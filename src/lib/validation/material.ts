import { z } from "zod";
import { FILE_KINDS } from "@/lib/files/types";
import { emptyToUndefined, idSchema, slugSchema, toStringArray } from "./common";

export const SORT_OPTIONS = ["newest", "views", "downloads", "title"] as const;
export const SORT_LABELS: Record<(typeof SORT_OPTIONS)[number], string> = {
  newest: "Newest",
  views: "Most viewed",
  downloads: "Most downloaded",
  title: "A–Z",
};
export const SINCE_OPTIONS = ["7d", "30d", "90d", "365d"] as const;

/** Multipart form booleans arrive as "true"/"false"/"on". */
const formBoolean = z.preprocess((v) => v === true || v === "true" || v === "on" || v === "1", z.boolean());

export const materialFields = {
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title is too long"),
  // Optional: generated from the title when empty.
  slug: z.preprocess(emptyToUndefined, slugSchema.max(90).optional()),
  description: z.string().trim().max(5000, "Description is too long"),
  categoryId: idSchema,
  tagIds: z.array(idSchema).max(20, "At most 20 tags"),
};

/** Upload form (multipart). */
export const materialUploadSchema = z.object({
  ...materialFields,
  description: materialFields.description.default(""),
  tagIds: materialFields.tagIds.default([]),
  isPublished: formBoolean.default(false),
  isFeatured: formBoolean.default(false),
});

/** PATCH /api/admin/materials/:id — any subset of editable fields. */
export const materialUpdateSchema = z
  .object({ ...materialFields, isPublished: z.boolean(), isFeatured: z.boolean() })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Provide at least one field to update" });

/** Client-side form schema (React Hook Form) for creating/editing metadata. */
export const materialFormSchema = z.object({
  title: materialFields.title,
  slug: z.string().trim().max(90).refine((s) => s === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s), {
    message: "Use lowercase letters, numbers and single hyphens",
  }),
  description: materialFields.description,
  categoryId: z.string().min(1, "Choose a category"),
  tagIds: materialFields.tagIds,
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
});
export type MaterialFormValues = z.infer<typeof materialFormSchema>;

/** Query parameters for listing/searching (public library and admin table). */
export const materialQuerySchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  category: z.preprocess(emptyToUndefined, slugSchema.optional()),
  tag: z.preprocess(toStringArray, z.array(slugSchema).max(10)),
  type: z.preprocess(toStringArray, z.array(z.enum(FILE_KINDS)).max(FILE_KINDS.length)),
  since: z.preprocess(emptyToUndefined, z.enum(SINCE_OPTIONS).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(["published", "draft"]).optional()),
  featured: z.preprocess(emptyToUndefined, z.enum(["true"]).optional()),
  sort: z.preprocess(emptyToUndefined, z.enum(SORT_OPTIONS).default("newest")),
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(10_000).default(1)),
  pageSize: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(50).default(12)),
});

export type MaterialUploadInput = z.infer<typeof materialUploadSchema>;
export type MaterialUpdateInput = z.infer<typeof materialUpdateSchema>;
export type MaterialQuery = z.infer<typeof materialQuerySchema>;

type RawParams = Record<string, string | string[] | undefined>;

export function searchParamsToRecord(params: URLSearchParams): RawParams {
  const record: RawParams = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    record[key] = all.length > 1 ? all : all[0];
  }
  return record;
}

/**
 * Lenient parse for pages: invalid parameters are dropped (falling back to
 * defaults) instead of erroring, so a mangled shared link still renders.
 */
export function parseMaterialQueryLenient(raw: RawParams): MaterialQuery {
  const input: RawParams = { ...raw };
  for (let attempt = 0; attempt < 12; attempt++) {
    const result = materialQuerySchema.safeParse(input);
    if (result.success) return result.data;
    for (const issue of result.error.issues) delete input[String(issue.path[0])];
  }
  return materialQuerySchema.parse({});
}
