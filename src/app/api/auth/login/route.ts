import { AuthError } from "next-auth";
import { LoginRateLimitedError, signIn } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/auth/guard";
import { ApiError, handle, ok, parseOrThrow, readJson } from "@/lib/http/api";
import { assertSameOrigin } from "@/lib/http/request";
import { loginSchema } from "@/lib/validation/auth";

/**
 * POST /api/auth/login  { email, password }
 * On success Auth.js sets the encrypted, HTTP-only session cookie on this response.
 * Errors are deliberately generic: we never reveal whether the email exists.
 */
export const POST = handle(async (request) => {
  // Blocks "login CSRF" (a third-party site logging the browser into an attacker's account).
  assertSameOrigin(request);
  const { email, password } = parseOrThrow(loginSchema, await readJson(request));

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof LoginRateLimitedError) {
      throw new ApiError("RATE_LIMITED", "Too many failed attempts. Please try again later.", undefined, {
        "Retry-After": String(error.retryAfterSeconds),
      });
    }
    if (error instanceof AuthError) throw new ApiError("UNAUTHORIZED", "Invalid email or password");
    throw error;
  }
  return ok({ success: true });
});

/** Convenience for clients: GET returns whether a session is already active. */
export const GET = handle(async () => ok({ authenticated: Boolean(await getCurrentAdmin()) }));
