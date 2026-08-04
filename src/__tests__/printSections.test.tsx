import { render, screen } from '@testing-library/react';
import {
  PrintVideoSection,
  PrintAudioSection,
  PrintMetadataSection,
  PrintImageSection,
} from '../pages/report/printSections';

describe('print section renderers', () => {
  it('renders image label and confidence', () => {
    render(<PrintImageSection data={{ label: 'FAKE', confidencePct: 99.21 }} />);
    expect(screen.getByText('FAKE')).toBeInTheDocument();
    expect(screen.getByText(/99\.21%/)).toBeInTheDocument();
  });

  it('renders video verdict, predicted class and class scores', () => {
    render(
      <PrintVideoSection
        data={{
          verdict: 'FAKE',
          predictedClass: 'Face Manipulation',
          fakePct: 99,
          realPct: 1,
          processingTime: 49.7,
          framesAnalyzed: 32,
          facesDetected: 1,
          avgInferenceMs: 232.7,
          classScores: [{ name: 'Fake', score: 0.9 }],
        }}
      />
    );
    expect(screen.getByText('FAKE')).toBeInTheDocument();
    expect(screen.getByText('Face Manipulation')).toBeInTheDocument();
    expect(screen.getByText('Fake')).toBeInTheDocument();
    expect(screen.getByText('0.900')).toBeInTheDocument();
  });

  it('renders audio no-speech message', () => {
    render(
      <PrintAudioSection
        data={{
          verdict: 'ERROR',
          isNoSpeech: true,
          fakePct: 0,
          realPct: 0,
          processingTime: 1,
          avgInferenceMs: null,
          duration: null,
          language: null,
          languageConfidencePct: null,
          error: 'No speech detected',
          flaggedSegments: [],
        }}
      />
    );
    expect(screen.getByText(/no detectable speech/i)).toBeInTheDocument();
  });

  it('renders metadata verdict, anomalies and summaries', () => {
    render(
      <PrintMetadataSection
        data={{
          verdict: 'CLEAN',
          score: 0.854,
          likelySource: 'SOFTWARE',
          sourceConfidence: 0.9,
          anomalies: ['unusual entropy'],
          inconsistencies: [],
          fileSize: '901',
          fileType: '.mp4',
          fileHash: 'abcdef',
          summaries: [{ label: 'Matrix', value: 'HIGH_QUALITY' }],
          forensicExplanation: 'looks clean',
          neuralAlignment: null,
          keyFindings: ['finding one'],
        }}
      />
    );
    expect(screen.getByText('CLEAN')).toBeInTheDocument();
    expect(screen.getByText('unusual entropy')).toBeInTheDocument();
    expect(screen.getByText('HIGH_QUALITY')).toBeInTheDocument();
    expect(screen.getByText('Gemini Forensic Signals')).toBeInTheDocument();
    expect(screen.getByText('Gemini Synthesis')).toBeInTheDocument();
    expect(screen.getByText('looks clean')).toBeInTheDocument();
  });
});
