import { z } from "zod";
import { slugify } from "@/lib/utils";
import { idSchema } from "./common";

const name = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} character${min === 1 ? "" : "s"}`)
    .max(max, `${label} is too long`)
    .refine((n) => slugify(n).length > 0, { message: `${label} must contain letters or numbers` });

export const categoryCreateSchema = z.object({
  name: name(2, 80, "Name"),
  description: z.string().trim().max(500, "Description is too long").default(""),
  displayOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});
export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Provide at least one field to update" });

/** DELETE /api/admin/categories/:id?moveTo=<id> — destination for its materials/quizzes. */
export const categoryDeleteQuerySchema = z.object({ moveTo: idSchema.optional() });

export const tagCreateSchema = z.object({ name: name(1, 50, "Tag name") });
export const tagUpdateSchema = tagCreateSchema.strict();
/** DELETE /api/admin/tags/:id?confirm=true — required when the tag is in use. */
export const tagDeleteQuerySchema = z.object({ confirm: z.enum(["true"]).optional() });

/** Client form schemas (React Hook Form). */
export const categoryFormSchema = z.object({
  name: name(2, 80, "Name"),
  description: z.string().trim().max(500, "Description is too long"),
  displayOrder: z.number({ message: "Enter a number" }).int().min(0).max(10_000),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type TagFormValues = z.infer<typeof tagCreateSchema>;

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
