import { CalendarX2, Clock, RefreshCw, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function TimelineSkeleton() {
  return (
    <div className="space-y-3 py-4" aria-hidden>
      {[60, 35, 80, 45, 70].map((width) => (
        <div key={width} className="flex items-center gap-3">
          <div className="h-3 w-10 animate-pulse rounded bg-slate-200" />
          <div className="h-12 animate-pulse rounded-lg bg-slate-100" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Загружаем расписание…</span>
      <div className="flex gap-1.5 sm:gap-2" aria-hidden>
        <div className="size-10 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-10 flex-1 animate-pulse rounded-lg bg-slate-200 sm:max-w-44" />
        <div className="size-10 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-hidden>
        <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
        <TimelineSkeleton />
      </div>
    </div>
  );
}

export function LoadError({ message, retrying, onRetry }: { message: string; retrying: boolean; onRetry: () => void }) {
  return (
    <div role="alert" className="my-6 flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
      <p className="flex gap-2 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <span className="font-medium">Не удалось загрузить бронирования.</span> {message}
        </span>
      </p>
      <Button onClick={onRetry} loading={retrying}>
        {!retrying && <RefreshCw className="size-4" aria-hidden />}
        Повторить
      </Button>
    </div>
  );
}

export function StaleWarning({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <div role="status" className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">Не удалось обновить расписание — показаны последние загруженные данные.</span>
      <Button variant="ghost" size="sm" onClick={onRetry} loading={retrying}>
        Обновить
      </Button>
    </div>
  );
}

export function Notice({ icon, children }: { icon: "closed" | "empty"; children: ReactNode }) {
  const Icon = icon === "closed" ? Clock : CalendarX2;
  return (
    <div className="mb-3 flex gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
      <div className="text-pretty">{children}</div>
    </div>
  );
}
