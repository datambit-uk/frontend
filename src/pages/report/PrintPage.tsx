import React from 'react';
import {
  formatBytes,
  normalizeImage,
  normalizeVideo,
  normalizeAudio,
  normalizeMetadata,
} from './reportNormalize';
import {
  PrintImageSection,
  PrintVideoSection,
  PrintAudioSection,
  PrintMetadataSection,
  PrintObviousDeepfakeSection,
} from './printSections';

export interface ReportFile {
  file_metadata: { filename: string; size: number; content_type: string };
  file_status: string;
  result: any | null;
}

function normalizeObvious(r: any): {
  verdict: string;
  confidencePct: number | null;
  rationale: string;
  reasons: string[];
  isObvious: boolean;
} | null {
  const raw =
    r?.obvious_deepfake_analysis ||
    r?.video_analysis?.obvious_deepfake_analysis ||
    r?.audio_analysis?.obvious_deepfake_analysis;
  if (!raw || typeof raw !== 'object') return null;
  if (raw.skipped || String(raw.verdict || '').toUpperCase() === 'SKIPPED') return null;
  const verdict = String(raw.verdict || 'UNKNOWN').toUpperCase();
  const isObvious = !!raw.is_obvious_deepfake || verdict === 'OBVIOUS_FAKE';
  const conf = raw.confidence != null && Number.isFinite(Number(raw.confidence))
    ? Number(raw.confidence) * 100
    : null;
  const reasons = Array.isArray(raw.reasons)
    ? raw.reasons.map((x: any) => String(x || '').trim()).filter(Boolean)
    : [];
  return {
    verdict: isObvious ? 'OBVIOUS DEEPFAKE' : verdict === 'NOT_OBVIOUS' ? 'NOT OBVIOUS' : verdict,
    confidencePct: conf,
    rationale: String(raw.rationale || '').trim(),
    reasons,
    isObvious,
  };
}

export const PrintPage: React.FC<{ file: ReportFile; uploadId: string }> = ({ file, uploadId }) => {
  const r = file.result;
  const ct = (file.file_metadata.content_type || '').toLowerCase();

  const image = r?.image_result && ct.includes('image') ? normalizeImage(r.image_result) : null;
  const metadata = !image && r?.metadata_analysis ? normalizeMetadata(r.metadata_analysis) : null;
  const video =
    ct.includes('video') && r?.video_analysis
      ? normalizeVideo(r.video_analysis, r?.metadata_analysis?.gemini_summary)
      : null;
  // Image files show only the image section on screen (ReportDetail returns early),
  // so suppress audio/metadata here to keep the PDF consistent with the dashboard.
  const audio = !image && r?.audio_analysis ? normalizeAudio(r.audio_analysis) : null;
  const obvious = !image ? normalizeObvious(r) : null;

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#111827', padding: 2 }}>
      {/* Header band */}
      <div style={{ borderBottom: '2px solid #111827', paddingBottom: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
            Shield Core — Deepfake Analysis Report
          </h1>
          <span style={{ fontSize: 9, color: '#6b7280' }}>
            Generated {new Date().toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 10, color: '#374151', marginTop: 6 }}>
          <span>
            <strong>Upload ID:</strong> {uploadId}
          </span>
          <span>
            <strong>File:</strong> {file.file_metadata.filename}
          </span>
          <span>
            <strong>Size:</strong> {formatBytes(file.file_metadata.size)}
          </span>
          <span>
            <strong>Type:</strong> {file.file_metadata.content_type}
          </span>
          <span>
            <strong>Status:</strong> {file.file_status}
          </span>
        </div>
      </div>

      {metadata?.forensicExplanation && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            border: '1px solid #93c5fd',
            borderRadius: 6,
            background: '#eff6ff',
            breakInside: 'auto',
          }}
        >
          <h4
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#2563eb',
              margin: '0 0 6px',
            }}
          >
            Full Evidence Explanation
          </h4>
          <p style={{ fontSize: 9.5, color: '#1f2937', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {metadata.forensicExplanation}
          </p>
        </div>
      )}

      {/* Section grid — video/audio/image verdicts are shown per section, not as one headline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
        {obvious && <PrintObviousDeepfakeSection data={obvious} />}
        {image && <PrintImageSection data={image} />}
        {video && <PrintVideoSection data={video} />}
        {audio && <PrintAudioSection data={audio} />}
        {metadata && <PrintMetadataSection data={metadata} omitForensicExplanation />}
      </div>
    </div>
  );
};
