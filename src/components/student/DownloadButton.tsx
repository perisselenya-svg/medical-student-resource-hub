"use client";

import { Download } from "lucide-react";
import { buttonClasses, type ButtonVariant } from "@/components/ui/button";
import { trackDownload } from "@/lib/http/track";

/**
 * A real link (works without JavaScript) to the access-controlled file route
 * with ?download=1; with JavaScript it also records the download.
 */
export function DownloadButton({ materialId, href, label, variant = "secondary", size = "md" }: { materialId: string; href: string; label: string; variant?: ButtonVariant; size?: "sm" | "md" }) {
  const url = `${href}${href.includes("?") ? "&" : "?"}download=1`;
  return (
    <a href={url} download onClick={() => trackDownload(materialId)} className={buttonClasses(variant, size)}>
      <Download className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
      {label}
    </a>
  );
}
