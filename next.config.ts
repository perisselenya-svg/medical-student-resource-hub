import type { NextConfig } from "next";

/**
 * Security headers for every response. The Content-Security-Policy is set
 * per request (with a nonce) in src/proxy.ts; HSTS is set by Nginx so it is
 * only ever sent over HTTPS.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for a small Docker image.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // src/proxy.ts runs on /api/admin/* (including uploads). Next.js buffers the
    // request body for the proxy up to this size and would TRUNCATE anything
    // larger, so it must exceed the largest allowed upload (MAX_UPLOAD_SIZE_MB
    // is capped at 1024 in src/lib/env.ts) plus multipart overhead.
    proxyClientMaxBodySize: "1040mb",
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Admin pages must never be cached by shared caches or indexed.
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
