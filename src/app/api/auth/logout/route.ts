import { signOut } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/auth/guard";
import { handle, ok } from "@/lib/http/api";
import { assertSameOrigin } from "@/lib/http/request";
import { recordAudit } from "@/lib/services/audit.service";

/** POST /api/auth/logout — clears the session cookie. Idempotent. */
export const POST = handle(async (request) => {
  assertSameOrigin(request);
  const admin = await getCurrentAdmin();
  await signOut({ redirect: false });
  if (admin) await recordAudit({ adminId: admin.id, action: "LOGOUT", entityType: "User", entityId: admin.id });
  return ok({ success: true });
});
