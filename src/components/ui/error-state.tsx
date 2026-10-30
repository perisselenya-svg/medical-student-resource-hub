import type { ReactNode } from "react";
import { AlertOctagon } from "lucide-react";

/** Full-section error message with an optional retry action. */
export function ErrorState({ title = "Something went wrong", children, action }: { title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="card flex flex-col items-center border-red-200 px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-red-50 p-3 text-red-700">
        <AlertOctagon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {children && <div className="mt-2 max-w-md text-sm text-slate-600">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
