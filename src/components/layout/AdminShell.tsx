"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Logo } from "@/components/ui/logo";
import { ToastProvider } from "@/components/ui/toast";
import { apiFetch } from "@/lib/http/client-api";
import type { AdminSessionUser } from "@/types";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({ admin, children }: { admin: AdminSessionUser; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  const logout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  };

  const account = (
    <div className="border-t border-slate-200 pt-4 text-sm">
      <p className="truncate font-medium text-slate-800" title={admin.email}>
        {admin.name ?? admin.email}
      </p>
      <p className="truncate text-xs text-slate-500">{admin.email}</p>
      <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={logout} loading={loggingOut} icon={<LogOut className="h-3.5 w-3.5" aria-hidden="true" />}>
        Log out
      </Button>
    </div>
  );

  return (
    <ToastProvider>
      <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <Link href="/admin/dashboard">
            <Logo compact />
          </Link>
          <button type="button" className="btn-ghost px-2" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Open admin menu</span>
          </button>
        </header>
        <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Admin menu" side="left">
          <div className="space-y-4">
            <AdminSidebar />
            {account}
          </div>
        </Drawer>

        <aside className="hidden h-dvh flex-col gap-6 border-r border-slate-200 bg-white p-4 lg:sticky lg:top-0 lg:flex">
          <Link href="/admin/dashboard" className="px-1">
            <Logo compact />
          </Link>
          <div className="flex-1">
            <AdminSidebar />
          </div>
          {account}
        </aside>

        <main id="main" tabIndex={-1} className="min-w-0 px-4 py-6 focus:outline-none sm:px-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
