"use client";

import { useState, type DragEvent } from "react";

/** Drag-and-drop state + handlers for a drop zone element. */
export function useFileDrop(onFiles: (files: File[]) => void, { disabled = false } = {}) {
  const [dragging, setDragging] = useState(false);
  const accepts = (e: DragEvent) => !disabled && Array.from(e.dataTransfer.types).includes("Files");

  return {
    dragging,
    dropProps: {
      onDragEnter: (e: DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        setDragging(true);
      },
      onDragOver: (e: DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      },
      onDragLeave: (e: DragEvent) => {
        // Ignore leave events fired when moving between child elements.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      },
      onDrop: (e: DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) onFiles(files);
      },
    },
  };
}
