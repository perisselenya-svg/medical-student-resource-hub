"use client";

import { useState } from "react";
import { Controller, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { MultiSelect, type MultiSelectItem } from "@/components/ui/multi-select";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/http/client-api";
import { slugify } from "@/lib/utils";
import type { MaterialFormValues } from "@/lib/validation/material";
import type { CategorySummary, TagSummary } from "@/types";

type Props = {
  control: Control<MaterialFormValues>;
  register: UseFormRegister<MaterialFormValues>;
  setValue: UseFormSetValue<MaterialFormValues>;
  errors: FieldErrors<MaterialFormValues>;
  categories: CategorySummary[];
  tags: TagSummary[];
  /** While false, the slug follows the title automatically. */
  slugTouched: boolean;
  onSlugTouched: () => void;
  disabled?: boolean;
};

/** Inline tag creation through the admin API (idempotent: returns the existing tag if present). */
export function createTag(name: string): Promise<MultiSelectItem> {
  return apiFetch<MultiSelectItem>("/api/admin/tags", { method: "POST", json: { name } });
}

/** Metadata fields shared by the upload and edit forms. */
export function MaterialMetadataFields({ control, register, setValue, errors, categories, tags: initialTags, slugTouched, onSlugTouched, disabled }: Props) {
  // Server-provided tags plus any created inline while this form is open.
  const [tags, setTags] = useState(initialTags);
  const titleField = register("title", {
    onChange: (e) => {
      if (!slugTouched) setValue("slug", slugify(String(e.target.value), 90), { shouldValidate: true });
    },
  });
  const slugField = register("slug", { onChange: onSlugTouched });

  return (
    <fieldset disabled={disabled} className="space-y-5">
      <legend className="sr-only">Material details</legend>
      <Field label="Title" error={errors.title?.message} required>
        {(a) => <Input {...a} {...titleField} maxLength={200} />}
      </Field>
      <Field label="URL slug" error={errors.slug?.message} hint="Generated from the title. Used in the public link: /materials/your-slug">
        {(a) => <Input {...a} {...slugField} maxLength={90} spellCheck={false} />}
      </Field>
      <Field label="Description" error={errors.description?.message} hint="Shown on the resource page and used in search. For images, describe the diagram — it becomes the alt text.">
        {(a) => <Textarea {...a} {...register("description")} rows={4} maxLength={5000} />}
      </Field>
      <Field label="Category" error={errors.categoryId?.message} required>
        {(a) => (
          <Select {...a} {...register("categoryId")}>
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Controller
        control={control}
        name="tagIds"
        render={({ field }) => (
          <Field label="Tags" error={errors.tagIds?.message}>
            {(a) => (
              <MultiSelect
                id={a.id}
                describedBy={a["aria-describedby"]}
                invalid={a["aria-invalid"]}
                options={tags}
                value={field.value.flatMap((id) => tags.filter((t) => t.id === id))}
                onChange={(items) => field.onChange(items.map((i) => i.id))}
                onCreate={async (name) => {
                  const tag = await createTag(name);
                  setTags((list) => (list.some((t) => t.id === tag.id) ? list : [...list, tag]));
                  return tag;
                }}
              />
            )}
          </Field>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="isPublished"
          render={({ field }) => (
            <Switch checked={field.value} onChange={field.onChange} label="Published" description={field.value ? "Visible to students" : "Draft — only admins can see it"} disabled={disabled} />
          )}
        />
        <Controller
          control={control}
          name="isFeatured"
          render={({ field }) => (
            <Switch checked={field.value} onChange={field.onChange} label="Featured" description="Highlighted on the home page" disabled={disabled} />
          )}
        />
      </div>
    </fieldset>
  );
}
