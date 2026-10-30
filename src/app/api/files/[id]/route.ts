import { getCurrentAdmin } from "@/lib/auth/guard";
import { storage } from "@/lib/files/storage";
import { errorResponse } from "@/lib/http/api";
import { getMaterialFileRecord } from "@/lib/services/material.service";
import { idSchema } from "@/lib/validation/common";

type Context = { params: Promise<{ id: string }> };

/**
 * GET/HEAD /api/files/:id[?download=1]
 *
 * The ONLY way stored files leave the server (uploads live outside public/).
 *  - PUBLISHED: anyone may view inline (PDF/images) or download.
 *  - DRAFT:     only a signed-in admin, inline preview only — downloads are
 *               allowed for published materials only.
 *  - otherwise: 404 (not 403, so draft ids are not confirmed to exist).
 * The storage key is looked up from the database; it never comes from the URL.
 */
async function serve(request: Request, { params }: Context, headOnly: boolean): Promise<Response> {
  const parsed = idSchema.safeParse((await params).id);
  if (!parsed.success) return errorResponse("NOT_FOUND", "File not found");
  const record = await getMaterialFileRecord(parsed.data);
  if (!record) return errorResponse("NOT_FOUND", "File not found");

  const wantsDownload = new URL(request.url).searchParams.get("download") === "1";
  if (!record.isPublished) {
    if (!(await getCurrentAdmin())) return errorResponse("NOT_FOUND", "File not found");
    if (wantsDownload) return errorResponse("FORBIDDEN", "Publish this material before downloading it");
  }

  const info = await storage().stat(record.storedFileName);
  if (!info) {
    console.error(`[files] missing object for material ${record.id}: ${record.storedFileName}`);
    return errorResponse("NOT_FOUND", "File not found");
  }

  const isMarkdown = record.fileType === "MARKDOWN";
  const inline = !wantsDownload;
  // Markdown shown inline is served as plain text so a browser never interprets it.
  const contentType = isMarkdown && inline ? "text/plain; charset=utf-8" : isMarkdown ? "text/markdown; charset=utf-8" : record.mimeType;
  const etag = `"${record.id}-${record.updatedAt.getTime().toString(36)}-${info.size}"`;

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", record.originalFileName),
    "Accept-Ranges": "bytes",
    ETag: etag,
    "Last-Modified": record.updatedAt.toUTCString(),
    // Drafts never cached; published briefly, so unpublishing takes effect quickly.
    "Cache-Control": record.isPublished ? "public, max-age=300, must-revalidate" : "private, no-store",
    "X-Content-Type-Options": "nosniff", // no MIME sniffing (e.g. text treated as HTML)
    "Cross-Origin-Resource-Policy": "same-origin",
    // Images/text opened directly get a script-free sandbox. PDFs are excluded
    // because browser PDF viewers refuse to render sandboxed documents.
    ...(record.fileType === "PDF" ? {} : { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }),
  });

  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  const range = parseRange(request.headers.get("range"), info.size);
  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${info.size}`);
    return new Response(null, { status: 416, headers });
  }
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${info.size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    return new Response(headOnly ? null : await storage().getStream(record.storedFileName, range), { status: 206, headers });
  }
  headers.set("Content-Length", String(info.size));
  return new Response(headOnly ? null : await storage().getStream(record.storedFileName), { status: 200, headers });
}

/** Single-range support ("bytes=a-b", "bytes=a-", "bytes=-n") for PDF viewers on slow connections. */
function parseRange(header: string | null, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, startRaw, endRaw] = match;
  let start: number;
  let end: number;
  if (startRaw === "") {
    if (!endRaw) return "invalid";
    start = Math.max(0, size - Number(endRaw));
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw ? Math.min(Number(endRaw), size - 1) : size - 1;
  }
  return start > end || start >= size ? "invalid" : { start, end };
}

/**
 * RFC 6266 Content-Disposition with ASCII fallback + RFC 5987 UTF-8 name.
 * Quotes, backslashes and control characters are replaced so a crafted
 * filename cannot inject header parameters.
 */
function contentDisposition(type: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: Request, context: Context) {
  return serve(request, context, false);
}

export async function HEAD(request: Request, context: Context) {
  return serve(request, context, true);
}
