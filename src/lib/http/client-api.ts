import type { ApiErrorBody } from "@/types";

/** Error thrown by client helpers, carrying the API's code and per-field messages. */
export class ClientApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

function toError(status: number, body: unknown): ClientApiError {
  const error = (body as Partial<ApiErrorBody> | null)?.error;
  if (error?.message) {
    const fieldMessages = Object.values(error.details?.fieldErrors ?? {}).flat();
    const message = error.code === "VALIDATION_ERROR" && fieldMessages.length > 0 ? fieldMessages.join(" ") : error.message;
    return new ClientApiError(message, status, error.code, error.details?.fieldErrors ?? {});
  }
  if (status === 413) return new ClientApiError("The file is too large for the server to accept.", status, "PAYLOAD_TOO_LARGE");
  if (status === 0) return new ClientApiError("Network error — check your connection and try again.", 0, "NETWORK");
  return new ClientApiError(`Request failed (${status})`, status, "UNKNOWN");
}

/** JSON fetch against our API, unwrapping { data } or throwing ClientApiError. */
export async function apiFetch<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: { Accept: "application/json", ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
    });
  } catch {
    throw toError(0, null);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw toError(response.status, body);
  return (body as { data: T }).data;
}

/**
 * Multipart upload with progress. fetch() cannot report upload progress, so
 * this uses XMLHttpRequest. Returns an abort function alongside the promise.
 */
export function uploadWithProgress<T>(
  url: string,
  form: FormData,
  { method = "POST", onProgress }: { method?: "POST" | "PUT"; onProgress?: (fraction: number) => void } = {},
): { promise: Promise<T>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<T>((resolve, reject) => {
    xhr.open(method, url);
    xhr.responseType = "json";
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve((xhr.response as { data: T }).data);
      else reject(toError(xhr.status, xhr.response));
    };
    xhr.onerror = () => reject(toError(0, null));
    xhr.onabort = () => reject(new ClientApiError("Upload cancelled", 0, "ABORTED"));
    xhr.send(form);
  });
  return { promise, abort: () => xhr.abort() };
}
