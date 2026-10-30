import { requireAdmin } from "@/lib/auth/guard";
import { handle, ok, parseOrThrow, readJson } from "@/lib/http/api";
import { deleteTag, updateTag } from "@/lib/services/taxonomy.service";
import { idSchema } from "@/lib/validation/common";
import { tagDeleteQuerySchema, tagUpdateSchema } from "@/lib/validation/taxonomy";

type Context = { params: Promise<{ id: string }> };

/** PATCH /api/admin/tags/:id { name } — rename (slug follows). */
export const PATCH = handle<Context>(async (request, { params }) => {
  const admin = await requireAdmin(request);
  const id = parseOrThrow(idSchema, (await params).id);
  const { name } = parseOrThrow(tagUpdateSchema, await readJson(request));
  return ok(await updateTag(id, name, admin.id));
});

/** DELETE /api/admin/tags/:id[?confirm=true] — confirmation required when materials use the tag. */
export const DELETE = handle<Context>(async (request, { params }) => {
  const admin = await requireAdmin(request);
  const id = parseOrThrow(idSchema, (await params).id);
  const { confirm } = parseOrThrow(tagDeleteQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  await deleteTag(id, confirm === "true", admin.id);
  return ok({ id, deleted: true });
});
