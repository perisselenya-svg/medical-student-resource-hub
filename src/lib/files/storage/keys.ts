import { randomUUID } from "node:crypto";

/**
 * SECURITY: storage keys follow a strict server-generated shape. Any key that
 * does not match (e.g. containing "..", absolute paths, or odd characters) is
 * rejected before touching the filesystem, which rules out path traversal even
 * if a corrupted database value were ever passed in.
 */
export const STORAGE_KEY_PATTERN = /^\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/;

/** "2026/10/<uuid>.pdf" — unguessable, collision-free, and sharded by month. */
export function generateStorageKey(ext: string, now = new Date()): string {
  const safeExt = ext.replace(/^\./, "").toLowerCase();
  if (!/^[a-z0-9]{1,8}$/.test(safeExt)) throw new Error(`Invalid extension: ${ext}`);
  const yyyy = now.getUTCFullYear().toString();
  const mm = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${yyyy}/${mm}/${randomUUID()}.${safeExt}`;
}

export function assertValidKey(key: string): void {
  if (!STORAGE_KEY_PATTERN.test(key)) throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
}
