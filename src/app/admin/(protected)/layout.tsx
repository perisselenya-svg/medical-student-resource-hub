import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireAdminPage } from "@/lib/auth/guard";

/**
 * All admin pages. src/proxy.ts already rejects requests without a valid
 * ADMIN session token; this server-side check additionally confirms the
 * account still exists in the database (defence in depth).
 */
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminPage();
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
