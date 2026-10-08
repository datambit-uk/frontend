import React from "react";

interface DevWatermarkProps {
  className?: string;
}

/**
 * Diagonal "DEV" ribbon overlaid on the logo.
 *
 * Visibility:
 *   - VITE_SHOW_DEV_RIBBON=true|1  → always show (local / explicit dev builds)
 *   - VITE_SHOW_DEV_RIBBON=false|0 → never show (prod / Pages builds)
 *   - unset                        → show only under Vite `npm run dev`
 *
 * `npm run deploy` is a production Vite build, so the ribbon is hidden unless
 * VITE_SHOW_DEV_RIBBON is explicitly set true at build time.
 */
const DevWatermark: React.FC<DevWatermarkProps> = ({ className = "" }) => {
  const flag = import.meta.env.VITE_SHOW_DEV_RIBBON;
  const show =
    flag === undefined || flag === ""
      ? Boolean(import.meta.env.DEV)
      : flag === "true" || flag === "1";

  if (!show) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
    >
      <span
        className={`font-black uppercase tracking-widest text-red-600 border-red-600 rounded-md opacity-90 -rotate-[25deg] ${className}`}
      >
        DEV
      </span>
    </span>
  );
};

export default DevWatermark;
