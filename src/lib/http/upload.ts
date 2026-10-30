import "server-only";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http/api";
import { limiters } from "@/lib/utils/rate-limit";
import type { AdminSessionUser } from "@/types";

// Allowance for multipart boundaries and text fields on top of the file itself.
const MULTIPART_OVERHEAD = 1024 * 1024;

/**
 * Shared pre-flight for upload and re-upload routes:
 *  1. per-admin upload rate limit;
 *  2. reject oversized bodies by Content-Length BEFORE buffering them
 *     (Nginx enforces a hard cap as well);
 *  3. require multipart/form-data and parse it.
 */
export async function readUploadForm(request: Request, admin: AdminSessionUser): Promise<FormData> {
  const { uploads } = limiters();
  const wait = uploads.retryAfter(admin.id);
  if (wait > 0) throw new ApiError("RATE_LIMITED", "Upload limit reached. Please wait before uploading more files.", undefined, { "Retry-After": String(wait) });
  uploads.hit(admin.id);

  const { maxUploadBytes, MAX_UPLOAD_SIZE_MB } = env();
  if (Number(request.headers.get("content-length") ?? 0) > maxUploadBytes + MULTIPART_OVERHEAD) {
    throw new ApiError("PAYLOAD_TOO_LARGE", `File exceeds the ${MAX_UPLOAD_SIZE_MB} MB limit`);
  }
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    throw new ApiError("UNSUPPORTED_MEDIA_TYPE", "Expected multipart/form-data");
  }
  try {
    return await request.formData();
  } catch {
    throw new ApiError("BAD_REQUEST", "Malformed multipart body");
  }
}

export function requireFile(form: FormData): File {
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError("VALIDATION_ERROR", "A file is required", { fieldErrors: { file: ["A file is required"] } });
  return file;
}
