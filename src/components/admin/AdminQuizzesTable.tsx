"use client";

import { startTransition, useOptimistic } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/http/client-api";
import { formatDate } from "@/lib/utils";
import type { QuizSummaryDTO } from "@/types";

/** Quiz list with optimistic publish/unpublish. */
export function AdminQuizzesTable({ quizzes }: { quizzes: QuizSummaryDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setOptimistic] = useOptimistic(quizzes, (state: QuizSummaryDTO[], change: { id: string; isPublished: boolean }) =>
    state.map((q) => (q.id === change.id ? { ...q, isPublished: change.isPublished } : q)),
  );

  const toggle = (q: QuizSummaryDTO) =>
    startTransition(async () => {
      setOptimistic({ id: q.id, isPublished: !q.isPublished });
      try {
        await apiFetch(`/api/admin/quizzes/${q.id}`, { method: "PATCH", json: { isPublished: !q.isPublished } });
        toast.success(`“${q.title}” ${q.isPublished ? "unpublished" : "published"}.`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof ClientApiError ? e.message : "Update failed");
      }
    });

  return (
    <Table label="Quizzes" minWidth="44rem">
      <THead>
        <Th>Title</Th>
        <Th>Category</Th>
        <Th className="text-right">Questions</Th>
        <Th>Status</Th>
        <Th>Updated</Th>
        <Th className="text-right">Actions</Th>
      </THead>
      <TBody>
        {rows.map((q) => (
          <tr key={q.id} className="hover:bg-slate-50/60">
            <Td>
              <Link href={`/admin/quizzes/${q.id}`} className="font-semibold text-ink hover:text-teal-800 hover:underline">
                {q.title}
              </Link>
            </Td>
            <Td>
              <Badge tone="brand">{q.category.name}</Badge>
            </Td>
            <Td className="text-right tabular-nums">{q.questionCount}</Td>
            <Td>
              <button type="button" onClick={() => toggle(q)} className="rounded" aria-label={`${q.isPublished ? "Unpublish" : "Publish"} “${q.title}” (currently ${q.isPublished ? "published" : "draft"})`}>
                <Badge tone={q.isPublished ? "success" : "warning"}>{q.isPublished ? "Published" : "Draft"}</Badge>
              </button>
            </Td>
            <Td className="whitespace-nowrap text-slate-600">{formatDate(q.updatedAt)}</Td>
            <Td className="text-right">
              <Link href={`/admin/quizzes/${q.id}`} className="btn-ghost btn-sm" aria-label={`Edit “${q.title}”`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Td>
          </tr>
        ))}
      </TBody>
    </Table>
  );
}
