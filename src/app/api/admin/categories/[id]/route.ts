import { requireAdmin } from "@/lib/auth/guard";
import { handle, ok, parseOrThrow, readJson } from "@/lib/http/api";
import { deleteCategory, updateCategory } from "@/lib/services/taxonomy.service";
import { idSchema } from "@/lib/validation/common";
import { categoryDeleteQuerySchema, categoryUpdateSchema } from "@/lib/validation/taxonomy";

type Context = { params: Promise<{ id: string }> };

/** PATCH /api/admin/categories/:id — rename, describe or reorder. */
export const PATCH = handle<Context>(async (request, { params }) => {
  const admin = await requireAdmin(request);
  const id = parseOrThrow(idSchema, (await params).id);
  const input = parseOrThrow(categoryUpdateSchema, await readJson(request));
  return ok(await updateCategory(id, input, admin.id));
});

/**
 * DELETE /api/admin/categories/:id[?moveTo=<categoryId>]
 * Empty categories are deleted directly. Non-empty ones answer 409 unless
 * `moveTo` confirms where their materials and quizzes should go.
 */
export const DELETE = handle<Context>(async (request, { params }) => {
  const admin = await requireAdmin(request);
  const id = parseOrThrow(idSchema, (await params).id);
  const { moveTo } = parseOrThrow(categoryDeleteQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  await deleteCategory(id, moveTo, admin.id);
  return ok({ id, deleted: true });
});
