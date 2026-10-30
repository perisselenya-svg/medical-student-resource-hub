import { z } from "zod";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const idSchema = z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, "Invalid id");
export const slugSchema = z.string().trim().min(1).max(100).regex(SLUG_PATTERN, "Invalid slug");


/** Turns "" into undefined so optional query params behave intuitively. */
export const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

/** Accepts repeated params (?tag=a&tag=b) and comma lists (?tag=a,b). */
export const toStringArray = (value: unknown): string[] => {
  if (value === undefined || value === null || value === "") return [];
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((v) => String(v).split(",")).map((v) => v.trim()).filter(Boolean);
};
