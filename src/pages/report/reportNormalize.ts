// Pure, framework-free normalization for the printable report.
// Mirrors the fallback logic used by the on-screen ReportDetail sections so
// both surfaces agree on verdicts and confidences.
//
// ACCEPTED DEBT: the spec called for this to be the single source consumed by
// BOTH the screen and print paths, but the on-screen sections
// (MetadataSection / VideoAnalysisSection / the inline audio block in
// ReportDetail.tsx) still compute their own normalization. This module is
// currently a faithful *mirror*, not the shared source. If you change verdict
// or confidence logic in either place, update the other to match. Follow-up:
// refactor those on-screen sections to consume these helpers.

export interface FlaggedSegment {
  startSec: number;
  endSec: number;
  verdict: string;
  rationale?: string;
  transcription?: string;
  importanceLabel?: string;
  importanceScorePct?: number | null;
}

export interface NormalizedImage {
  label: string;
  confidencePct: number | null;
}

export interface NormalizedVideo {
  verdict: string;
  predictedClass: string;
  fakePct: number;
  realPct: number;
  processingTime: number | null;
  framesAnalyzed: number | null;
  facesDetected: number | null;
  avgInferenceMs: number | null;
  classScores: { name: string; score: number }[];
}

export interface NormalizedAudio {
  verdict: string;
  isNoSpeech: boolean;
  fakePct: number;
  realPct: number;
  processingTime: number | null;
  avgInferenceMs: number | null;
  duration: number | null;
  language: string | null;
  languageConfidencePct: number | null;
  error: string | null;
  flaggedSegments: FlaggedSegment[];
}

export interface NormalizedMetadata {
  verdict: string;
  score: number | null;
  likelySource: string | null;
  sourceConfidence: number | null;
  anomalies: string[];
  inconsistencies: string[];
  fileSize: string | null;
  fileType: string | null;
  fileHash: string | null;
  /** Gemini / forensic prose blocks (Matrix, Bitrate, FPS, Atoms, …). */
  summaries: { label: string; value: string }[];
  forensicExplanation: string | null;
  neuralAlignment: string | null;
  keyFindings: string[];
}

const titleCase = (s: string): string =>
  String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const num = (x: any): number | null =>
  typeof x === 'number' && !Number.isNaN(x) ? x : null;

export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

export function normalizeImage(img: any): NormalizedImage {
  return {
    label: String(img?.label_image || 'UNKNOWN').toUpperCase(),
    confidencePct: img?.score_image !== undefined ? Number(img.score_image) * 100 : null,
  };
}

export function normalizeVideo(v: any): NormalizedVideo {
  // Detector emits class_scores; class_confidences is the legacy / DB column name.
  const rawScores = v?.class_scores ?? v?.class_confidences;
  const classScores = rawScores
    ? Object.entries(rawScores).map(([name, score]) => ({
        name: titleCase(name),
        score: Number(score),
      }))
    : [];
  return {
    verdict: String(v?.verdict || 'UNKNOWN').toUpperCase(),
    predictedClass: v?.predicted_class ? titleCase(v.predicted_class) : 'N/A',
    fakePct: Number(v?.fake_confidence ?? 0) * 100,
    realPct: Number(v?.real_confidence ?? 0) * 100,
    processingTime: num(v?.processing_time),
    framesAnalyzed: num(v?.frames_analyzed),
    facesDetected: num(v?.faces_detected),
    avgInferenceMs: num(v?.avg_inference_ms),
    classScores,
  };
}

