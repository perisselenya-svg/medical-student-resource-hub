import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  basePath: string;
  /** Current query parameters to preserve (page is replaced). */
  params: Record<string, string | string[] | undefined>;
  page: number;
  totalPages: number;
};

function hrefFor(basePath: string, params: PaginationProps["params"], page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) if (v !== "") search.append(key, v);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Compact page list: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, total: number): Array<number | "gap"> {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

/** Link-based pagination: crawlable, works without JS, preserves filters in the URL. */
export function Pagination({ basePath, params, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;
  const linkClass = "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-medium";
  return (
    <nav aria-label="Pagination" className="mt-8 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {page > 1 ? (
            <Link href={hrefFor(basePath, params, page - 1)} className={cn(linkClass, "hover:bg-slate-100")} rel="prev">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Previous</span>
            </Link>
          ) : (
            <span className={cn(linkClass, "text-slate-400")} aria-disabled="true">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Previous</span>
            </span>
          )}
        </li>
        {pageWindow(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-slate-500">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={hrefFor(basePath, params, p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={cn(linkClass, p === page ? "bg-brand-700 text-white" : "hover:bg-slate-100")}
              >
                {p}
              </Link>
            </li>
          ),
        )}
        <li>
          {page < totalPages ? (
            <Link href={hrefFor(basePath, params, page + 1)} className={cn(linkClass, "hover:bg-slate-100")} rel="next">
              <span className="sr-only sm:not-sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className={cn(linkClass, "text-slate-400")} aria-disabled="true">
              <span className="sr-only sm:not-sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
