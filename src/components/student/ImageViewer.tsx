"use client";

import { useState, type KeyboardEvent } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

const ZOOMS = [1, 1.5, 2, 3, 4];

/**
 * Embedded image viewer with zoom (buttons, +/- keys, double-click/tap) and
 * panning by scrolling the viewport — works with touch on phones.
 */
export function ImageViewer({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const zoom = ZOOMS[zoomIndex]!;
  const step = (d: 1 | -1) => setZoomIndex((i) => Math.min(Math.max(i + d, 0), ZOOMS.length - 1));

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "+" || e.key === "=") step(1);
    else if (e.key === "-") step(-1);
    else if (e.key === "0") setZoomIndex(0);
    else return;
    e.preventDefault();
  };

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-900", className)}>
      <div role="toolbar" aria-label="Image controls" className="flex items-center justify-end gap-1 border-b border-slate-700 bg-slate-800 px-2 py-1.5 text-slate-100">
        <button type="button" className="btn btn-sm text-slate-100 hover:bg-slate-700" onClick={() => step(-1)} disabled={zoomIndex === 0} aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="w-12 text-center text-xs tabular-nums" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" className="btn btn-sm text-slate-100 hover:bg-slate-700" onClick={() => step(1)} disabled={zoomIndex === ZOOMS.length - 1} aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-sm text-slate-100 hover:bg-slate-700" onClick={() => setZoomIndex(0)} aria-label="Fit to screen">
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div
        tabIndex={0}
        role="group"
        aria-label={`${alt}. Use plus and minus keys to zoom, arrow keys to pan.`}
        onKeyDown={onKeyDown}
        className={cn("relative min-h-64 flex-1 overflow-auto", zoom === 1 && "flex items-center justify-center")}
      >
        {status === "loading" && (
          <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
            Loading image…
          </p>
        )}
        {status === "error" ? (
          <p role="alert" className="p-8 text-center text-slate-200">
            The image could not be loaded.
          </p>
        ) : (
          // Plain <img>: files come from our access-controlled route; the Next.js
          // optimizer would cache copies outside that access control.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
            onDoubleClick={() => setZoomIndex((i) => (i === 0 ? 2 : 0))}
            style={zoom === 1 ? undefined : { width: `${zoom * 100}%`, maxWidth: "none" }}
            className={cn("transition-opacity", status === "loaded" ? "opacity-100" : "opacity-0", zoom === 1 ? "max-h-[75dvh] max-w-full object-contain" : "h-auto")}
          />
        )}
      </div>
    </div>
  );
}
