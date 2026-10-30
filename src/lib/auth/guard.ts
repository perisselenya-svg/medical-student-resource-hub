import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/http/api";
import { assertSameOrigin } from "@/lib/http/request";
import { db } from "@/lib/db";
import type { AdminSessionUser } from "@/types";
import { auth } from "./index";

/**
 * Resolve the current admin from the session cookie, then RE-CHECK the
 * database. Sessions are stateless JWTs, so without this a deleted admin
 * would keep access until the token expired. React cache() = once per request.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminSessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db().user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true } });
  return user?.role === "ADMIN" ? user : null;
});

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Guard for every /api/admin route (defence in depth behind src/proxy.ts):
 *  1. CSRF: state-changing requests must come from our own origin;
 *  2. authentication: a valid, unexpired session;
 *  3. authorization: the account still exists and has the ADMIN role.
 */
export async function requireAdmin(request: Request): Promise<AdminSessionUser> {
  if (MUTATING.has(request.method)) assertSameOrigin(request);
  const admin = await getCurrentAdmin();
  if (!admin) throw new ApiError("UNAUTHORIZED", "Authentication required");
  if (admin.role !== "ADMIN") throw new ApiError("FORBIDDEN", "Administrator access required");
  return admin;
}

/** Guard for admin pages: redirects to the login page when not signed in. */
export async function requireAdminPage(): Promise<AdminSessionUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
