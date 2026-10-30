"use client";

import { useEffect } from "react";

export const LIVE_REGION_ID = "live-region";

/**
 * Announces a message via the persistent polite live region in the layout.
 * Content that is freshly mounted (e.g. new search results) is not reliably
 * announced by itself, so we write into a region that already exists.
 */
export function Announce({ message }: { message: string }) {
  useEffect(() => {
    const region = document.getElementById(LIVE_REGION_ID);
    if (!region) return;
    region.textContent = "";
    const timer = window.setTimeout(() => (region.textContent = message), 50);
    return () => window.clearTimeout(timer);
  }, [message]);
  return null;
}
