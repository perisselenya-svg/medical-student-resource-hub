"use client";

import { useId, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";
import { useFileDrop } from "@/hooks/use-file-drop";
import { ACCEPT_ATTRIBUTE } from "@/lib/files/types";
import { cn } from "@/lib/utils";

type FileUploadAreaProps = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  title?: ReactNode;
  hint?: ReactNode;
  compact?: boolean;
};

/**
 * Drag-and-drop zone that is also a normal file input: the real <input> is
 * visually hidden but focusable, so keyboard and screen-reader users can
 * activate it with Enter/Space; the dashed area shows focus via focus-within.
 */
export function FileUploadArea({ onFiles, disabled, invalid, describedBy, title, hint, compact }: FileUploadAreaProps) {
  const inputId = useId();
  const { dragging, dropProps } = useFileDrop(onFiles, { disabled });
  return (
    <label
      htmlFor={inputId}
      {...dropProps}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-white text-center transition-colors focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-teal-600",
        compact ? "px-4 py-6" : "px-6 py-12",
        dragging ? "border-teal-600 bg-teal-50" : invalid ? "border-red-400" : "border-slate-300 hover:border-teal-500",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <UploadCloud className={cn("text-teal-700", compact ? "h-7 w-7" : "h-10 w-10")} aria-hidden="true" />
      <span className="font-semibold text-ink">{title ?? "Drag and drop a file here, or click to browse"}</span>
      {hint && <span className="text-sm text-slate-600">{hint}</span>}
      <input
        id={inputId}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="sr-only"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = ""; // allow choosing the same file again
        }}
      />
    </label>
  );
}
