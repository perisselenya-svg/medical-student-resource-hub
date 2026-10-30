import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Returns `base` if free, otherwise `base-<6 hex>` (retrying on the rare
 * collision). The database unique constraint remains the final guarantee.
 */
export async function uniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  const trimmed = base.slice(0, 80);
  if (!(await isTaken(trimmed))) return trimmed;
  for (let i = 0; i < 5; i++) {
    const candidate = `${trimmed.slice(0, 72)}-${randomBytes(3).toString("hex")}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error("Could not generate a unique slug");
}
