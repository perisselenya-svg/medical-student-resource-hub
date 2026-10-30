"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import type { MaterialDTO } from "@/types";
import { DownloadButton } from "./DownloadButton";
import { PdfViewer } from "./PdfViewer";

export function PDFViewerModal({ material, onClose }: { material: MaterialDTO | null; onClose: () => void }) {
  const downloadUrl = material ? `${material.fileUrl}&download=1` : "";
  return (
    <Modal
      open={Boolean(material)}
      onClose={onClose}
      size="full"
      title={material?.title ?? "PDF"}
      description={material && `${material.category.name} · Updated ${formatDate(material.updatedAt)}`}
      actions={
        material && (
          <>
            <Link href={`/materials/${material.slug}`} className="btn-ghost btn-sm">
              Details
            </Link>
            <a href={material.fileUrl} target="_blank" rel="noopener" className="btn-ghost btn-sm">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> New tab
            </a>
            <DownloadButton materialId={material.id} href={material.fileUrl} label="Download" size="sm" />
          </>
        )
      }
    >
      {material && <PdfViewer url={material.fileUrl} title={material.title} downloadUrl={downloadUrl} />}
    </Modal>
  );
}
