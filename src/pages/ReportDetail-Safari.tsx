import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiCall } from "../api/api";
import { motion } from 'framer-motion';
import {
  collectHeatmapUrls,
  downloadHeatmapFiles,
  isHeatmapVideoUrl,
  normalizeHeatmapUrl,
} from '../utils/heatmapExport';

interface FileMetadata {
  content_type: string;
  filename: string;
  size: number;
}

interface VideoAnalysis {
  error: string | null;
  verdict: string;
  predicted_class: string;
  fake_confidence: number;
  real_confidence: number;
  processing_time: number;
  avg_inference_ms: number;
  heatmap_paths?: string[] | null;
  faces_detected?: number;
  frames_analyzed?: number;
  class_confidences?: Record<string, number>;
  class_scores?: Record<string, number>;
  predicted_class_idx?: number;
  score_video?: number;
  num_windows?: number;
  duration?: number;
  video_path?: string;
  performance?: Record<string, any>;
  individual_models?: Record<string, any>;
  ensemble_average?: Record<string, any>;
  predicted_technique?: string;
  final_video_verdict?: string;
  final_video_fake_confidence?: number;
  final_video_real_confidence?: number;
}

interface SuspiciousChunk {
  rank: number;
  chunk_index: number;
  start_sec: number;
  end_sec: number;
  fake_confidence: number;
}

interface ChunkingInfo {
  enabled: boolean;
  aggregation?: string;
  top_suspicious_chunks: SuspiciousChunk[];
  num_chunks?: number;
  decision_threshold?: number;
  window_sec?: number;
  stride_sec?: number;
}

interface AudioPerformance {
  inference_time_ms?: number;
  total_time_ms?: number;
  chunking?: ChunkingInfo;
}

interface AudioWindow {
  fake_confidence: number;
  real_confidence: number;
  verdict: string;
  chunk_index: number;
  start_sec: number;
  end_sec: number;
  rationale?: string;
  transcription?: string;
  language_predicted_name?: string;
  language_confidence?: number;
  importance?: number;
  importance_score?: number;
  importance_label?: string;
  importance_rationale?: string;
}

interface AudioHighlight {
  start_sec: number;
  end_sec: number;
  verdict: string;
  transcription?: string;
  fake_confidence?: number;
  importance_rationale?: string;
  chunk_index?: number;
}

interface AudioHighlights {
  primary_alert?: AudioHighlight;
  technical_proof?: AudioHighlight;
}

interface RealWindowInsight {
  chunk_index?: number;
  start_sec: number;
  end_sec: number;
  verdict?: string;
  transcription?: string;
  importance_label?: string;
  importance_score?: number;
  importance_rationale?: string;
  real_confidence?: number;
}

interface AudioAnalysis {
  error: string | null;
  verdict: string;
  fake_confidence: number;
  real_confidence: number;
  processing_time: number;
  avg_inference_ms: number;
  duration?: number;
  audio_path?: string;
  score_audio?: number;
  performance?: AudioPerformance;
  performance_metrics?: AudioPerformance;
  audio_windows?: AudioWindow[];
  suspicious_chunks?: SuspiciousChunk[];
  audio_highlights?: AudioHighlights;
  real_window_insights?: RealWindowInsight[];
  language_predicted_name?: string;
  language_confidence?: number;
  final_audio_verdict?: string;
  final_audio_fake_confidence?: number;
  final_audio_real_confidence?: number;
  audio_prediction_raw?: any;
}

interface ImageResult {
  label_image: string;
  score_image?: number;
}

interface Result {
  // Flat DB columns
  id?: string;
  file_upload_id?: string;
  created_at?: string;
  updated_at?: string;
  verdict?: string;
  real_confidence?: number;
  fake_confidence?: number;
  predicted_class?: string | null;
  processing_time?: number;
  avg_inference_ms?: number;
  // Nested analysis objects
  video_analysis: VideoAnalysis | null;
  audio_analysis: AudioAnalysis | null;
  image_result: ImageResult | null;
  heatmap_url: string[] | null;
  heatmap_paths: string[] | null;
  metadata_analysis: any | null;
  obvious_deepfake_analysis?: ObviousDeepfakeAnalysis | null;
}

interface ObviousDeepfakeAnalysis {
  enabled?: boolean;
  skipped?: boolean;
  is_obvious_deepfake?: boolean;
  verdict?: string;
  confidence?: number;
  rationale?: string;
  reasons?: string[];
  modality?: string;
  frames_sampled?: number;
  audio_included?: boolean;
  processing_time_sec?: number;
  model?: string;
  note?: string;
  error?: string;
  used_multimodal?: boolean;
  layer?: string;
  windows_analyzed?: number;
  windows_obvious?: number;
  sampling?: {
    mode?: string;
    frames_per_window?: number;
    window_sec?: number;
    stride_sec?: number;
    max_windows?: number;
    windows_planned?: number;
    windows_completed?: number;
    early_stopped?: boolean;
  };
  windows?: Array<{
    window_index?: number;
    start_sec?: number;
    end_sec?: number;
    verdict?: string;
    confidence?: number;
    is_obvious_deepfake?: boolean;
    rationale?: string;
    reasons?: string[];
    frames_sampled?: number;
  }>;
}

interface FileUpload {
  file_meta_id?: string;
  file_metadata: FileMetadata;
  file_status: string;
  result: Result | null;
}

interface ReportDetailResponse {
  code: string;
  message: {
    file_uploads: FileUpload[];
  };
}

/** Resolve obvious-deepfake payload from any of the nested JSONB homes. */
const resolveObviousDeepfake = (result: Result | null | undefined): ObviousDeepfakeAnalysis | null => {
  if (!result) return null;
  const candidates = [
    result.obvious_deepfake_analysis,
    (result.video_analysis as any)?.obvious_deepfake_analysis,
    (result.audio_analysis as any)?.obvious_deepfake_analysis,
  ];
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;
    // Disabled / skipped precheck must not occupy a layout column.
    if (c.skipped || String(c.verdict || '').toUpperCase() === 'SKIPPED') continue;
    if (c.verdict || c.rationale || c.is_obvious_deepfake !== undefined) {
      return c as ObviousDeepfakeAnalysis;
    }
  }
  return null;
};

