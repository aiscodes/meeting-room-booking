"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ISODate, addDays, isValidDate } from "@/domain/time";

type Props = { date: ISODate; today: ISODate; onChange: (date: ISODate) => void };

export function DateNavigator({ date, today, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <Button size="icon" aria-label="Предыдущий день" onClick={() => onChange(addDays(date, -1))}>
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      <label className="flex min-w-36 flex-1 sm:max-w-44">
        <span className="sr-only">Дата бронирования</span>
        <input
          type="date"
          value={date}
          onChange={(e) => isValidDate(e.target.value) && onChange(e.target.value)}
          className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-2 focus:outline-indigo-200 sm:px-3"
        />
      </label>
      <Button size="icon" aria-label="Следующий день" onClick={() => onChange(addDays(date, 1))}>
        <ChevronRight className="size-4" aria-hidden />
      </Button>
      <Button variant="ghost" disabled={date === today} onClick={() => onChange(today)}>
        Сегодня
      </Button>
    </div>
  );
}
