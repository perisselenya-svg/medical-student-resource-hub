"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Embedded PDF viewer (pdf.js via react-pdf). Loaded lazily and only in the
 * browser: no plugins required, works on mobile, renders a selectable and
 * screen-reader-readable text layer. Used inline on resource pages and inside
 * the Quick View modal.
 */
export const PdfViewer = dynamic(() => import("./PdfDocumentViewer"), {
  ssr: false,
  loading: () => (
    <div className="p-4" role="status">
      <span className="sr-only">Loading PDF viewer…</span>
      <Skeleton className="mx-auto aspect-[1/1.41] w-full max-w-3xl" />
    </div>
  ),
});
