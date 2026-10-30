import { db } from "@/lib/db";

/** GET /api/health — liveness + DB connectivity for Docker healthchecks. */
export async function GET() {
  try {
    await db().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
