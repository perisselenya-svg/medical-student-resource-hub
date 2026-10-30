import { counterRoute } from "@/lib/http/counter-route";

/** POST /api/materials/:id/view — record a view of a published material. */
export const POST = counterRoute("viewCount");
