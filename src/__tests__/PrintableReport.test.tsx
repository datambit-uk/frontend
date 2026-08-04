import { render } from '@testing-library/react';
import { PrintableReport } from '../pages/report/PrintableReport';

const mkFile = (name: string) => ({
  file_metadata: { filename: name, size: 1000, content_type: 'image/jpeg' },
  file_status: 'complete',
  result: { image_result: { label_image: 'real', score_image: 0.9 } },
});

describe('PrintableReport', () => {
  beforeEach(() => {
    window.print = jest.fn();
  });

  it('renders one print-page per file into document.body', () => {
    render(<PrintableReport files={[mkFile('a.jpg'), mkFile('b.jpg')]} uploadId="x" onDone={jest.fn()} />);
    expect(document.querySelectorAll('#printable-report .print-page')).toHaveLength(2);
  });

  it('calls window.print after mount', () => {
    jest.useFakeTimers();
    render(<PrintableReport files={[mkFile('a.jpg')]} uploadId="x" onDone={jest.fn()} />);
    jest.runOnlyPendingTimers();
    expect(window.print).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
