import { handle, ok } from "@/lib/http/api";
import { listCategories } from "@/lib/services/taxonomy.service";

/** GET /api/categories — public; counts include published materials/quizzes only. */
export const GET = handle(async () => ok(await listCategories({ publishedOnly: true }), { headers: { "Cache-Control": "public, max-age=60" } }));
