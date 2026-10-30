import { requireAdmin } from "@/lib/auth/guard";
import { handle, ok, parseOrThrow } from "@/lib/http/api";
import { listMaterials } from "@/lib/services/material.service";
import { materialQuerySchema, searchParamsToRecord } from "@/lib/validation/material";

/** GET /api/admin/materials?q=&category=&status=published|draft&type=&featured=&sort=&page= — includes drafts. */
export const GET = handle(async (request) => {
  await requireAdmin(request);
  const query = parseOrThrow(materialQuerySchema, searchParamsToRecord(new URL(request.url).searchParams));
  const { items, ...meta } = await listMaterials(query, { publishedOnly: false });
  return ok(items, { meta });
});
