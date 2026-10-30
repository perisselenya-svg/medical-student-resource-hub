/**
 * Storage abstraction. All file I/O goes through this interface so the local
 * VPS disk driver can later be swapped for MinIO / S3-compatible storage
 * (implement the interface, add a STORAGE_DRIVER value, register it in
 * src/storage/index.ts) without touching services or routes.
 *
 * Keys are opaque, server-generated relative paths such as
 * "2026/10/3f2b…e1.pdf". They are never built from user input.
 */
export type ByteRange = { start: number; end: number }; // inclusive, like HTTP Range

export type StoredObjectInfo = { size: number };

export type StorageUsage = { totalBytes: number; freeBytes: number };

export interface StorageService {
  readonly driver: string;
  /** Write an object atomically (readers never see a partial file). */
  put(key: string, data: Buffer): Promise<void>;
  /** Stream an object, optionally a byte range. */
  getStream(key: string, range?: ByteRange): Promise<ReadableStream<Uint8Array>>;
  /** Object metadata, or null if it does not exist. */
  stat(key: string): Promise<StoredObjectInfo | null>;
  /** Delete an object. Idempotent: deleting a missing object succeeds. */
  delete(key: string): Promise<void>;
  /** List every key (used by the orphan-cleanup script). */
  listKeys(): AsyncIterable<string>;
  /** Capacity of the underlying volume, if the driver can report it. */
  usage(): Promise<StorageUsage | null>;
}
