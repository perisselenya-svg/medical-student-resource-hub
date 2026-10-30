/** JSON-safe shapes shared by API responses and client components. */
import type { FileTypeEnum } from "@/lib/files/types";

export type AdminRole = "ADMIN";

export type CategorySummary = { id: string; name: string; slug: string };
export type TagSummary = { id: string; name: string; slug: string };

export type CategoryDTO = CategorySummary & {
  description: string | null;
  displayOrder: number;
  materialCount: number;
  quizCount: number;
};

export type TagDTO = TagSummary & { materialCount: number };

export type MaterialDTO = {
  id: string;
  title: string;
  slug: string;
  description: string;
  originalFileName: string;
  fileType: FileTypeEnum;
  mimeType: string;
  fileSize: number;
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  category: CategorySummary;
  tags: TagSummary[];
  /** Access-controlled file URL with a version parameter (busts caches after re-upload). */
  fileUrl: string;
};

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };

export type AdminSessionUser = { id: string; email: string; name: string | null; role: AdminRole };

/* ---------------------------------- Quizzes --------------------------------- */

export type QuizSummaryDTO = {
  id: string;
  title: string;
  slug: string;
  description: string;
  isPublished: boolean;
  category: CategorySummary;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

/** Student view: correct answers and explanations are deliberately absent. */
export type PublicQuizDTO = QuizSummaryDTO & {
  questions: Array<{ id: string; questionText: string; options: Array<{ id: string; optionText: string }> }>;
};

/** Admin view: full content for editing. */
export type AdminQuizDTO = QuizSummaryDTO & {
  questions: Array<{ id: string; questionText: string; explanation: string; options: Array<{ id: string; optionText: string; isCorrect: boolean }> }>;
};

export type AnswerResult = {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string;
};

/** Client-side view of the API error envelope. */
export type ApiErrorBody = {
  error: { code: string; message: string; details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } };
};
