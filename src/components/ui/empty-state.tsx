import type { ReactNode } from "react";
import { SearchX } from "lucide-react";

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-700">{icon ?? <SearchX className="h-6 w-6" aria-hidden="true" />}</div>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {children && <div className="mt-2 max-w-md text-sm text-slate-600">{children}</div>}
    </div>
  );
}
