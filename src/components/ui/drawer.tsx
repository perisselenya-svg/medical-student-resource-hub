"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  side?: "left" | "right";
  children: ReactNode;
};

/**
 * Slide-in panel built on a modal <dialog>: background is inert, focus stays
 * inside, Escape and backdrop clicks close it, and focus returns to the opener.
 * Used for mobile navigation and the mobile filter sidebar.
 */
export function Drawer({ open, onClose, title, side = "right", children }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      if (opener.current && document.contains(opener.current)) opener.current.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-0 h-dvh max-h-dvh w-[min(22rem,90vw)] max-w-none bg-white p-0 shadow-2xl",
        side === "right" ? "ml-auto" : "mr-auto",
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 id={titleId} className="font-semibold text-ink">
              {title}
            </h2>
            <button type="button" className="btn-ghost px-2" onClick={onClose} aria-label="Close panel">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
