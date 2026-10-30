import type { Metadata } from "next";
import { QuizForm } from "@/components/forms/QuizForm";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listCategories } from "@/lib/services/taxonomy.service";

export const metadata: Metadata = { title: "New quiz" };

export default async function NewQuizPage() {
  const categories = await listCategories({ publishedOnly: false });
  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs items={[{ label: "Quizzes", href: "/admin/quizzes" }, { label: "New quiz" }]} />
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-ink">New quiz</h1>
      <QuizForm categories={categories.map(({ id, name, slug }) => ({ id, name, slug }))} />
    </div>
  );
}
