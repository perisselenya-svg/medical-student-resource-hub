// Auth.js internal endpoints (CSRF token, credentials callback, session).
// The app's public auth API is /api/auth/login|logout|session.
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
