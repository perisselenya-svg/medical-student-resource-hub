import Link from "next/link";
import { SearchBar } from "@/components/student/SearchBar";
import { Logo } from "@/components/ui/logo";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";

/** Sticky top navigation for the student site (desktop links + mobile drawer). */
export function StudentNavbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-md" aria-label="Medical Student Resource Hub — home">
          <span className="hidden sm:inline">
            <Logo />
          </span>
          <span className="sm:hidden">
            <Logo compact />
          </span>
        </Link>
        <nav aria-label="Primary" className="ml-4 hidden lg:block">
          <NavLinks />
        </nav>
        <SearchBar id="header-search" className="ml-auto hidden max-w-sm md:flex" />
        <div className="ml-auto md:ml-0 lg:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
