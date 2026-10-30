import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/http/api";
import { slugify } from "@/lib/utils";
import type { AdminQuizDTO, AnswerResult, PublicQuizDTO, QuizSummaryDTO } from "@/types";
import type { QuestionInput, QuizCreateInput, QuizUpdateInput } from "@/lib/validation/quiz";
import { recordAudit } from "./audit.service";
import { uniqueSlug } from "./slug";

const summaryInclude = {
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { questions: true } },
} satisfies Prisma.QuizInclude;

function toSummary(q: Prisma.QuizGetPayload<{ include: typeof summaryInclude }>): QuizSummaryDTO {
  return {
    id: q.id,
    title: q.title,
    slug: q.slug,
    description: q.description,
    isPublished: q.isPublished,
    category: q.category,
    questionCount: q._count.questions,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

const orderedQuestions = {
  orderBy: { order: "asc" as const },
  include: { options: { orderBy: { order: "asc" as const } } },
};

/* -------------------------------- Public -------------------------------- */

export async function listQuizzes({ publishedOnly, categorySlug }: { publishedOnly: boolean; categorySlug?: string }): Promise<QuizSummaryDTO[]> {
  const rows = await db().quiz.findMany({
    where: {
      ...(publishedOnly ? { isPublished: true } : {}),
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    include: summaryInclude,
    orderBy: [{ updatedAt: "desc" }],
  });
  return rows.map(toSummary);
}

/**
 * Student view of a PUBLISHED quiz. SECURITY: correct answers and
 * explanations are NOT included; they are revealed per question only by
 * POST /api/quizzes/:slug/submit after the student commits to an answer.
 */
export async function getPublicQuiz(slug: string): Promise<PublicQuizDTO | null> {
  const quiz = await db().quiz.findFirst({
    where: { slug, isPublished: true },
    include: { ...summaryInclude, questions: orderedQuestions },
  });
  if (!quiz) return null;
  return {
    ...toSummary(quiz),
    questions: quiz.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options.map((o) => ({ id: o.id, optionText: o.optionText })),
    })),
  };
}

/** Grade submitted answers against a PUBLISHED quiz. Unknown ids are rejected. */
export async function gradeAnswers(slug: string, answers: Array<{ questionId: string; optionId: string }>): Promise<{ results: AnswerResult[]; correct: number }> {
  const quiz = await db().quiz.findFirst({ where: { slug, isPublished: true }, include: { questions: orderedQuestions } });
  if (!quiz) throw new ApiError("NOT_FOUND", "Quiz not found");
  const questions = new Map(quiz.questions.map((q) => [q.id, q]));

  const results = answers.map(({ questionId, optionId }) => {
    const question = questions.get(questionId);
    if (!question) throw new ApiError("VALIDATION_ERROR", "Answer refers to a question that is not in this quiz");
    if (!question.options.some((o) => o.id === optionId)) throw new ApiError("VALIDATION_ERROR", "Answer refers to an option that is not in this question");
    const correct = question.options.find((o) => o.isCorrect);
    if (!correct) throw new ApiError("INTERNAL_ERROR", "Question has no correct answer configured");
    return { questionId, selectedOptionId: optionId, correctOptionId: correct.id, isCorrect: correct.id === optionId, explanation: question.explanation };
  });
  return { results, correct: results.filter((r) => r.isCorrect).length };
}

/* -------------------------------- Admin --------------------------------- */

export async function getAdminQuiz(id: string): Promise<AdminQuizDTO | null> {
  const quiz = await db().quiz.findUnique({ where: { id }, include: { ...summaryInclude, questions: orderedQuestions } });
  if (!quiz) return null;
  return {
    ...toSummary(quiz),
    questions: quiz.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      explanation: q.explanation,
      options: q.options.map((o) => ({ id: o.id, optionText: o.optionText, isCorrect: o.isCorrect })),
    })),
  };
}

