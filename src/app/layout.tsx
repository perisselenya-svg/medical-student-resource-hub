import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { site, siteUrl } from "@/lib/seo/site";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: siteUrl(),
    // Every page title becomes e.g. "Anatomy Notes | Medical Student Resource Hub".
    title: { default: site.name, template: `%s | ${site.name}` },
    description: site.description,
    applicationName: site.name,
    openGraph: { type: "website", siteName: site.name, title: site.name, description: site.description, locale: "en_US", url: "/" },
    twitter: { card: "summary", title: site.name, description: site.description },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = { themeColor: "#1a2850", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-brand-900 focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
