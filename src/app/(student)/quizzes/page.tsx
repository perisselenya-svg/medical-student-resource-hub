import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { pageMetadata } from "@/lib/seo/metadata";
import { listQuizzes } from "@/lib/services/quiz.service";
import { listCategories } from "@/lib/services/taxonomy.service";
import { cn } from "@/lib/utils";
import { slugSchema } from "@/lib/validation/common";

export const metadata: Metadata = pageMetadata({
  title: "Practice Quizzes",
  description: "Single-best-answer practice quizzes with instant feedback and explanations, organised by subject.",
  path: "/quizzes",
});

type Props = { searchParams: Promise<{ category?: string | string[] }> };

export default async function QuizzesPage({ searchParams }: Props) {
  const raw = (await searchParams).category;
  const parsed = slugSchema.safeParse(Array.isArray(raw) ? raw[0] : raw);
  const category = parsed.success ? parsed.data : undefined;
  const [quizzes, categories] = await Promise.all([listQuizzes({ publishedOnly: true, categorySlug: category }), listCategories({ publishedOnly: true })]);
  const withQuizzes = categories.filter((c) => c.quizCount > 0);
  const chip = (active: boolean) =>
    cn("inline-block rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset", active ? "bg-brand-800 text-white ring-brand-800" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Quizzes" }]} />
      <h1 className="text-3xl font-bold tracking-tight text-ink">Practice quizzes</h1>
      <p className="mt-2 max-w-2xl text-slate-700">Answer one question at a time and see the explanation straight away. No account needed.</p>

      {withQuizzes.length > 0 && (
        <nav aria-label="Filter quizzes by subject" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link href="/quizzes" className={chip(!category)} aria-current={!category ? "page" : undefined}>
                All subjects
              </Link>
            </li>
            {withQuizzes.map((c) => (
              <li key={c.id}>
                <Link href={`/quizzes?category=${c.slug}`} className={chip(category === c.slug)} aria-current={category === c.slug ? "page" : undefined}>
                  {c.name} ({c.quizCount})
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-8">
        {quizzes.length === 0 ? (
          <EmptyState title="No quizzes here yet" icon={<ListChecks className="h-6 w-6" aria-hidden="true" />}>
            {category ? "Try another subject." : "Practice quizzes will appear here once they are published."}
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <li key={quiz.id}>
                <article className="card flex h-full flex-col p-5">
                  <Badge tone="brand" className="self-start">
                    {quiz.category.name}
                  </Badge>
                  <h2 className="mt-3 text-lg font-semibold text-ink">{quiz.title}</h2>
                  {quiz.description && <p className="mt-1 text-sm text-slate-600">{quiz.description}</p>}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-sm text-slate-600">
                      {quiz.questionCount} question{quiz.questionCount === 1 ? "" : "s"}
                    </span>
                    <Link href={`/quizzes/${quiz.slug}`} className="btn-primary btn-sm" aria-label={`Start quiz: ${quiz.title}`}>
                      Start quiz
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
