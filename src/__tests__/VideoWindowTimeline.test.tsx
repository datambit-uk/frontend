import { render, screen } from '@testing-library/react';
import { VideoWindowTimeline } from '../pages/report/VideoWindowTimeline';

describe('VideoWindowTimeline', () => {
  it('draws each window and every aggregation verdict', () => {
    const { container } = render(
      <VideoWindowTimeline
        windows={[
          { window_index: 0, start_sec: 0, end_sec: 2.5, verdict: 'REAL', real_confidence: 0.9, fake_confidence: 0.1 },
          { window_index: 1, start_sec: 2.5, end_sec: 5, verdict: 'FAKE', real_confidence: 0.2, fake_confidence: 0.8 },
        ]}
        aggregations={{
          persistent_peak_run: { verdict: 'FAKE', fake_confidence: 0.7 },
          dual_branch: { verdict: 'FAKE', fake_confidence: 0.62 },
          max_fake_confidence: { verdict: 'FAKE', fake_confidence: 0.8 },
          max_confidence: { verdict: 'REAL', fake_confidence: 0.1 },
          min_confidence: { verdict: 'REAL', fake_confidence: 0.05 },
        }}
        activeMethod="persistent_peak_run"
      />
    );

    const segments = container.querySelectorAll('[title]');
    expect(segments).toHaveLength(2);
    expect(segments[0].getAttribute('style')).toContain('34, 197, 94');
    expect(segments[1].getAttribute('style')).toContain('239, 68, 68');
    expect(screen.getByText(/Peak run/)).toHaveTextContent('used');
    expect(screen.getByText(/Max fake/)).not.toHaveTextContent('used');
    expect(screen.getByText(/Dual branch/)).toBeInTheDocument();
    expect(screen.queryByText(/Max confidence/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Min confidence/)).not.toBeInTheDocument();
    expect(screen.getByText(/highest fake probability/)).toBeInTheDocument();
    expect(screen.getByText(/tempered average/)).toBeInTheDocument();
  });
});
