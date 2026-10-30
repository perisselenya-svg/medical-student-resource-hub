import { ApiError, handle, ok } from "@/lib/http/api";
import { getPublicQuiz } from "@/lib/services/quiz.service";
import { slugSchema } from "@/lib/validation/common";

type Context = { params: Promise<{ slug: string }> };

/** GET /api/quizzes/:slug — questions and options of a published quiz, WITHOUT correct answers. */
export const GET = handle<Context>(async (_request, { params }) => {
  const slug = slugSchema.safeParse((await params).slug);
  const quiz = slug.success ? await getPublicQuiz(slug.data) : null;
  if (!quiz) throw new ApiError("NOT_FOUND", "Quiz not found");
  return ok(quiz);
});
