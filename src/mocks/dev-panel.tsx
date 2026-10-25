"use client";

import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { FlaskConical, X } from "lucide-react";
import { useId, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { firstFreeStart, suggestEnd } from "@/domain/booking";
import type { ISODate } from "@/domain/time";
import type { MockControlsStore } from "./controls";
import { useMockApi } from "./mock-gate";
import type { BookingStore } from "./store";

export function DevPanel({ date }: { date: ISODate }) {
  const api = useMockApi();
  if (!api) return null;
  return <Panel date={date} store={api.store} controls={api.controls} />;
}

function Panel({ date, store, controls }: { date: ISODate; store: BookingStore; controls: MockControlsStore }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const state = useSyncExternalStore(controls.subscribe, controls.get, controls.get);
  const queryClient = useQueryClient();

  function occupyFreeSlot() {
    const existing = store.list(date);
    const start = firstFreeStart(date, existing, new Date());
    const end = start && suggestEnd(date, start, existing);
    if (!start || !end) {
      toast.info("На эту дату нет свободного времени");
      return;
    }
    store.insert({ date, start, end, title: "Другой пользователь" });
    toast(`Другой пользователь занял ${start}–${end}`, {
      description: "Интерфейс об этом пока не знает. Попробуйте забронировать это время — сервер вернёт 409.",
    });
  }

  function reset() {
    store.reset();
    void queryClient.invalidateQueries();
    toast("Данные mock API сброшены");
  }

  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col items-end gap-2">
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Управление mock API"
          className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">Mock API</p>
              <p className="mt-0.5 text-xs text-slate-500">Сценарии сети для демонстрации. Данные — в localStorage.</p>
            </div>
            <button
              type="button"
              aria-label="Скрыть панель"
              onClick={() => setOpen(false)}
              className="-m-1 rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <Button className="w-full" onClick={occupyFreeSlot}>
              Другой пользователь занимает слот
            </Button>
            <Toggle
              label="Конфликт при следующем сохранении"
              hint="Сервер вернёт 409, хотя слот выглядит свободным"
              checked={state.raceNextWrite}
              onChange={(raceNextWrite) => controls.set({ raceNextWrite })}
            />
            <Toggle
              label="Следующий запрос вернёт 500"
              checked={state.failNextRequest}
              onChange={(failNextRequest) => controls.set({ failNextRequest })}
            />
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-800">Задержка ответа</span>
              <select
                value={state.latencyMs}
                onChange={(e) => controls.set({ latencyMs: Number(e.target.value) })}
                className="min-h-9 rounded-lg border border-slate-300 bg-white px-2"
              >
                <option value={0}>нет</option>
                <option value={400}>400 мс</option>
                <option value={1500}>1,5 с</option>
                <option value={4000}>4 с</option>
              </select>
            </label>
            <Button variant="ghost" className="w-full" onClick={reset}>
              Сбросить данные
            </Button>
          </div>
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:px-4",
          open ? "border-indigo-200 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-white text-slate-700",
        )}
      >
        <FlaskConical className="size-4" aria-hidden />
        <span className="max-sm:sr-only">Mock API</span>
        {(state.raceNextWrite || state.failNextRequest) && (
          <>
            <span className="size-2 rounded-full bg-amber-500" aria-hidden />
            <span className="sr-only">, есть активные сценарии</span>
          </>
        )}
      </button>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-indigo-600"
      />
      <span>
        <span className="block text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}
