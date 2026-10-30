import { handle, ok, parseOrThrow } from "@/lib/http/api";
import { listMaterials } from "@/lib/services/material.service";
import { materialQuerySchema, searchParamsToRecord } from "@/lib/validation/material";

/**
 * GET /api/materials?q=&category=&tag=&type=&since=&sort=&page=&pageSize=
 * Public. ALWAYS restricted to published materials (the `status` filter is ignored here).
 */
export const GET = handle(async (request) => {
  const params = searchParamsToRecord(new URL(request.url).searchParams);
  const query = parseOrThrow(materialQuerySchema, params);
  const { items, ...meta } = await listMaterials(query, { publishedOnly: true });
  return ok(items, { meta, headers: { "Cache-Control": "public, max-age=30" } });
});