export function normalizeAudio(a: any): NormalizedAudio {
  const verdict = String(a?.verdict || a?.final_audio_verdict || 'UNKNOWN').toUpperCase();
  // File-level fused confidences from the detector — do not average windows here.
  const fakeConf = Number(a?.fake_confidence ?? a?.final_audio_fake_confidence ?? 0);
  const realConf = Number(a?.real_confidence ?? a?.final_audio_real_confidence ?? 0);
  const raw = a?.audio_prediction_raw || {};
  const language = a?.language_predicted_name || raw.language_predicted_name || null;
  const langConf = a?.language_confidence ?? raw.language_confidence ?? null;
  const isNoSpeech =
    verdict === 'ERROR' && typeof a?.error === 'string' && a.error.includes('No speech detected');

  const segments: FlaggedSegment[] = [];
  const highlights = a?.audio_highlights || raw.highlights || {};
  const pushSegment = (h: any, defaultVerdict: string) => {
    if (!h || (h.start_sec === undefined && h.end_sec === undefined)) return;
    const importanceScore =
      h.importance_score !== undefined && h.importance_score !== null
        ? Number(h.importance_score) * 100
        : null;
    segments.push({
      startSec: Number(h.start_sec ?? 0),
      endSec: Number(h.end_sec ?? 0),
      verdict: String(h.verdict || defaultVerdict).toUpperCase(),
      rationale: h.importance_rationale || h.rationale,
      transcription: h.transcription,
      importanceLabel: h.importance_label || undefined,
      importanceScorePct: importanceScore,
    });
  };
  pushSegment(highlights.primary_alert, 'FAKE');
  pushSegment(highlights.technical_proof, 'FAKE');
  const insights = a?.real_window_insights || raw.real_window_insights || [];
  (Array.isArray(insights) ? insights : []).slice(0, 2).forEach((i: any) =>
    pushSegment(i, 'REAL')
  );

  return {
    verdict,
    isNoSpeech,
    fakePct: fakeConf * 100,
    realPct: realConf * 100,
    processingTime: num(a?.processing_time ?? raw.processing_time),
    avgInferenceMs: num(a?.avg_inference_ms ?? raw.avg_inference_ms),
    duration: num(a?.duration ?? raw.duration),
    language: language ? String(language) : null,
    languageConfidencePct: langConf != null ? Number(langConf) * 100 : null,
    error: a?.error ?? null,
    flaggedSegments: segments,
  };
}

export function normalizeMetadata(raw: any): NormalizedMetadata | null {
  if (!raw) return null;
  let d: any = raw;
  if (typeof d === 'string') {
    try {
      d = JSON.parse(d);
    } catch {
      d = {};
    }
  }
  if (d && d.metadata_analysis && Object.keys(d).length === 1) {
    d = d.metadata_analysis;
  }
  const forensic = d.forensic_analysis || {};
  const hwSw = forensic.hardware_software_analysis || {};
  const gs = d.gemini_summary || {};
  const scoreRaw = d.suspicious_score !== undefined ? d.suspicious_score : d.score;

  const summaries: { label: string; value: string }[] = [];
  const addSummary = (label: string, value: any) => {
    if (value && value !== 'N/A') summaries.push({ label, value: String(value) });
  };
  addSummary('Matrix', gs.matrix_summary || d.forensic_summary?.matrix_interpretation);
  addSummary('Bitrate', gs.bitrate_summary || d.forensic_summary?.bitrate_category);
  addSummary('FPS', gs.fps_summary || d.forensic_summary?.fps);
  addSummary('Atoms', gs.atoms_summary);

  const rawSize = d.file_size ?? d.file_info?.size ?? null;
  let fileSize: string | null = null;
  if (typeof rawSize === 'number') {
    fileSize = formatBytes(rawSize);
  } else if (rawSize != null && String(rawSize).trim()) {
    const asNum = Number(rawSize);
    fileSize = Number.isFinite(asNum) && String(rawSize).trim() === String(asNum)
      ? formatBytes(asNum)
      : String(rawSize);
  }

  return {
    verdict: String(d.verdict || 'UNKNOWN').toUpperCase(),
    score: num(scoreRaw),
    likelySource:
      d.forensic_summary?.likely_source ||
      d.source_analysis?.likely_source ||
      hwSw.likely_source ||
      null,
    sourceConfidence: num(
      d.confidence ??
        d.forensic_summary?.hw_sw_confidence ??
        d.source_analysis?.confidence ??
        hwSw.confidence
    ),
    anomalies: (d.top_anomalies || d.anomalies || []).map(String),
    inconsistencies: (d.top_inconsistencies || d.metadata_inconsistencies || []).map(String),
    fileSize,
    fileType: d.file_type || d.file_info?.type || null,
    fileHash: d.file_hash || d.file_info?.hash || null,
    summaries,
    forensicExplanation:
      gs.forensic_trail_explanation && gs.forensic_trail_explanation !== 'N/A'
        ? String(gs.forensic_trail_explanation)
        : null,
    neuralAlignment:
      gs.neural_metadata_alignment && gs.neural_metadata_alignment !== 'N/A'
        ? String(gs.neural_metadata_alignment)
        : null,
    keyFindings: Array.isArray(gs.key_findings) ? gs.key_findings.map(String) : [],
  };
}
