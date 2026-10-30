import { requireAdmin } from "@/lib/auth/guard";
import { ApiError, handle, ok, parseOrThrow, readJson } from "@/lib/http/api";
import { deleteQuiz, getAdminQuiz, updateQuiz } from "@/lib/services/quiz.service";
import { idSchema } from "@/lib/validation/common";
import { quizUpdateSchema } from "@/lib/validation/quiz";

type Context = { params: Promise<{ id: string }> };

/** GET /api/admin/quizzes/:id — full quiz including correct answers. */
export const GET = handle<Context>(async (request, { params }) => {
  await requireAdmin(request);
  const quiz = await getAdminQuiz(parseOrThrow(idSchema, (await params).id));
  if (!quiz) throw new ApiError("NOT_FOUND", "Quiz not found");
  return ok(quiz);
});

/**
 * PATCH /api/admin/quizzes/:id — any subset of fields. When `questions` is
 * sent it replaces the whole question list in the given order (reordering).
 */
export const PATCH = handle<Context>(async (request, { params }) => {
  const admin = await requireAdmin(request);
  const id = parseOrThrow(idSchema, (await params).id);
  const input = parseOrThrow(quizUpdateSchema, await readJson(request));
  return ok(await updateQuiz(id, input, admin.id));
});

/** DELETE /api/admin/quizzes/:id — deletes the quiz with its questions and options. */
export const DELETE = handle<Context>(async (request, { params }) => {
  const admin = await requireAdmin(request);
  const id = parseOrThrow(idSchema, (await params).id);
  await deleteQuiz(id, admin.id);
  return ok({ id, deleted: true });
});
