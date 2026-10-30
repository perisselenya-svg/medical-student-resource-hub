"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

/** Error boundary for all student pages (library, subjects, materials, quizzes). */
export default function StudentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <ErrorState title="We couldn't load this page" action={<Button onClick={reset}>Try again</Button>}>
        The library may be temporarily unavailable. Please try again in a moment.
        {error.digest && <span className="mt-1 block text-xs">Reference: {error.digest}</span>}
      </ErrorState>
    </div>
  );
}
