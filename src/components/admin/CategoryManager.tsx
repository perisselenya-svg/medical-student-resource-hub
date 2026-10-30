"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { Alert } from "@/components/ui/alert";
import { SectionCard } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/http/client-api";
import type { CategoryDTO } from "@/types";
import { ConfirmDialog } from "./ConfirmDialog";

export function CategoryManager({ categories }: { categories: CategoryDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [pending, setPending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const inUse = deleting ? deleting.materialCount + deleting.quizCount > 0 : false;

  const remove = async () => {
    if (!deleting) return;
    if (inUse && !moveTo) {
      setDeleteError("Choose where to move its materials and quizzes.");
      return;
    }
    setPending(true);
    try {
      await apiFetch(`/api/admin/categories/${deleting.id}${inUse ? `?moveTo=${encodeURIComponent(moveTo)}` : ""}`, { method: "DELETE" });
      toast.success(`Category “${deleting.name}” deleted.`);
      setDeleting(null);
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof ClientApiError ? e.message : "Could not delete category");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="New category" titleId="new-category">
        <div className="p-5">
          <CategoryForm
            submitLabel="Add"
            initial={undefined}
            onSubmit={async (values) => {
              await apiFetch("/api/admin/categories", { method: "POST", json: values });
              toast.success(`Category “${values.name}” created.`);
              router.refresh();
            }}
          />
        </div>
      </SectionCard>

      <SectionCard title={`Categories (${categories.length})`} titleId="category-list">
        <ul className="divide-y divide-slate-100">
          {categories.map((c) => (
            <li key={c.id} className="px-5 py-4">
              {editing === c.id ? (
                <CategoryForm
                  submitLabel="Save"
                  initial={{ name: c.name, description: c.description ?? "", displayOrder: c.displayOrder }}
                  onCancel={() => setEditing(null)}
                  onSubmit={async (values) => {
                    await apiFetch(`/api/admin/categories/${c.id}`, { method: "PATCH", json: values });
                    toast.success("Category updated.");
                    setEditing(null);
                    router.refresh();
                  }}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-12 text-xs tabular-nums text-slate-500" title="Display order">
                    #{c.displayOrder}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{c.name}</p>
                    {c.description && <p className="truncate text-sm text-slate-600">{c.description}</p>}
                  </div>
                  <span className="text-sm text-slate-600">
                    {c.materialCount} material{c.materialCount === 1 ? "" : "s"} · {c.quizCount} quiz{c.quizCount === 1 ? "" : "zes"}
                  </span>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(c.id)} aria-label={`Edit ${c.name}`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setDeleting(c);
                      setMoveTo("");
                      setDeleteError(null);
                    }}
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

      <ConfirmDialog open={Boolean(deleting)} title="Delete category?" confirmLabel={inUse ? "Move content and delete" : "Delete"} pending={pending} onConfirm={remove} onClose={() => setDeleting(null)}>
        {deleting && !inUse && (
          <p>
            Delete the empty category <strong>“{deleting.name}”</strong>?
          </p>
        )}
        {deleting && inUse && (
          <>
            <p>
              <strong>“{deleting.name}”</strong> contains {deleting.materialCount} material(s) and {deleting.quizCount} quiz(zes). They will be moved to the
              category you choose, then the category is deleted.
            </p>
            <Field label="Move content to" required>
              {(a) => (
                <Select {...a} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                  <option value="">Choose a category…</option>
                  {categories
                    .filter((c) => c.id !== deleting.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
          </>
        )}
        {deleteError && <Alert tone="error">{deleteError}</Alert>}
      </ConfirmDialog>
    </div>
  );
}
