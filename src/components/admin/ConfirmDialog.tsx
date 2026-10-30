"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({ open, title, children, confirmLabel, pending, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={pending ? () => undefined : onClose} title={title} size="sm">
      <div className="space-y-4 p-5 text-sm text-slate-700">
        {children}
        <div className="flex justify-end gap-2">
          {/* Cancel first in DOM so it receives initial focus — the safe default. */}
          <button type="button" className="btn-secondary" onClick={onClose} disabled={pending} autoFocus>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
