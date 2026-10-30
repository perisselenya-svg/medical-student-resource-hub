import "dotenv/config";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectMimeType, sanitizeOriginalFilename, validateUpload } from "@/lib/files/validation";
import { makeDiagramPng, makePdf } from "../scripts/lib/demo-files";

const MB = 1024 * 1024;
const file = (data: Buffer | string, name: string, type: string) => new File([typeof data === "string" ? data : new Uint8Array(data)], name, { type });
const rejects = (promise: Promise<unknown>, code: string) => assert.rejects(promise, (e: { code?: string }) => e.code === code);

describe("detectMimeType", () => {
  it("identifies supported formats by signature", () => {
    assert.equal(detectMimeType(makePdf("t", ["x"])), "application/pdf");
    assert.equal(detectMimeType(makeDiagramPng(10, 10)), "image/png");
    assert.equal(detectMimeType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])), "image/jpeg");
    assert.equal(detectMimeType(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1")), "image/webp");
    assert.equal(detectMimeType(Buffer.from("# Notes\n\n- item ✓\n")), "text/markdown");
  });

  it("rejects binaries, ZIP/Office files and invalid text", () => {
    assert.equal(detectMimeType(Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03])), null); // Windows EXE ("MZ"), contains NUL
    assert.equal(detectMimeType(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])), null); // ZIP / DOCX (not supported)
    assert.equal(detectMimeType(Buffer.from([0xc3, 0x28])), null); // invalid UTF-8
  });
});

describe("validateUpload", () => {
  it("accepts a consistent file and returns the canonical type", async () => {
    const result = await validateUpload(file(makePdf("t", ["x"]), "notes.pdf", "application/pdf"), MB);
    assert.equal(result.mimeType, "application/pdf");
    assert.equal(result.fileType, "PDF");
    assert.equal(result.ext, ".pdf");
  });

  it("accepts generic browser MIME types for markdown and records the file type", async () => {
    const md = await validateUpload(file("# hi", "a.md", ""), MB);
    assert.equal(md.mimeType, "text/markdown");
    assert.equal(md.fileType, "MARKDOWN");
    assert.equal((await validateUpload(file("# hi", "notes.markdown", "application/octet-stream"), MB)).ext, ".md");
    assert.equal((await validateUpload(file(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]), "x.jpeg", "image/jpeg"), MB)).fileType, "IMAGE");
  });

  it("rejects content that contradicts the declared type or extension", async () => {
    await rejects(validateUpload(file(makePdf("t", []), "a.pdf", "image/png"), MB), "UNSUPPORTED_MEDIA_TYPE");
    await rejects(validateUpload(file(makePdf("t", []), "a.png", "application/octet-stream"), MB), "UNSUPPORTED_MEDIA_TYPE");
    await rejects(validateUpload(file("<svg onload=alert(1)>", "x.svg", "image/svg+xml"), MB), "UNSUPPORTED_MEDIA_TYPE");
    await rejects(validateUpload(file("<html><script>", "x.html", "text/html"), MB), "UNSUPPORTED_MEDIA_TYPE");
    await rejects(validateUpload(file("<html><script>", "x.md", "text/html"), MB), "UNSUPPORTED_MEDIA_TYPE");
    await rejects(validateUpload(file(Buffer.from([0x50, 0x4b, 3, 4, 0, 0]), "notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), MB), "UNSUPPORTED_MEDIA_TYPE");
  });

  it("enforces size limits and rejects empty files", async () => {
    await rejects(validateUpload(file(Buffer.alloc(2048, 0x41), "a.md", "text/markdown"), 1024), "PAYLOAD_TOO_LARGE");
    await rejects(validateUpload(file("", "a.md", "text/markdown"), MB), "VALIDATION_ERROR");
  });

  it("strips paths and control characters from original filenames", () => {
    assert.equal(sanitizeOriginalFilename("../../etc/passwd"), "passwd");
    assert.equal(sanitizeOriginalFilename("C:\\Users\\me\\notes\u0000.pdf"), "notes.pdf");
  });
});
