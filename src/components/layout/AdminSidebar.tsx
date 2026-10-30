"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, FolderTree, LayoutDashboard, Library, ListChecks, Tags, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_NAV = [
  { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/upload", label: "Upload", Icon: Upload },
  { href: "/admin/materials", label: "Materials", Icon: Library },
  { href: "/admin/categories", label: "Categories", Icon: FolderTree },
  { href: "/admin/tags", label: "Tags", Icon: Tags },
  { href: "/admin/quizzes", label: "Quizzes", Icon: ListChecks },
] as const;

/** Admin navigation list (used in the desktop sidebar and the mobile drawer). */
export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <ul className="space-y-1">
        {ADMIN_NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium", active ? "bg-brand-800 text-white" : "text-slate-700 hover:bg-slate-100")}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> View student site
          </a>
        </li>
      </ul>
    </nav>
  );
}
