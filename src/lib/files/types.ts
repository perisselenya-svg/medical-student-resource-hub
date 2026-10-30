/**
 * Supported upload types, shared by client (pre-checks, labels, icons) and
 * server (authoritative validation lives in src/lib/files/validation.ts).
 */
export const FILE_KINDS = ["pdf", "image", "markdown"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

/** Prisma enum value for each kind. */
export const FILE_TYPE_ENUM = { pdf: "PDF", image: "IMAGE", markdown: "MARKDOWN" } as const;
export type FileTypeEnum = (typeof FILE_TYPE_ENUM)[FileKind];

export type FileTypeInfo = { kind: FileKind; ext: string; label: string };

/** Canonical MIME type → info. `Material.mimeType` is always one of these keys. */
export const FILE_TYPES = {
  "application/pdf": { kind: "pdf", ext: ".pdf", label: "PDF" },
  "image/png": { kind: "image", ext: ".png", label: "PNG" },
  "image/jpeg": { kind: "image", ext: ".jpg", label: "JPG" },
  "image/webp": { kind: "image", ext: ".webp", label: "WEBP" },
  "text/markdown": { kind: "markdown", ext: ".md", label: "Markdown" },
} as const satisfies Record<string, FileTypeInfo>;

export type CanonicalMime = keyof typeof FILE_TYPES;

export const KIND_LABELS: Record<FileKind, string> = { pdf: "PDF", image: "Image", markdown: "Markdown notes" };

export const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".md", ".markdown"];

/** Value for <input accept>. */
export const ACCEPT_ATTRIBUTE = [...ALLOWED_EXTENSIONS, ...Object.keys(FILE_TYPES)].join(",");

export function fileTypeInfo(mimeType: string): FileTypeInfo {
  return (FILE_TYPES as Record<string, FileTypeInfo>)[mimeType] ?? { kind: "markdown", ext: "", label: "File" };
}

export function kindFromEnum(value: FileTypeEnum): FileKind {
  return value === "PDF" ? "pdf" : value === "IMAGE" ? "image" : "markdown";
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}
