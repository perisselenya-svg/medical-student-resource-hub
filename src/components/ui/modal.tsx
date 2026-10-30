"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
};

/**
 * Accessible modal built on the native <dialog> element:
 *  - showModal() makes the rest of the page inert and keeps focus inside;
 *  - Escape closes it (native "cancel" event);
 *  - it is labelled by its title (and description) for screen readers;
 *  - focus returns to the element that opened it when it closes.
 */
export function Modal({ open, onClose, title, description, actions, children, size = "md" }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusTo.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Restore focus after closing, whichever way it was closed.
  useEffect(() => {
    if (open) return;
    const target = returnFocusTo.current;
    returnFocusTo.current = null;
    if (target && document.contains(target)) target.focus();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Click on the backdrop (the dialog element itself, outside the panel) closes.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-hidden rounded-2xl bg-white p-0 text-slate-800 shadow-2xl",
        size === "sm" && "max-w-md",
        size === "md" && "max-w-2xl",
        size === "lg" && "max-w-5xl",
        size === "full" && "h-[calc(100dvh-1rem)] max-w-6xl",
      )}
    >
      {open && (
        <div className={cn("flex max-h-[calc(100dvh-1rem)] flex-col", size === "full" && "h-full")}>
          <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate text-lg font-semibold text-ink">
                {title}
              </h2>
              {description && (
                <div id={descriptionId} className="mt-0.5 text-sm text-slate-600">
                  {description}
                </div>
              )}
            </div>
            {actions && <div className="hidden items-center gap-2 sm:flex">{actions}</div>}
            <button type="button" onClick={onClose} className="btn-ghost -mr-2 px-2" aria-label="Close dialog">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
          {actions && <footer className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3 sm:hidden">{actions}</footer>}
        </div>
      )}
    </dialog>
  );
}
