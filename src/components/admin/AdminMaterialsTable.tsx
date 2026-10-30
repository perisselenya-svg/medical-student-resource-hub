"use client";

import { startTransition, useOptimistic, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileUp, Pencil, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/http/client-api";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { MaterialDTO } from "@/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { ReplaceFileDialog } from "./ReplaceFileDialog";

type Patch = Partial<Pick<MaterialDTO, "isPublished" | "isFeatured">>;
type Action = { type: "patch"; id: string; patch: Patch } | { type: "delete"; id: string };

/**
 * Publish/feature toggles and delete update the table immediately
 * (useOptimistic); on failure React reverts to server data and we show an error.
 */
export function AdminMaterialsTable({ materials, maxBytes }: { materials: MaterialDTO[]; maxBytes: number }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, applyOptimistic] = useOptimistic(materials, (state: MaterialDTO[], action: Action) =>
    action.type === "delete" ? state.filter((m) => m.id !== action.id) : state.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)),
  );
  const [replacing, setReplacing] = useState<MaterialDTO | null>(null);
  const [deleting, setDeleting] = useState<MaterialDTO | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const patch = (m: MaterialDTO, change: Patch, message: string) =>
    startTransition(async () => {
      applyOptimistic({ type: "patch", id: m.id, patch: change });
      try {
        await apiFetch(`/api/admin/materials/${m.id}`, { method: "PATCH", json: change });
        toast.success(message);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof ClientApiError ? e.message : "Update failed");
      }
    });

  const confirmDelete = () => {
    const m = deleting;
    if (!m) return;
    setDeletePending(true);
    startTransition(async () => {
      applyOptimistic({ type: "delete", id: m.id });
      try {
        await apiFetch(`/api/admin/materials/${m.id}`, { method: "DELETE" });
        toast.success(`Deleted “${m.title}”.`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof ClientApiError ? e.message : "Could not delete material");
      } finally {
        setDeletePending(false);
        setDeleting(null);
      }
    });
  };

  return (
    <>
      <Table label="Materials" minWidth="68rem">
        <THead>
          <Th>Title</Th>
          <Th>Category</Th>
          <Th>Tags</Th>
          <Th>Type</Th>
          <Th className="text-right">Size</Th>
          <Th>Status</Th>
          <Th className="text-right">Views</Th>
          <Th className="text-right">Downloads</Th>
          <Th>Uploaded</Th>
          <Th className="text-right">Actions</Th>
        </THead>
        <TBody>
          {rows.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50/60">
              <Td className="max-w-64">
                <Link href={`/admin/materials/${m.id}`} className="font-semibold text-ink hover:text-teal-800 hover:underline">
                  {m.title}
                </Link>
                <p className="truncate text-xs text-slate-500" title={m.originalFileName}>
                  {m.originalFileName}
                </p>
              </Td>
              <Td>
                <Badge tone="brand">{m.category.name}</Badge>
              </Td>
              <Td className="max-w-48 text-xs text-slate-600">{m.tags.map((t) => t.name).join(", ") || "—"}</Td>
              <Td>
                <FileTypeIcon mimeType={m.mimeType} />
              </Td>
              <Td className="whitespace-nowrap text-right tabular-nums text-slate-600">{formatBytes(m.fileSize)}</Td>
              <Td>
                <div className="flex flex-col items-start gap-1">
                  <button
                    type="button"
                    onClick={() => patch(m, { isPublished: !m.isPublished }, `“${m.title}” ${m.isPublished ? "unpublished" : "published"}.`)}
                    className="rounded"
                    aria-label={`${m.isPublished ? "Unpublish" : "Publish"} “${m.title}” (currently ${m.isPublished ? "published" : "draft"})`}
                  >
                    <Badge tone={m.isPublished ? "success" : "warning"}>{m.isPublished ? "Published" : "Draft"}</Badge>
                  </button>
                  <button
                    type="button"
                    onClick={() => patch(m, { isFeatured: !m.isFeatured }, `“${m.title}” ${m.isFeatured ? "unfeatured" : "featured"}.`)}
                    aria-pressed={m.isFeatured}
                    aria-label={`${m.isFeatured ? "Unfeature" : "Feature"} “${m.title}”`}
                    className={cn("inline-flex items-center gap-1 rounded text-xs", m.isFeatured ? "font-semibold text-amber-800" : "text-slate-500 hover:text-slate-800")}
                  >
                    <Star className={cn("h-3.5 w-3.5", m.isFeatured && "fill-amber-500 text-amber-500")} aria-hidden="true" />
                    {m.isFeatured ? "Featured" : "Feature"}
                  </button>
                </div>
              </Td>
              <Td className="text-right tabular-nums text-slate-600">{m.viewCount}</Td>
              <Td className="text-right tabular-nums text-slate-600">{m.downloadCount}</Td>
              <Td className="whitespace-nowrap text-slate-600">
                <time dateTime={m.createdAt}>{formatDate(m.createdAt)}</time>
              </Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <Link href={`/admin/materials/${m.id}`} className="btn-ghost btn-sm" aria-label={`Edit “${m.title}”`} title="Edit">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <a href={m.fileUrl} target="_blank" rel="noopener" className="btn-ghost btn-sm" aria-label={`Preview “${m.title}” in a new tab`} title="Preview">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setReplacing(m)} aria-label={`Re-upload file for “${m.title}”`} title="Re-upload">
                    <FileUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-ghost btn-sm text-red-700 hover:bg-red-50" onClick={() => setDeleting(m)} aria-label={`Delete “${m.title}”`} title="Delete">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </TBody>
      </Table>

      <ReplaceFileDialog
        material={replacing}
        maxBytes={maxBytes}
        onClose={() => setReplacing(null)}
        onReplaced={(updated) => {
          setReplacing(null);
          toast.success(`File replaced for “${updated.title}”.`);
          router.refresh();
        }}
      />
      <ConfirmDialog open={Boolean(deleting)} title="Delete material?" confirmLabel="Delete permanently" pending={deletePending} onConfirm={confirmDelete} onClose={() => setDeleting(null)}>
        <p>
          This permanently deletes <strong>“{deleting?.title}”</strong> and its stored file. Students immediately lose access. This cannot be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