const ObviousDeepfakeSection: React.FC<{ data: ObviousDeepfakeAnalysis; forceExpand?: boolean }> = ({ data, forceExpand }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const showFull = isExpanded || forceExpand;

  if (!data || data.skipped || data.verdict === 'SKIPPED') return null;

  const verdict = String(data.verdict || 'UNKNOWN').toUpperCase();
  const isObvious = !!data.is_obvious_deepfake || verdict === 'OBVIOUS_FAKE';
  const notObvious = verdict === 'NOT_OBVIOUS';

  const verdictStyle = isObvious
    ? 'bg-red-900/40 text-red-400'
    : notObvious
      ? 'bg-green-900/40 text-green-400'
      : 'bg-gray-800 text-gray-400';

  const verdictLabel = isObvious
    ? 'OBVIOUS FAKE'
    : notObvious
      ? 'NOT OBVIOUS'
      : verdict;

  const confidencePct = data.confidence != null && Number.isFinite(Number(data.confidence))
    ? (Number(data.confidence) * 100).toFixed(2)
    : null;

  const summary = (data.rationale || '').trim();

  return (
    <div className="min-h-full p-3 border border-gray-700/50 rounded-lg bg-gray-900/30 backdrop-blur-sm print-break-inside-avoid">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
            Perceptual Visual Screening
          </h4>
          <p className="text-[9px] text-gray-500 mt-0.5 normal-case tracking-normal font-normal">
            Initial perceptual check for glaring visual and temporal anomalies.
          </p>
        </div>
        {!forceExpand && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-blue-400 px-2 py-1 rounded border border-gray-700 transition-all flex items-center gap-1 no-print shrink-0"
          >
            {isExpanded ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Hide
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Show Full Analysis
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black px-2 py-0.5 rounded ${verdictStyle}`}>
            {verdictLabel}
          </span>
        </div>

        <div className="space-y-1 text-[10px] text-gray-400">
          {confidencePct != null && (
            <p>Confidence: <span className="text-gray-300">{confidencePct}%</span></p>
          )}
          {summary && (
            <p className="text-gray-300 leading-snug whitespace-normal break-words">{summary}</p>
          )}
          {data.windows_analyzed != null && (
            <p>
              Windows analyzed:{' '}
              <span className="text-gray-300">{data.windows_analyzed}</span>
              {data.sampling?.frames_per_window != null && data.sampling?.window_sec != null && (
                <span className="opacity-70">
                  {' '}({data.sampling.frames_per_window} frames / {data.sampling.window_sec}s)
                </span>
              )}
            </p>
          )}
        </div>

        {showFull && (
          <motion.div
            initial={forceExpand ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={forceExpand ? { duration: 0 } : { duration: 0.3 }}
            className="mt-4 space-y-2 pt-3 border-t border-gray-700/50 text-[10px] text-gray-500"
          >
            {Array.isArray(data.reasons) && data.reasons.length > 0 && (
              <div>
                <p className="font-black text-gray-500 uppercase mb-1 text-[9px]">Reasons</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-300">
                  {data.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.sampling && (
              <p>
                Sampling:{' '}
                <span className="text-gray-300">
                  {data.sampling.frames_per_window ?? '?'} frames / {data.sampling.window_sec ?? '?'}s window
                  {data.sampling.early_stopped ? ' · early exit' : ''}
                </span>
              </p>
            )}
            {data.modality && (
              <p>Modality: <span className="text-gray-300">{data.modality}</span></p>
            )}
            {data.frames_sampled != null && (
              <p>Frames sampled: <span className="text-gray-300">{data.frames_sampled}</span></p>
            )}
            {data.audio_included != null && (
              <p>Audio included: <span className="text-gray-300">{data.audio_included ? 'yes' : 'no'}</span></p>
            )}
            {data.processing_time_sec != null && (
              <p>Screening time: <span className="text-gray-300">{Number(data.processing_time_sec).toFixed(2)}s</span></p>
            )}
            {Array.isArray(data.windows) && data.windows.length > 0 && (
              <div className="mt-1 space-y-1">
                <p className="font-black text-gray-500 uppercase text-[9px]">Per-window opinions</p>
                {data.windows.map((w, i) => (
                  <div key={i} className="bg-black/20 p-1.5 rounded text-gray-400">
                    <span className="text-gray-300">
                      {Number(w.start_sec ?? 0).toFixed(1)}s–{Number(w.end_sec ?? 0).toFixed(1)}s
                    </span>
                    {' · '}
                    <span className={w.is_obvious_deepfake ? 'text-red-400' : 'text-gray-300'}>
                      {w.verdict || 'UNKNOWN'}
                    </span>
                    {w.confidence != null && (
                      <span className="opacity-70"> ({(Number(w.confidence) * 100).toFixed(0)}%)</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {data.error && (
              <p className="text-red-400">Error: {data.error}</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

const VideoAnalysisSection: React.FC<{
  data: any;
  heatmapUrls?: string[] | null;
  heatmapAudit?: {
    focusSummary?: string | null;
    attentionQuality?: string | null;
    auditVerdict?: { error_risk_type?: string; risk_level?: string; rationale?: string } | null;
  } | null;
  forceExpand?: boolean;
}> = ({ data: v, heatmapUrls, heatmapAudit, forceExpand }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHeatmapAudit, setShowHeatmapAudit] = useState(false);
  const showFull = isExpanded || forceExpand;

  if (!v) return null;

  // Simple formatters
  const formatClassName = (cls: any) => {
    if (!cls) return 'N/A';
    return String(cls).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  };

  const getVerdictColor = (verdict: any) => {
    if (!verdict) return 'bg-gray-800 text-gray-400';
    const lower = String(verdict).toLowerCase();
    if (lower === 'real') return 'bg-green-900/40 text-green-400';
    return 'bg-red-900/40 text-red-400';
  };

  const getConfidenceColor = (type: 'real' | 'fake') => {
    return type === 'real' ? 'text-green-300' : 'text-red-300';
  };

  const focusSummary =
    heatmapAudit?.focusSummary && heatmapAudit.focusSummary !== 'N/A'
      ? String(heatmapAudit.focusSummary)
      : null;
  const attentionQuality =
    heatmapAudit?.attentionQuality &&
    heatmapAudit.attentionQuality !== 'N/A' &&
    heatmapAudit.attentionQuality !== 'NOT_AVAILABLE'
      ? String(heatmapAudit.attentionQuality)
      : null;
  const auditRationale =
    heatmapAudit?.auditVerdict?.rationale && String(heatmapAudit.auditVerdict.rationale).trim()
      ? String(heatmapAudit.auditVerdict.rationale)
      : null;
  const auditRisk =
    heatmapAudit?.auditVerdict?.risk_level &&
    heatmapAudit.auditVerdict.risk_level !== 'NOT_AVAILABLE'
      ? String(heatmapAudit.auditVerdict.risk_level)
      : null;
  const hasHeatmapAudit = !!(focusSummary || attentionQuality || auditRationale);

  return (
    <div className="min-h-full p-3 border border-gray-700/50 rounded-lg bg-gray-900/30 backdrop-blur-sm print-break-inside-avoid">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Video Forensic Analysis</h4>
        {!forceExpand && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-blue-400 px-2 py-1 rounded border border-gray-700 transition-all flex items-center gap-1 no-print"
          >
            {isExpanded ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Hide
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Show Full Analysis
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {/* Summary Stats */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black px-2 py-0.5 rounded ${getVerdictColor(v.verdict)}`}>
            {v.verdict || 'UNKNOWN'}
          </span>
        </div>

        <div className="space-y-1 text-[10px] text-gray-400">
          <p>Predicted Class: <span className="text-gray-300">{formatClassName(v.predicted_class)}</span></p>
          <p>Fake Confidence: <span className={getConfidenceColor('fake')}>{(Number(v.fake_confidence) * 100).toFixed(2)}%</span></p>
          <p>Real Confidence: <span className={getConfidenceColor('real')}>{(Number(v.real_confidence) * 100).toFixed(2)}%</span></p>
          {v.processing_time !== undefined && (
            <p>Processing Time: <span className="text-gray-300">{Number(v.processing_time).toFixed(2)}s</span></p>
          )}
          {v.frames_analyzed !== undefined && (
            <p>Frames Analyzed: <span className="text-gray-300">{v.frames_analyzed}</span></p>
          )}
          {v.faces_detected !== undefined && (
            <p>Faces Detected: <span className="text-gray-300">{v.faces_detected}</span></p>
          )}
        </div>

        {/* Class Scores (class_scores from detector; class_confidences is legacy) */}
        {(v.class_scores || v.class_confidences) && (
          <div className="mt-2">
            <p className="font-black text-gray-500 uppercase mb-2 text-[9px]">Class Scores</p>
            <div className="space-y-1 text-[10px]">
              {Object.entries(v.class_scores || v.class_confidences || {}).map(([className, score]: [string, any]) => {
                const value = Number(score);
                return (
                  <div key={className} className="flex justify-between items-center bg-black/20 p-1.5 rounded">
                    <span className="text-gray-400">{formatClassName(className)}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-800 h-1 rounded overflow-hidden">
                        <div
                          className={className.toLowerCase() === 'real' ? 'bg-green-500 h-full' : 'bg-red-500 h-full'}
                          style={{ width: `${Math.min(100, value * 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-300 w-12 text-right">{value.toFixed(3)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasHeatmapAudit && (
          <div className="mt-2 p-2 bg-orange-900/10 border border-orange-500/20 rounded-lg space-y-1.5">
            <p className="text-[9px] font-black text-orange-300 uppercase tracking-wider">Heatmap Analysis</p>
            {attentionQuality && (
              <p className="text-[10px] text-gray-400">
                Attention: <span className="text-orange-200 font-medium">{attentionQuality}</span>
                {auditRisk ? <span className="opacity-70"> · Risk {auditRisk}</span> : null}
              </p>
            )}
            {focusSummary && (
              <p className="text-[10px] text-gray-300 leading-snug">{focusSummary}</p>
            )}
            {auditRationale && (showFull || showHeatmapAudit) && (
              <p className="text-[10px] text-gray-400 leading-snug italic">{auditRationale}</p>
            )}
            {auditRationale && !showFull && !showHeatmapAudit && (
              <button
                type="button"
                onClick={() => setShowHeatmapAudit(true)}
                className="text-[9px] text-blue-400 hover:text-blue-300 no-print text-left"
              >
                Show full heatmap audit rationale…
              </button>
            )}
          </div>
        )}
      </div>

      {heatmapUrls && heatmapUrls.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700/30">
          <HeatmapSection urls={heatmapUrls} />
        </div>
      )}

      {showFull && (
        <motion.div
          initial={forceExpand ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={forceExpand ? { duration: 0 } : { duration: 0.3 }}
          className="mt-4 space-y-4 pt-3 border-t border-gray-700/50"
        >
          {/* Performance Details */}
          {v.performance && (
            <div className="bg-black/20 p-2 rounded">
              <p className="font-black text-gray-500 uppercase mb-2 text-[9px]">Performance Metrics</p>
              <div className="space-y-1 text-[10px]">
                {v.performance.total_inference_time_ms && (
                  <p>Total Inference Time: <span className="text-gray-300">{Number(v.performance.total_inference_time_ms).toFixed(2)} ms</span></p>
                )}
                {v.performance.total_processing_time_ms && (
                  <p>Total Processing Time: <span className="text-gray-300">{Number(v.performance.total_processing_time_ms).toFixed(2)} ms</span></p>
                )}
              </div>
            </div>
          )}

          {/* Avg Inference */}
          {v.avg_inference_ms && (
            <div className="bg-black/20 p-2 rounded">
              <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Avg Inference Time</p>
              <p className="text-[10px] text-gray-300">{Number(v.avg_inference_ms).toFixed(2)} ms</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

const ForensicExplanationBlock: React.FC<{
  explanation: string;
}> = ({ explanation }) => {
  const text = String(explanation || '').trim();
  if (!text || text === 'N/A') return null;

  return (
    <div className="w-full p-4 border border-blue-500/30 rounded-lg bg-blue-900/10 backdrop-blur-sm print-break-inside-avoid">
      <div className="mb-2">
        <span className="text-[10px] font-black text-blue-300 uppercase tracking-wider">
          Full Evidence Explanation
        </span>
      </div>
      <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">
        {text}
      </p>
    </div>
  );
};

const MetadataSection: React.FC<{ data: any; forceExpand?: boolean }> = ({ data: initialData, forceExpand }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Resilient data parsing
  const data = useMemo(() => {
    if (!initialData) return null;
    let d = initialData;
    // Handle stringified JSON
    if (typeof d === 'string') {
      try { d = JSON.parse(d); } catch (e) { return { raw_string: d }; }
    }
    // Handle double nesting (e.g., { metadata_analysis: { ... } })
    if (d && d.metadata_analysis && Object.keys(d).length === 1) {
      d = d.metadata_analysis;
    }
    return d;
  }, [initialData]);

  useEffect(() => {
    if (data) console.log('MetadataSection processed data:', data);
  }, [data]);

  if (!data) return null;

  const verdict = data.verdict || 'UNKNOWN';
  const score = data.suspicious_score !== undefined ? data.suspicious_score : (data.score !== undefined ? data.score : 'N/A');
  const anomalies = data.top_anomalies || data.anomalies || [];
  const inconsistencies = data.top_inconsistencies || data.metadata_inconsistencies || [];
  const geminiSummary = data.gemini_summary;

  // Helper mappings for the new forensic_analysis structure
  const forensic = data.forensic_analysis || {};
  const hwSw = forensic.hardware_software_analysis || {};
  const matrix = forensic.matrix_analysis || {};
  const bitrate = forensic.bitrate_analysis || {};
  const fps = forensic.fps_analysis || {};

  const likelySource = data.forensic_summary?.likely_source || data.source_analysis?.likely_source || hwSw.likely_source || null;
  const hwSwConfidence = data.confidence || data.forensic_summary?.hw_sw_confidence || data.source_analysis?.confidence || hwSw.confidence || 0;

  const showFull = isExpanded || forceExpand;

  return (
    <div className="min-h-full p-3 border border-gray-700/50 rounded-lg bg-gray-900/30 backdrop-blur-sm print-break-inside-avoid">
    <div className="flex justify-between items-center mb-2">
    <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider">Metadata Analysis</h4>
    {!forceExpand && (
      <button
      onClick={() => setIsExpanded(!isExpanded)}
      className="text-[10px] bg-gray-800 hover:bg-gray-700 text-blue-400 px-2 py-1 rounded border border-gray-700 transition-all flex items-center gap-1 no-print"
      >
      {isExpanded ? (
        <>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        Hide
        </>
      ) : (
        <>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Show Full Analysis
        </>
      )}
      </button>
    )}
    </div>

    <div className="space-y-2">
    <div className="flex items-center gap-2">
    <span className={`text-xs font-black px-2 py-0.5 rounded ${verdict === 'SUSPICIOUS' || verdict === 'MANIPULATED' ? 'bg-yellow-900/40 text-yellow-400' : (verdict === 'CLEAN' ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-400')}`}>
    {verdict}
    </span>
    <span className="text-[10px] text-gray-400 font-mono">Score: {typeof score === 'number' ? score.toFixed(4) : score}</span>
    </div>

    {likelySource && (
      <div className="flex items-center gap-1 text-[10px] text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Likely Source: <span className="text-gray-200 font-medium">{likelySource}</span>
      <span className="opacity-60">(Conf: {hwSwConfidence.toFixed(2)})</span>
      </div>
    )}

    {geminiSummary && (
      <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="p-0.5 bg-blue-500/20 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-[9px] font-black text-blue-300 uppercase tracking-wider">Evidence Collation</span>
          <span className={`ml-auto text-[8px] font-bold px-1 rounded ${geminiSummary.verdict === 'MANIPULATED' ? 'text-red-400 bg-red-950/40' : 'text-green-400 bg-green-950/40'}`}>
            {geminiSummary.verdict} ({(geminiSummary.confidence * 100).toFixed(0)}%)
          </span>
        </div>
        {geminiSummary.key_findings && geminiSummary.key_findings.length > 0 && (
          <ul className="space-y-1">
            {geminiSummary.key_findings.slice(0, showFull ? undefined : 2).map((finding: string, i: number) => (
              <li key={i} className="text-[10px] text-gray-300 flex gap-2 leading-snug">
                <span className="text-blue-500 font-bold">•</span>
                {finding}
              </li>
            ))}
            {!showFull && geminiSummary.key_findings.length > 2 && (
              <li className="list-none text-blue-400 text-[9px] font-medium no-print">
                + {geminiSummary.key_findings.length - 2} more in full analysis…
              </li>
            )}
          </ul>
        )}
      </div>
    )}

    {anomalies.length > 0 && (
      <div className="text-[10px] bg-yellow-900/10 border border-yellow-700/20 rounded p-1.5">
      <div className="flex items-center gap-1 text-yellow-500 font-bold mb-1 uppercase text-[9px]">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Detected Anomalies ({anomalies.length})
      </div>
      <ul className="list-disc list-inside text-gray-400 space-y-0.5">
      {anomalies.slice(0, showFull ? undefined : 2).map((a: string, i: number) => (
        <li key={i} className="leading-tight">{a}</li>
      ))}
      {!showFull && anomalies.length > 2 && <li className="list-none text-blue-400 mt-0.5 font-medium no-print">+ {anomalies.length - 2} more...</li>}
      </ul>
      </div>
    )}
    </div>

    {showFull && (
      <motion.div
      initial={forceExpand ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={forceExpand ? { duration: 0 } : { duration: 0.3 }}
      className="mt-4 space-y-4 pt-3 border-t border-gray-700/50"
      >
      {geminiSummary && (
        <div className="bg-blue-900/10 p-3 rounded-lg border border-blue-500/20">
          <p className="text-[10px] font-black text-blue-300 uppercase mb-2 border-b border-blue-500/30 pb-1">Evidence Collation</p>
          
          {geminiSummary.key_findings && geminiSummary.key_findings.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1.5">Key Findings</p>
              <ul className="space-y-1.5">
                {geminiSummary.key_findings.map((finding: string, i: number) => (
                  <li key={i} className="text-[10px] text-gray-300 flex gap-2 leading-snug">
                    <span className="text-blue-500 font-bold">•</span>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {geminiSummary.fps_summary && geminiSummary.fps_summary !== 'N/A' && (
              <div className="bg-black/30 p-1.5 rounded">
                <p className="text-[8px] text-gray-500 uppercase font-bold">FPS Summary</p>
                <p className="text-[10px] text-blue-200">{geminiSummary.fps_summary}</p>
              </div>
            )}
            {geminiSummary.bitrate_summary && geminiSummary.bitrate_summary !== 'N/A' && (
              <div className="bg-black/30 p-1.5 rounded">
                <p className="text-[8px] text-gray-500 uppercase font-bold">Bitrate</p>
                <p className="text-[10px] text-blue-200">{geminiSummary.bitrate_summary}</p>
              </div>
            )}
            {geminiSummary.matrix_summary && geminiSummary.matrix_summary !== 'N/A' && (
              <div className="bg-black/30 p-1.5 rounded">
                <p className="text-[8px] text-gray-500 uppercase font-bold">Matrix</p>
                <p className="text-[10px] text-blue-200">{geminiSummary.matrix_summary}</p>
              </div>
            )}
             {geminiSummary.atoms_summary && geminiSummary.atoms_summary !== 'N/A' && (
              <div className="bg-black/30 p-1.5 rounded">
                <p className="text-[8px] text-gray-500 uppercase font-bold">Atoms</p>
                <p className="text-[10px] text-blue-200">{geminiSummary.atoms_summary}</p>
              </div>
            )}
            {geminiSummary.neural_metadata_alignment && geminiSummary.neural_metadata_alignment !== 'N/A' && (
              <div className="bg-black/30 p-1.5 rounded">
                <p className="text-[8px] text-gray-500 uppercase font-bold">Alignment</p>
                <p className="text-[10px] text-blue-200">{geminiSummary.neural_metadata_alignment}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {(data.file_info || data.file_hash || data.file_size) && (
        <div className="bg-black/20 p-2 rounded">
        <p className="text-[9px] font-black text-gray-500 uppercase mb-1.5 border-b border-gray-800 pb-1">File Information</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <div className="flex justify-between border-b border-gray-800/50 pb-0.5">
        <span className="text-gray-500">Size</span>
        <span className="text-gray-300 font-mono">{data.file_size || data.file_info?.size || 'N/A'}</span>
        </div>
        <div className="flex justify-between border-b border-gray-800/50 pb-0.5">
        <span className="text-gray-500">Type</span>
        <span className="text-gray-300 font-mono">{data.file_type || data.file_info?.type || 'N/A'}</span>
        </div>
        <div className="col-span-2 flex flex-col gap-0.5">
        <span className="text-gray-500">File Hash (SHA-256)</span>
        <span className="text-gray-400 font-mono break-all bg-black/40 p-1 rounded select-all">{data.file_hash || data.file_info?.hash || 'N/A'}</span>
        </div>
        </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {(data.forensic_summary?.matrix_interpretation || data.matrix_structure || matrix.interpretation) && (
        <div className="bg-black/20 p-2 rounded">
        <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Matrix Structure</p>
        <p className="text-[10px] text-gray-300 font-mono">{data.forensic_summary?.matrix_interpretation || data.matrix_structure || matrix.interpretation}</p>
        </div>
      )}
      {(data.forensic_summary?.bitrate_category || data.bitrate_analysis || bitrate.bitrate_category) && (
        <div className="bg-black/20 p-2 rounded">
        <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Bitrate Analysis</p>
        <p className="text-[10px] text-gray-300 font-mono">{data.forensic_summary?.bitrate_category || data.bitrate_analysis || bitrate.bitrate_category}</p>
        </div>
      )}
      {(data.forensic_summary?.fps || data.frame_rate || fps.frame_rate) && (
        <div className="bg-black/20 p-2 rounded">
        <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Frame Rate</p>
        <p className="text-[10px] text-gray-300 font-mono">{data.forensic_summary?.fps || data.frame_rate || fps.frame_rate}</p>
        </div>
      )}
      </div>

      {(data.hex_format || data.hex_analysis) && (
        <div>
        <p className="text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">Hex Analysis</p>
        <pre className="text-[9px] text-gray-400 bg-black/40 p-2 rounded max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 font-mono leading-tight">
        {data.hex_format || JSON.stringify(data.hex_analysis, null, 2)}
        </pre>
        </div>
      )}

      {(data.ffprobe || data.ffprobe_data) && (
        <div>
        <p className="text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">FFprobe (stream & format)</p>
        <pre className="text-[9px] text-gray-400 bg-black/40 p-2 rounded max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 font-mono leading-tight">
        {JSON.stringify(data.ffprobe || data.ffprobe_data, null, 2)}
        </pre>
        </div>
      )}

      {(data.quantization_analysis || data.quantization_anomaly_count !== undefined) && (
        <div>
        <p className="text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">Quantization Analysis</p>
        <pre className="text-[9px] text-gray-400 bg-black/40 p-2 rounded font-mono leading-tight scrollbar-thin scrollbar-thumb-gray-700 overflow-y-auto max-h-40">
        {data.quantization_analysis ? JSON.stringify(data.quantization_analysis, null, 2) : `Anomaly Count: ${data.quantization_anomaly_count}`}
        </pre>
        </div>
      )}


      {(data.atom_structure || data.atom_tree || data.atoms || data.atom_anomaly_count !== undefined) && (
        <div>
        <p className="text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">Moov / Atom structure</p>
        <pre className="text-[9px] text-gray-400 bg-black/40 p-2 rounded max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 font-mono leading-tight">
        {data.atom_structure || data.atom_tree || data.atoms ? JSON.stringify(data.atom_structure || data.atom_tree || data.atoms, null, 2) : `Atom Anomaly Count: ${data.atom_anomaly_count}`}
        </pre>
        </div>
      )}

      {data.exif_data && (
        <div>
        <p className="text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">Exif Data</p>
        <pre className="text-[9px] text-gray-400 bg-black/40 p-2 rounded max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 font-mono leading-tight">
        {JSON.stringify(data.exif_data, null, 2)}
        </pre>
        </div>
      )}

      {(forensic && Object.keys(forensic).length > 0 && !data.forensic_summary) || (data && !data.file_info && !data.file_hash && !data.ffprobe_data) ? (
        <div>
        <p className="text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">Raw Analysis Data</p>
        <pre className="text-[9px] text-gray-400 bg-black/40 p-2 rounded max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 font-mono leading-tight">
        {JSON.stringify(data, null, 2)}
        </pre>
        </div>
      ) : null}

      {inconsistencies.length > 0 && (
        <div className="bg-red-900/10 border border-red-700/20 rounded p-2">
        <p className="text-[9px] font-black text-red-400 uppercase mb-1.5 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Metadata inconsistencies
        </p>
        <ul className="list-disc list-inside text-[10px] text-red-400/80 space-y-1">
        {inconsistencies.map((err: string, i: number) => <li key={i}>{err}</li>)}
        </ul>
        </div>
      )}
      </motion.div>
    )}
    </div>
  );
};

const isPlaceholderImportanceLabel = (label: unknown): boolean => {
  if (label == null) return true;
  const s = String(label).trim();
  if (!s) return true;
  const upper = s.toUpperCase().replace(/\s+/g, '_');
  return [
    'UNKNOWN',
    'NEGLIGIBLE',
    'UNKNOWN/NEGLIGIBLE',
    'UNKNOWN_NEGLIGIBLE',
    'N/A',
    'NA',
    'NONE',
    'MISSING',
    'NOT_AVAILABLE',
    'NOTAVAILABLE',
  ].includes(upper);
};

const hasAudioImportance = (item: any): boolean => {
  if (!item || typeof item !== 'object') return false;
  const hasLabel = !isPlaceholderImportanceLabel(item.importance_label);
  const score = item.importance_score;
  const hasScore = score !== undefined && score !== null && Number.isFinite(Number(score));
  return hasLabel || hasScore;
};

const hasAudioTranscription = (item: any): boolean =>
  typeof item?.transcription === 'string' && item.transcription.trim().length > 0;

const hasAudioImportanceRationale = (item: any): boolean =>
  typeof item?.importance_rationale === 'string' && item.importance_rationale.trim().length > 0;

const SuspiciousChunksTimeline: React.FC<{ 
  audioWindows?: AudioWindow[];
  highlights?: AudioHighlights;
  realInsights?: RealWindowInsight[];
  forceExpand?: boolean;
}> = ({ highlights, realInsights, forceExpand }) => {
  const [showAllRealInsights, setShowAllRealInsights] = useState(false);
  const hasRealInsights = (realInsights?.length ?? 0) > 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const primary = highlights?.primary_alert;
  const technical = highlights?.technical_proof;
  const primaryImportanceLabel = String((primary as any)?.importance_label || "").toUpperCase();
  const primaryIsFake = String((primary as any)?.verdict || "").toUpperCase() === "FAKE";
  const primaryRequiresImmediateReview = Boolean(
    primary && primaryIsFake && !isPlaceholderImportanceLabel(primaryImportanceLabel) && primaryImportanceLabel === "CRITICAL"
  );
  const displayedRealInsights = (showAllRealInsights || forceExpand) ? (realInsights || []) : (realInsights || []).slice(0, 1);

  return (
    <div className="mt-4 pt-3 border-t border-gray-700/30">
      {(primary || technical) && (
        <p className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Analysis Highlights
        </p>
      )}

      {primary && (
        <div className="mb-4 p-2 bg-red-900/10 border border-red-700/20 rounded">
          <p className="text-[9px] font-black text-red-400 uppercase mb-1.5">
            {primaryRequiresImmediateReview ? '🚨 Requires Immediate Review' : 'Most Crucial Window'}
          </p>
          <p className="text-[10px] text-gray-300 flex items-center gap-2">
            <span className="font-mono">
              {formatTime((primary as any).start_sec || 0)} {' → '} {formatTime((primary as any).end_sec || 0)}
            </span>
            {(primary as any).fake_confidence !== undefined && (
              <span className="text-red-300">
                Confidence: {(((primary as any).fake_confidence || 0) * 100).toFixed(1)}%
              </span>
            )}
          </p>

          {hasAudioImportance(primary) && (
            <div className="flex items-center gap-2 text-[10px] mt-1">
              <p className="text-[9px] font-black text-gray-500 uppercase">Importance</p>
              {!isPlaceholderImportanceLabel((primary as any).importance_label) && (
                <span className="text-red-300 font-semibold">{(primary as any).importance_label}</span>
              )}
              {(primary as any).importance_score !== undefined &&
                (primary as any).importance_score !== null &&
                Number.isFinite(Number((primary as any).importance_score)) && (
                <span className="text-gray-400">
                  Score: {(Number((primary as any).importance_score) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          )}

          {hasAudioTranscription(primary) && (
            <div className="mt-1">
              <p className="text-[9px] font-black text-gray-500 uppercase">Transcript</p>
              <p className="text-[10px] text-gray-400 mt-1 italic">"{String((primary as any).transcription).trim()}"</p>
            </div>
          )}

          {hasAudioImportanceRationale(primary) && (
            <div className="mt-1">
              <p className="text-[9px] font-black text-gray-500 uppercase">Rationale</p>
              <p className="text-[10px] text-gray-400 mt-1">{(primary as any).importance_rationale}</p>
            </div>
          )}
        </div>
      )}

      {technical && (
        <div className="mb-4 p-2 bg-purple-900/10 border border-purple-700/20 rounded">
          <p className="text-[9px] font-black text-purple-400 uppercase mb-1.5">Forensic Proof</p>
          <p className="text-[10px] text-gray-300 flex items-center gap-2">
            <span className="font-mono">
              {formatTime((technical as any).start_sec || 0)} {' → '} {formatTime((technical as any).end_sec || 0)}
            </span>
            {(technical as any).fake_confidence !== undefined && (
              <span className="text-purple-300">
                Confidence: {(((technical as any).fake_confidence || 0) * 100).toFixed(1)}%
              </span>
            )}
          </p>
        </div>
      )}

      {hasRealInsights && (
        <div className="mb-4 p-2 bg-green-900/10 border border-green-700/20 rounded">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-[9px] font-black text-green-400 uppercase">✓ Real Windows</p>
            {(realInsights?.length ?? 0) > 1 && (
              <button 
                onClick={() => setShowAllRealInsights(!showAllRealInsights)}
                className="ml-auto text-[9px] text-blue-400 hover:text-blue-300 no-print"
              >
                {showAllRealInsights ? 'Collapse' : `Show ${(realInsights?.length ?? 0) - 1} more`}
              </button>
            )}
          </div>
          
          <div className="space-y-1">
            {displayedRealInsights.map((insight, i) => (
              <div key={i} className="text-[10px] text-gray-300 bg-black/20 p-1.5 rounded">
                <p className="font-mono mb-1">
                  {formatTime(insight.start_sec)} → {formatTime(insight.end_sec)}
                </p>

                {hasAudioImportance(insight) && (
                  <div className="flex items-center gap-2 text-[10px] mb-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase">Importance</p>
                    {!isPlaceholderImportanceLabel(insight.importance_label) && (
                      <span className="text-green-300 font-semibold">{insight.importance_label}</span>
                    )}
                    {insight.importance_score !== undefined &&
                      insight.importance_score !== null &&
                      Number.isFinite(Number(insight.importance_score)) && (
                      <span className="text-gray-400">Score: {(Number(insight.importance_score) * 100).toFixed(1)}%</span>
                    )}
                  </div>
                )}

                {hasAudioTranscription(insight) && (
                  <div className="mb-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase">Transcript</p>
                    <p className="text-gray-400 italic mt-0.5">"{String(insight.transcription).trim()}"</p>
                  </div>
                )}

                {hasAudioImportanceRationale(insight) && (
                  <div>
                    <p className="text-[9px] font-black text-gray-500 uppercase">Rationale</p>
                    <p className="text-gray-400 text-[9px] mt-0.5">{insight.importance_rationale}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

const HeatmapSection: React.FC<{ urls: string[] | null }> = ({ urls }) => {
  const safeUrls = Array.isArray(urls)
    ? urls.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    : [];
  if (safeUrls.length === 0) return null;

  return (
    <div className="mt-3">
    <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Video Heatmaps</h4>
    <div className="flex flex-col gap-4">
    {safeUrls.map((url, i) => {
      const normalizedUrl = normalizeHeatmapUrl(url);
      const isVideo = isHeatmapVideoUrl(normalizedUrl);
      const canRenderMedia =
        normalizedUrl.startsWith("data:") ||
        normalizedUrl.startsWith("http://") ||
        normalizedUrl.startsWith("https://") ||
        (normalizedUrl.startsWith("/") && !normalizedUrl.startsWith("//"));
      return (
        <div key={i} className="relative group bg-black/50 rounded-lg overflow-hidden border border-gray-700/50 hover:border-orange-400/50 transition-all w-full">
        {canRenderMedia && isVideo && (
          <video
          src={normalizedUrl}
          className="w-full h-auto block"
          controls
          muted
          playsInline
          preload="metadata"
          />
        )}
        {canRenderMedia && !isVideo && (
          <img
          src={normalizedUrl}
          alt={`Heatmap ${i + 1}`}
          className="w-full h-auto block"
          />
        )}
        {!canRenderMedia && (
          <div className="w-full aspect-video flex items-center justify-center text-gray-500 text-xs text-center p-2">
          <span>Unable to preview heatmap</span>
          </div>
        )}
        </div>
      );
    })}
    </div>
    </div>
  );
};

const ReportDetail: React.FC = () => {
  const { uploadId, contentType: urlContentType } = useParams<{ uploadId: string; contentType?: string }>();
  const [data, setData] = useState<FileUpload[]>([]);
  const [contentType] = useState<string | undefined>(urlContentType);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProcessingItems, setHasProcessingItems] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const POLL_INTERVAL = 10000; // 10 seconds
  const navigate = useNavigate();

  const handleBackToReport = () => {
    navigate(-1);
  };

  const handleExport = async () => {
    const heatmapUrls = collectHeatmapUrls(data);
    if (heatmapUrls.length > 0) {
      await downloadHeatmapFiles(heatmapUrls);
    }
    setIsPrinting(true);
    // Give time for state to update and layout to expand
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  // Check if any items are in processing state
  const checkForProcessingItems = useCallback((items: FileUpload[]) => {
    return items.some(item => item.file_status === 'processing' || item.file_status === 'pending');
  }, []);

  // Clear polling interval
  const clearPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  const fetchReportDetail = useCallback(async () => {
    setLoading(true); // Always set loading true on fetch start
    setError(null);
    try {
      const token = localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken');

      if (!token) {
        alert("Authentication token missing. Please log in again.");
        setData([]);
        setHasProcessingItems(false);
        setLoading(false); // Set loading to false on error
        return;
      }

      const url = `/reports/${uploadId}`;

      const result: ReportDetailResponse = await apiCall({
        endpoint: url,
        method: 'GET',
        jwtToken: true
      });
      console.log('API Response for Report Detail:', result);


      if (result.code === 'success' && result.message && Array.isArray(result.message.file_uploads) && result.message.file_uploads.length > 0) {
        // Show all uploads — pending/processing show a status card, complete show results
        const filteredUploads = result.message.file_uploads.filter(upload => {
          // Always show pending, processing, or errored files
          if (
            upload.file_status === 'pending' ||
            upload.file_status === 'processing' ||
            upload.file_status === 'error'
          ) {
            return true;
          }

          // For completed files, show if they have any analysis result
          if (upload.file_status === 'complete') {
            return !!(
              upload.result?.audio_analysis ||
              upload.result?.image_result ||
              upload.result?.video_analysis ||
              (upload.result?.heatmap_paths && upload.result.heatmap_paths.length > 0) ||
              (upload.result?.heatmap_url && upload.result.heatmap_url.length > 0) ||
              upload.result?.verdict
            );

          }
          return false;
        });

        setData(filteredUploads);

        // Check for processing items in the new data
        const hasProcessing = checkForProcessingItems(filteredUploads);
        setHasProcessingItems(hasProcessing);
      } else {
        setData([]);
        setHasProcessingItems(false);
      }
    } catch (err: unknown) { // Changed to unknown
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setData([]);
      setHasProcessingItems(false);
    } finally {
      setLoading(false);
    }
  }, [uploadId, contentType, navigate, checkForProcessingItems]);

  // Setup polling if needed
  const setupPolling = useCallback(() => {
    if (hasProcessingItems && !pollingInterval.current) {
      pollingInterval.current = setInterval(() => {
        fetchReportDetail();
      }, POLL_INTERVAL);
    } else if (!hasProcessingItems) {
      clearPolling();
    }
  }, [hasProcessingItems, clearPolling, fetchReportDetail]);

  // Effect for initial fetch and cleanup
  useEffect(() => {
    fetchReportDetail();
    return () => clearPolling();
  }, [uploadId, contentType, clearPolling, fetchReportDetail]); // Add fetchReportDetail to dependencies

  // Effect for polling setup
  useEffect(() => {
    setupPolling();
    return () => clearPolling();
  }, [hasProcessingItems, setupPolling, clearPolling]);

  // Moved outside the component
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatResult = (upload: FileUpload, forceExpand: boolean = false) => {
    if (upload.file_status === 'error') {
      return (
        <div>
        <span className="font-semibold text-red-400">Error:</span>
        <br />
        <span className="text-xs text-red-400">Failed to process file</span>
        </div>
      );
    }

    if (upload.file_status === 'pending' || upload.file_status === 'processing') {
      const isPending = upload.file_status === 'pending';
      return (
        <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
        <svg className="animate-spin h-4 w-4 text-blue-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-semibold text-blue-300">
        {isPending ? 'Pending — queued for processing' : 'Processing — analysis in progress'}
        </span>
        </div>
        <span className="text-xs text-gray-500">
        {upload.file_metadata.content_type} &bull; {formatFileSize(upload.file_metadata.size)}
        </span>
        <span className="text-[10px] text-gray-600 italic">This page will refresh automatically.</span>
        </div>
      );
    }

    if (
      upload.file_status === 'complete' &&
      upload.result &&
      !upload.result.audio_analysis &&
      !upload.result.image_result &&
      !upload.result.video_analysis
    ) {
      return (
        <div>
        <span className="font-semibold text-red-400">Error:</span>
        <br />
        <span className="text-xs text-red-400">No results available - Processing failed</span>
        </div>
      );
    }

    if (upload.file_status === 'complete') {
      // Image Analysis (standalone, no grid needed)
      if (upload.result?.image_result && upload.file_metadata.content_type.toLowerCase().includes('image')) {
        const label = upload.result.image_result.label_image || 'UNKNOWN';
        return (
          <div className="min-h-full p-3 border border-gray-700/50 rounded-lg bg-gray-900/30 backdrop-blur-sm print-break-inside-avoid">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Image Analysis</h4>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-2 py-0.5 rounded ${label.toLowerCase() === 'real' ? 'bg-green-900/40 text-green-400' : (label.toLowerCase() === 'fake' ? 'bg-red-900/40 text-red-400' : 'bg-gray-800 text-gray-400')}`}>
                  {label.toUpperCase()}
                </span>
              </div>

              {upload.result.image_result.score_image !== undefined && (
                <div className="space-y-1 text-[10px] text-gray-400">
                  <p>Confidence: <span className="text-gray-300">{(upload.result.image_result.score_image * 100).toFixed(2)}%</span></p>
                </div>
              )}
            </div>
          </div>
        );
      }

      const isVideo = upload.file_metadata.content_type.toLowerCase().includes('video');
      const hasVideoAnalysis = isVideo && upload.result?.video_analysis;
      const hasAudioAnalysis = upload.result?.audio_analysis;

      let videoBlock: React.ReactElement | null = null;
      let audioBlock: React.ReactElement | null = null;

      if (hasVideoAnalysis) {
        const heatmapUrls = upload.result!.heatmap_url || upload.result!.heatmap_paths;
        const gs = upload.result?.metadata_analysis?.gemini_summary;
        videoBlock = (
          <div key="video-analysis" className="min-h-full">
            <VideoAnalysisSection 
              data={upload.result!.video_analysis} 
              heatmapUrls={heatmapUrls}
              heatmapAudit={gs ? {
                focusSummary: gs.heatmap_focus_summary,
                attentionQuality: gs.attention_quality,
                auditVerdict: gs.heatmap_audit_verdict,
              } : null}
              forceExpand={forceExpand} 
            />
          </div>
        );
      }

      // Audio Analysis — shown for both audio-only and video+audio (no predicted_class for audio)
      if (hasAudioAnalysis) {
        const a = upload.result!.audio_analysis!;

        // Resilient field extraction with fallbacks for new structure
        const verdict = a.verdict || a.final_audio_verdict || 'UNKNOWN';
        // File-level fused confidences from the detector — do not average windows here.
        const fakeConf = a.fake_confidence ?? a.final_audio_fake_confidence ?? 0;
        const realConf = a.real_confidence ?? a.final_audio_real_confidence ?? 0;
        const procTime = a.processing_time ?? a.audio_prediction_raw?.processing_time ?? 0;
        const avgInf = a.avg_inference_ms ?? a.audio_prediction_raw?.avg_inference_ms ?? 0;
        const duration = a.duration ?? a.audio_prediction_raw?.duration ?? 0;

        const isNoSpeech = verdict === 'ERROR' && typeof a.error === 'string' && a.error.includes('No speech detected');

        audioBlock = (
          <div key="audio-analysis" className="min-h-full p-3 border border-gray-700/50 rounded-lg bg-gray-900/30 backdrop-blur-sm print-break-inside-avoid">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Audio Forensic Analysis</h4>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-2 py-0.5 rounded ${verdict.toLowerCase() === 'real' ? 'bg-green-900/40 text-green-400' : (verdict.toLowerCase() === 'fake' ? 'bg-red-900/40 text-red-400' : 'bg-gray-800 text-gray-400')}`}>
                  {verdict || 'UNKNOWN'}
                </span>
              </div>

              <div className="space-y-1 text-[10px] text-gray-400">
                {isNoSpeech ? (
                  <>
                    <p className="text-yellow-600 italic">
                      The audio track contains no detectable speech and could not be analysed. The file may be silent or contain only background noise.
                    </p>
                    {procTime > 0 && (
                      <p>Processing Time: <span className="text-gray-300">{procTime.toFixed(2)}s</span></p>
                    )}
                  </>
                ) : (
                  <>
                    <p>Fake Confidence: <span className="text-red-300">{(Number(fakeConf) * 100).toFixed(2)}%</span></p>
                    <p>Real Confidence: <span className="text-green-300">{(Number(realConf) * 100).toFixed(2)}%</span></p>
                    <p>Processing Time: <span className="text-gray-300">{procTime > 0 ? procTime.toFixed(2) : 'N/A'}s</span></p>
                    {avgInf > 0 && (
                      <p>Avg Inference: <span className="text-gray-300">{avgInf.toFixed(2)} ms</span></p>
                    )}
                    {duration > 0 && (
                      <p>Audio Duration: <span className="text-gray-300">{duration.toFixed(2)}s</span></p>
                    )}
                    {/* Predicted language hidden from report UI
                    {(a.language_predicted_name || a.audio_prediction_raw?.language_predicted_name) && (
                      <p>Primary Language: <span className="text-blue-300 font-medium capitalize">{a.language_predicted_name || a.audio_prediction_raw?.language_predicted_name}</span>
                      {(a.language_confidence || a.audio_prediction_raw?.language_confidence) && <span className="opacity-60 ml-1">(Conf: {((a.language_confidence || a.audio_prediction_raw?.language_confidence) * 100).toFixed(1)}%)</span>}
                      </p>
                    )}
                    */}
                    {a.error && (
                      <p className="text-red-400 mt-1">Error: {a.error}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Suspicious chunks timeline — handles both performance, performance_metrics, and audio_highlights structures */}
            {((a.performance?.chunking?.enabled || a.performance_metrics?.chunking?.enabled || a.audio_highlights || a.audio_prediction_raw?.highlights) &&
               (a.performance?.chunking?.top_suspicious_chunks || a.suspicious_chunks || a.audio_highlights || a.audio_prediction_raw?.highlights || a.real_window_insights || a.audio_prediction_raw?.real_window_insights)) && (
                <SuspiciousChunksTimeline
                audioWindows={a.audio_windows}
                highlights={a.audio_highlights || a.audio_prediction_raw?.highlights}
                realInsights={a.real_window_insights || a.audio_prediction_raw?.real_window_insights}
                forceExpand={forceExpand}
                />
              )}
          </div>
        );
      }

      const hasMetadata = !!upload.result?.metadata_analysis;
      const obviousData = resolveObviousDeepfake(upload.result);
      const showPerceptual = !!obviousData;
      const gridClass = showPerceptual
        ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6'
        : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6';
      const geminiSummary = upload.result?.metadata_analysis?.gemini_summary;
      const forensicExplanation =
        geminiSummary?.forensic_trail_explanation &&
        geminiSummary.forensic_trail_explanation !== 'N/A'
          ? String(geminiSummary.forensic_trail_explanation)
          : null;

      return (
        <div className="flex flex-col gap-6 w-full">
          {forensicExplanation && (
            <ForensicExplanationBlock
              explanation={forensicExplanation}
            />
          )}
          <div className={gridClass}>
            {showPerceptual && (
              <div key="perceptual-screening" className="min-h-full">
                <ObviousDeepfakeSection data={obviousData!} forceExpand={forceExpand} />
              </div>
            )}
            {videoBlock}
            {audioBlock}
            {hasMetadata && (
              <div key="metadata-analysis" className="min-h-full">
                <MetadataSection data={upload.result!.metadata_analysis} forceExpand={forceExpand} />
              </div>
            )}
          </div>
        </div>
      );
    }

    return <span>-</span>;
  };

  // Calculate summary stats
  const fileUploads = data || [];
  let totalReal = 0, totalFake = 0;

  if (fileUploads.length > 0) {
    fileUploads.forEach(upload => {
      const { result } = upload;
      if (result) {
        if (result.image_result && result.image_result.label_image) {
          if (result.image_result.label_image.toLowerCase() === "real") totalReal++;
          if (result.image_result.label_image.toLowerCase() === "fake") totalFake++;
        }
        const audioVerdict = result.audio_analysis?.verdict || result.audio_analysis?.final_audio_verdict;
        if (audioVerdict) {
          if (audioVerdict.toLowerCase() === "real") totalReal++;
          if (audioVerdict.toLowerCase() === "fake") totalFake++;
        }
        if (result.video_analysis && result.video_analysis.verdict) {
          if (result.video_analysis.verdict.toLowerCase() === "real") totalReal++;
          if (result.video_analysis.verdict.toLowerCase() === "fake") totalFake++;
        }
      }
    });
  }


  useEffect(() => {
    console.log('Data state updated:', data);
    console.log('Error state updated:', error);
    console.log('Loading state updated:', loading);
  }, [data, error, loading]);

  return (
    <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="w-full h-full"
    >
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        body {
          background-color: #030712 !important;
        }
        .no-print {
          display: none !important;
        }
        .print-break-inside-avoid {
          break-inside: avoid !important;
        }
        * {
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      }
    ` }} />

    <div className="w-full h-full">
    <div className="flex flex-col gap-2 h-full py-1">
    {/* Summary Section */}
    {fileUploads.length > 0 ? (
      <div className="flex flex-row flex-wrap items-center justify-between gap-4 py-2 px-1 mb-2 w-full">
      {/* Upload ID left */}
      <div className="flex flex-col items-start min-w-[120px] flex-1">
      <span className="text-xs text-gray-400">Upload ID</span>
      <span className="text-lg font-bold font-mono text-blue-400 break-all max-w-[320px] tracking-wide leading-tight select-all">
      {uploadId}
      </span>
      </div>
      {/* Center: Real/Fake */}
      <div className="flex flex-row items-center gap-8 flex-1 justify-center">
      <div className="flex flex-col items-center min-w-[80px]">
      <span className="text-xs text-gray-400">Total Real Uploads</span>
      <span className="text-lg font-bold text-green-400">{totalReal}</span>
      </div>
      <div className="w-px h-6 bg-gray-700 mx-2" />
      <div className="flex flex-col items-center min-w-[80px]">
      <span className="text-xs text-gray-400">Total Fake Uploads</span>
      <span className="text-lg font-bold text-red-400">{totalFake}</span>
      </div>
      </div>
      {/* Actions right */}
      <div className="flex flex-row items-center gap-2 min-w-[160px] flex-1 justify-end no-print">
      <button
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-blue-900/20"
      onClick={handleExport}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
      </button>

      <button
      className="text-blue-400 hover:text-blue-300 transition-all duration-200 text-sm p-2 rounded-full"
      onClick={handleBackToReport}
      aria-label="Back"
      >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      </button>
      </div>
      </div>
    ) : (
      <div className="flex flex-col justify-center items-center h-40 gap-2">
      <span className="text-gray-400 text-lg">No results available</span>
      {error && (
        <span className="text-red-400 text-sm text-center px-4">{error}</span>
      )}
      </div>
    )}

    {/* Only render table/cards if there are files */}
    {fileUploads.length > 0 && (
      <>
      {/* Error Message */}
      {error && (
        <div className="text-red-400 text-sm text-center">{error}</div>
      )}

      {/* Loading State */}
      {loading && (
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="text-center text-gray-400 p-6"
        >
        <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="inline-block w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full"
        />
        <span className="ml-2">Loading...</span>
        </motion.div>
      )}

      {/* Table */}
      {!loading && !error && (
        <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex-1 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 min-h-0"
        >
        <div className="h-full overflow-hidden rounded-2xl">
        <div className="h-full overflow-y-auto">
        {/* Desktop List View */}
        <div className="hidden md:block p-6">
        <div className="space-y-8">
        {data.map((upload, index) => (
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          key={index}
          className="bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-700/50 overflow-hidden shadow-xl"
          >
          {/* Top Line: Filename & Status */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-800/60 border-b border-gray-700/50">
          <div className="flex items-center gap-4 min-w-0">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">File Info</span>
          <div className="h-4 w-px bg-gray-700" />
          <span className="text-sm font-bold text-blue-400 truncate max-w-2xl">{upload.file_metadata.filename}</span>
          <span className="text-[10px] text-gray-500 font-mono">({formatFileSize(upload.file_metadata.size)})</span>
          </div>

          <div className="flex items-center gap-6 flex-shrink-0">
          <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</span>
          <motion.span
          whileHover={{ scale: 1.05 }}
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            upload.file_status === 'complete'
            ? 'bg-green-900/40 text-green-400 border border-green-700/30'
            : upload.file_status === 'pending'
            ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/30'
            : upload.file_status === 'processing'
            ? 'bg-blue-900/40 text-blue-400 border border-blue-700/30'
            : 'bg-red-900/40 text-red-400 border border-red-700/30'
          }`}
          >
          {upload.file_status}
          </motion.span>
          </div>
          </div>
          </div>

          {/* Result Content */}
          <div className="p-6">
          {formatResult(upload, isPrinting)}
          </div>
          </motion.div>
        ))}
        </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden w-full">
        <div className="space-y-4 p-2 w-full">
        {data.map((upload, index) => (
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          key={index}
          className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 w-full overflow-x-auto"
          >
          {/* Filename */}
          <div className="mb-3">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
          Filename
          </div>
          <div className="text-sm font-medium text-gray-300 break-all">
          {upload.file_metadata.filename}
          </div>
          </div>

          {/* File Status */}
          <div className="mb-3">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
          File Status
          </div>
          <motion.span
          whileHover={{ scale: 1.05 }}
          className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${
            upload.file_status === 'complete'
            ? 'bg-green-900/50 text-green-400'
            : upload.file_status === 'pending'
            ? 'bg-yellow-900/50 text-yellow-400'
            : upload.file_status === 'processing'
            ? 'bg-blue-900/50 text-blue-400'
            : 'bg-red-900/50 text-red-400'
          }`}
          >
          {upload.file_status}
          </motion.span>
          </div>

          {/* Result */}
          <div className="mt-2">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
          Result
          </div>
          <div className="mt-1">
          {formatResult(upload, isPrinting)}
          </div>
          </div>
          </motion.div>
        ))}
        </div>
        </div>
        </div>
        </div>
        </motion.div>
      )}

      {/* Heatmap Modal */}
      {/* {selectedHeatmap && selectedHeatmap.result && (
        // <AnalysisModal />
        <Modal
        isOpen={!!selectedHeatmap}
        onClose={closeHeatmapModal}
        images={selectedHeatmap.result.heatmap_url}
        label_audio={contentType === 'audio' || contentType === 'video' ? selectedHeatmap.result.audio_analysis?.verdict || '' : ''}
        score_audio={contentType === 'audio' || contentType === 'video' ? selectedHeatmap.result.audio_analysis?.score_audio || 0 : 0}
        label_image={contentType === 'image' ? (selectedHeatmap.result.image_result?.label_image || '') : ''}
        score_image={contentType === 'image' ? (selectedHeatmap.result.image_result?.score_image || 0) : 0}
        label_video={contentType === 'video' ? (selectedHeatmap.result.video_analysis?.predicted_class || '') : ''}
        score_video={contentType === 'video' ? (selectedHeathetmap.result.video_analysis?.score_video || 0) : 0}
        />
    )} */}
    </>
    )}
    </div>
    </div>
    </motion.div>
  );
};

export default ReportDetail;