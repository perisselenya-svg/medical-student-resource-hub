"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { STUDENT_NAV } from "./nav-links";

/** Primary links with aria-current for the active section. */
export function NavLinks({ vertical = false }: { vertical?: boolean }) {
  const pathname = usePathname();
  return (
    <ul className={cn(vertical ? "space-y-1" : "flex items-center gap-1")}>
      {STUDENT_NAV.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`) || (href === "/library" && pathname.startsWith("/materials/"));
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium",
                active ? "bg-brand-50 text-brand-900" : "text-slate-700 hover:bg-slate-100 hover:text-ink",
              )}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
