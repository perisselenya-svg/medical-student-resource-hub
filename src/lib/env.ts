import "server-only";
import path from "node:path";
import { z } from "zod";

/**
 * Server environment, validated once on first use.
 *
 * Validation is lazy (not at import time) so `next build` can run without
 * production secrets; the first request that needs configuration fails fast
 * with a clear message if anything is missing or malformed.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  // Auth.js signs/encrypts session JWTs with this. 32+ chars of randomness.
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.string().url(),
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  UPLOAD_DIR: z.string().min(1).default("./uploads"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().max(1024).default(25),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  UPLOAD_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(10),
  SESSION_MAX_AGE_HOURS: z.coerce.number().int().positive().max(24 * 30).default(8),
});

export type ServerEnv = z.infer<typeof envSchema> & {
  /** Absolute upload directory. */
  uploadDirAbsolute: string;
  /** Maximum upload size in bytes. */
  maxUploadBytes: number;
  /** Canonical origin, e.g. "https://resourcehub.example.org". */
  appOrigin: string;
};

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid server environment configuration:\n${problems}`);
  }
  const data = parsed.data;
  cached = {
    ...data,
    uploadDirAbsolute: path.resolve(data.UPLOAD_DIR),
    maxUploadBytes: data.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    appOrigin: new URL(data.APP_URL).origin,
  };
  return cached;
}
