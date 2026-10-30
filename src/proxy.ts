import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Next.js middleware (named "proxy" since Next.js 16). Two jobs:
 *
 * 1. ACCESS CONTROL for /admin/* pages and /api/admin/* routes.
 *    The encrypted Auth.js session cookie is decrypted and verified here; a
 *    missing, expired, tampered or non-ADMIN token is rejected before any
 *    page or route code runs. Route handlers and pages ALSO call
 *    requireAdmin()/requireAdminPage(), which re-check the database (defence in depth).
 *
 * 2. CONTENT-SECURITY-POLICY with a per-request nonce for all pages. Next.js
 *    applies the nonce to its own scripts, so 'unsafe-inline' is never needed.
 */

const isProd = process.env.NODE_ENV === "production";

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval' lets pdf.js run its WebAssembly image decoders (it does not allow JS eval).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isProd ? "" : " 'unsafe-eval'"}`,
    // Inline styles are required by React style props and pdf.js text layers.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false; // misconfigured server: fail closed
  const token = await getToken({
    req: request,
    secret,
    // Must match the cookie mode chosen in src/lib/auth/index.ts.
    secureCookie: (process.env.APP_URL ?? "").startsWith("https://"),
  });
  return token?.role === "ADMIN" && typeof token.uid === "string";
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // --- Admin API: JSON 401, never a redirect ---
  if (pathname.startsWith("/api/admin")) {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.next();
  }

  // --- Admin pages (except the login page itself) ---
  const isAdminPage = pathname === "/admin" || (pathname.startsWith("/admin/") && pathname !== "/admin/login");
  if (isAdminPage && !(await isAdminRequest(request))) {
    const login = new URL("/admin/login", request.url);
    // Only same-site relative paths are ever used as the post-login destination.
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  // --- All pages: per-request CSP nonce ---
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Every admin API route is checked here (uploads included; see proxyClientMaxBodySize in next.config.ts).
    "/api/admin/:path*",
    // Pages: everything except other APIs, static assets and metadata files.
    {
      source: "/((?!api/|_next/static|_next/image|pdfjs/|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
