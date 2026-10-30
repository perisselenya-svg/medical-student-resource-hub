"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, FileUp, Save, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ReplaceFileDialog } from "@/components/admin/ReplaceFileDialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { fileTypeInfo } from "@/lib/files/types";
import { apiFetch, ClientApiError } from "@/lib/http/client-api";
import { formatBytes, formatDate } from "@/lib/utils";
import { materialFormSchema, type MaterialFormValues } from "@/lib/validation/material";
import type { CategorySummary, MaterialDTO, TagSummary } from "@/types";
import { MaterialMetadataFields } from "./MaterialMetadataFields";

type Props = { material: MaterialDTO; categories: CategorySummary[]; tags: TagSummary[]; maxBytes: number };

export function MaterialEditForm({ material, categories, tags, maxBytes }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { control, register, handleSubmit, setValue, setError, formState } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      title: material.title,
      slug: material.slug,
      description: material.description,
      categoryId: material.category.id,
      tagIds: material.tags.map((t) => t.id),
      isPublished: material.isPublished,
      isFeatured: material.isFeatured,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await apiFetch(`/api/admin/materials/${material.id}`, { method: "PATCH", json: { ...values, slug: values.slug || undefined } });
      toast.success("Changes saved.");
      router.refresh();
    } catch (e) {
      if (e instanceof ClientApiError) {
        for (const [field, messages] of Object.entries(e.fieldErrors)) {
          if (field in values) setError(field as keyof MaterialFormValues, { message: messages[0] });
        }
        setServerError(e.message);
      } else setServerError("Could not save changes.");
    }
  });

  const remove = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/materials/${material.id}`, { method: "DELETE" });
      toast.success(`Deleted “${material.title}”.`);
      router.push("/admin/materials");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Could not delete.");
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const facts: Array<[string, string]> = [
    ["File", material.originalFileName],
    ["Type", fileTypeInfo(material.mimeType).label],
    ["Size", formatBytes(material.fileSize)],
    ["Uploaded", formatDate(material.createdAt)],
    ["Updated", formatDate(material.updatedAt)],
    ["Views", material.viewCount.toLocaleString("en-US")],
    ["Downloads", material.downloadCount.toLocaleString("en-US")],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={onSubmit} noValidate className="card space-y-5 p-5 sm:p-6">
        {serverError && <Alert tone="error">{serverError}</Alert>}
        <MaterialMetadataFields
          control={control}
          register={register}
          setValue={setValue}
          errors={formState.errors}
          categories={categories}
          tags={tags}
          slugTouched
          onSlugTouched={() => undefined}
        />
        <div className="flex justify-end border-t border-slate-200 pt-4">
          <Button type="submit" loading={formState.isSubmitting} icon={<Save className="h-4 w-4" aria-hidden="true" />}>
            Save changes
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        <section aria-labelledby="file-info" className="card p-5 text-sm">
          <h2 id="file-info" className="mb-3 font-semibold text-ink">
            File
          </h2>
          <dl className="space-y-2">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="truncate text-right font-medium" title={v}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-col gap-2">
            <a href={material.fileUrl} target="_blank" rel="noopener" className="btn-secondary">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Preview file
            </a>
            {material.isPublished && (
              <a href={`/materials/${material.slug}`} target="_blank" rel="noopener" className="btn-ghost">
                View public page
              </a>
            )}
            <Button variant="secondary" onClick={() => setReplaceOpen(true)} icon={<FileUp className="h-4 w-4" aria-hidden="true" />}>
              Re-upload file
            </Button>
          </div>
        </section>
        <section aria-labelledby="danger" className="card border-red-200 p-5 text-sm">
          <h2 id="danger" className="font-semibold text-red-900">
            Danger zone
          </h2>
          <p className="mt-1 text-slate-600">Deletes the database record and the stored file permanently.</p>
          <Button variant="danger" className="mt-3 w-full" onClick={() => setDeleteOpen(true)} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
            Delete material
          </Button>
        </section>
      </aside>

      <ReplaceFileDialog
        material={replaceOpen ? material : null}
        maxBytes={maxBytes}
        onClose={() => setReplaceOpen(false)}
        onReplaced={() => {
          setReplaceOpen(false);
          toast.success("File replaced.");
          router.refresh();
        }}
      />
      <ConfirmDialog open={deleteOpen} title="Delete material?" confirmLabel="Delete permanently" pending={deleting} onConfirm={remove} onClose={() => setDeleteOpen(false)}>
        <p>
          This permanently deletes <strong>“{material.title}”</strong> and its stored file. This cannot be undone.
        </p>
      </ConfirmDialog>
    </div>
  );
}
