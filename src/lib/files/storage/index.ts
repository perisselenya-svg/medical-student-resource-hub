import "server-only";
import { env } from "@/lib/env";
import { LocalStorage } from "./local";
import type { StorageService } from "./types";

export type { StorageService } from "./types";
export { generateStorageKey } from "./keys";

let instance: StorageService | null = null;

/**
 * Returns the configured storage driver. To add MinIO/S3: implement
 * StorageService (e.g. with @aws-sdk/client-s3), add "s3" to STORAGE_DRIVER in
 * src/lib/env.ts, and construct it here.
 */
export function storage(): StorageService {
  if (instance) return instance;
  const config = env();
  switch (config.STORAGE_DRIVER) {
    case "local":
      instance = new LocalStorage(config.uploadDirAbsolute);
      break;
  }
  return instance;
}
