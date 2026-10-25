"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { errorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { earliestStart, firstFreeStart, sortByStart } from "@/domain/booking";
import { type ISODate, addDays, toISODate } from "@/domain/time";
import { formatBookingCount, formatDateHeading } from "../format";
import { useNow } from "../now";
import { useBookings } from "../queries";
import type { BookingFormTarget } from "../use-booking-form";
import { BookingDialog } from "./booking-dialog";
import { DateNavigator } from "./date-navigator";
import { DayTimeline } from "./day-timeline";
import { LoadError, Notice, StaleWarning, TimelineSkeleton } from "./states";

const HIGHLIGHT_MS = 6000;

type Props = { date: ISODate; onDateChange: (date: ISODate) => void };

export function BookingPage({ date, onDateChange }: Props) {
  const now = useNow();
  const today = toISODate(now);
  const headingId = useId();

  const query = useBookings(date);
  const bookings = useMemo(() => sortByStart(query.data ?? []), [query.data]);

  const [target, setTarget] = useState<BookingFormTarget | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const heading = formatDateHeading(date);

  useEffect(() => {
    document.title = `${heading} · Бронирование переговорной`;
  }, [heading]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const open = earliestStart(date, now) !== null;
  const nextFree = query.data ? firstFreeStart(date, bookings, now) : undefined;
  const canCreate = open && nextFree !== undefined;
  const relative = date === today ? "Сегодня" : date === addDays(today, 1) ? "Завтра" : null;

  return (
    <>
      <DateNavigator date={date} today={today} onChange={onDateChange} />
      <p className="sr-only" aria-live="polite">
        {query.data && `${heading}: ${formatBookingCount(bookings.length)}`}
      </p>

      <section
        aria-labelledby={headingId}
        aria-busy={query.isPending || undefined}
        className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id={headingId} className="text-lg font-semibold text-slate-900">
            {heading}
          </h2>
          {relative && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{relative}</span>
          )}
          <span role="status" className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            {query.isFetching && !query.isPending && (
              <>
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                Обновляем…
              </>
            )}
          </span>
          <Button
            variant="primary"
            className="w-full sm:ml-auto sm:w-auto"
            disabled={!canCreate}
            onClick={() => setTarget({ mode: "create" })}
          >
            <Plus className="size-4" aria-hidden />
            Новая бронь
          </Button>
        </div>

        {query.isPending ? (
          <>
            <span className="sr-only" role="status">
              Загружаем бронирования…
            </span>
            <TimelineSkeleton />
          </>
        ) : query.isError && !query.data ? (
          <LoadError
            message={errorMessage(query.error)}
            retrying={query.isFetching}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            {query.isError && <StaleWarning retrying={query.isFetching} onRetry={() => void query.refetch()} />}
            <DayNotice date={date} today={today} open={open} hasBookings={bookings.length > 0} hasFree={nextFree !== undefined} />
            <DayTimeline
              date={date}
              bookings={bookings}
              now={now}
              highlightId={highlightId}
              onCreate={(start) => setTarget({ mode: "create", start })}
              onEdit={(booking) => setTarget({ mode: "edit", booking })}
            />
          </>
        )}
      </section>

      <BookingDialog
        target={target}
        date={date}
        onClose={() => setTarget(null)}
        onSaved={onDateChange}
        onConflict={setHighlightId}
      />
    </>
  );
}

function DayNotice({
  date,
  today,
  open,
  hasBookings,
  hasFree,
}: {
  date: string;
  today: string;
  open: boolean;
  hasBookings: boolean;
  hasFree: boolean;
}) {
  if (date < today) {
    return (
      <Notice icon="closed">
        Это прошедшая дата — расписание доступно только для просмотра.{!hasBookings && " Броней в этот день не было."}
      </Notice>
    );
  }
  if (!open) {
    return <Notice icon="closed">Рабочий день закончился — выберите другую дату.</Notice>;
  }
  if (!hasBookings) {
    return (
      <Notice icon="empty">
        <span className="font-medium">На эту дату броней нет.</span> Выберите свободное время на шкале или нажмите
        «Новая бронь».
      </Notice>
    );
  }
  if (!hasFree) {
    return <Notice icon="closed">Свободного времени на эту дату не осталось.</Notice>;
  }
  return null;
}
