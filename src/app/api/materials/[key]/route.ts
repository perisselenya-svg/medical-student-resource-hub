import { ApiError, handle, ok } from "@/lib/http/api";
import { getPublishedMaterialBySlug } from "@/lib/services/material.service";
import { slugSchema } from "@/lib/validation/common";

// One dynamic segment name per level: this folder receives a slug for GET and
// an id for the /view and /download sub-routes.
type Context = { params: Promise<{ key: string }> };

/** GET /api/materials/:slug — one published material (404 for drafts and unknown slugs). */
export const GET = handle<Context>(async (_request, { params }) => {
  const slug = slugSchema.safeParse((await params).key);
  const material = slug.success ? await getPublishedMaterialBySlug(slug.data) : null;
  if (!material) throw new ApiError("NOT_FOUND", "Material not found");
  return ok(material);
});
