import React from 'react';
import type {
  NormalizedImage,
  NormalizedVideo,
  NormalizedAudio,
  NormalizedMetadata,
} from './reportNormalize';

// Colored TEXT (not filled backgrounds) so verdicts print without relying on
// the browser "Background graphics" toggle.
export const verdictColor = (verdict: string): string => {
  const v = verdict.toUpperCase();
  if (v === 'REAL' || v === 'CLEAN') return '#15803d'; // green-700
  if (v === 'FAKE' || v === 'SUSPICIOUS' || v === 'MANIPULATED') return '#b91c1c'; // red-700
  return '#374151'; // gray-700
};

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section
    style={{
      border: '1px solid #d1d5db',
      borderRadius: 6,
      padding: '8px 10px',
      breakInside: 'avoid',
    }}
  >
    <h4
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: '#6b7280',
        margin: '0 0 6px',
      }}
    >
      {title}
    </h4>
    {children}
  </section>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, lineHeight: 1.5 }}>
    <span style={{ color: '#6b7280' }}>{label}</span>
    <span style={{ color: '#111827', fontFamily: 'monospace' }}>{value}</span>
  </div>
);

const VerdictBadge: React.FC<{ verdict: string }> = ({ verdict }) => (
  <span
    style={{
      display: 'inline-block',
      fontSize: 11,
      fontWeight: 800,
      color: verdictColor(verdict),
      border: `1px solid ${verdictColor(verdict)}`,
      borderRadius: 4,
      padding: '1px 6px',
      marginBottom: 6,
    }}
  >
    {verdict}
  </span>
);

export const PrintImageSection: React.FC<{ data: NormalizedImage }> = ({ data }) => (
  <Card title="Image Analysis">
    <VerdictBadge verdict={data.label} />
    {data.confidencePct !== null && (
      <Row label="Confidence" value={`${data.confidencePct.toFixed(2)}%`} />
    )}
  </Card>
);

