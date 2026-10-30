/**
 * Generates small but genuinely valid demo files (PDF and PNG)
 * without extra dependencies, so the seed exercises the same signature
 * validation as real uploads.
 */
import { crc32, deflateSync } from "node:zlib";

/* --------------------------------- PDF --------------------------------- */

function pdfEscape(text: string): string {
  return text.replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1");
}

/** Multi-page text PDF (Helvetica, A4). Lines starting with "# " are headings. */
export function makePdf(title: string, lines: string[]): Buffer {
  const perPage = 42;
  const pages: string[][] = [];
  for (let i = 0; i < Math.max(lines.length, 1); i += perPage) pages.push(lines.slice(i, i + perPage));

  const objects: string[] = [];
  const add = (body: string) => objects.push(body) - 1 + 1; // 1-based object number
  const catalog = add("");
  const pagesObj = add("");
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const pageRefs: number[] = [];
  pages.forEach((pageLines, index) => {
    let y = 790;
    const ops: string[] = [];
    if (index === 0) {
      ops.push(`BT /F2 18 Tf 56 ${y} Td (${pdfEscape(title)}) Tj ET`);
      y -= 34;
    }
    for (const line of pageLines) {
      const heading = line.startsWith("# ");
      ops.push(`BT /${heading ? "F2" : "F1"} ${heading ? 13 : 11} Tf 56 ${y} Td (${pdfEscape(heading ? line.slice(2) : line)}) Tj ET`);
      y -= heading ? 22 : 17;
    }
    ops.push(`BT /F1 8 Tf 56 30 Td (Medical Student Resource Hub demo - educational use only - page ${index + 1} of ${pages.length}) Tj ET`);
    const stream = ops.join("\n");
    const content = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    pageRefs.push(
      add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${content} 0 R >>`),
    );
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageRefs.map((r) => `${r} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;

  let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${o.toString().padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/* --------------------------------- PNG --------------------------------- */

type RGB = [number, number, number];

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData) >>> 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/** Simple schematic "diagram": labelled-by-colour nodes joined by branches. */
export function makeDiagramPng(width = 720, height = 440): Buffer {
  const pixels = Buffer.alloc(width * height * 3, 0xf8);
  const set = (x: number, y: number, [r, g, b]: RGB) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 3;
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
  };
  const rect = (x0: number, y0: number, w: number, h: number, c: RGB) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c);
  };
  const line = (x0: number, y0: number, x1: number, y1: number, c: RGB, thickness = 3) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / steps);
      const y = Math.round(y0 + ((y1 - y0) * s) / steps);
      rect(x - (thickness >> 1), y - (thickness >> 1), thickness, thickness, c);
    }
  };

  rect(0, 0, width, 56, [31, 91, 94]);
  const roots: RGB = [47, 140, 141];
  const trunks: RGB = [74, 170, 169];
  const branches: RGB = [217, 119, 6];
  const rootY = [110, 170, 230, 290, 350];
  const trunkY = [140, 260, 330];
  rootY.forEach((y, i) => {
    rect(40, y - 14, 90, 28, roots);
    line(130, y, 300, trunkY[Math.min(2, Math.floor(i / 2))]!, [100, 116, 139]);
  });
  trunkY.forEach((y, i) => {
    rect(300, y - 16, 110, 32, trunks);
    line(410, y, 560, 100 + i * 120, [100, 116, 139]);
    line(410, y, 560, 160 + i * 110, [100, 116, 139]);
  });
  [100, 160, 220, 270, 330, 380].forEach((y) => rect(560, y - 14, 120, 28, branches));

  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
