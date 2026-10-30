import "server-only";
import { ApiError } from "@/lib/http/api";
import { extensionOf, FILE_TYPE_ENUM, FILE_TYPES, type CanonicalMime, type FileTypeEnum } from "@/lib/files/types";

/**
 * Upload validation — the server-side source of truth.
 *
 * SECURITY: the client-supplied filename and Content-Type are attacker
 * controlled. We therefore:
 *   1. Detect the real type from the file's leading bytes ("magic numbers")
 *      (Markdown has no signature, so it must be strict UTF-8 text instead).
 *   2. Require the declared MIME type to agree with the detected type, or be a
 *      generic "unknown" value browsers send for unregistered types.
 *   3. Require the filename extension to agree with the detected type, so a
 *      PDF can never be stored or served as ".png" (or vice versa).
 *   4. Store and later serve ONLY the detected canonical MIME type.
 * Anything not positively identified is rejected (allow-list, not deny-list).
 */

/** Declared MIME values accepted for each canonical type. */
const DECLARED_ALIASES: Record<CanonicalMime, string[]> = {
  "application/pdf": ["application/pdf", "application/x-pdf"],
  "image/png": ["image/png"],
  "image/jpeg": ["image/jpeg", "image/jpg", "image/pjpeg"],
  "image/webp": ["image/webp"],
  "text/markdown": ["text/markdown", "text/x-markdown", "text/plain"],
};

/** Browsers send these when the OS has no registered type (common for .md files). */
const GENERIC_DECLARED = new Set(["", "application/octet-stream"]);

const EXTENSIONS: Record<CanonicalMime, string[]> = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "text/markdown": [".md", ".markdown"],
};

function startsWith(buf: Uint8Array, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buf[offset + i] === b);
}

function ascii(s: string): number[] {
  return Array.from(s, (c) => c.charCodeAt(0));
}

/**
 * Markdown has no magic number. We accept it only if it is valid UTF-8 text
 * with no NUL bytes and does not begin with any known binary signature.
 */
function isMarkdownText(buf: Uint8Array): boolean {
  if (buf.length === 0) return false;
  if (buf.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

export function detectMimeType(buf: Uint8Array): CanonicalMime | null {
  if (startsWith(buf, ascii("%PDF-"))) return "application/pdf";
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(buf, ascii("RIFF")) && startsWith(buf, ascii("WEBP"), 8)) return "image/webp";
  if (isMarkdownText(buf)) return "text/markdown";
  return null;
}

export type ValidatedFile = {
  buffer: Buffer;
  mimeType: CanonicalMime;
  fileType: FileTypeEnum;
  ext: string;
  originalFilename: string;
  size: number;
};

/** Removes path components and control characters from a client filename (display use only). */
export function sanitizeOriginalFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 255);
  return cleaned || "file";
}

export async function validateUpload(file: File, maxBytes: number): Promise<ValidatedFile> {
  if (file.size === 0) throw new ApiError("VALIDATION_ERROR", "The file is empty");
  if (file.size > maxBytes) {
    throw new ApiError("PAYLOAD_TOO_LARGE", `File exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit`);
  }

  const originalFilename = sanitizeOriginalFilename(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectMimeType(buffer);
  if (!detected) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Unsupported or unrecognised file. Allowed: PDF, PNG, JPG/JPEG, WEBP, Markdown.",
    );
  }

  const declared = (file.type || "").toLowerCase().split(";")[0]!.trim();
  if (!GENERIC_DECLARED.has(declared) && !DECLARED_ALIASES[detected].includes(declared)) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      `File content (${FILE_TYPES[detected].label}) does not match its declared type (${declared}).`,
    );
  }

  const ext = extensionOf(originalFilename);
  if (!EXTENSIONS[detected].includes(ext)) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      `File content (${FILE_TYPES[detected].label}) does not match its extension (${ext || "none"}).`,
    );
  }

  return {
    buffer,
    mimeType: detected,
    fileType: FILE_TYPE_ENUM[FILE_TYPES[detected].kind],
    ext: FILE_TYPES[detected].ext,
    originalFilename,
    size: buffer.length,
  };
}
