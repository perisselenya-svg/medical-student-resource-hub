// Copies pdf.js runtime assets (worker, wasm decoders, fonts, cmaps) from the
// pdfjs-dist version that react-pdf actually uses into public/pdfjs/, so the
// worker always matches the library version. Runs on postinstall.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const reactPdfDir = path.dirname(require.resolve("react-pdf/package.json"));
const pdfjsDir = path.dirname(require.resolve("pdfjs-dist/package.json", { paths: [reactPdfDir] }));
const target = path.resolve("public/pdfjs");

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(path.join(pdfjsDir, "build/pdf.worker.min.mjs"), path.join(target, "pdf.worker.min.mjs"));
for (const dir of ["wasm", "standard_fonts", "cmaps"]) {
  const source = path.join(pdfjsDir, dir);
  if (existsSync(source)) cpSync(source, path.join(target, dir), { recursive: true });
}
console.log(`pdf.js assets copied from ${pdfjsDir} to ${target}`);
