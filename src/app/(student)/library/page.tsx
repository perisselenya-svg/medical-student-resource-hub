import type { Metadata } from "next";
import { ResourceBrowser } from "@/components/student/ResourceBrowser";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const term = typeof q === "string" && q.trim() ? q.trim().slice(0, 60) : null;
  return pageMetadata({
    title: term ? `Search: ${term}` : "Resource Library",
    description: "Search and filter high-yield medical notes, PDFs, images and diagrams by subject, tag and file type.",
    path: "/library",
    // Index the canonical library, not endless search/filter combinations.
    noindex: Boolean(term),
  });
}

export default async function LibraryPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Library" }]} />
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-ink">Resource library</h1>
      <ResourceBrowser rawParams={await searchParams} basePath="/library" />
    </div>
  );
}
