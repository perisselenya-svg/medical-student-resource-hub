import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminQuizzesTable } from "@/components/admin/AdminQuizzesTable";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listQuizzes } from "@/lib/services/quiz.service";

export const metadata: Metadata = { title: "Quizzes" };

export default async function AdminQuizzesPage() {
  const quizzes = await listQuizzes({ publishedOnly: false });
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Quizzes</h1>
          <p className="text-slate-600">{quizzes.length} quiz{quizzes.length === 1 ? "" : "zes"}</p>
        </div>
        <Link href="/admin/quizzes/new" className={buttonClasses()}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New quiz
        </Link>
      </div>
      {quizzes.length === 0 ? (
        <EmptyState title="No quizzes yet">
          <Link href="/admin/quizzes/new" className="font-medium text-teal-800 underline">
            Create your first quiz
          </Link>
        </EmptyState>
      ) : (
        <AdminQuizzesTable quizzes={quizzes} />
      )}
    </div>
  );
}
