import { getCurrentAdmin } from "@/lib/auth/guard";
import { handle, ok } from "@/lib/http/api";

/** GET /api/auth/session — the signed-in admin, or { user: null }. Never cached. */
export const GET = handle(async () => {
  const admin = await getCurrentAdmin();
  return ok({ user: admin });
});
