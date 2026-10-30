"use client";

// Last-resort boundary (errors in the root layout). Must render its own <html>.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1rem", textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>Please try again in a moment.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
