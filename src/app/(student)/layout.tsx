import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { StudentNavbar } from "@/components/layout/StudentNavbar";
import { LIVE_REGION_ID } from "@/components/student/Announce";
import { libraryLastUpdated } from "@/lib/services/material.service";

// Content changes whenever an admin publishes; always render fresh from the database.
export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const lastUpdated = await libraryLastUpdated();
  return (
    <div className="flex min-h-dvh flex-col">
      <StudentNavbar />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer lastUpdated={lastUpdated} />
      <div id={LIVE_REGION_ID} aria-live="polite" aria-atomic="true" className="sr-only" />
    </div>
  );
}
