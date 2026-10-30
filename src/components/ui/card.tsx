import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

/** Card with a titled header row (used by dashboard and admin sections). */
export function SectionCard({ title, titleId, actions, children, className }: { title: ReactNode; titleId: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={titleId} className={cn("card", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <h2 id={titleId} className="font-semibold text-ink">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