export const PrintVideoSection: React.FC<{ data: NormalizedVideo }> = ({ data }) => (
  <Card title="Video Analysis">
    <VerdictBadge verdict={data.verdict} />
    <Row label="Predicted Class" value={data.predictedClass} />
    <Row label="Fake Confidence" value={`${data.fakePct.toFixed(2)}%`} />
    <Row label="Real Confidence" value={`${data.realPct.toFixed(2)}%`} />
    {data.framesAnalyzed !== null && <Row label="Frames Analyzed" value={data.framesAnalyzed} />}
    {data.facesDetected !== null && <Row label="Faces Detected" value={data.facesDetected} />}
    {data.processingTime !== null && (
      <Row label="Processing Time" value={`${data.processingTime.toFixed(2)}s`} />
    )}
    {data.avgInferenceMs !== null && (
      <Row label="Avg Inference" value={`${data.avgInferenceMs.toFixed(2)} ms`} />
    )}
    {data.classScores.length > 0 && (
      <div style={{ marginTop: 6 }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 3px' }}>
          Class Scores
        </p>
        {data.classScores.map((c) => (
          <Row key={c.name} label={c.name} value={c.score.toFixed(3)} />
        ))}
      </div>
    )}
  </Card>
);

export const PrintAudioSection: React.FC<{ data: NormalizedAudio }> = ({ data }) => (
  <Card title="Audio Analysis">
    <VerdictBadge verdict={data.verdict} />
    {data.isNoSpeech ? (
      <p style={{ fontSize: 10, color: '#a16207', fontStyle: 'italic', margin: 0 }}>
        The audio track contains no detectable speech and could not be analysed.
      </p>
    ) : (
      <>
        <Row label="Fake Confidence" value={`${data.fakePct.toFixed(2)}%`} />
        <Row label="Real Confidence" value={`${data.realPct.toFixed(2)}%`} />
        {data.duration !== null && <Row label="Duration" value={`${data.duration.toFixed(2)}s`} />}
        {/* Predicted language hidden from report UI
        {data.language && (
          <Row
            label="Primary Language"
            value={
              data.languageConfidencePct !== null
                ? `${data.language} (${data.languageConfidencePct.toFixed(1)}%)`
                : data.language
            }
          />
        )}
        */}
        {data.processingTime !== null && (
          <Row label="Processing Time" value={`${data.processingTime.toFixed(2)}s`} />
        )}
        {data.error && (
          <p style={{ fontSize: 10, color: '#b91c1c', margin: '4px 0 0' }}>Error: {data.error}</p>
        )}
        {data.flaggedSegments.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 3px' }}>
              Flagged Segments
            </p>
            {data.flaggedSegments.map((s, i) => (
              <div key={i} style={{ fontSize: 9, color: '#374151', marginBottom: 6, lineHeight: 1.4 }}>
                <div style={{ fontFamily: 'monospace', color: verdictColor(s.verdict) }}>
                  {s.startSec.toFixed(0)}s–{s.endSec.toFixed(0)}s [{s.verdict}]
                </div>
                {(s.importanceLabel || s.importanceScorePct != null) && (
                  <div style={{ color: '#6b7280' }}>
                    Importance:{' '}
                    {s.importanceLabel || 'UNKNOWN'}
                    {s.importanceScorePct != null &&
                      ` (${s.importanceScorePct.toFixed(1)}%)`}
                  </div>
                )}
                {s.transcription && (
                  <div style={{ color: '#4b5563', fontStyle: 'italic' }}>
                    Transcript: "{s.transcription}"
                  </div>
                )}
                {s.rationale && (
                  <div style={{ color: '#4b5563' }}>Rationale: {s.rationale}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </>
    )}
  </Card>
);

export const PrintMetadataSection: React.FC<{ data: NormalizedMetadata }> = ({ data }) => {
  const sectionTitle = (title: string, color = '#9ca3af') => (
    <p
      style={{
        fontSize: 9,
        fontWeight: 800,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        margin: '0 0 4px',
      }}
    >
      {title}
    </p>
  );

  const proseBlock = (label: string, body: string) => (
    <div
      key={label}
      style={{
        marginBottom: 8,
        paddingBottom: 8,
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: '#4b5563',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <p
        style={{
          fontSize: 9.5,
          color: '#111827',
          margin: 0,
          lineHeight: 1.5,
          textAlign: 'left',
          whiteSpace: 'pre-wrap',
        }}
      >
        {body}
      </p>
    </div>
  );

  return (
    <section
      style={{
        border: '1px solid #d1d5db',
        borderRadius: 6,
        padding: '8px 10px',
        // Long Gemini prose may span pages — allow breaks rather than clipping.
        breakInside: 'auto',
      }}
    >
      <h4
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: '#6b7280',
          margin: '0 0 6px',
        }}
      >
        Metadata Analysis
      </h4>

      <VerdictBadge verdict={data.verdict} />

      {/* Compact overview metrics — short Row layout is appropriate here */}
      <div style={{ marginBottom: data.summaries.length || data.keyFindings.length ? 8 : 0 }}>
        {data.score !== null && <Row label="Suspicious Score" value={data.score.toFixed(4)} />}
        {data.likelySource && (
          <Row
            label="Likely Source"
            value={
              data.sourceConfidence !== null
                ? `${data.likelySource} (${data.sourceConfidence.toFixed(2)})`
                : data.likelySource
            }
          />
        )}
        {data.fileSize && <Row label="Size" value={data.fileSize} />}
        {data.fileType && <Row label="Type" value={data.fileType} />}
        {data.fileHash && (
          <div style={{ fontSize: 8, color: '#6b7280', wordBreak: 'break-all', marginTop: 4, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700 }}>SHA-256</span>
            <br />
            <span style={{ fontFamily: 'monospace', color: '#374151' }}>{data.fileHash}</span>
          </div>
        )}
      </div>

      {/* Gemini forensic signals — stacked prose, not flex rows */}
      {data.summaries.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {sectionTitle('Gemini Forensic Signals', '#2563eb')}
          {data.summaries.map((s) => proseBlock(s.label, s.value))}
        </div>
      )}

      {data.keyFindings.length > 0 && (
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          {sectionTitle('Key Findings')}
          <ul style={{ margin: 0, paddingLeft: 14, fontSize: 9.5, color: '#111827', lineHeight: 1.45 }}>
            {data.keyFindings.map((f, i) => (
              <li key={i} style={{ marginBottom: 3 }}>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.anomalies.length > 0 && (
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          {sectionTitle(`Detected Anomalies (${data.anomalies.length})`, '#a16207')}
          <ul style={{ margin: 0, paddingLeft: 14, fontSize: 9.5, color: '#374151', lineHeight: 1.45 }}>
            {data.anomalies.map((a, i) => (
              <li key={i} style={{ marginBottom: 2 }}>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.neuralAlignment && (
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          {sectionTitle('Neural ↔ Metadata Alignment', '#2563eb')}
          <p style={{ fontSize: 9.5, color: '#111827', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {data.neuralAlignment}
          </p>
        </div>
      )}

      {data.forensicExplanation && (
        <div
          style={{
            marginTop: 4,
            padding: '8px 8px',
            background: '#f9fafb',
            borderRadius: 4,
            border: '1px solid #e5e7eb',
          }}
        >
          {sectionTitle('Gemini Synthesis', '#6b7280')}
          <p style={{ fontSize: 9.5, color: '#1f2937', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {data.forensicExplanation}
          </p>
        </div>
      )}

      {data.inconsistencies.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {sectionTitle('Metadata Inconsistencies', '#b91c1c')}
          <ul style={{ margin: 0, paddingLeft: 14, fontSize: 9.5, color: '#b91c1c', lineHeight: 1.45 }}>
            {data.inconsistencies.map((e, i) => (
              <li key={i} style={{ marginBottom: 2 }}>
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
