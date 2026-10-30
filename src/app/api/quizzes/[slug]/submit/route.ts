import { ApiError, handle, ok, parseOrThrow, readJson } from "@/lib/http/api";
import { assertSameOrigin, clientIp } from "@/lib/http/request";
import { gradeAnswers } from "@/lib/services/quiz.service";
import { limiters } from "@/lib/utils/rate-limit";
import { slugSchema } from "@/lib/validation/common";
import { quizSubmitSchema } from "@/lib/validation/quiz";

type Context = { params: Promise<{ slug: string }> };

/**
 * POST /api/quizzes/:slug/submit  { answers: [{ questionId, optionId }] }
 * Grades on the server and returns, for each answered question, whether it
 * was correct, the correct option and the explanation. Students are
 * anonymous, so nothing is stored. Rate-limited per IP.
 */
export const POST = handle<Context>(async (request, { params }) => {
  assertSameOrigin(request);
  const slug = parseOrThrow(slugSchema, (await params).slug);
  const ip = clientIp(request.headers);
  const { quizSubmit } = limiters();
  const wait = quizSubmit.retryAfter(ip);
  if (wait > 0) throw new ApiError("RATE_LIMITED", "Too many submissions. Please slow down.", undefined, { "Retry-After": String(wait) });
  quizSubmit.hit(ip);

  const { answers } = parseOrThrow(quizSubmitSchema, await readJson(request));
  const { results, correct } = await gradeAnswers(slug, answers);
  return ok({ results, correct, answered: results.length });
});
