import {
  normalizeImage,
  normalizeVideo,
  normalizeAudio,
  normalizeMetadata,
  formatBytes,
} from '../pages/report/reportNormalize';

describe('reportNormalize', () => {
  it('normalizeImage uppercases label and computes confidence', () => {
    const r = normalizeImage({ label_image: 'fake', score_image: 0.9921 });
    expect(r.label).toBe('FAKE');
    expect(r.confidencePct).toBeCloseTo(99.21, 2);
  });

  it('normalizeImage handles missing fields', () => {
    const r = normalizeImage(undefined);
    expect(r.label).toBe('UNKNOWN');
    expect(r.confidencePct).toBeNull();
  });

  it('normalizeVideo maps class scores and confidences', () => {
    const r = normalizeVideo({
      verdict: 'fake',
      predicted_class: 'face_manipulation',
      fake_confidence: 0.99,
      real_confidence: 0.01,
      frames_analyzed: 32,
      class_confidences: { real: 0.1, fake: 0.9 },
    });
    expect(r.verdict).toBe('FAKE');
    expect(r.predictedClass).toBe('Face Manipulation');
    expect(r.fakePct).toBeCloseTo(99, 5);
    expect(r.framesAnalyzed).toBe(32);
    expect(r.classScores).toEqual([
      { name: 'Real', score: 0.1 },
      { name: 'Fake', score: 0.9 },
    ]);
  });

  it('normalizeVideo prefers class_scores over class_confidences', () => {
    const r = normalizeVideo({
      verdict: 'fake',
      predicted_class: 'face_manipulation',
      fake_confidence: 0.85,
      real_confidence: 0.15,
      class_scores: {
        real: 0.15,
        face_manipulation: 0.7,
        text_to_video: 0.05,
        lip_sync: 0.05,
        image_to_video: 0.05,
      },
      class_confidences: { real: 0.1, fake: 0.9 },
    });
    expect(r.classScores).toEqual([
      { name: 'Real', score: 0.15 },
      { name: 'Face Manipulation', score: 0.7 },
      { name: 'Text To Video', score: 0.05 },
      { name: 'Lip Sync', score: 0.05 },
      { name: 'Image To Video', score: 0.05 },
    ]);
  });

  it('normalizeAudio includes transcript, importance, and rationale on segments', () => {
    const r = normalizeAudio({
      verdict: 'fake',
      fake_confidence: 0.9,
      real_confidence: 0.1,
      audio_highlights: {
        primary_alert: {
          start_sec: 1.2,
          end_sec: 3.4,
          verdict: 'FAKE',
          transcription: 'Hello world',
          importance_label: 'CRITICAL',
          importance_score: 0.95,
          importance_rationale: 'Contains urgent claim',
        },
      },
    });
    expect(r.flaggedSegments).toHaveLength(1);
    expect(r.flaggedSegments[0]).toMatchObject({
      startSec: 1.2,
      endSec: 3.4,
      verdict: 'FAKE',
      transcription: 'Hello world',
      importanceLabel: 'CRITICAL',
      importanceScorePct: 95,
      rationale: 'Contains urgent claim',
    });
  });

  it('normalizeAudio uses fused file-level confidences (ignores window averages)', () => {
    const r = normalizeAudio({
      verdict: 'fake',
      fake_confidence: 0.643,
      real_confidence: 0.357,
      audio_windows: [
        { fake_confidence: 0.2, real_confidence: 0.8 },
        { fake_confidence: 0.4, real_confidence: 0.6 },
      ],
    });
    expect(r.verdict).toBe('FAKE');
    expect(r.fakePct).toBeCloseTo(64.3, 5);
    expect(r.realPct).toBeCloseTo(35.7, 5);
  });

  it('normalizeAudio falls back to final_ fields and detects no-speech', () => {
    const r = normalizeAudio({
      final_audio_verdict: 'ERROR',
      verdict: undefined,
      error: 'No speech detected in audio',
    });
    expect(r.verdict).toBe('ERROR');
    expect(r.isNoSpeech).toBe(true);
  });

  it('normalizeMetadata parses stringified + double-nested payloads', () => {
    const nested = JSON.stringify({
      metadata_analysis: {
        verdict: 'CLEAN',
        score: 0.854,
        gemini_summary: { matrix_summary: 'HIGH_QUALITY', key_findings: ['a', 'b'] },
        file_info: { size: '901', type: '.mp4', hash: 'abc' },
      },
    });
    const r = normalizeMetadata(nested)!;
    expect(r.verdict).toBe('CLEAN');
    expect(r.score).toBeCloseTo(0.854, 3);
    expect(r.fileType).toBe('.mp4');
    expect(r.summaries).toContainEqual({ label: 'Matrix', value: 'HIGH_QUALITY' });
    expect(r.keyFindings).toEqual(['a', 'b']);
  });

  it('normalizeMetadata returns null for empty input', () => {
    expect(normalizeMetadata(null)).toBeNull();
  });

  it('formatBytes formats sizes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
  });
});
