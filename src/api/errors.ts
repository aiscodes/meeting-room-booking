import type { Booking } from "@/domain/booking";
import { type ApiViolation, apiErrorBodySchema } from "./contract";

export type ApiErrorKind = "conflict" | "validation" | "locked" | "not_found" | "server" | "network";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly violations: ApiViolation[];
  readonly conflictWith?: Booking;

  constructor(
    kind: ApiErrorKind,
    message: string,
    details: { status?: number; violations?: ApiViolation[]; conflictWith?: Booking } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = details.status;
    this.violations = details.violations ?? [];
    this.conflictWith = details.conflictWith;
  }
}

export function isApiError(error: unknown, kind?: ApiErrorKind): error is ApiError {
  return error instanceof ApiError && (kind === undefined || error.kind === kind);
}

export function isStaleBookingError(error: unknown): error is ApiError {
  return isApiError(error, "not_found") || isApiError(error, "locked");
}

const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  conflict: "Это время уже занято",
  validation: "Проверьте введённые данные",
  locked: "Эту бронь уже нельзя изменить",
  not_found: "Бронь не найдена — возможно, её уже удалили",
  server: "Сервер не смог обработать запрос. Попробуйте ещё раз",
  network: "Нет связи с сервером. Проверьте подключение и попробуйте ещё раз",
};

const KIND_BY_STATUS: Record<number, ApiErrorKind> = {
  400: "validation",
  404: "not_found",
  409: "conflict",
  423: "locked",
};

export async function toApiError(response: Response): Promise<ApiError> {
  const kind = KIND_BY_STATUS[response.status] ?? "server";
  const parsed = apiErrorBodySchema.safeParse(await response.json().catch(() => undefined));
  const body = parsed.success ? parsed.data.error : undefined;
  return new ApiError(kind, body?.message ?? FALLBACK_MESSAGES[kind], {
    status: response.status,
    violations: body?.violations,
    conflictWith: body?.conflictWith,
  });
}

export function networkError(): ApiError {
  return new ApiError("network", FALLBACK_MESSAGES.network);
}

export function invalidResponseError(status: number): ApiError {
  return new ApiError("server", "Сервер вернул данные в неожиданном формате", { status });
}

export function errorMessage(error: unknown): string {
  return isApiError(error) ? error.message : FALLBACK_MESSAGES.server;
}
