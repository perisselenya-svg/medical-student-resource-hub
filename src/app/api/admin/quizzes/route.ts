import { requireAdmin } from "@/lib/auth/guard";
import { handle, ok, parseOrThrow, readJson } from "@/lib/http/api";
import { createQuiz, listQuizzes } from "@/lib/services/quiz.service";
import { quizCreateSchema } from "@/lib/validation/quiz";

/** GET /api/admin/quizzes — all quizzes, including drafts. */
export const GET = handle(async (request) => {
  await requireAdmin(request);
  return ok(await listQuizzes({ publishedOnly: false }));
});

/** POST /api/admin/quizzes — create with questions, options, correct answers and explanations. */
export const POST = handle(async (request) => {
  const admin = await requireAdmin(request);
  const input = parseOrThrow(quizCreateSchema, await readJson(request));
  return ok(await createQuiz(input, admin.id), { status: 201 });
});
