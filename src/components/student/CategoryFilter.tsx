import type { CategoryDTO } from "@/types";

/** Single-choice category radio group (part of the filters <form>). */
export function CategoryFilter({ categories, selected }: { categories: CategoryDTO[]; selected?: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">Subject</legend>
      <div className="space-y-1">
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50">
          <input type="radio" name="category" value="" defaultChecked={!selected} className="h-4 w-4 accent-teal-700" />
          All subjects
        </label>
        {categories.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50">
            <input type="radio" name="category" value={c.slug} defaultChecked={selected === c.slug} className="h-4 w-4 accent-teal-700" />
            <span className="flex-1">{c.name}</span>
            <span className="text-xs text-slate-500" aria-label={`${c.materialCount} resources`}>
              {c.materialCount}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
