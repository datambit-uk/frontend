import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiCall } from "../api/api";
import { motion } from 'framer-motion';

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
  predicted_class_idx?: number;
  score_video?: number;
  num_windows?: number;
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

const MetadataSection: React.FC<{ data: any }> = ({ data: initialData }) => {
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

  // Helper mappings for the new forensic_analysis structure
  const forensic = data.forensic_analysis || {};
  const hwSw = forensic.hardware_software_analysis || {};
  const matrix = forensic.matrix_analysis || {};
  const bitrate = forensic.bitrate_analysis || {};
  const fps = forensic.fps_analysis || {};

  const likelySource = data.forensic_summary?.likely_source || data.source_analysis?.likely_source || hwSw.likely_source || null;
  const hwSwConfidence = data.confidence || data.forensic_summary?.hw_sw_confidence || data.source_analysis?.confidence || hwSw.confidence || 0;

  return (
    <div className="h-full p-3 border border-gray-700/50 rounded-lg bg-gray-900/30 backdrop-blur-sm">
    <div className="flex justify-between items-center mb-2">
    <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider">Metadata Analysis</h4>
    <button
    onClick={() => setIsExpanded(!isExpanded)}
    className="text-[10px] bg-gray-800 hover:bg-gray-700 text-blue-400 px-2 py-1 rounded border border-gray-700 transition-all flex items-center gap-1"
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
    </div>

    <div className="space-y-2">
    <div className="flex items-center gap-2">
    <span className={`text-xs font-black px-2 py-0.5 rounded ${verdict === 'SUSPICIOUS' ? 'bg-yellow-900/40 text-yellow-400' : (verdict === 'CLEAN' ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-400')}`}>
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

    {anomalies.length > 0 && (
      <div className="text-[10px] bg-yellow-900/10 border border-yellow-700/20 rounded p-1.5">
      <div className="flex items-center gap-1 text-yellow-500 font-bold mb-1 uppercase text-[9px]">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Detected Anomalies ({anomalies.length})
      </div>
      <ul className="list-disc list-inside text-gray-400 space-y-0.5">
      {anomalies.slice(0, isExpanded ? undefined : 2).map((a: string, i: number) => (
        <li key={i} className="leading-tight">{a}</li>
      ))}
      {!isExpanded && anomalies.length > 2 && <li className="list-none text-blue-400 mt-0.5 font-medium">+ {anomalies.length - 2} more...</li>}
      </ul>
      </div>
    )}
    </div>

    {isExpanded && (
      <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-4 pt-3 border-t border-gray-700/50"
      >
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

const SuspiciousChunksTimeline: React.FC<{ 
  chunks: SuspiciousChunk[]; 
  duration: number;
  audioWindows?: AudioWindow[];
  highlights?: AudioHighlights;
}> = ({ chunks, duration, audioWindows, highlights }) => {
  const totalDuration = duration > 0 ? duration : (chunks.length > 0 ? Math.max(...chunks.map(c => c.end_sec)) : 0);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const primary = highlights?.primary_alert;
  const technical = highlights?.technical_proof;

  // Fallback to top chunk if no highlights
  const topChunk = chunks.find(c => c.rank === 1) || chunks[0];
  
  const rationaleWindows = audioWindows?.filter(w => w.rationale) || [];
  const topImportanceWindow = rationaleWindows.length > 0 
    ? rationaleWindows.reduce((prev, curr) => (curr.importance || 0) > (prev.importance || 0) ? curr : prev)
    : undefined;

  if (!primary && !technical && (!chunks || chunks.length === 0)) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-700/40">
    <p className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    Analysis Highlights
    </p>
    
    {/* Timeline bar */}
    <div className="relative h-7 bg-gray-700/40 rounded-full overflow-hidden mb-3">
    {primary && (
      <div
      className="absolute top-0 h-full flex items-center justify-center border-r border-black/20"
      style={{
        left: `${(primary.start_sec / totalDuration) * 100}%`,
        width: `${((primary.end_sec - primary.start_sec) / totalDuration) * 100}%`,
        backgroundColor: '#dc2626',
        opacity: 0.8,
        zIndex: 2,
      }}
      title={`Crucial Window: ${formatTime(primary.start_sec)}–${formatTime(primary.end_sec)}`}
      >
      <span className="text-[8px] font-black text-white uppercase px-1">Requires Immediate Review</span>
      </div>
    )}
    {technical && (
      <div
      className="absolute top-0 h-full flex items-center justify-center opacity-60"
      style={{
        left: `${(technical.start_sec / totalDuration) * 100}%`,
        width: `${((technical.end_sec - technical.start_sec) / totalDuration) * 100}%`,
        backgroundColor: '#7c3aed',
        zIndex: 1,
      }}
      title={`Forensic Proof: ${formatTime(technical.start_sec)}–${formatTime(technical.end_sec)}`}
      >
      {/* If it doesn't overlap perfectly with primary, show a label */}
      {(!primary || primary.start_sec !== technical.start_sec) && (
        <span className="text-[8px] font-black text-white uppercase px-1">Proof</span>
      )}
      </div>
    )}
    {!primary && !technical && topChunk && (
      <div
      className="absolute top-0 h-full flex items-center justify-center"
      style={{
        left: `${(topChunk.start_sec / totalDuration) * 100}%`,
        width: `${((topChunk.end_sec - topChunk.start_sec) / totalDuration) * 100}%`,
        backgroundColor: '#dc2626',
        opacity: 0.8,
      }}
      >
      <span className="text-[9px] font-bold text-white drop-shadow">1</span>
      </div>
    )}
    {/* Start / end labels */}
    <span className="absolute left-1 bottom-0.5 text-[8px] text-gray-400 font-mono leading-none">0:00</span>
    <span className="absolute right-1 bottom-0.5 text-[8px] text-gray-400 font-mono leading-none">{formatTime(totalDuration)}</span>
    </div>

    {/* Details Cards */}
    <div className="space-y-3">
    {/* 1. Primary Alert */}
    {primary && (
      <div className="border rounded-lg p-3 bg-red-950/10 border-red-600/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black rounded uppercase tracking-tighter">Primary Alert</span>
            <span className="text-[11px] font-mono font-bold text-red-400">
              {formatTime(primary.start_sec)} – {formatTime(primary.end_sec)}
            </span>
          </div>
          {primary.fake_confidence !== undefined && (
            <span className="text-[10px] text-gray-400">
              Confidence: <span className="font-bold text-red-400">{(primary.fake_confidence * 100).toFixed(1)}%</span>
            </span>
          )}
        </div>

        <div className="space-y-2 mt-2 pt-2 border-t border-gray-700/30">
          {primary.importance_rationale && (
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Forensic Rationale</p>
              <p className="text-[10px] text-gray-400 leading-tight">
                {primary.importance_rationale}
              </p>
            </div>
          )}
        </div>
      </div>
    )}

    {/* 2. Technical Proof */}
    {technical && (
      <div className="border rounded-lg p-3 bg-purple-950/10 border-purple-600/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-600 text-white text-[9px] font-black rounded uppercase tracking-tighter">Technical Proof</span>
            <span className="text-[11px] font-mono font-bold text-purple-400">
              {formatTime(technical.start_sec)} – {formatTime(technical.end_sec)}
            </span>
          </div>
          {technical.fake_confidence !== undefined && (
            <span className="text-[10px] text-gray-400">
              Confidence: <span className="font-bold text-purple-400">{(technical.fake_confidence * 100).toFixed(1)}%</span>
            </span>
          )}
        </div>

        <div className="space-y-2 mt-2 pt-2 border-t border-gray-700/30">
          {technical.transcription && (
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Transcript</p>
              <p className="text-[11px] text-gray-300 italic leading-relaxed bg-black/20 p-2 rounded border border-gray-800/30">
                "{technical.transcription}"
              </p>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Fallback to Top Suspicious Chunk if no highlights */}
    {!primary && !technical && topChunk && (
      <div className="border rounded-lg p-3 bg-red-950/10 border-red-600/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center text-white bg-red-600">1</span>
            <span className="text-[11px] font-mono font-bold text-red-400">
              {formatTime(topChunk.start_sec)} – {formatTime(topChunk.end_sec)}
            </span>
          </div>
          <span className="text-[10px] text-gray-400">
            Top Suspicious: <span className="font-bold text-red-400">{(topChunk.fake_confidence * 100).toFixed(1)}%</span>
          </span>
        </div>
        {audioWindows?.find(w => w.chunk_index === topChunk.chunk_index) && (() => {
          const w = audioWindows.find(win => win.chunk_index === topChunk.chunk_index);
          return (
            <div className="mt-2 pt-2 border-t border-gray-700/30">
              {w?.transcription && (
                <div className="mb-2">
                  <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Transcript</p>
                  <p className="text-[11px] text-gray-300 italic bg-black/20 p-2 rounded border border-gray-800/30">"{w.transcription}"</p>
                </div>
              )}
              {w?.rationale && (
                <div>
                  <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Rationale</p>
                  <p className="text-[10px] text-gray-400">{w.rationale}</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    )}

    {/* Importance Rationale (Key Forensic Rationale) - Keep this as additional context if available */}
    {topImportanceWindow && (!primary || topImportanceWindow.start_sec !== primary.start_sec) && (!technical || topImportanceWindow.start_sec !== technical.start_sec) && (!topChunk || topImportanceWindow.chunk_index !== topChunk.chunk_index) && (
        <div className="border border-orange-700/40 rounded-lg p-3 bg-orange-950/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider">Additional Forensic Insight</span>
            <span className="text-[10px] text-orange-400 font-bold">Importance: {topImportanceWindow.importance?.toFixed(2)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-orange-700/20">
            <p className="text-[10px] text-gray-400 leading-tight">{topImportanceWindow.rationale}</p>
          </div>
        </div>
    )}
    </div>
    </div>
  );
};

const HeatmapSection: React.FC<{ urls: string[] | null | undefined }> = ({ urls }) => {
  if (!urls || urls.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-gray-700/50">
    <div className="flex items-center gap-2 mb-3">
    <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Heatmap</h4>
    <span className="text-[10px] bg-orange-900/30 text-orange-300 px-1.5 py-0.5 rounded border border-orange-700/30">Deleted after 30 days</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {urls.map((url, i) => {
      const isVideo = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm') || url.includes('video');
      return (
        <div key={i} className="relative group bg-black/40 rounded-xl overflow-hidden border border-gray-700/50 hover:border-blue-500/50 transition-all shadow-2xl">
        {isVideo ? (
          <video
          src={url}
          controls
          className="w-full aspect-video object-cover"
          muted
          loop
          />
        ) : (
          <img src={url} alt={`Forensic analysis ${i+1}`} className="w-full aspect-video object-cover" />
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 bg-gray-900/90 rounded-lg text-blue-400 hover:text-blue-300 border border-gray-700 shadow-xl"
        title="Open original"
        >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        </a>
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <span className="text-[9px] text-gray-300 font-medium truncate block">Source: forensic_node_{i+1}</span>
        </div>
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
  const pollingInterval = useRef<number | null>(null);
  const POLL_INTERVAL = 10000; // 10 seconds
  const navigate = useNavigate();

  const handleBackToReport = () => {
    navigate(-1);
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

      const url = `/api/v2/report/${uploadId}`;

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
              upload.result?.video_analysis
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

  const formatResult = (upload: FileUpload) => {
    // Helper function to get label color
    const getLabelColor = (label: string | undefined | null) => {
      if (!label) return 'text-gray-400';
      const lowerLabel = label.toLowerCase();
      if (lowerLabel === 'real') return 'text-green-400';
      if (lowerLabel === 'fake') return 'text-red-400';
      return 'text-gray-400';
    };

    const capitalizeFirst = (str: string | undefined | null) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const formatClassName = (cls: string | undefined | null) => {
      if (!cls) return 'N/A';
      return cls.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

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
        return (
          <div className="p-3 border border-gray-700 rounded-lg bg-gray-800/40">
          <h4 className="text-sm font-semibold text-orange-300 mb-1">Image Analysis</h4>
          <p className="text-xs text-gray-400">
          Verdict:{' '}
          <span className={getLabelColor(upload.result.image_result.label_image)}>
          {capitalizeFirst(upload.result.image_result.label_image)}
          </span>
          </p>
          </div>
        );
      }

      const isVideo = upload.file_metadata.content_type.toLowerCase().includes('video');
      const hasVideoAnalysis = isVideo && upload.result?.video_analysis;
      const hasAudioAnalysis = upload.result?.audio_analysis;

      let videoBlock: React.ReactElement | null = null;
      let audioBlock: React.ReactElement | null = null;

      if (hasVideoAnalysis) {
        const v = upload.result!.video_analysis!;
        const syntheticScore = (v.class_confidences && typeof v.class_confidences === 'object')
        ? Object.entries(v.class_confidences)
        .filter(([cls]) => cls.toLowerCase() !== 'real')
        .reduce((sum, [_, score]) => sum + (score as number), 0)
        : v.fake_confidence;

        videoBlock = (
          <div key="video-analysis" className="p-3 border border-gray-700 rounded-lg bg-gray-800/40">
          <h4 className="text-sm font-semibold text-blue-300 mb-1">Video Analysis:</h4>
          <p className="text-xs text-gray-400">
          Verdict:{' '}
          <span className={getLabelColor(v.verdict)}>{capitalizeFirst(v.verdict)}</span>
          </p>
          <p className="text-xs text-gray-400">
          Predicted Class: <span className="text-gray-300">{formatClassName(v.predicted_class)}</span>
          </p>
          <p className="text-xs text-gray-400">
          Fake Confidence: <span className="text-red-300">{(syntheticScore * 100).toFixed(2)}%</span>
          </p>
          <p className="text-xs text-gray-400">
          Real Confidence: <span className="text-green-300">{(v.real_confidence * 100).toFixed(2)}%</span>
          </p>
          <p className="text-xs text-gray-400">
          Processing Time: <span className="text-gray-300">{v.processing_time?.toFixed(2) ?? 'N/A'}s</span>
          </p>
          <p className="text-xs text-gray-400">
          Avg Inference: <span className="text-gray-300">{v.avg_inference_ms?.toFixed(2) ?? 'N/A'} ms</span>
          </p>
          {v.frames_analyzed !== undefined && (
            <p className="text-xs text-gray-400">
            Frames Analyzed: <span className="text-gray-300">{v.frames_analyzed}</span>
            </p>
          )}
          {v.num_windows !== undefined && (
            <p className="text-xs text-gray-400">
            Windows: <span className="text-gray-300">{v.num_windows}</span>
            </p>
          )}
          </div>
        );
      }

      // Audio Analysis — shown for both audio-only and video+audio (no predicted_class for audio)
      if (hasAudioAnalysis) {
        const a = upload.result!.audio_analysis!;

        // Resilient field extraction with fallbacks for new structure
        const verdict = a.verdict || a.final_audio_verdict || 'UNKNOWN';
        const fakeConf = a.fake_confidence ?? a.final_audio_fake_confidence ?? 0;
        const realConf = a.real_confidence ?? a.final_audio_real_confidence ?? 0;
        const procTime = a.processing_time ?? a.audio_prediction_raw?.processing_time ?? 0;
        const avgInf = a.avg_inference_ms ?? a.audio_prediction_raw?.avg_inference_ms ?? 0;
        const duration = a.duration ?? a.audio_prediction_raw?.duration ?? 0;

        const avgFakeConfidence = a.audio_windows && a.audio_windows.length > 0
          ? a.audio_windows.reduce((sum, w) => sum + w.fake_confidence, 0) / a.audio_windows.length
          : fakeConf;
        const avgRealConfidence = a.audio_windows && a.audio_windows.length > 0
          ? a.audio_windows.reduce((sum, w) => sum + w.real_confidence, 0) / a.audio_windows.length
          : realConf;

        const isNoSpeech = verdict === 'ERROR' && typeof a.error === 'string' && a.error.includes('No speech detected');

        audioBlock = (
          <div key="audio-analysis" className="p-3 border border-gray-700 rounded-lg bg-gray-800/40">
          <h4 className="text-sm font-semibold text-purple-300 mb-1">Audio Analysis:</h4>

          {isNoSpeech ? (
            <>
            <p className="text-xs text-gray-400">
            Verdict:{' '}
            <span className="text-yellow-400">No Speech Detected</span>
            </p>
            <p className="text-xs text-yellow-600 mt-1">
            The audio track contains no detectable speech and could not be analysed. The file may be silent or contain only background noise.
            </p>
            {procTime > 0 && (
              <p className="text-xs text-gray-400 mt-1">
              Processing Time: <span className="text-gray-300">{procTime.toFixed(2)}s</span>
              </p>
            )}
            </>
          ) : (
            <>
            <p className="text-xs text-gray-400">
            Verdict:{' '}
            <span className={getLabelColor(verdict)}>{capitalizeFirst(verdict)}</span>
            </p>
            <p className="text-xs text-gray-400">
            Fake Confidence: <span className="text-red-300">{(avgFakeConfidence * 100).toFixed(2)}%</span>
            </p>
            <p className="text-xs text-gray-400">
            Real Confidence: <span className="text-green-300">{(avgRealConfidence * 100).toFixed(2)}%</span>
            </p>
            <p className="text-xs text-gray-400">
            Processing Time: <span className="text-gray-300">{procTime > 0 ? procTime.toFixed(2) : 'N/A'}s</span>
            </p>
            {avgInf > 0 && (
              <p className="text-xs text-gray-400">
              Avg Inference: <span className="text-gray-300">{avgInf.toFixed(2)} ms</span>
              </p>
            )}
            {duration > 0 && (
              <p className="text-xs text-gray-400">
              Audio Duration: <span className="text-gray-300">{duration.toFixed(2)}s</span>
              </p>
            )}
            {(a.language_predicted_name || a.audio_prediction_raw?.language_predicted_name) && (
              <p className="text-xs text-gray-400">
              Primary Language: <span className="text-blue-300 font-medium capitalize">{a.language_predicted_name || a.audio_prediction_raw?.language_predicted_name}</span>
              {(a.language_confidence || a.audio_prediction_raw?.language_confidence) && <span className="opacity-60 ml-1">(Conf: {((a.language_confidence || a.audio_prediction_raw?.language_confidence) * 100).toFixed(1)}%)</span>}
              </p>
            )}
            {a.error && (
              <p className="text-xs text-red-400 mt-1">
              Error: {a.error}
              </p>
            )}
            {/* Suspicious chunks timeline — handles both performance, performance_metrics, and audio_highlights structures */}
            {((a.performance?.chunking?.enabled || a.performance_metrics?.chunking?.enabled || a.audio_highlights || a.audio_prediction_raw?.highlights) &&
               (a.performance?.chunking?.top_suspicious_chunks || a.suspicious_chunks || a.audio_highlights || a.audio_prediction_raw?.highlights)) && (
                <SuspiciousChunksTimeline
                chunks={a.performance?.chunking?.top_suspicious_chunks || a.suspicious_chunks || []}
                duration={duration}
                audioWindows={a.audio_windows}
                highlights={a.audio_highlights || a.audio_prediction_raw?.highlights}
                />
              )}
              </>
          )}
          </div>
        );
      }

      const hasMetadata = !!upload.result?.metadata_analysis;

      return (
        <div className="flex flex-col gap-6">

        {/* Main layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videoBlock}
        {audioBlock}
        {hasMetadata && (
          <div className="h-full">
          <MetadataSection data={upload.result!.metadata_analysis} />
          </div>
        )}
        </div>

        {/* Heatmaps BELOW */}
        {(upload.result?.heatmap_url || upload.result?.heatmap_paths) && (
          <HeatmapSection urls={upload.result.heatmap_url || upload.result.heatmap_paths} />
        )}

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
      {/* Back Button right */}
      <div className="flex flex-col items-end min-w-[60px] flex-1 justify-center">
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
      <div className="flex justify-center items-center h-40">
      <span className="text-gray-400 text-lg">No results available</span>
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
          {formatResult(upload)}
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
          <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
          Result
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
