import type { Metadata } from "next";
import { site } from "./site";

type PageMetaInput = {
  /** Page title; the layout template appends " | Medical Student Resource Hub". */
  title: string;
  description: string;
  /** Path for canonical/OG URL, e.g. "/library". */
  path: string;
  type?: "website" | "article";
  noindex?: boolean;
  extraOpenGraph?: Record<string, unknown>;
};

/** Consistent metadata for every public page: canonical URL, Open Graph and Twitter card. */
export function pageMetadata({ title, description, path, type = "website", noindex, extraOpenGraph }: PageMetaInput): Metadata {
  const fullTitle = `${title} | ${site.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type, title: fullTitle, description, url: path, siteName: site.name, locale: "en_US", ...extraOpenGraph },
    twitter: { card: "summary", title: fullTitle, description },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}

/** Serialise JSON-LD safely: "<" is escaped so content can never close the <script> element. */
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
