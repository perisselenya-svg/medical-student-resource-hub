export const site = {
  name: "Medical Student Resource Hub",
  shortName: "Resource Hub",
  headline: "Organized high-yield resources for medical students.",
  description:
    "Search, filter and study high-yield medical education resources: PDF notes, images, diagrams and quizzes, organised by subject.",
  disclaimer: "For educational purposes only. Not a substitute for clinical judgment.",
} as const;

/** Absolute base URL for metadata, sitemap, canonical and Open Graph URLs. */
export function siteUrl(): URL {
  return new URL(process.env.APP_URL || "http://localhost:3000");
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}
