import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuizForm } from "@/components/forms/QuizForm";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getAdminQuiz } from "@/lib/services/quiz.service";
import { listCategories } from "@/lib/services/taxonomy.service";
import { idSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Edit quiz" };

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [quiz, categories] = await Promise.all([getAdminQuiz(id.data), listCategories({ publishedOnly: false })]);
  if (!quiz) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs items={[{ label: "Quizzes", href: "/admin/quizzes" }, { label: quiz.title }]} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{quiz.title}</h1>
        <Badge tone={quiz.isPublished ? "success" : "warning"}>{quiz.isPublished ? "Published" : "Draft"}</Badge>
        {quiz.isPublished && (
          <a href={`/quizzes/${quiz.slug}`} target="_blank" rel="noopener" className="text-sm font-medium text-teal-800 hover:underline">
            Open student view
          </a>
        )}
      </div>
      <QuizForm key={quiz.updatedAt} quiz={quiz} categories={categories.map(({ id, name, slug }) => ({ id, name, slug }))} />
    </div>
  );
}
