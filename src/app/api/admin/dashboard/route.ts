import { requireAdmin } from "@/lib/auth/guard";
import { handle, ok } from "@/lib/http/api";
import { dashboardStats } from "@/lib/services/stats.service";

/** GET /api/admin/dashboard — totals, recent uploads and recent activity. */
export const GET = handle(async (request) => {
  await requireAdmin(request);
  return ok(await dashboardStats());
});
