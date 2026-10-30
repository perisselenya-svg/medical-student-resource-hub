import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuizPlayer } from "@/components/student/QuizPlayer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { jsonLd, pageMetadata } from "@/lib/seo/metadata";
import { absoluteUrl, site } from "@/lib/seo/site";
import { getPublicQuiz } from "@/lib/services/quiz.service";
import { slugSchema } from "@/lib/validation/common";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  return parsed.success ? getPublicQuiz(parsed.data) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const quiz = await load((await params).slug);
  if (!quiz) return { title: "Quiz not found", robots: { index: false } };
  return pageMetadata({
    title: `${quiz.title} — Quiz`,
    description: quiz.description || `${quiz.questionCount}-question ${quiz.category.name} practice quiz with explanations.`,
    path: `/quizzes/${quiz.slug}`,
  });
}

export default async function QuizPage({ params }: Props) {
  const quiz = await load((await params).slug);
  if (!quiz) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "Quiz",
            name: quiz.title,
            description: quiz.description || undefined,
            url: absoluteUrl(`/quizzes/${quiz.slug}`),
            about: quiz.category.name,
            educationalLevel: "Medical school",
            numberOfQuestions: quiz.questionCount,
            isAccessibleForFree: true,
            publisher: { "@type": "Organization", name: site.name },
          }),
        }}
      />
      <Breadcrumbs items={[{ label: "Quizzes", href: "/quizzes" }, { label: quiz.category.name, href: `/quizzes?category=${quiz.category.slug}` }, { label: quiz.title }]} />
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{quiz.title}</h1>
      {quiz.description && <p className="mt-2 text-slate-700">{quiz.description}</p>}
      <div className="mt-6">
        <QuizPlayer quiz={quiz} />
      </div>
      <p className="mt-8 text-sm text-slate-600">{site.disclaimer}</p>
    </div>
  );
}
