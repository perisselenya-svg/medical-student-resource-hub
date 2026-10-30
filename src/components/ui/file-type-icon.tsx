import { FileImage, FileText, NotebookText } from "lucide-react";
import { fileTypeInfo, type FileKind } from "@/lib/files/types";
import { cn } from "@/lib/utils";

const kindStyle: Record<FileKind, { Icon: typeof FileText; className: string; label: string }> = {
  pdf: { Icon: FileText, className: "bg-rose-50 text-rose-800", label: "PDF" },
  image: { Icon: FileImage, className: "bg-sky-50 text-sky-800", label: "Image" },
  markdown: { Icon: NotebookText, className: "bg-amber-50 text-amber-900", label: "Notes" },
};

/** Decorative card "cover" — fast, lightweight alternative to generated thumbnails. */
export function FileCover({ mimeType, className }: { mimeType: string; className?: string }) {
  const info = fileTypeInfo(mimeType);
  const { Icon, className: tone } = kindStyle[info.kind];
  return (
    <div className={cn("flex items-center justify-center gap-2", tone, className)} aria-hidden="true">
      <Icon className="h-8 w-8" strokeWidth={1.5} />
      <span className="text-sm font-bold tracking-wider">{info.label}</span>
    </div>
  );
}

/** Small icon + label, e.g. in cards and tables. */
export function FileTypeIcon({ mimeType, withLabel = true }: { mimeType: string; withLabel?: boolean }) {
  const info = fileTypeInfo(mimeType);
  const { Icon } = kindStyle[info.kind];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
      <Icon className="h-3.5 w-3.5" aria-hidden={withLabel} aria-label={withLabel ? undefined : info.label} />
      {withLabel && info.label}
    </span>
  );
}
