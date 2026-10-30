"use client";

import { useState } from "react";
import { trackView } from "@/lib/http/track";
import type { MaterialDTO } from "@/types";
import { ImageViewerModal } from "./ImageViewerModal";
import { MaterialCard } from "./MaterialCard";
import { PDFViewerModal } from "./PDFViewerModal";

/** Responsive grid of resource cards; owns the Quick View modals for PDFs and images. */
export function ResourceGallery({ materials, headingLevel }: { materials: MaterialDTO[]; headingLevel?: "h2" | "h3" }) {
  const [active, setActive] = useState<MaterialDTO | null>(null);
  const open = (m: MaterialDTO) => {
    trackView(m.id);
    setActive(m);
  };
  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {materials.map((m) => (
          <li key={m.id}>
            <MaterialCard material={m} onQuickView={open} headingLevel={headingLevel} />
          </li>
        ))}
      </ul>
      <PDFViewerModal material={active?.fileType === "PDF" ? active : null} onClose={() => setActive(null)} />
      <ImageViewerModal material={active?.fileType === "IMAGE" ? active : null} onClose={() => setActive(null)} />
    </>
  );
}
