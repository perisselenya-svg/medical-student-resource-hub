"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { SearchBar } from "@/components/student/SearchBar";
import { Drawer } from "@/components/ui/drawer";
import { NavLinks } from "./NavLinks";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close after navigation (adjusting state during render is React's recommended pattern).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  return (
    <>
      <button type="button" className="btn-ghost px-2" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu className="h-6 w-6" aria-hidden="true" />
        <span className="sr-only">Open menu</span>
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Menu">
        <SearchBar id="mobile-search" />
        <nav aria-label="Mobile" className="mt-5">
          <NavLinks vertical />
        </nav>
      </Drawer>
    </>
  );
}
