import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  error: { box: "border-red-200 bg-red-50 text-red-900", Icon: AlertTriangle },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", Icon: CheckCircle2 },
  info: { box: "border-brand-200 bg-brand-50 text-brand-900", Icon: Info },
} as const;

/** Errors use role="alert" so screen readers announce them immediately. */
export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof styles; title?: string; children?: ReactNode; className?: string }) {
  const { box, Icon } = styles[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-3 text-sm", box, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}
