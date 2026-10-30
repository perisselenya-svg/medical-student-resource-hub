import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ListChecks } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { pageMetadata } from "@/lib/seo/metadata";
import { listCategories } from "@/lib/services/taxonomy.service";

export const metadata: Metadata = pageMetadata({
  title: "Medical Subjects",
  description: "Browse high-yield notes, diagrams and quizzes by subject: anatomy, physiology, pathology, pharmacology and more.",
  path: "/subjects",
});

export default async function SubjectsPage() {
  const categories = await listCategories({ publishedOnly: true });
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Subjects" }]} />
      <h1 className="text-3xl font-bold tracking-tight text-ink">Subjects</h1>
      <p className="mt-2 max-w-2xl text-slate-700">Choose a subject to see its published notes, diagrams and quizzes.</p>
      {categories.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No subjects yet" />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/subjects/${c.slug}`} className="card group flex h-full flex-col p-5 transition hover:border-teal-300 hover:shadow-md">
                <h2 className="text-lg font-semibold text-ink group-hover:text-teal-800">{c.name}</h2>
                {c.description && <p className="mt-1 text-sm text-slate-600">{c.description}</p>}
                <p className="mt-auto flex gap-4 pt-4 text-sm font-medium text-slate-700">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-4 w-4 text-teal-700" aria-hidden="true" />
                    {c.materialCount} material{c.materialCount === 1 ? "" : "s"}
                  </span>
                  {c.quizCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="h-4 w-4 text-teal-700" aria-hidden="true" />
                      {c.quizCount} quiz{c.quizCount === 1 ? "" : "zes"}
                    </span>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
