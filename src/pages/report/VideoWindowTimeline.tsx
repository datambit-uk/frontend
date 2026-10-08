import React from 'react';
import { REPORT_AGGREGATIONS, isReportAggregation } from './aggregationMethods';

export interface VideoWindowVerdict {
  window_index?: number;
  start_sec?: number;
  end_sec?: number;
  verdict?: string;
  predicted_class?: string;
  real_confidence?: number;
  fake_confidence?: number;
}

export interface VideoAggregation {
  verdict?: string;
  predicted_class?: string;
  real_confidence?: number;
  fake_confidence?: number;
}

export const formatTimeSec = (sec?: number): string => {
  const n = Number(sec);
  if (!Number.isFinite(n) || n < 0) return '0:00';
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const finite = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const VideoWindowTimeline: React.FC<{
  windows?: VideoWindowVerdict[] | null;
  aggregations?: Record<string, VideoAggregation> | null;
  activeMethod?: string | null;
}> = ({ windows, aggregations, activeMethod }) => {
  const items = (windows || [])
    .filter((window) => finite(window?.start_sec) !== null && finite(window?.end_sec) !== null)
    .slice()
    .sort((a, b) => Number(a.start_sec) - Number(b.start_sec));

  const byMethod = aggregations || {};
  const methods = REPORT_AGGREGATIONS.filter(
    (method) => isReportAggregation(method.id) && byMethod[method.id] && typeof byMethod[method.id] === 'object',
  );
  if (items.length === 0 && methods.length === 0) return null;

  const span = Math.max(items.reduce((end, window) => Math.max(end, Number(window.end_sec) || 0), 0), 1e-6);
  const activeName = String(activeMethod || '').toLowerCase().replace('ensemble_mean_of_', '');
  const active = activeName === 'max' ? 'max_fake_confidence' : activeName;

  return (
    <div className="mt-3">
      {items.length > 0 && (
        <>
          <p className="font-black text-gray-500 uppercase mb-2 text-[9px]">Window timeline</p>
          <div className="relative h-7 w-full rounded overflow-hidden bg-gray-800">
            {items.map((window, index) => {
              const start = Number(window.start_sec);
              const end = Math.max(Number(window.end_sec), start);
              const fake = String(window.verdict || '').toUpperCase() === 'FAKE';
              const confidence = fake
                ? Number(window.fake_confidence ?? 0)
                : Number(window.real_confidence ?? 0);
              const intensity = Math.min(1, Math.max(0.22, Number.isFinite(confidence) ? confidence : 0.22));
              const label = fake ? 'Fake' : 'Real';
              return (
                <div
                  key={`${window.window_index ?? index}-${start}`}
                  title={`${formatTimeSec(start)}–${formatTimeSec(end)} ${label} ${(confidence * 100).toFixed(0)}%`}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${(start / span) * 100}%`,
                    width: `${Math.max(((end - start) / span) * 100, 0.6)}%`,
                    backgroundColor: fake
                      ? `rgba(239, 68, 68, ${intensity})`
                      : `rgba(34, 197, 94, ${intensity})`,
                  }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-gray-500 mt-1 font-mono">
            <span>0:00</span>
            <span>{formatTimeSec(span)}</span>
          </div>
        </>
      )}

      {methods.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="font-black text-gray-500 uppercase text-[9px]">Aggregation methods</p>
          {methods.map((method) => {
            const result = byMethod[method.id];
            const verdict = String(result.verdict || 'UNKNOWN').toUpperCase();
            const fake = verdict === 'FAKE';
            const selected = method.id === active;
            return (
              <div key={method.id} className="bg-black/20 px-1.5 py-1 rounded">
                <div className="flex items-center justify-between text-[10px]">
                  <span className={selected ? 'text-gray-200' : 'text-gray-400'}>
                    {method.label}
                    {selected ? ' · used' : ''}
                  </span>
                  <span className={fake ? 'text-red-300' : 'text-green-300'}>
                    {verdict} {((Number(result.fake_confidence) || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <details className="mt-1">
                  <summary className="text-[9px] text-blue-400 cursor-pointer select-none">What this means</summary>
                  <p className="text-[10px] text-gray-400 mt-1 leading-snug">{method.explanation}</p>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
