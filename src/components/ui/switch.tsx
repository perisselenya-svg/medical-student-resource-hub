"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
};

/** On/off toggle using the WAI-ARIA switch pattern, labelled by visible text. */
export function Switch({ checked, onChange, label, description, disabled, id: idProp }: SwitchProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60", checked ? "bg-teal-600" : "bg-slate-300")}
      >
        <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
      </button>
      <div className="text-sm">
        <span id={`${id}-label`} className="font-medium text-slate-800">
          {label}
        </span>
        {description && (
          <p id={`${id}-desc`} className="text-slate-600">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
