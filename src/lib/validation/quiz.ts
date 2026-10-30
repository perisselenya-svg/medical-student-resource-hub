import { z } from "zod";
import { emptyToUndefined, idSchema, slugSchema } from "./common";

export const MAX_QUESTIONS = 100;

const optionSchema = z.object({
  optionText: z.string().trim().min(1, "Option text is required").max(500, "Option is too long"),
});

/**
 * One multiple-choice question with a single best answer. The correct answer
 * is stored as an index into `options` while editing and converted to
 * AnswerOption.isCorrect flags on save.
 */
export const questionSchema = z
  .object({
    questionText: z.string().trim().min(3, "Question must be at least 3 characters").max(2000, "Question is too long"),
    explanation: z.string().trim().max(4000, "Explanation is too long"),
    options: z.array(optionSchema).min(2, "Add at least 2 options").max(6, "At most 6 options"),
    correctIndex: z.number({ message: "Mark the correct answer" }).int().min(0),
  })
  .refine((q) => q.correctIndex < q.options.length, { message: "Mark the correct answer", path: ["correctIndex"] });

const quizBase = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title is too long"),
  slug: z.preprocess(emptyToUndefined, slugSchema.max(90).optional()),
  description: z.string().trim().max(2000, "Description is too long"),
  categoryId: idSchema,
  isPublished: z.boolean(),
  questions: z.array(questionSchema).max(MAX_QUESTIONS, `At most ${MAX_QUESTIONS} questions`),
});

const publishNeedsQuestions = (q: { isPublished?: boolean; questions?: unknown[] }) => !q.isPublished || q.questions === undefined || q.questions.length > 0;
const publishMessage = { message: "Add at least one question before publishing", path: ["isPublished"] };

/** POST /api/admin/quizzes */
export const quizCreateSchema = quizBase
  .extend({ description: quizBase.shape.description.default(""), isPublished: z.boolean().default(false), questions: quizBase.shape.questions.default([]) })
  .refine(publishNeedsQuestions, publishMessage);

/** PATCH /api/admin/quizzes/:id — when `questions` is present it REPLACES all questions (in the given order). */
export const quizUpdateSchema = quizBase
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Provide at least one field to update" })
  .refine(publishNeedsQuestions, publishMessage);

/** Client form schema (React Hook Form). */
export const quizFormSchema = quizBase.extend({
  slug: z.string().trim().max(90).refine((s) => s === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s), {
    message: "Use lowercase letters, numbers and single hyphens",
  }),
  categoryId: z.string().min(1, "Choose a category"),
}).refine(publishNeedsQuestions, publishMessage);
export type QuizFormValues = z.infer<typeof quizFormSchema>;

/** POST /api/quizzes/:slug/submit — one or more answers. */
export const quizSubmitSchema = z.object({
  answers: z
    .array(z.object({ questionId: idSchema, optionId: idSchema }))
    .min(1, "Provide at least one answer")
    .max(MAX_QUESTIONS),
});

export type QuizCreateInput = z.infer<typeof quizCreateSchema>;
export type QuizUpdateInput = z.infer<typeof quizUpdateSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
