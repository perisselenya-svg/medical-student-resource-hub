import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceBrowser } from "@/components/student/ResourceBrowser";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { pageMetadata } from "@/lib/seo/metadata";
import { listQuizzes } from "@/lib/services/quiz.service";
import { getCategoryBySlug } from "@/lib/services/taxonomy.service";
import { slugSchema } from "@/lib/validation/common";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function load(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  return parsed.success ? getCategoryBySlug(parsed.data) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await load((await params).slug);
  if (!category) return { title: "Subject not found", robots: { index: false } };
  // e.g. "Anatomy Notes | Medical Student Resource Hub"
  return pageMetadata({
    title: `${category.name} Notes`,
    description: category.description || `High-yield ${category.name.toLowerCase()} notes, diagrams and quizzes for medical students.`,
    path: `/subjects/${category.slug}`,
  });
}

export default async function SubjectPage({ params, searchParams }: Props) {
  const category = await load((await params).slug);
  if (!category) notFound();
  const [rawParams, quizzes] = await Promise.all([searchParams, listQuizzes({ publishedOnly: true, categorySlug: category.slug })]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Subjects", href: "/subjects" }, { label: category.name }]} />
      <h1 className="text-3xl font-bold tracking-tight text-ink">{category.name} Notes</h1>
      {category.description && <p className="mt-2 max-w-3xl text-slate-700">{category.description}</p>}
      {quizzes.length > 0 && (
        <p className="mt-3 text-sm">
          <Link href={`/quizzes?category=${category.slug}`} className="font-semibold text-teal-800 hover:underline">
            {quizzes.length} practice quiz{quizzes.length === 1 ? "" : "zes"} in {category.name} →
          </Link>
        </p>
      )}
      <div className="mt-6">
        <ResourceBrowser rawParams={rawParams} basePath={`/subjects/${category.slug}`} category={{ id: category.id, name: category.name, slug: category.slug }} />
      </div>
    </div>
  );
}
