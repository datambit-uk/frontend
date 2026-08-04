import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PrintPage, type ReportFile } from './PrintPage';

const MM_TO_PX = 96 / 25.4;
const MARGIN_MM = 10;
const PAGE_W_PX = (210 - 2 * MARGIN_MM) * MM_TO_PX; // ~718px
const PAGE_H_PX = (297 - 2 * MARGIN_MM) * MM_TO_PX; // ~1047px
// Fit target a hair below the exact printable height so 1px rounding at the
// page boundary can't spill a blank trailing page.
const FIT_H_PX = PAGE_H_PX * 0.995;

// Isolate the print-only portal by removing the rest of the document from the
// print flow entirely (display:none), rather than merely hiding it
// (visibility:hidden) — the latter leaves the app laid out at full height and
// produces phantom blank pages. The portal then flows normally from the top.
const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: ${MARGIN_MM}mm; }
  body > *:not(#printable-report) { display: none !important; }
  #printable-report { position: static !important; }
  #printable-report .print-page:not(:last-child) { break-after: page; }
}
`;

interface Props {
  files: ReportFile[];
  uploadId: string;
  onDone: () => void;
}

export const PrintableReport: React.FC<Props> = ({ files, uploadId, onDone }) => {
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [scales, setScales] = useState<number[] | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Measure each page's natural height once, then compute a fit-to-page scale.
  useLayoutEffect(() => {
    const next = files.map((_, i) => {
      const el = innerRefs.current[i];
      if (!el) return 1;
      const h = el.scrollHeight;
      return h > FIT_H_PX ? FIT_H_PX / h : 1;
    });
    setScales(next);
  }, [files]);

  // Once scales are applied, print on the next frame and clean up afterward.
  useEffect(() => {
    if (!scales) return;
    const after = () => onDoneRef.current();
    window.addEventListener('afterprint', after);
    const raf = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('afterprint', after);
    };
  }, [scales]);

  return createPortal(
    <div
      id="printable-report"
      style={
        {
          position: 'absolute',
          left: -99999,
          top: 0,
          background: '#ffffff',
          color: '#111827',
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        } as React.CSSProperties
      }
    >
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      {files.map((file, i) => (
        <div
          key={i}
          className="print-page"
          style={{
            width: PAGE_W_PX,
            height: scales ? FIT_H_PX : undefined,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <div
            ref={(el) => {
              innerRefs.current[i] = el;
            }}
            style={{
              width: PAGE_W_PX,
              transform: scales ? `scale(${scales[i]})` : undefined,
              transformOrigin: 'top left',
            }}
          >
            <PrintPage file={file} uploadId={uploadId} />
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
};
