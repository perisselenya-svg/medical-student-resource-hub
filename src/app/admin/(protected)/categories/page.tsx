import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { listCategories } from "@/lib/services/taxonomy.service";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await listCategories({ publishedOnly: false });
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Categories</h1>
      <p className="mb-6 mt-1 text-slate-600">Subjects shown to students. Lower order numbers appear first.</p>
      <CategoryManager categories={categories} />
    </div>
  );
}
