import type { Metadata } from "next";
import { MaterialUploadForm } from "@/components/forms/MaterialUploadForm";
import { env } from "@/lib/env";
import { listCategories, listTags } from "@/lib/services/taxonomy.service";

export const metadata: Metadata = { title: "Upload material" };

export default async function UploadPage() {
  const [categories, tags] = await Promise.all([listCategories({ publishedOnly: false }), listTags({ publishedOnly: false })]);
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Upload material</h1>
      <p className="mb-6 mt-1 text-slate-600">Files are checked by extension, MIME type and content signature before they are stored.</p>
      <MaterialUploadForm
        categories={categories.map(({ id, name, slug }) => ({ id, name, slug }))}
        tags={tags.map(({ id, name, slug }) => ({ id, name, slug }))}
        maxBytes={env().maxUploadBytes}
      />
    </div>
  );
}
