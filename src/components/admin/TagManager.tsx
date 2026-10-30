"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { TagForm } from "@/components/forms/TagForm";
import { SectionCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/http/client-api";
import type { TagDTO } from "@/types";
import { ConfirmDialog } from "./ConfirmDialog";

export function TagManager({ tags }: { tags: TagDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TagDTO | null>(null);
  const [pending, setPending] = useState(false);

  const remove = async () => {
    if (!deleting) return;
    setPending(true);
    try {
      // The dialog itself is the confirmation, so in-use tags are sent with confirm=true.
      await apiFetch(`/api/admin/tags/${deleting.id}${deleting.materialCount > 0 ? "?confirm=true" : ""}`, { method: "DELETE" });
      toast.success(`Tag “${deleting.name}” deleted.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Could not delete tag");
    } finally {
      setPending(false);
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="New tag" titleId="new-tag">
        <div className="p-5">
          <TagForm
            submitLabel="Add"
            onSubmit={async (values) => {
              await apiFetch("/api/admin/tags", { method: "POST", json: values });
              toast.success(`Tag “${values.name}” saved.`);
              router.refresh();
            }}
          />
        </div>
      </SectionCard>

      <SectionCard title={`Tags (${tags.length})`} titleId="tag-list">
        {tags.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No tags yet">Tags you create here or while uploading will appear in this list.</EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tags.map((t) => (
              <li key={t.id} className="px-5 py-3">
                {editing === t.id ? (
                  <TagForm
                    submitLabel="Save"
                    initial={{ name: t.name }}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (values) => {
                      await apiFetch(`/api/admin/tags/${t.id}`, { method: "PATCH", json: values });
                      toast.success("Tag renamed.");
                      setEditing(null);
                      router.refresh();
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">#{t.name}</span>
                    <span className="text-sm text-slate-600">
                      {t.materialCount} material{t.materialCount === 1 ? "" : "s"}
                    </span>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(t.id)} aria-label={`Rename ${t.name}`}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" className="btn-ghost btn-sm text-red-700 hover:bg-red-50" onClick={() => setDeleting(t)} aria-label={`Delete ${t.name}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <ConfirmDialog open={Boolean(deleting)} title="Delete tag?" confirmLabel="Delete tag" pending={pending} onConfirm={remove} onClose={() => setDeleting(null)}>
        {deleting && deleting.materialCount > 0 ? (
          <p>
            <strong>“{deleting.name}”</strong> is used by {deleting.materialCount} material(s). Deleting it removes the tag from those materials; the
            materials themselves are kept.
          </p>
        ) : (
          <p>
            Delete the unused tag <strong>“{deleting?.name}”</strong>?
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
