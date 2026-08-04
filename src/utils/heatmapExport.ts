/**
 * Heatmap URL helpers for report preview + Export downloads.
 *
 * report-read returns same-origin HMAC media URLs
 * (`/reports/.../heatmaps/<i>?exp=&sig=`). On GitHub Pages those become
 * absolute against production.datambit.com via API_URL.
 */

import { API_URL } from "../api/api";

export function normalizeHeatmapUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  let normalized = rawUrl.trim();

  // Legacy internal service prefix → public gateway prefix.
  if (normalized.startsWith("/api/v2/report")) {
    normalized = `/reports${normalized.slice("/api/v2/report".length)}`;
  }

  // Absolute http(s) / data — use as-is (do not rewrite gs:// to public GCS).
  if (
    normalized.startsWith("data:") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://")
  ) {
    // Old report-read signed GCS URLs are blocked by CSP; they cannot be fixed
    // in the browser. Prefer reloading the report after report-read emits proxy URLs.
    return normalized;
  }

  if (normalized.startsWith("/") && !normalized.startsWith("//")) {
    return `${API_URL}${normalized}`;
  }

  // gs:// or other storage URIs are not browser-playable under CSP.
  if (normalized.startsWith("gs://")) {
    console.warn("Heatmap gs:// path received; expected HMAC /reports proxy URL:", normalized);
    return normalized;
  }

  return `${API_URL}/${normalized}`;
}

export function isHeatmapVideoUrl(url: string): boolean {
  const u = url.trim();
  return (
    u.startsWith("data:video/") ||
    /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u) ||
    /\/heatmaps\/\d+(\?|$)/i.test(u) ||
    (/heatmap/i.test(u) && /[?&]alt=media\b/i.test(u))
  );
}

function filenameFromHeatmapUrl(url: string, index: number): string {
  try {
    const parsed = new URL(url, window.location.origin);
    const decodedPath = decodeURIComponent(parsed.pathname);
    const base = decodedPath.split("/").filter(Boolean).pop() || "";
    if (base && /\.(mp4|webm|mov|m4v|png|jpg|jpeg|webp)$/i.test(base)) {
      return base;
    }
    if (/^\d+$/.test(base)) {
      return `heatmap-${base}.mp4`;
    }
  } catch {
    /* fall through */
  }
  return `heatmap-${index + 1}.mp4`;
}

/** Collect unique heatmap URLs from report file_uploads results. */
export function collectHeatmapUrls(
  files: Array<{
    result?: {
      heatmap_url?: string[] | null;
      heatmap_paths?: string[] | null;
    } | null;
  }>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const file of files) {
    const paths = [
      ...(file.result?.heatmap_url || []),
      ...(file.result?.heatmap_paths || []),
    ];
    for (const p of paths) {
      if (typeof p !== "string" || !p.trim()) continue;
      const normalized = normalizeHeatmapUrl(p);
      if (
        normalized.startsWith("gs://") ||
        normalized.includes("storage.googleapis.com/")
      ) {
        continue;
      }
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

async function triggerBlobDownload(blob: Blob, filename: string): Promise<void> {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

/**
 * Download each heatmap as a file (mp4/png). Failures are logged; others continue.
 * Returns the number of successful downloads.
 */
export async function downloadHeatmapFiles(urls: string[]): Promise<number> {
  let ok = 0;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      // HMAC is in the query string; cross-origin from GitHub Pages to the API host.
      const response = await fetch(url, {
        method: "GET",
        credentials: "omit",
        mode: "cors",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      await triggerBlobDownload(blob, filenameFromHeatmapUrl(url, i));
      ok += 1;
      if (i < urls.length - 1) {
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch (err) {
      console.error("Heatmap download failed:", url, err);
    }
  }
  return ok;
}
