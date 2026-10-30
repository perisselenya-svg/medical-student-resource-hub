"use client";

import { useEffect } from "react";
import { trackView } from "@/lib/http/track";

/** Records one view when a resource page is opened (renders nothing). */
export function ViewTracker({ materialId }: { materialId: string }) {
  useEffect(() => trackView(materialId), [materialId]);
  return null;
}
