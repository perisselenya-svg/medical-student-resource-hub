/**
 * Client helpers for anonymous usage counters. A view is reported at most
 * once per browser session per material (sessionStorage); the server also
 * de-duplicates per IP, so counts stay meaningful.
 */
export function trackView(materialId: string): void {
  try {
    const key = `viewed:${materialId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Storage unavailable (private mode): fall back to server-side de-duplication.
  }
  void fetch(`/api/materials/${materialId}/view`, { method: "POST", keepalive: true }).catch(() => undefined);
}

/** keepalive lets the request finish even though the download navigates away. */
export function trackDownload(materialId: string): void {
  void fetch(`/api/materials/${materialId}/download`, { method: "POST", keepalive: true }).catch(() => undefined);
}
