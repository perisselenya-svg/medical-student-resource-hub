"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { formatDate, imageAltText } from "@/lib/utils";
import type { MaterialDTO } from "@/types";
import { DownloadButton } from "./DownloadButton";
import { ImageViewer } from "./ImageViewer";

export function ImageViewerModal({ material, onClose }: { material: MaterialDTO | null; onClose: () => void }) {
  return (
    <Modal
      open={Boolean(material)}
      onClose={onClose}
      size="lg"
      title={material?.title ?? "Image"}
      description={material && `${material.category.name} · Updated ${formatDate(material.updatedAt)}`}
      actions={
        material && (
          <>
            <Link href={`/materials/${material.slug}`} className="btn-ghost btn-sm">
              Details
            </Link>
            <DownloadButton materialId={material.id} href={material.fileUrl} label="Download" size="sm" />
          </>
        )
      }
    >
      {material && <ImageViewer src={material.fileUrl} alt={imageAltText(material.title, material.description)} className="rounded-none border-0" />}
    </Modal>
  );
}
