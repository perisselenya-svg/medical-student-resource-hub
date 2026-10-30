import { ALLOWED_EXTENSIONS, extensionOf } from "@/lib/files/types";
import { formatBytes } from "@/lib/utils";

/**
 * Instant client-side feedback only. NOT a security control — the server
 * re-validates every upload by file signature (src/lib/files/validation.ts).
 */
export function precheckFile(file: File, maxBytes: number): string | null {
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
    return "Unsupported file type. Allowed: PDF, PNG, JPG/JPEG, WEBP, Markdown.";
  }
  if (file.size === 0) return "The file is empty.";
  if (file.size > maxBytes) return `File is ${formatBytes(file.size)}; the limit is ${formatBytes(maxBytes)}.`;
  return null;
}
