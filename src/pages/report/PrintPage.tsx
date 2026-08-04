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
} from './printSections';

export interface ReportFile {
  file_metadata: { filename: string; size: number; content_type: string };
  file_status: string;
  result: any | null;
}

export const PrintPage: React.FC<{ file: ReportFile; uploadId: string }> = ({ file, uploadId }) => {
  const r = file.result;
  const ct = (file.file_metadata.content_type || '').toLowerCase();

  const image = r?.image_result && ct.includes('image') ? normalizeImage(r.image_result) : null;
  const video = ct.includes('video') && r?.video_analysis ? normalizeVideo(r.video_analysis) : null;
  // Image files show only the image section on screen (ReportDetail returns early),
  // so suppress audio/metadata here to keep the PDF consistent with the dashboard.
  const audio = !image && r?.audio_analysis ? normalizeAudio(r.audio_analysis) : null;
  const metadata = !image && r?.metadata_analysis ? normalizeMetadata(r.metadata_analysis) : null;

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

      {/* Section grid — video/audio/image verdicts are shown per section, not as one headline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
        {image && <PrintImageSection data={image} />}
        {video && <PrintVideoSection data={video} />}
        {audio && <PrintAudioSection data={audio} />}
        {metadata && <PrintMetadataSection data={metadata} />}
      </div>
    </div>
  );
};
