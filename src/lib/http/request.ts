import "server-only";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http/api";

/**
 * Best-effort client IP.
 *
 * SECURITY: X-Forwarded-For / X-Real-IP are client-controllable unless a
 * trusted proxy overwrites them. Our Nginx config sets X-Real-IP to
 * $remote_addr (overwriting any client value), and the app container is not
 * reachable except through Nginx, so X-Real-IP is trustworthy in deployment.
 * Never expose the Node port directly to the internet.
 */
export function clientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/**
 * CSRF defence for cookie-authenticated mutations.
 *
 * The session cookie is SameSite=Lax, so browsers already refuse to attach it
 * to cross-site POST/PATCH/PUT/DELETE requests. As defence in depth we also
 * require the Origin header (sent by all modern browsers on these methods) to
 * match APP_URL. Requests without Origin (curl, server-to-server) are allowed
 * because they cannot carry a victim's browser cookies.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (origin !== env().appOrigin) {
    throw new ApiError("FORBIDDEN", "Cross-origin request rejected");
  }
}
