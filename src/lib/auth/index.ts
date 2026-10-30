import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/http/request";
import { limiters } from "@/lib/utils/rate-limit";
import { recordAudit } from "@/lib/services/audit.service";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "./password";

/** Thrown from authorize() so the login route can answer 429 instead of 401. */
export class LoginRateLimitedError extends CredentialsSignin {
  code = "rate_limited";
  constructor(public readonly retryAfterSeconds: number) {
    super();
  }
}

/**
 * Auth.js is mounted at /api/authjs (not the default /api/auth) so the
 * REST-style /api/auth/login|logout|session routes can own /api/auth/*.
 *
 * Sessions are stateless JWTs stored in an HTTP-only cookie:
 *  - httpOnly: JavaScript cannot read the token (mitigates XSS token theft);
 *  - SameSite=Lax: not sent on cross-site POST/PATCH/DELETE (CSRF mitigation);
 *  - Secure + "__Secure-" prefix automatically when APP_URL is https.
 * The token is encrypted (JWE) with AUTH_SECRET.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const config = env();
  const maxAge = config.SESSION_MAX_AGE_HOURS * 3600;
  return {
    basePath: "/api/authjs",
    secret: config.AUTH_SECRET,
    // Required behind Nginx: the Host / X-Forwarded-* headers come from our proxy.
    trustHost: true,
    // Secure cookies (with the "__Secure-" prefix) whenever the public URL is HTTPS.
    useSecureCookies: config.APP_URL.startsWith("https://"),
    session: { strategy: "jwt", maxAge, updateAge: 15 * 60 },
    jwt: { maxAge },
    pages: { signIn: "/admin/login", error: "/admin/login" },
    providers: [
      Credentials({
        credentials: { email: {}, password: {} },
        // authorize() is the single choke point for password checks: both our
        // /api/auth/login route and Auth.js's own callback endpoint call it, so
        // rate limiting here cannot be bypassed by hitting the other endpoint.
        async authorize(rawCredentials, request) {
          const parsed = loginSchema.safeParse(rawCredentials);
          if (!parsed.success) return null;
          const { email, password } = parsed.data;
          const ip = clientIp(request.headers);
          const { loginPerAccount: perAccount, loginPerIp: perIp } = limiters();
          const accountKey = `${email}|${ip}`;

          const wait = Math.max(perAccount.retryAfter(accountKey), perIp.retryAfter(ip));
          if (wait > 0) throw new LoginRateLimitedError(wait);

          const user = await db().user.findUnique({ where: { email } });
          // Only ADMIN accounts may sign in (students have no accounts in v1).
          const valid = await verifyPassword(password, user?.passwordHash);
          if (!user || !valid || user.role !== "ADMIN") {
            perAccount.hit(accountKey);
            perIp.hit(ip);
            await recordAudit({
              adminId: user?.id ?? null,
              action: "LOGIN_FAILURE",
              entityType: "User",
              entityId: user?.id ?? null,
              metadata: { email, ip },
            });
            return null;
          }

          perAccount.reset(accountKey);
          await db().user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
          await recordAudit({ adminId: user.id, action: "LOGIN_SUCCESS", entityType: "User", entityId: user.id, metadata: { ip } });
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        },
      }),
    ],
    callbacks: {
      jwt({ token, user }) {
        if (user) {
          token.uid = user.id;
          token.role = user.role;
        }
        return token;
      },
      session({ session, token }) {
        if (token.uid) session.user.id = token.uid;
        if (token.role) session.user.role = token.role;
        return session;
      },
    },
  };
});
