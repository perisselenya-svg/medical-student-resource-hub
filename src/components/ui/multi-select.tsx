"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { cn, slugify } from "@/lib/utils";


export type MultiSelectItem = { id: string; name: string; slug: string };

type MultiSelectProps = {
  id: string;
  options: MultiSelectItem[];
  value: MultiSelectItem[];
  onChange: (items: MultiSelectItem[]) => void;
  /** When provided, typing a new name offers "Create …" (e.g. POST /api/admin/tags). */
  onCreate?: (name: string) => Promise<MultiSelectItem>;
  max?: number;
  describedBy?: string;
  invalid?: boolean;
  itemLabel?: string;
};

/**
 * Multi-select combobox (WAI-ARIA combobox + listbox pattern) with optional
 * inline creation of missing items.
 * Keys: ↑/↓ move, Enter or "," selects/creates, Esc closes, Backspace on an
 * empty field removes the last tag.
 */
export function MultiSelect({ id, options: allOptions, value, onChange, onCreate, max = 20, describedBy, invalid, itemLabel = "tag" }: MultiSelectProps) {
  const [known, setKnown] = useState(allOptions);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const hintId = useId();

  const selectedIds = new Set(value.map((t) => t.id));
  const term = text.trim();
  const termSlug = slugify(term, 60);

  const suggestions = useMemo(() => {
    const lower = term.toLowerCase();
    return known.filter((t) => !value.some((v) => v.id === t.id) && (!lower || t.name.toLowerCase().includes(lower))).slice(0, 8);
  }, [known, term, value]);
  const exactMatch = known.find((t) => t.slug === termSlug);
  const canCreate = Boolean(onCreate) && term.length > 0 && termSlug.length > 0 && !exactMatch;
  const options: Array<{ type: "tag"; tag: MultiSelectItem } | { type: "create" }> = [
    ...suggestions.map((tag) => ({ type: "tag" as const, tag })),
    ...(canCreate ? [{ type: "create" as const }] : []),
  ];

  const add = (tag: MultiSelectItem) => {
    if (!selectedIds.has(tag.id) && value.length < max) onChange([...value, tag]);
    setText("");
    setActive(0);
    setError(null);
    // Close after choosing so the list never covers the fields below;
    // typing or ArrowDown reopens it.
    setOpen(false);
    inputRef.current?.focus();
  };

  const create = async () => {
    if (exactMatch) return add(exactMatch);
    if (!onCreate) return;
    setCreating(true);
    setError(null);
    try {
      const tag = await onCreate(term);
      setKnown((k) => (k.some((t) => t.id === tag.id) ? k : [...k, tag].sort((a, b) => a.name.localeCompare(b.name))));
      add(tag);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not create ${itemLabel}`);
    } finally {
      setCreating(false);
    }
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (option.type === "tag") add(option.tag);
    else void create();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if ((e.key === "Enter" || e.key === ",") && term) {
      e.preventDefault();
      if (open && options[active]) choose(active);
      else if (exactMatch) add(exactMatch);
      else if (onCreate) void create();
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Backspace" && !text && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const activeId = open && options[active] ? `${listId}-${active}` : undefined;

  return (
    <div>
      <div
        className={`flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 focus-within:border-teal-600 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-600 ${invalid ? "border-red-600" : "border-slate-300"}`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-teal-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-teal-900 ring-1 ring-teal-200">
            {tag.name}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t.id !== tag.id))}
              className="rounded-full p-0.5 hover:bg-teal-100"
              aria-label={`Remove ${itemLabel} ${tag.name}`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <div className="relative min-w-32 flex-1">
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-describedby={[hintId, describedBy].filter(Boolean).join(" ")}
            aria-invalid={invalid || undefined}
            value={text}
            disabled={value.length >= max}
            placeholder={value.length >= max ? `Maximum ${max} ${itemLabel}s` : onCreate ? "Type to search or create…" : "Type to search…"}
            onChange={(e) => {
              setText(e.target.value.replace(/,/g, ""));
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            className="w-full border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-slate-500 focus-visible:outline-none"
          />
          {creating && <Loader2 className="absolute right-1 top-1 h-4 w-4 animate-spin text-slate-500" aria-label={`Creating ${itemLabel}`} />}
          <ul
            id={listId}
            role="listbox"
            aria-label={`${itemLabel} suggestions`}
            hidden={!open || options.length === 0}
            className="absolute left-0 top-full z-20 mt-2 max-h-60 w-64 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {options.map((option, index) => (
              <li
                key={option.type === "tag" ? option.tag.id : "__create"}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                // mousedown (not click) so the input's blur does not close the list first
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(index);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn("flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm", index === active && "bg-teal-50 text-teal-900")}
              >
                {option.type === "tag" ? (
                  option.tag.name
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Create “{term}”
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p id={hintId} className="mt-1 text-xs text-slate-500">
        {onCreate ? `Press Enter to add. New ${itemLabel}s are created automatically.` : "Press Enter to add."}
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
