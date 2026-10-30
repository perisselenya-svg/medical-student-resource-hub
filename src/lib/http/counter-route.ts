import "server-only";
import { ApiError, handle, ok, parseOrThrow } from "@/lib/http/api";
import { clientIp, assertSameOrigin } from "@/lib/http/request";
import { incrementCounter } from "@/lib/services/material.service";
import { limiters } from "@/lib/utils/rate-limit";
import { idSchema } from "@/lib/validation/common";

type Context = { params: Promise<{ key: string }> };

/**
 * Shared handler for POST /api/materials/:id/view and /download.
 * Counts at most once per (IP, material, counter) per 30 minutes so refreshes
 * and scripts cannot inflate statistics; repeats still return 200 (idempotent
 * from the client's point of view). Only published materials are counted.
 */
export function counterRoute(counter: "viewCount" | "downloadCount") {
  return handle<Context>(async (request, { params }) => {
    assertSameOrigin(request);
    const id = parseOrThrow(idSchema, (await params).key);
    const key = `${counter}:${id}:${clientIp(request.headers)}`;
    const { counters } = limiters();
    if (counters.retryAfter(key) > 0) return ok({ counted: false });
    if (!(await incrementCounter(id, counter))) throw new ApiError("NOT_FOUND", "Material not found");
    counters.hit(key);
    return ok({ counted: true });
  });
}
