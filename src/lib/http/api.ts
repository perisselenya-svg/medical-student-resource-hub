import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

/**
 * Consistent JSON envelope for every API route:
 *   success → { data, meta? }
 *   failure → { error: { code, message, details? } }
 */
export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T, init?: { status?: number; meta?: Record<string, unknown>; headers?: HeadersInit }) {
  return NextResponse.json(
    init?.meta ? { data, meta: init.meta } : { data },
    { status: init?.status ?? 200, headers: { "Cache-Control": "no-store", ...init?.headers } },
  );
}

export function errorResponse(code: ErrorCode, message: string, details?: unknown, headers?: Record<string, string>) {
  return NextResponse.json(
    { error: details === undefined ? { code, message } : { code, message, details } },
    { status: STATUS[code], headers: { "Cache-Control": "no-store", ...headers } },
  );
}

/** Parse with Zod, throwing a 422 with per-field messages on failure. */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError("VALIDATION_ERROR", "Request validation failed", z.flattenError(result.error));
  }
  return result.data;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("BAD_REQUEST", "Request body must be valid JSON");
  }
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

/**
 * Wraps a route handler so every thrown error becomes a consistent JSON error.
 * Unexpected errors are logged server-side with a reference id; their details
 * are never sent to the client (they can leak paths, SQL, or stack traces).
 */
export function handle<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error.code, error.message, error.details, error.headers);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") return errorResponse("CONFLICT", "A record with these values already exists");
        if (error.code === "P2025") return errorResponse("NOT_FOUND", "Record not found");
        if (error.code === "P2003") return errorResponse("CONFLICT", "This record is still referenced by other records");
      }
      const ref = crypto.randomUUID();
      console.error(`[api] unhandled error ref=${ref} ${request.method} ${new URL(request.url).pathname}`, error);
      return errorResponse("INTERNAL_ERROR", `Something went wrong. Reference: ${ref}`);
    }
  };
}
