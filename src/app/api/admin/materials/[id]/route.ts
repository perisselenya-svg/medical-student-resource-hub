import { requireAdmin } from "@/lib/auth/guard";
import { ApiError, handle, ok, parseOrThrow, readJson } from "@/lib/http/api";
import { deleteMaterial, getMaterialById, updateMaterial } from "@/lib/services/material.service";
import { idSchema } from "@/lib/validation/common";
import { materialUpdateSchema } from "@/lib/validation/material";

type Context = { params: Promise<{ id: string }> };

/** GET /api/admin/materials/:id — any material, including drafts. */
export const GET = handle<Context>(async (request, { params }) => {
  await requireAdmin(request);
  const material = await getMaterialById(parseOrThrow(idSchema, (await params).id));
  if (!material) throw new ApiError("NOT_FOUND", "Material not found");
  return ok(material);
});

/** PATCH /api/admin/materials/:id — metadata, category, tags, publish and feature flags. */
export const PATCH = handle<Context>(async (request, { params }) => {
  const admin = await requireAdmin(request);
  const id = parseOrThrow(idSchema, (await params).id);
  const input = parseOrThrow(materialUpdateSchema, await readJson(request));
  return ok(await updateMaterial(id, input, admin));
});

/** DELETE /api/admin/materials/:id — removes the database record and the stored file. */
export const DELETE = handle<Context>(async (request, { params }) => {
  const admin = await requireAdmin(request);
  const id = parseOrThrow(idSchema, (await params).id);
  await deleteMaterial(id, admin);
  return ok({ id, deleted: true });
});
