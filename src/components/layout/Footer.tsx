import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { site } from "@/lib/seo/site";
import { formatDate } from "@/lib/utils";

export function Footer({ lastUpdated }: { lastUpdated: Date | null }) {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            <strong className="font-semibold">{site.disclaimer}</strong> Always follow current guidelines, your institution&apos;s protocols and your
            supervising clinicians.{" "}
            <Link href="/disclaimer" className="font-medium underline underline-offset-2">
              Full disclaimer
            </Link>
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getUTCFullYear()} {site.name}
            {lastUpdated && (
              <>
                {" · "}Library updated <time dateTime={lastUpdated.toISOString()}>{formatDate(lastUpdated)}</time>
              </>
            )}
          </p>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-4">
              {[
                ["/library", "Library"],
                ["/subjects", "Subjects"],
                ["/quizzes", "Quizzes"],
                ["/disclaimer", "Disclaimer"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href!} className="hover:text-brand-800 hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
