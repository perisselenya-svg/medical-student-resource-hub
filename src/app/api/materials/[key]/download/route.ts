import { counterRoute } from "@/lib/http/counter-route";

/** POST /api/materials/:id/download — record a download of a published material. */
export const POST = counterRoute("downloadCount");
