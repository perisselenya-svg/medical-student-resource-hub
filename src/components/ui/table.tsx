import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Responsive data table: the scroll container is focusable and labelled so
 * keyboard users can scroll wide tables horizontally on small screens.
 */
export function Table({ label, children, minWidth = "48rem" }: { label: string; children: ReactNode; minWidth?: string }) {
  return (
    <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label={`${label} (scrolls horizontally)`}>
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <caption className="sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn("px-4 py-3 font-semibold", className)} {...props} />;
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-slate-100" {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-top", className)} {...props} />;
}
