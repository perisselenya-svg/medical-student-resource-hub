import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";
import { AdminMaterialsTable } from "@/components/admin/AdminMaterialsTable";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { env } from "@/lib/env";
import { FILE_KINDS, KIND_LABELS } from "@/lib/files/types";
import { listMaterials } from "@/lib/services/material.service";
import { listCategories } from "@/lib/services/taxonomy.service";
import { parseMaterialQueryLenient } from "@/lib/validation/material";

export const metadata: Metadata = { title: "Materials" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminMaterialsPage({ searchParams }: Props) {
  const rawParams = await searchParams;
  const query = parseMaterialQueryLenient({ pageSize: "20", ...rawParams });
  const [result, categories] = await Promise.all([listMaterials(query, { publishedOnly: false }), listCategories({ publishedOnly: false })]);
  const filtered = Boolean(query.q || query.category || query.status || query.type.length || query.featured);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Materials</h1>
          <p className="text-slate-600">
            {result.total} material{result.total === 1 ? "" : "s"}
            {filtered && " matching filters"}
          </p>
        </div>
        <Link href="/admin/upload" className={buttonClasses()}>
          <Upload className="h-4 w-4" aria-hidden="true" /> Upload
        </Link>
      </div>

      {/* GET form: filters live in the URL, so views are bookmarkable and work without JS. */}
      <form method="get" role="search" aria-label="Filter materials" className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
        <div>
          <label htmlFor="f-q" className="label">
            Search by title
          </label>
          <input id="f-q" name="q" type="search" defaultValue={query.q} className="input" placeholder="Title, description, tag…" />
        </div>
        <div>
          <label htmlFor="f-category" className="label">
            Category
          </label>
          <select id="f-category" name="category" defaultValue={query.category ?? ""} className="input">
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name} ({c.materialCount})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-status" className="label">
            Status
          </label>
          <select id="f-status" name="status" defaultValue={query.status ?? ""} className="input">
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-type" className="label">
            File type
          </label>
          <select id="f-type" name="type" defaultValue={query.type[0] ?? ""} className="input">
            <option value="">All</option>
            {FILE_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className={buttonClasses()}>
            Filter
          </button>
          {filtered && (
            <Link href="/admin/materials" className={buttonClasses("secondary")}>
              Clear
            </Link>
          )}
        </div>
      </form>

      {result.items.length === 0 ? (
        <EmptyState title={filtered ? "No materials match these filters" : "No materials yet"}>
          {filtered ? (
            "Try a different search or clear the filters."
          ) : (
            <Link href="/admin/upload" className="font-medium text-teal-800 underline">
              Upload your first file
            </Link>
          )}
        </EmptyState>
      ) : (
        <AdminMaterialsTable materials={result.items} maxBytes={env().maxUploadBytes} />
      )}
      <Pagination basePath="/admin/materials" params={rawParams} page={result.page} totalPages={result.totalPages} />
    </div>
  );
}
