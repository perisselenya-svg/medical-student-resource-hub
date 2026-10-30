import { handle, ok } from "@/lib/http/api";
import { listTags } from "@/lib/services/taxonomy.service";

/** GET /api/tags — public; only tags used by at least one published material. */
export const GET = handle(async () => ok(await listTags({ publishedOnly: true }), { headers: { "Cache-Control": "public, max-age=60" } }));
