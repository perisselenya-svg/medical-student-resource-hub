import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { pageMetadata } from "@/lib/seo/metadata";
import { site } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "Educational Disclaimer",
  description: `${site.disclaimer} How to use ${site.name} responsibly.`,
  path: "/disclaimer",
});

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Disclaimer" }]} />
      <h1 className="text-3xl font-bold tracking-tight text-ink">Educational disclaimer</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-slate-700">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-950">{site.disclaimer}</p>
        <p>
          {site.name} collects study materials — notes, diagrams, images and practice quizzes — to support learning. Content may be simplified,
          course-specific, or out of date by the time you read it.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Do not use these materials to diagnose, treat, or make decisions about real patients.</li>
          <li>Drug doses, protocols and guidelines change. Always check current local guidance and official formularies.</li>
          <li>Clinical work must be performed under appropriate supervision and in line with your institution&apos;s policies.</li>
          <li>Each resource shows when it was uploaded and last updated so you can judge how current it is.</li>
        </ul>
        <p>
          Students do not create accounts and no personal data is collected from students. If you believe a resource contains an error or infringes
          copyright, please contact the site administrator.
        </p>
      </div>
    </div>
  );
}
