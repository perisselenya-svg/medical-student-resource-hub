import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaterialEditForm } from "@/components/forms/MaterialEditForm";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { env } from "@/lib/env";
import { getMaterialById } from "@/lib/services/material.service";
import { listCategories, listTags } from "@/lib/services/taxonomy.service";
import { idSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Edit material" };

export default async function EditMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [material, categories, tags] = await Promise.all([getMaterialById(id.data), listCategories({ publishedOnly: false }), listTags({ publishedOnly: false })]);
  if (!material) notFound();
  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "Materials", href: "/admin/materials" }, { label: material.title }]} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{material.title}</h1>
        <Badge tone={material.isPublished ? "success" : "warning"}>{material.isPublished ? "Published" : "Draft"}</Badge>
        {material.isFeatured && <Badge tone="brand">Featured</Badge>}
      </div>
      {/* key: reset the form whenever server data changes (after save or re-upload). */}
      <MaterialEditForm
        key={material.updatedAt}
        material={material}
        categories={categories.map(({ id, name, slug }) => ({ id, name, slug }))}
        tags={tags.map(({ id, name, slug }) => ({ id, name, slug }))}
        maxBytes={env().maxUploadBytes}
      />
    </div>
  );
}
