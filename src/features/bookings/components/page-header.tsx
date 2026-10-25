import { DURATION_LIMITS_LABEL, WORKDAY_LABEL } from "@/domain/messages";

export function PageHeader() {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Переговорная</h1>
      <p className="mt-1 text-sm text-balance text-slate-600">
        Бронирование на рабочий день {WORKDAY_LABEL}, {DURATION_LIMITS_LABEL}.
      </p>
    </header>
  );
}
