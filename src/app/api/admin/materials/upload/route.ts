import { requireAdmin } from "@/lib/auth/guard";
import { env } from "@/lib/env";
import { validateUpload } from "@/lib/files/validation";
import { handle, ok, parseOrThrow } from "@/lib/http/api";
import { readUploadForm, requireFile } from "@/lib/http/upload";
import { createMaterial } from "@/lib/services/material.service";
import { materialUploadSchema } from "@/lib/validation/material";

/**
 * POST /api/admin/materials/upload  (multipart/form-data)
 * Fields: file, title, slug?, description, categoryId, tagIds (repeatable), isPublished, isFeatured
 */
export const POST = handle(async (request) => {
  const admin = await requireAdmin(request);
  const form = await readUploadForm(request, admin);

  // Validate metadata first: cheap, and nothing is written for bad metadata.
  const input = parseOrThrow(materialUploadSchema, {
    title: form.get("title"),
    slug: form.get("slug") ?? undefined,
    description: form.get("description") ?? "",
    categoryId: form.get("categoryId"),
    tagIds: form.getAll("tagIds").map(String),
    isPublished: form.get("isPublished") ?? undefined,
    isFeatured: form.get("isFeatured") ?? undefined,
  });
  const file = await validateUpload(requireFile(form), env().maxUploadBytes);
  return ok(await createMaterial(input, file, admin), { status: 201 });
});
