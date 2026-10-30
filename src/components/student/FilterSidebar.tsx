"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { FILE_KINDS, KIND_LABELS } from "@/lib/files/types";
import { SORT_LABELS, SORT_OPTIONS, type MaterialQuery } from "@/lib/validation/material";
import type { CategoryDTO, TagDTO } from "@/types";
import { CategoryFilter } from "./CategoryFilter";
import { TagFilter } from "./TagFilter";

const SINCE_LABELS = { "": "Any time", "7d": "Past week", "30d": "Past month", "90d": "Past 3 months", "365d": "Past year" } as const;

type Props = { categories: CategoryDTO[]; tags: TagDTO[]; query: MaterialQuery; showCategory?: boolean };

/**
 * Filters as one GET form (works without JS via "Apply"; every state is a
 * shareable URL). With JS, changes apply immediately and reset to page 1.
 * Desktop: sticky sidebar. Mobile: a "Filters" button opens a drawer.
 */
export function FilterSidebar(props: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { query, showCategory = true } = props;
  const activeCount = (showCategory && query.category ? 1 : 0) + query.tag.length + query.type.length + (query.since ? 1 : 0);

  return (
    <>
      <div className="lg:hidden">
        <Button variant="secondary" className="w-full" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog" icon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}>
          Filters &amp; sort{activeCount > 0 && ` (${activeCount})`}
        </Button>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters & sort" side="left">
          <FilterForm {...props} idPrefix="m" onDone={() => setDrawerOpen(false)} />
        </Drawer>
      </div>
      <div className="card hidden p-4 lg:block">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
        </h2>
        <FilterForm {...props} idPrefix="d" />
      </div>
    </>
  );
}

function FilterForm({ categories, tags, query, showCategory = true, idPrefix, onDone }: Props & { idPrefix: string; onDone?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const apply = (form: HTMLFormElement) => {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value !== "" && !(key === "sort" && value === "newest")) params.append(key, value);
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Inputs are uncontrolled (so the form works without JS); reset them in place
  // rather than remounting, which would drop keyboard focus.
  const reset = () => {
    const form = formRef.current;
    if (!form) return;
    for (const el of form.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) el.checked = false;
    for (const el of form.querySelectorAll<HTMLInputElement>("input[type=radio]")) el.checked = el.value === "";
    const sort = form.querySelector<HTMLSelectElement>("select[name=sort]");
    if (sort) sort.value = "newest";
    apply(form);
  };

  return (
    <form
      ref={formRef}
      action={pathname}
      method="get"
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        apply(e.currentTarget);
        onDone?.();
      }}
      onChange={(e) => apply(e.currentTarget)}
      aria-busy={pending}
      className="space-y-6"
    >
      {query.q && <input type="hidden" name="q" value={query.q} />}
      <div>
        <label htmlFor={`${idPrefix}-sort`} className="mb-2 block text-sm font-semibold text-ink">
          Sort by
        </label>
        <select id={`${idPrefix}-sort`} name="sort" defaultValue={query.sort} className="input">
          {SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {showCategory && <CategoryFilter categories={categories} selected={query.category} />}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">File type</legend>
        <div className="space-y-1">
          {FILE_KINDS.map((kind) => (
            <label key={kind} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50">
              <input type="checkbox" name="type" value={kind} defaultChecked={query.type.includes(kind)} className="h-4 w-4 rounded accent-teal-700" />
              {KIND_LABELS[kind]}
            </label>
          ))}
        </div>
      </fieldset>

      <TagFilter tags={tags} selected={query.tag} />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Uploaded</legend>
        <div className="space-y-1">
          {Object.entries(SINCE_LABELS).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50">
              <input type="radio" name="since" value={value} defaultChecked={(query.since ?? "") === value} className="h-4 w-4 accent-teal-700" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" loading={pending}>
          {onDone ? "Show results" : "Apply"}
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">
        {pending ? "Updating results…" : ""}
      </p>
    </form>
  );
}
