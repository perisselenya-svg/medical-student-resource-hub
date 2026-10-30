import { createReadStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat, statfs, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { assertValidKey } from "./keys";
import type { ByteRange, StorageService, StorageUsage, StoredObjectInfo } from "./types";

/**
 * Local-disk driver for a single VPS.
 *
 * SECURITY:
 * - UPLOAD_DIR must live OUTSIDE the web root (`public/`), so files are only
 *   reachable through the validated /api/files route, never by direct URL.
 * - Every key is shape-checked and the resolved path is verified to stay inside
 *   the root directory (defence in depth against traversal).
 * - Files are written 0640 / directories 0750 so other OS users cannot read them.
 */
export class LocalStorage implements StorageService {
  readonly driver = "local";

  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    assertValidKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Resolved path escapes storage root");
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true, mode: 0o750 });
    // Write to a temp file then rename: rename is atomic on the same
    // filesystem, so a crash mid-write never leaves a truncated object.
    const tmp = `${full}.tmp-${randomUUID()}`;
    try {
      await writeFile(tmp, data, { mode: 0o640, flag: "wx" });
      await rename(tmp, full);
    } catch (error) {
      await rm(tmp, { force: true });
      throw error;
    }
  }

  async getStream(key: string, range?: ByteRange): Promise<ReadableStream<Uint8Array>> {
    const full = this.resolve(key);
    const nodeStream = createReadStream(full, range ? { start: range.start, end: range.end } : undefined);
    return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  }

  async stat(key: string): Promise<StoredObjectInfo | null> {
    try {
      const info = await stat(this.resolve(key));
      return info.isFile() ? { size: info.size } : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async *listKeys(): AsyncIterable<string> {
    let entries: string[];
    try {
      entries = await readdir(this.root, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const key = entry.split(path.sep).join("/");
      // Only yield real object keys; skip directories and stray temp files.
      if (/^\d{4}\/\d{2}\/[^/]+$/.test(key) && !key.includes(".tmp-")) yield key;
    }
  }

  async usage(): Promise<StorageUsage | null> {
    try {
      await mkdir(this.root, { recursive: true, mode: 0o750 });
      const fs = await statfs(this.root);
      return { totalBytes: fs.blocks * fs.bsize, freeBytes: fs.bavail * fs.bsize };
    } catch {
      return null;
    }
  }
}
