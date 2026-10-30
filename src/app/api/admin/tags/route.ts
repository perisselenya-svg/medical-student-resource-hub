import { requireAdmin } from "@/lib/auth/guard";
import { handle, ok, parseOrThrow, readJson } from "@/lib/http/api";
import { findOrCreateTag, listTags } from "@/lib/services/taxonomy.service";
import { tagCreateSchema } from "@/lib/validation/taxonomy";

/** GET /api/admin/tags — all tags with total usage counts. */
export const GET = handle(async (request) => {
  await requireAdmin(request);
  return ok(await listTags({ publishedOnly: false }));
});

/**
 * POST /api/admin/tags { name } — also used for inline creation in the upload form.
 * Idempotent: 201 when created, 200 with the existing tag when the name already exists.
 */
export const POST = handle(async (request) => {
  const admin = await requireAdmin(request);
  const { name } = parseOrThrow(tagCreateSchema, await readJson(request));
  const { tag, created } = await findOrCreateTag(name, admin.id);
  return ok({ id: tag.id, name: tag.name, slug: tag.slug }, { status: created ? 201 : 200 });
});
