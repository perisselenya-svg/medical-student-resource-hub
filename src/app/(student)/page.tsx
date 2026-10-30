import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, ListChecks, ShieldAlert } from "lucide-react";
import { ResourceGallery } from "@/components/student/ResourceGallery";
import { SearchBar } from "@/components/student/SearchBar";
import { EmptyState } from "@/components/ui/empty-state";
import { jsonLd } from "@/lib/seo/metadata";
import { absoluteUrl, site } from "@/lib/seo/site";
import { homeMaterials } from "@/lib/services/material.service";
import { listCategories } from "@/lib/services/taxonomy.service";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — High-yield notes, diagrams and quizzes` },
  description: site.description,
  alternates: { canonical: "/" },
};

function Section({ id, title, href, linkLabel, children }: { id: string; title: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 id={id} className="text-2xl font-bold tracking-tight text-ink">
          {title}
        </h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:underline">
            {linkLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [categories, featured, popular, latest] = await Promise.all([
    listCategories({ publishedOnly: true }),
    homeMaterials("featured", 3),
    homeMaterials("popular", 3),
    homeMaterials("latest", 6),
  ]);
  const total = categories.reduce((n, c) => n + c.materialCount, 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: site.name,
            url: absoluteUrl("/"),
            potentialAction: { "@type": "SearchAction", target: `${absoluteUrl("/library")}?q={search_term_string}`, "query-input": "required name=search_term_string" },
          }),
        }}
      />
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">{site.name}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">{site.headline}</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-700">{site.description}</p>
          <SearchBar id="hero-search" size="lg" className="mt-8 max-w-2xl" />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/library" className="btn-primary">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" /> Browse the library
            </Link>
            <Link href="/quizzes" className="btn-secondary">
              <ListChecks className="h-4 w-4" aria-hidden="true" /> Practice quizzes
            </Link>
          </div>
          <p className="mt-6 flex items-start gap-2 text-sm font-medium text-amber-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {site.disclaimer}
          </p>
          {total > 0 && (
            <p className="mt-3 text-sm text-slate-600">
              {total} resources across {categories.filter((c) => c.materialCount > 0).length} subjects
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6">
        {featured.length > 0 && (
          <Section id="featured-heading" title="Featured resources" href="/library?featured=true" linkLabel="All featured">
            <ResourceGallery materials={featured} />
          </Section>
        )}

        {popular.length > 0 && (
          <Section id="popular-heading" title="Popular resources" href="/library?sort=views" linkLabel="Most viewed">
            <ResourceGallery materials={popular} />
          </Section>
        )}

        {categories.length > 0 && (
          <Section id="subjects-heading" title="Browse by subject" href="/subjects" linkLabel="All subjects">
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/subjects/${c.slug}`} className="card flex h-full flex-col p-4 transition hover:border-teal-300 hover:shadow-md">
                    <span className="font-semibold text-ink">{c.name}</span>
                    <span className="mt-auto pt-2 text-xs font-medium text-teal-800">
                      {c.materialCount} resource{c.materialCount === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section id="latest-heading" title="Latest resources" href="/library" linkLabel="View library">
          {latest.length > 0 ? (
            <ResourceGallery materials={latest} />
          ) : (
            <EmptyState title="No resources published yet">New study materials will appear here as soon as they are published.</EmptyState>
          )}
        </Section>
      </div>
    </>
  );
}