async function quizSlugTaken(slug: string, exceptId?: string) {
  const found = await db().quiz.findUnique({ where: { slug }, select: { id: true } });
  return Boolean(found && found.id !== exceptId);
}

async function assertCategory(categoryId: string) {
  if (!(await db().category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    throw new ApiError("VALIDATION_ERROR", "Selected category does not exist", { fieldErrors: { categoryId: ["Unknown category"] } });
  }
}

/** Nested create data; `order` follows array position, so reordering = sending a new order. */
function questionsCreate(questions: QuestionInput[]) {
  return questions.map((q, index) => ({
    questionText: q.questionText,
    explanation: q.explanation,
    order: index,
    options: { create: q.options.map((o, i) => ({ optionText: o.optionText, isCorrect: i === q.correctIndex, order: i })) },
  }));
}

export async function createQuiz(input: QuizCreateInput, adminId: string) {
  await assertCategory(input.categoryId);
  if (input.slug && (await quizSlugTaken(input.slug))) {
    throw new ApiError("CONFLICT", "That slug is already used by another quiz", { fieldErrors: { slug: ["Slug already in use"] } });
  }
  const slug = input.slug ?? (await uniqueSlug(slugify(input.title) || "quiz", (s) => quizSlugTaken(s)));
  const quiz = await db().quiz.create({
    data: {
      title: input.title,
      slug,
      description: input.description,
      categoryId: input.categoryId,
      isPublished: input.isPublished,
      questions: { create: questionsCreate(input.questions) },
    },
  });
  await recordAudit({ adminId, action: "QUIZ_CREATE", entityType: "Quiz", entityId: quiz.id, metadata: { title: quiz.title, questions: input.questions.length } });
  return getAdminQuiz(quiz.id);
}

export async function updateQuiz(id: string, input: QuizUpdateInput, adminId: string) {
  const current = await db().quiz.findUnique({ where: { id }, include: { _count: { select: { questions: true } } } });
  if (!current) throw new ApiError("NOT_FOUND", "Quiz not found");
  if (input.categoryId) await assertCategory(input.categoryId);
  if (input.slug && (await quizSlugTaken(input.slug, id))) {
    throw new ApiError("CONFLICT", "That slug is already used by another quiz", { fieldErrors: { slug: ["Slug already in use"] } });
  }
  // Publishing an existing quiz without sending questions: it must already have some.
  if (input.isPublished && input.questions === undefined && current._count.questions === 0) {
    throw new ApiError("VALIDATION_ERROR", "Add at least one question before publishing");
  }

  await db().$transaction(async (tx) => {
    if (input.questions !== undefined) {
      // Replace-all keeps ordering, options and correct flags consistent in one step.
      await tx.question.deleteMany({ where: { quizId: id } });
      for (const data of questionsCreate(input.questions)) await tx.question.create({ data: { ...data, quizId: id } });
    }
    await tx.quiz.update({
      where: { id },
      data: {
        title: input.title,
        slug: input.slug,
        description: input.description,
        categoryId: input.categoryId,
        isPublished: input.isPublished,
        // Touch updatedAt even when only questions changed.
        updatedAt: new Date(),
      },
    });
  });
  const { questions, ...rest } = input;
  await recordAudit({
    adminId,
    action: "QUIZ_UPDATE",
    entityType: "Quiz",
    entityId: id,
    metadata: { title: input.title ?? current.title, changes: rest, ...(questions ? { questions: questions.length } : {}) },
  });
  return getAdminQuiz(id);
}

export async function deleteQuiz(id: string, adminId: string) {
  const quiz = await db().quiz.delete({ where: { id }, select: { title: true } }); // questions/options cascade
  await recordAudit({ adminId, action: "QUIZ_DELETE", entityType: "Quiz", entityId: id, metadata: { title: quiz.title } });
}

export async function publishedQuizSlugs() {
  return db().quiz.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } });
}
