import { Suspense } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { GallerySkeleton } from "@/components/ui/skeleton";
import { listMaterials } from "@/lib/services/material.service";
import { listCategories, listTags } from "@/lib/services/taxonomy.service";
import type { CategorySummary } from "@/types";
import { parseMaterialQueryLenient, type MaterialQuery } from "@/lib/validation/material";
import { Announce } from "./Announce";
import { FilterSidebar } from "./FilterSidebar";
import { ResourceGallery } from "./ResourceGallery";
import { SearchBar } from "./SearchBar";

type RawParams = Record<string, string | string[] | undefined>;

type ResourceBrowserProps = {
  rawParams: RawParams;
  basePath: string;
  /** Fixed category (category landing pages). */
  category?: CategorySummary;
};

/** Search + filters + results, entirely driven by URL search params. */
export async function ResourceBrowser({ rawParams, basePath, category }: ResourceBrowserProps) {
  const query = parseMaterialQueryLenient(rawParams);
  if (category) query.category = category.slug;
  const [categories, tags] = await Promise.all([listCategories({ publishedOnly: true }), listTags({ publishedOnly: true })]);

  // Params to keep when the user runs a new keyword search from this page.
  const carry = Object.fromEntries(
    Object.entries(rawParams).filter(([key]) => key !== "q" && key !== "page" && !(category && key === "category")),
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[17rem_1fr]">
      <aside aria-label="Filters" className="lg:sticky lg:top-24">
        <FilterSidebar categories={categories} tags={tags} query={query} showCategory={!category} />
      </aside>
      <section aria-labelledby="results-heading" className="min-w-0">
        <SearchBar id="page-search" defaultValue={query.q} hiddenParams={carry} action={basePath} size="lg" className="mb-5" />
        {/* Keyed by the query so a fresh skeleton shows while new results stream in. */}
        <Suspense key={JSON.stringify(query)} fallback={<GallerySkeleton />}>
          <Results query={query} rawParams={rawParams} basePath={basePath} />
        </Suspense>
      </section>
    </div>
  );
}

async function Results({ query, rawParams, basePath }: { query: MaterialQuery; rawParams: RawParams; basePath: string }) {
  const result = await listMaterials(query, { publishedOnly: true });
  const summary =
    result.total === 0
      ? "No resources found"
      : `${result.total} resource${result.total === 1 ? "" : "s"}${query.q ? ` for “${query.q}”` : ""}`;

  return (
    <>
      <Announce message={`${summary}. Page ${result.page} of ${result.totalPages}.`} />
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 id="results-heading" className="text-sm font-semibold text-slate-700">
          {summary}
        </h2>
        {result.totalPages > 1 && (
          <p className="text-sm text-slate-500">
            Page {result.page} of {result.totalPages}
          </p>
        )}
      </div>
      {result.items.length === 0 ? (
        <EmptyState title="No matching resources">
          Try fewer or different keywords, or remove some filters.{" "}
          <Link href={basePath} className="font-medium text-brand-800 underline">
            Clear all filters
          </Link>
          .
        </EmptyState>
      ) : (
        <ResourceGallery materials={result.items} />
      )}
      <Pagination basePath={basePath} params={rawParams} page={result.page} totalPages={result.totalPages} />
    </>
  );
}
