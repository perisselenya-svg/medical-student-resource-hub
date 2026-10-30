import { z } from "zod";
import { handle, ok, parseOrThrow } from "@/lib/http/api";
import { listQuizzes } from "@/lib/services/quiz.service";
import { emptyToUndefined, slugSchema } from "@/lib/validation/common";

const querySchema = z.object({ category: z.preprocess(emptyToUndefined, slugSchema.optional()) });

/** GET /api/quizzes?category=<slug> — published quizzes only. */
export const GET = handle(async (request) => {
  const { category } = parseOrThrow(querySchema, Object.fromEntries(new URL(request.url).searchParams));
  return ok(await listQuizzes({ publishedOnly: true, categorySlug: category }));
});
