import type { Metadata } from "next";
import { TagManager } from "@/components/admin/TagManager";
import { listTags } from "@/lib/services/taxonomy.service";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage() {
  const tags = await listTags({ publishedOnly: false });
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Tags</h1>
      <p className="mb-6 mt-1 text-slate-600">Tags help students filter the library. Counts include draft materials.</p>
      <TagManager tags={tags} />
    </div>
  );
}
