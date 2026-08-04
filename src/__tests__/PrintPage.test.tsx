import { render, screen } from '@testing-library/react';
import { PrintPage } from '../pages/report/PrintPage';

const videoFile = {
  file_metadata: { filename: 'clip.mp4', size: 9014409, content_type: 'video/mp4' },
  file_status: 'complete',
  result: {
    video_analysis: { verdict: 'fake', predicted_class: 'face', fake_confidence: 0.99, real_confidence: 0.01 },
    audio_analysis: { verdict: 'real', fake_confidence: 0.3, real_confidence: 0.7 },
    metadata_analysis: { verdict: 'CLEAN', score: 0.85 },
  },
};

const imageFile = {
  file_metadata: { filename: 'pic.jpg', size: 2048, content_type: 'image/jpeg' },
  file_status: 'complete',
  result: { image_result: { label_image: 'real', score_image: 0.88 } },
};

describe('PrintPage', () => {
  it('renders header info and all applicable sections for a video file', () => {
    render(<PrintPage file={videoFile} uploadId="abc123" />);
    expect(screen.getByText('clip.mp4')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('Video Analysis')).toBeInTheDocument();
    expect(screen.getByText('Audio Analysis')).toBeInTheDocument();
    expect(screen.getByText('Metadata Analysis')).toBeInTheDocument();
    expect(screen.queryByTestId('report-headline')).not.toBeInTheDocument();
  });

  it('renders only the image section for an image file', () => {
    render(<PrintPage file={imageFile} uploadId="img1" />);
    expect(screen.getByText('Image Analysis')).toBeInTheDocument();
    expect(screen.queryByText('Video Analysis')).not.toBeInTheDocument();
    expect(screen.queryByText('Audio Analysis')).not.toBeInTheDocument();
  });
});
