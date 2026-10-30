import { requireAdmin } from "@/lib/auth/guard";
import { handle, ok, parseOrThrow, readJson } from "@/lib/http/api";
import { createCategory, listCategories } from "@/lib/services/taxonomy.service";
import { categoryCreateSchema } from "@/lib/validation/taxonomy";

/** GET /api/admin/categories — all categories with total (incl. draft) counts. */
export const GET = handle(async (request) => {
  await requireAdmin(request);
  return ok(await listCategories({ publishedOnly: false }));
});

/** POST /api/admin/categories { name, description?, displayOrder? } */
export const POST = handle(async (request) => {
  const admin = await requireAdmin(request);
  const input = parseOrThrow(categoryCreateSchema, await readJson(request));
  return ok(await createCategory(input, admin.id), { status: 201 });
});
