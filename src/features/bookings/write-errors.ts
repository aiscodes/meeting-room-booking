import { toast } from "sonner";
import { errorMessage, isApiError, isStaleBookingError } from "@/api/errors";

export type WriteProblem = { tone: "warning" | "error"; message: string };

export function closeIfStale(error: unknown, close: () => void): boolean {
  if (!isStaleBookingError(error)) return false;
  toast.error(error.message);
  close();
  return true;
}

export function describeWriteFailure(error: unknown): WriteProblem {
  if (isApiError(error, "conflict")) {
    return {
      tone: "warning",
      message: `${error.message}. Расписание обновлено, введённые данные сохранены — выберите другое время.`,
    };
  }
  if (isApiError(error, "server") || isApiError(error, "network")) {
    return { tone: "error", message: `${error.message}. Введённые данные сохранены.` };
  }
  return { tone: "error", message: errorMessage(error) };
}
