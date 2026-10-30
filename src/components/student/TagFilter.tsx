import type { TagDTO } from "@/types";

const INITIAL_VISIBLE = 10;

function TagCheckbox({ tag, checked }: { tag: TagDTO; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50">
      <input type="checkbox" name="tag" value={tag.slug} defaultChecked={checked} className="h-4 w-4 rounded accent-teal-700" />
      <span className="flex-1">{tag.name}</span>
      <span className="text-xs text-slate-500" aria-label={`${tag.materialCount} resources`}>
        {tag.materialCount}
      </span>
    </label>
  );
}

/** Multi-select tag checkboxes; results must match ALL selected tags. */
export function TagFilter({ tags, selected }: { tags: TagDTO[]; selected: string[] }) {
  if (tags.length === 0) return null;
  // Selected tags always stay visible, then the most-used ones.
  const sorted = [...tags].sort((a, b) => Number(selected.includes(b.slug)) - Number(selected.includes(a.slug)) || b.materialCount - a.materialCount);
  const visible = sorted.slice(0, Math.max(INITIAL_VISIBLE, selected.length));
  const rest = sorted.slice(visible.length);

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">Tags</legend>
      <div className="space-y-1">
        {visible.map((t) => (
          <TagCheckbox key={t.id} tag={t} checked={selected.includes(t.slug)} />
        ))}
      </div>
      {rest.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer rounded-md px-1 py-1 text-sm font-medium text-brand-800 hover:underline">
            Show {rest.length} more tags
          </summary>
          <div className="mt-1 space-y-1">
            {rest.map((t) => (
              <TagCheckbox key={t.id} tag={t} checked={false} />
            ))}
          </div>
        </details>
      )}
    </fieldset>
  );
}
