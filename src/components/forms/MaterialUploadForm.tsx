"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, FileUp, Trash2 } from "lucide-react";
import { MarkdownViewer } from "@/components/student/MarkdownViewer";
import { PdfViewer } from "@/components/student/PdfViewer";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { FileUploadArea } from "@/components/ui/file-upload-area";
import { ClientApiError, uploadWithProgress } from "@/lib/http/client-api";
import { precheckFile } from "@/lib/files/precheck";
import { extensionOf } from "@/lib/files/types";
import { formatBytes, slugify, titleFromFilename } from "@/lib/utils";
import { materialFormSchema, type MaterialFormValues } from "@/lib/validation/material";
import type { CategorySummary, MaterialDTO, TagSummary } from "@/types";
import { MaterialMetadataFields } from "./MaterialMetadataFields";

const EMPTY: MaterialFormValues = { title: "", slug: "", description: "", categoryId: "", tagIds: [], isPublished: false, isFeatured: false };

function previewMime(file: File): string {
  const ext = extensionOf(file.name);
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".md" || ext === ".markdown") return "text/markdown";
  return "image/png";
}

/** Local preview of the chosen file before upload (nothing leaves the browser yet). */
function FilePreview({ file }: { file: File }) {
  const ext = extensionOf(file.name);
  const isImage = [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
  const isMarkdown = ext === ".md" || ext === ".markdown";
  const objectUrl = useMemo(() => (isImage ? URL.createObjectURL(file) : null), [file, isImage]);
  const [text, setText] = useState<string | null>(null);

  // Release the blob URL when the file changes or the preview unmounts.
  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  useEffect(() => {
    if (!isMarkdown) return;
    let cancelled = false;
    void file.slice(0, 64 * 1024).text().then((t) => {
      if (!cancelled) setText(t);
    });
    return () => {
      cancelled = true;
    };
  }, [file, isMarkdown]);

  if (objectUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={objectUrl} alt="Preview of the selected image" className="mx-auto max-h-80 rounded-lg object-contain" />;
  }
  if (ext === ".pdf") {
    return (
      <div className="h-96 overflow-hidden rounded-lg border border-slate-200">
        <PdfViewer url={file} title={`Preview of ${file.name}`} />
      </div>
    );
  }
  if (isMarkdown && text !== null) {
    return (
      <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white p-4">
        <MarkdownViewer source={text} />
      </div>
    );
  }
  return null;
}

export function MaterialUploadForm({ categories, tags, maxBytes }: { categories: CategorySummary[]; tags: TagSummary[]; maxBytes: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<MaterialDTO | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const { control, register, handleSubmit, setValue, getValues, setError, reset, formState } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (uploaded) successRef.current?.focus();
  }, [uploaded]);

  const chooseFile = (files: File[]) => {
    const next = files[0];
    if (!next) return;
    const problem = precheckFile(next, maxBytes);
    setFile(problem ? null : next);
    setFileError(problem);
    // Prefill the title (and slug) from the filename if the admin hasn't typed one.
    if (!problem && !getValues("title")) {
      const title = titleFromFilename(next.name);
      setValue("title", title, { shouldValidate: true });
      if (!slugTouched) setValue("slug", slugify(title, 90));
    }
  };

  const upload = async (values: MaterialFormValues) => {
    if (!file) {
      setFileError("Choose a file to upload");
      return;
    }
    setServerError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("title", values.title);
    form.append("slug", values.slug);
    form.append("description", values.description);
    form.append("categoryId", values.categoryId);
    for (const id of values.tagIds) form.append("tagIds", id);
    form.append("isPublished", String(values.isPublished));
    form.append("isFeatured", String(values.isFeatured));

    setProgress(0);
    const { promise, abort } = uploadWithProgress<MaterialDTO>("/api/admin/materials/upload", form, { onProgress: setProgress });
    abortRef.current = abort;
    try {
      setUploaded(await promise);
    } catch (e) {
      if (e instanceof ClientApiError) {
        // Map server-side field errors back onto the form fields.
        for (const [field, messages] of Object.entries(e.fieldErrors)) {
          if (field === "file") setFileError(messages[0] ?? e.message);
          else if (field in EMPTY) setError(field as keyof MaterialFormValues, { message: messages[0] });
        }
        setServerError(e.code === "ABORTED" ? "Upload cancelled." : e.message);
      } else setServerError("Upload failed. Please try again.");
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };
  // handleSubmit runs inside the event handler (not during render).
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    // Report a missing file together with any field errors, not after them.
    if (!file) setFileError("Choose a file to upload");
    return handleSubmit(upload)(e);
  };

  const uploadAnother = () => {
    reset(EMPTY);
    setFile(null);
    setUploaded(null);
    setSlugTouched(false);
    setServerError(null);
  };

  if (uploaded) {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="card mx-auto max-w-2xl p-8 text-center focus:outline-none">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-semibold text-ink">Upload complete</h2>
        <p className="mt-1 text-slate-700">
          “{uploaded.title}” was saved as <strong>{uploaded.isPublished ? "published" : "a draft"}</strong>
          {uploaded.isFeatured && " and featured"}.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={uploadAnother} icon={<FileUp className="h-4 w-4" aria-hidden="true" />}>
            Upload another file
          </Button>
          <Link href={`/admin/materials/${uploaded.id}`} className={buttonClasses("secondary")}>
            Edit material
          </Link>
          {uploaded.isPublished && (
            <a href={`/materials/${uploaded.slug}`} target="_blank" rel="noopener" className={buttonClasses("ghost")}>
              View public page
            </a>
          )}
        </div>
      </div>
    );
  }

  const uploading = progress !== null;
  const percent = Math.round((progress ?? 0) * 100);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <section aria-labelledby="file-heading" className="space-y-4">
        <h2 id="file-heading" className="font-semibold text-ink">
          File
        </h2>
        {file ? (
          <div className="card space-y-4 p-4">
            <div className="flex items-center gap-3">
              <FileTypeIcon mimeType={previewMime(file)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={uploading} aria-label={`Remove ${file.name}`} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
                Change
              </Button>
            </div>
            <FilePreview file={file} />
          </div>
        ) : (
          <FileUploadArea
            onFiles={chooseFile}
            invalid={Boolean(fileError)}
            describedBy={fileError ? "file-error" : undefined}
            hint={`PDF, PNG, JPG/JPEG, WEBP or Markdown · up to ${formatBytes(maxBytes)}`}
          />
        )}
        {fileError && (
          <p id="file-error" role="alert" className="field-error">
            {fileError}
          </p>
        )}
      </section>

      <section aria-labelledby="details-heading" className="card h-fit space-y-5 p-5 lg:sticky lg:top-6">
        <h2 id="details-heading" className="font-semibold text-ink">
          Details
        </h2>
        {serverError && <Alert tone="error">{serverError}</Alert>}
        <MaterialMetadataFields
          control={control}
          register={register}
          setValue={setValue}
          errors={formState.errors}
          categories={categories}
          tags={tags}
          slugTouched={slugTouched}
          onSlugTouched={() => setSlugTouched(true)}
          disabled={uploading}
        />
        {uploading && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <div className="h-full bg-teal-600 transition-[width]" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-600" aria-live="polite">
              {percent < 100 ? `Uploading… ${percent}%` : "Validating and saving…"}
            </p>
          </div>
        )}
        <div className="flex gap-2 border-t border-slate-200 pt-4">
          <Button type="submit" className="flex-1" loading={uploading} icon={<FileUp className="h-4 w-4" aria-hidden="true" />}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
          {uploading && (
            <Button variant="secondary" onClick={() => abortRef.current?.()}>
              Cancel
            </Button>
          )}
        </div>
      </section>
    </form>
  );
}
