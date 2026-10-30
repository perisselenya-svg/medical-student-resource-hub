"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useElementWidth } from "@/hooks/use-element-width";

// Worker and decoder assets are copied from node_modules into public/pdfjs on
// install (scripts/copy-pdf-assets.mjs), so they always match this pdf.js version.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/**
 * pdf.js renders a canvas plus a real text layer (selectable, searchable,
 * readable by screen readers) and an annotation layer (working links).
 * Only the current page is rendered to keep memory low on phones.
 */
export default function PdfDocumentViewer({ url, title, downloadUrl }: { url: string | File; title: string; downloadUrl?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => ({
      cMapUrl: "/pdfjs/cmaps/",
      standardFontDataUrl: "/pdfjs/standard_fonts/",
      wasmUrl: "/pdfjs/wasm/",
    }),
    [],
  );

  const goTo = useCallback((next: number) => setPage((p) => Math.min(Math.max(1, next || p), numPages || 1)), [numPages]);
  const zoomBy = (direction: 1 | -1) =>
    setZoom((z) => {
      const index = ZOOM_STEPS.findIndex((s) => s >= z);
      return ZOOM_STEPS[Math.min(Math.max(0, index + direction), ZOOM_STEPS.length - 1)] ?? 1;
    });

  // Keyboard shortcuts while focus is inside the viewer (but not in the page-number field).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key === "ArrowRight" || e.key === "PageDown") goTo(page + 1);
    else if (e.key === "ArrowLeft" || e.key === "PageUp") goTo(page - 1);
    else if (e.key === "+" || e.key === "=") zoomBy(1);
    else if (e.key === "-") zoomBy(-1);
    else return;
    e.preventDefault();
  };

  const pageWidth = width > 0 ? Math.max(200, (width - 32) * zoom) : undefined;

  return (
    <div className="flex h-full flex-col" onKeyDown={onKeyDown}>
      <div role="toolbar" aria-label="PDF controls" className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-1">
          <button type="button" className="btn-ghost px-2" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <label className="flex items-center gap-1.5 text-sm">
            <span className="sr-only">Page number</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={numPages || 1}
              value={page}
              onChange={(e) => goTo(Number(e.target.value))}
              className="input w-16 px-2 py-1 text-center"
            />
            <span className="whitespace-nowrap text-slate-600">of {numPages || "–"}</span>
          </label>
          <button type="button" className="btn-ghost px-2" onClick={() => goTo(page + 1)} disabled={page >= numPages} aria-label="Next page">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="btn-ghost px-2" onClick={() => zoomBy(-1)} disabled={zoom <= ZOOM_STEPS[0]!} aria-label="Zoom out">
            <ZoomOut className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="w-12 text-center text-sm tabular-nums text-slate-700" aria-label={`Zoom ${Math.round(zoom * 100)} percent`}>
            {Math.round(zoom * 100)}%
          </span>
          <button type="button" className="btn-ghost px-2" onClick={() => zoomBy(1)} disabled={zoom >= ZOOM_STEPS.at(-1)!} aria-label="Zoom in">
            <ZoomIn className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" className="btn-ghost px-2" onClick={() => setZoom(1)} aria-label="Fit to width">
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {numPages > 0 && `Page ${page} of ${numPages}`}
      </p>

      <div
        ref={containerRef}
        // Focusable so keyboard users can scroll and use the shortcuts.
        tabIndex={0}
        aria-label={`${title}, PDF document. Use arrow keys to change page.`}
        className="min-h-0 flex-1 overflow-auto bg-slate-200 p-4"
      >
        {error ? (
          <Alert tone="error" title="This PDF could not be displayed">
            {error}
            {downloadUrl && (
              <>
                {" "}
                <a href={downloadUrl} className="font-semibold underline">
                  Download it instead
                </a>
                .
              </>
            )}
          </Alert>
        ) : (
          <Document
            file={url}
            options={options}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              setPage(1);
            }}
            onLoadError={() => setError("The file may be damaged or your browser may not support it.")}
            loading={<Skeleton className="mx-auto aspect-[1/1.41] w-full max-w-3xl bg-white" />}
            className="flex justify-center"
          >
            {pageWidth && (
              <Page
                pageNumber={page}
                width={pageWidth}
                className="shadow-lg"
                loading={<Skeleton className="aspect-[1/1.41] bg-white" />}
              />
            )}
          </Document>
        )}
      </div>
    </div>
  );
}
