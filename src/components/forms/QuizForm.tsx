"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/http/client-api";
import { cn, slugify } from "@/lib/utils";
import { MAX_QUESTIONS, quizFormSchema, type QuizFormValues } from "@/lib/validation/quiz";
import type { AdminQuizDTO, CategorySummary } from "@/types";

const MAX_OPTIONS = 6;
const blankQuestion = (): QuizFormValues["questions"][number] => ({
  questionText: "",
  explanation: "",
  options: [{ optionText: "" }, { optionText: "" }, { optionText: "" }, { optionText: "" }],
  correctIndex: 0,
});

function toFormValues(quiz?: AdminQuizDTO): QuizFormValues {
  if (!quiz) return { title: "", slug: "", description: "", categoryId: "", isPublished: false, questions: [blankQuestion()] };
  return {
    title: quiz.title,
    slug: quiz.slug,
    description: quiz.description,
    categoryId: quiz.category.id,
    isPublished: quiz.isPublished,
    questions: quiz.questions.map((q) => ({
      questionText: q.questionText,
      explanation: q.explanation,
      options: q.options.map((o) => ({ optionText: o.optionText })),
      correctIndex: Math.max(0, q.options.findIndex((o) => o.isCorrect)),
    })),
  };
}

/** Create/edit a quiz: details, multiple-choice questions, correct answers, explanations and order. */
export function QuizForm({ quiz, categories }: { quiz?: AdminQuizDTO; categories: CategorySummary[] }) {
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(quiz));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { control, register, handleSubmit, setValue, formState } = useForm<QuizFormValues>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: toFormValues(quiz),
  });
  const questions = useFieldArray({ control, name: "questions" });
  const errorCount = countErrors(formState.errors);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const payload = { ...values, slug: values.slug || undefined };
    try {
      if (quiz) {
        await apiFetch(`/api/admin/quizzes/${quiz.id}`, { method: "PATCH", json: payload });
        toast.success("Quiz saved.");
        router.refresh();
      } else {
        const created = await apiFetch<AdminQuizDTO>("/api/admin/quizzes", { method: "POST", json: payload });
        toast.success("Quiz created.");
        router.push(`/admin/quizzes/${created.id}`);
      }
    } catch (e) {
      setServerError(e instanceof ClientApiError ? e.message : "Could not save the quiz.");
    }
  });

  const remove = async () => {
    if (!quiz) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/quizzes/${quiz.id}`, { method: "DELETE" });
      toast.success("Quiz deleted.");
      router.push("/admin/quizzes");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Could not delete the quiz.");
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const titleField = register("title", {
    onChange: (e) => {
      if (!slugTouched) setValue("slug", slugify(String(e.target.value), 90));
    },
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {serverError && <Alert tone="error">{serverError}</Alert>}
      {formState.isSubmitted && errorCount > 0 && (
        <Alert tone="error" title={`Please fix ${errorCount} problem${errorCount === 1 ? "" : "s"} below`}>
          Each question needs text, at least two options with text, and a marked correct answer.
        </Alert>
      )}

      <section aria-labelledby="quiz-details" className="card space-y-5 p-5 sm:p-6">
        <h2 id="quiz-details" className="font-semibold text-ink">
          Quiz details
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Title" error={formState.errors.title?.message} required>
            {(a) => <Input {...a} {...titleField} maxLength={200} />}
          </Field>
          <Field label="URL slug" error={formState.errors.slug?.message} hint="Public link: /quizzes/your-slug">
            {(a) => <Input {...a} {...register("slug", { onChange: () => setSlugTouched(true) })} maxLength={90} spellCheck={false} />}
          </Field>
        </div>
        <Field label="Description" error={formState.errors.description?.message}>
          {(a) => <Textarea {...a} {...register("description")} rows={2} maxLength={2000} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" error={formState.errors.categoryId?.message} required>
            {(a) => (
              <Select {...a} {...register("categoryId")}>
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="sm:pt-6">
            <Controller
              control={control}
              name="isPublished"
              render={({ field }) => (
                <Switch checked={field.value} onChange={field.onChange} label="Published" description={field.value ? "Students can take this quiz" : "Draft — hidden from students"} />
              )}
            />
            {formState.errors.isPublished && (
              <p role="alert" className="field-error">
                {formState.errors.isPublished.message}
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="quiz-questions" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="quiz-questions" className="font-semibold text-ink">
            Questions ({questions.fields.length})
          </h2>
        </div>
        <ol className="space-y-4">
          {questions.fields.map((field, index) => (
            <QuestionEditor
              key={field.id}
              index={index}
              total={questions.fields.length}
              control={control}
              register={register}
              setValue={setValue}
              errors={formState.errors}
              onMove={(to) => questions.move(index, to)}
              onRemove={() => questions.remove(index)}
            />
          ))}
        </ol>
        <Button variant="secondary" onClick={() => questions.append(blankQuestion())} disabled={questions.fields.length >= MAX_QUESTIONS} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
          Add question
        </Button>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap justify-between gap-3 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        {quiz ? (
          <Button variant="danger" onClick={() => setDeleteOpen(true)} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
            Delete quiz
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" loading={formState.isSubmitting} icon={<Save className="h-4 w-4" aria-hidden="true" />}>
          {quiz ? "Save quiz" : "Create quiz"}
        </Button>
      </div>

      <ConfirmDialog open={deleteOpen} title="Delete quiz?" confirmLabel="Delete quiz" pending={deleting} onConfirm={remove} onClose={() => setDeleteOpen(false)}>
        <p>This permanently deletes the quiz with all its questions and answers.</p>
      </ConfirmDialog>
    </form>
  );
}

type EditorProps = {
  index: number;
  total: number;
  control: Control<QuizFormValues>;
  register: UseFormRegister<QuizFormValues>;
  setValue: UseFormSetValue<QuizFormValues>;
  errors: FieldErrors<QuizFormValues>;
  onMove: (to: number) => void;
  onRemove: () => void;
};

function QuestionEditor({ index, total, control, register, setValue, errors, onMove, onRemove }: EditorProps) {
  const options = useFieldArray({ control, name: `questions.${index}.options` });
  const correctIndex = useWatch({ control, name: `questions.${index}.correctIndex` });
  const qErrors = errors.questions?.[index];
  const n = index + 1;

  const removeOption = (i: number) => {
    options.remove(i);
    // Keep the "correct" mark pointing at the same option after removal.
    if (i < correctIndex) setValue(`questions.${index}.correctIndex`, correctIndex - 1);
    else if (i === correctIndex) setValue(`questions.${index}.correctIndex`, 0);
  };

  return (
    <li className={cn("card p-5", qErrors && "border-red-300")} aria-labelledby={`q-${index}-label`}>
      <div className="mb-4 flex items-center gap-2">
        <h3 id={`q-${index}-label`} className="flex-1 font-semibold text-ink">
          Question {n}
        </h3>
        <button type="button" className="btn-ghost btn-sm" onClick={() => onMove(index - 1)} disabled={index === 0} aria-label={`Move question ${n} up`}>
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => onMove(index + 1)} disabled={index === total - 1} aria-label={`Move question ${n} down`}>
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className="btn-ghost btn-sm text-red-700 hover:bg-red-50" onClick={onRemove} disabled={total <= 1} aria-label={`Remove question ${n}`}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <Field label="Question text" error={qErrors?.questionText?.message} required>
        {(a) => <Textarea {...a} {...register(`questions.${index}.questionText`)} rows={2} maxLength={2000} />}
      </Field>

      <fieldset className="mt-4">
        <legend className="label">
          Options — select the correct answer <span className="text-red-700" aria-hidden="true">*</span>
        </legend>
        <Controller
          control={control}
          name={`questions.${index}.correctIndex`}
          render={({ field }) => (
            <ul className="space-y-2">
              {options.fields.map((opt, i) => {
                const optError = qErrors?.options?.[i]?.optionText?.message;
                const letter = String.fromCharCode(65 + i);
                return (
                  <li key={opt.id}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`questions.${index}.correct`}
                        checked={field.value === i}
                        onChange={() => field.onChange(i)}
                        className="h-4 w-4 accent-emerald-600"
                        aria-label={`Option ${letter} is the correct answer`}
                      />
                      <span aria-hidden="true" className="w-5 text-sm font-semibold text-slate-600">
                        {letter}
                      </span>
                      <Input
                        {...register(`questions.${index}.options.${i}.optionText`)}
                        aria-label={`Option ${letter} text, question ${n}`}
                        aria-invalid={optError ? true : undefined}
                        maxLength={500}
                        className={cn(field.value === i && "border-emerald-500")}
                      />
                      <button type="button" className="btn-ghost btn-sm" onClick={() => removeOption(i)} disabled={options.fields.length <= 2} aria-label={`Remove option ${letter}`}>
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    {optError && (
                      <p role="alert" className="field-error ml-14">
                        {optError}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        />
        {(qErrors?.options?.message || qErrors?.options?.root?.message || qErrors?.correctIndex?.message) && (
          <p role="alert" className="field-error">
            {qErrors?.options?.message ?? qErrors?.options?.root?.message ?? qErrors?.correctIndex?.message}
          </p>
        )}
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => options.append({ optionText: "" })} disabled={options.fields.length >= MAX_OPTIONS} icon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}>
          Add option
        </Button>
      </fieldset>

      <Field label="Explanation" error={qErrors?.explanation?.message} hint="Shown to students after they answer." className="mt-4">
        {(a) => <Textarea {...a} {...register(`questions.${index}.explanation`)} rows={2} maxLength={4000} />}
      </Field>
    </li>
  );
}

/** Counts leaf error messages in a nested React Hook Form error tree. */
function countErrors(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  if ("message" in node && typeof (node as { message?: unknown }).message === "string") return 1;
  return Object.values(node as Record<string, unknown>).reduce<number>((n, child) => n + countErrors(child), 0);
}
