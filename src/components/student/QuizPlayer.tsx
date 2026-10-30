"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiFetch, ClientApiError } from "@/lib/http/client-api";
import { cn } from "@/lib/utils";
import type { AnswerResult, PublicQuizDTO } from "@/types";

type Phase = "answering" | "feedback" | "finished";

/**
 * Quiz engine (student side). One question at a time:
 * choose → submit (graded on the server, which reveals the correct option and
 * explanation only after the answer is committed) → next → final score →
 * review all answers → retake. Nothing is stored; students are anonymous.
 */
export function QuizPlayer({ quiz }: { quiz: PublicQuizDTO }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AnswerResult>>({});
  const [phase, setPhase] = useState<Phase>("answering");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  const total = quiz.questions.length;
  const question = quiz.questions[index];
  const result = question ? results[question.id] : undefined;
  const correctCount = Object.values(results).filter((r) => r.isCorrect).length;

  // Move focus to what changed so keyboard and screen-reader users follow along.
  const [focusTarget, setFocusTarget] = useState<"question" | "feedback" | "result" | null>(null);
  useEffect(() => {
    if (focusTarget === "question") headingRef.current?.focus();
    if (focusTarget === "feedback") feedbackRef.current?.focus();
    if (focusTarget === "result") resultRef.current?.focus();
  }, [focusTarget, index, phase]);

  if (total === 0) return <Alert tone="info">This quiz has no questions yet.</Alert>;

  const submit = async () => {
    if (!question || !selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<{ results: AnswerResult[] }>(`/api/quizzes/${quiz.slug}/submit`, {
        method: "POST",
        json: { answers: [{ questionId: question.id, optionId: selected }] },
      });
      const r = data.results[0];
      if (r) setResults((prev) => ({ ...prev, [question.id]: r }));
      setPhase("feedback");
      setFocusTarget("feedback");
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Could not check your answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (index + 1 >= total) {
      setPhase("finished");
      setFocusTarget("result");
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setPhase("answering");
    setFocusTarget("question");
  };

  const retake = () => {
    setIndex(0);
    setSelected(null);
    setResults({});
    setPhase("answering");
    setReviewing(false);
    setError(null);
    setFocusTarget("question");
  };

  /* ----------------------------- Final score ----------------------------- */
  if (phase === "finished") {
    const percent = Math.round((correctCount / total) * 100);
    return (
      <div className="space-y-6">
        <section className="card p-6 text-center" aria-labelledby="quiz-result">
          <h2 id="quiz-result" ref={resultRef} tabIndex={-1} className="text-xl font-bold text-ink focus:outline-none">
            Quiz complete
          </h2>
          <p className="mt-3 text-5xl font-bold tabular-nums text-brand-900">{percent}%</p>
          <p className="mt-2 text-slate-700">
            You answered <strong>{correctCount}</strong> of <strong>{total}</strong> questions correctly.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={() => setReviewing((v) => !v)} aria-expanded={reviewing} aria-controls="quiz-review">
              {reviewing ? "Hide review" : "Review answers"}
            </Button>
            <Button onClick={retake} icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
              Retake quiz
            </Button>
            <Link href="/quizzes" className="btn-ghost">
              More quizzes
            </Link>
          </div>
        </section>
        <div id="quiz-review" hidden={!reviewing}>
          <h2 className="mb-3 text-lg font-semibold text-ink">Review</h2>
          <ol className="space-y-4">
            {quiz.questions.map((q, i) => {
              const r = results[q.id];
              return (
                <li key={q.id} className="card p-5">
                  <p className="flex items-start gap-2 font-medium text-ink">
                    {r?.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Correct" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-label="Incorrect" />
                    )}
                    <span>
                      {i + 1}. {q.questionText}
                    </span>
                  </p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {q.options.map((o) => (
                      <li
                        key={o.id}
                        className={cn(
                          "rounded-md px-3 py-1.5",
                          o.id === r?.correctOptionId && "bg-emerald-50 font-medium text-emerald-900",
                          o.id === r?.selectedOptionId && !r.isCorrect && "bg-red-50 text-red-900 line-through",
                        )}
                      >
                        {o.optionText}
                        {o.id === r?.correctOptionId && " — correct answer"}
                        {o.id === r?.selectedOptionId && !r?.isCorrect && " — your answer"}
                      </li>
                    ))}
                  </ul>
                  {r?.explanation && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{r.explanation}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

  /* --------------------------- Question screen --------------------------- */
  if (!question) return null;
  const answered = Object.keys(results).length;
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          Question {index + 1} of {total}
        </span>
        <span>
          Score: {correctCount}/{answered}
        </span>
      </div>
      <div
        className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        aria-valuetext={`${answered} of ${total} answered`}
      >
        <div className="h-full bg-teal-600 transition-[width]" style={{ width: `${(answered / total) * 100}%` }} />
      </div>

      <fieldset disabled={phase === "feedback" || submitting}>
        <legend className="w-full">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold leading-snug text-ink focus:outline-none">
            {question.questionText}
          </h2>
        </legend>
        <div className="mt-4 space-y-2">
          {question.options.map((o, i) => {
            const isCorrect = result?.correctOptionId === o.id;
            const isWrongPick = result && result.selectedOptionId === o.id && !result.isCorrect;
            return (
              <label
                key={o.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-600",
                  !result && (selected === o.id ? "border-brand-700 bg-brand-50" : "border-slate-200 hover:bg-slate-50"),
                  isCorrect && "border-emerald-500 bg-emerald-50",
                  isWrongPick && "border-red-500 bg-red-50",
                  result && !isCorrect && !isWrongPick && "border-slate-200 opacity-70",
                )}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={o.id}
                  checked={selected === o.id}
                  onChange={() => setSelected(o.id)}
                  className="sr-only"
                />
                <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 pt-0.5">{o.optionText}</span>
                {isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Correct answer" />}
                {isWrongPick && <XCircle className="h-5 w-5 text-red-600" aria-label="Your answer, incorrect" />}
              </label>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      {phase === "feedback" && result && (
        <div ref={feedbackRef} tabIndex={-1} className={cn("mt-5 rounded-lg p-4 focus:outline-none", result.isCorrect ? "bg-emerald-50 text-emerald-950" : "bg-red-50 text-red-950")} aria-live="polite">
          <p className="font-semibold">{result.isCorrect ? "Correct!" : "Not quite."}</p>
          {result.explanation && <p className="mt-1 text-sm">{result.explanation}</p>}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        {phase === "answering" ? (
          <Button onClick={submit} disabled={!selected} loading={submitting}>
            Submit answer
          </Button>
        ) : (
          <Button onClick={next}>{index + 1 >= total ? "See final score" : "Next question"}</Button>
        )}
      </div>
    </div>
  );
}
