"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileUploadArea } from "@/components/ui/file-upload-area";
import { Modal } from "@/components/ui/modal";
import { precheckFile } from "@/lib/files/precheck";
import { ClientApiError, uploadWithProgress } from "@/lib/http/client-api";
import { formatBytes } from "@/lib/utils";
import type { MaterialDTO } from "@/types";

type Props = { material: MaterialDTO | null; maxBytes: number; onClose: () => void; onReplaced: (material: MaterialDTO) => void };

/** Re-upload: replaces the stored file; title, tags, counts and link stay the same. */
export function ReplaceFileDialog({ material, maxBytes, onClose, onReplaced }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const pick = (files: File[]) => {
    const next = files[0];
    if (!next) return;
    setError(precheckFile(next, maxBytes));
    setFile(next);
  };

  const close = () => {
    abortRef.current?.();
    setFile(null);
    setError(null);
    setProgress(null);
    onClose();
  };

  const submit = async () => {
    if (!material || !file || error) return;
    const form = new FormData();
    form.append("file", file);
    setProgress(0);
    const { promise, abort } = uploadWithProgress<MaterialDTO>(`/api/admin/materials/${material.id}/file`, form, { method: "PUT", onProgress: setProgress });
    abortRef.current = abort;
    try {
      const updated = await promise;
      setFile(null);
      onReplaced(updated);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Upload failed");
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  const percent = Math.round((progress ?? 0) * 100);
  return (
    <Modal open={Boolean(material)} onClose={close} title="Re-upload file" description={material?.title} size="sm">
      {material && (
        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600">
            Current file: <span className="font-medium text-slate-800">{material.originalFileName}</span> ({formatBytes(material.fileSize)}).
          </p>
          <FileUploadArea compact onFiles={pick} disabled={progress !== null} invalid={Boolean(error)} title={file ? file.name : "Drop a file or click to choose"} hint={file ? formatBytes(file.size) : undefined} />
          {error && <Alert tone="error">{error}</Alert>}
          {progress !== null && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                <div className="h-full bg-teal-600 transition-[width]" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-600">{percent < 100 ? `Uploading… ${percent}%` : "Validating and saving…"}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!file || Boolean(error)} loading={progress !== null} icon={<FileUp className="h-4 w-4" aria-hidden="true" />}>
              Replace file
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
