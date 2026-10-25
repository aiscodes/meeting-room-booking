import type { z } from "zod";
import { invalidResponseError, networkError, toApiError } from "./errors";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

function resolveUrl(path: string): string {
  const url = `${API_BASE_URL}${path}`;
  return typeof window === "undefined" ? url : new URL(url, window.location.origin).toString();
}

type RequestOptions = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal };

async function send(path: string, { method = "GET", body, signal }: RequestOptions): Promise<Response> {
  const hasBody = body !== undefined;
  let response: Response;
  try {
    response = await fetch(resolveUrl(path), {
      method,
      signal,
      headers: { Accept: "application/json", ...(hasBody && { "Content-Type": "application/json" }) },
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw networkError();
  }
  if (!response.ok) throw await toApiError(response);
  return response;
}

export async function request<T>(path: string, schema: z.ZodType<T>, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  const parsed = schema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) throw invalidResponseError(response.status);
  return parsed.data;
}

export async function requestNoContent(path: string, options: RequestOptions = {}): Promise<void> {
  await send(path, options);
}
