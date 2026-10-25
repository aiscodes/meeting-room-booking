"use client";

import clsx from "clsx";
import { Lock, Plus } from "lucide-react";
import { type Booking, bookingPhase, startOptions } from "@/domain/booking";
import {
  type ISODate,
  SLOT_STEP,
  WORKDAY_END,
  WORKDAY_START,
  formatRange,
  fromMinutes,
  minutesOfDay,
  toISODate,
  toMinutes,
} from "@/domain/time";
import { formatDateHeading } from "../format";

const SLOT_PX = 44;
const offset = (minutes: number) => ((minutes - WORKDAY_START) / SLOT_STEP) * SLOT_PX;
const TRACK_HEIGHT = offset(WORKDAY_END);

type Props = {
  date: ISODate;
  bookings: Booking[];
  now: Date;
  highlightId: string | null;
  onCreate: (start: string) => void;
  onEdit: (booking: Booking) => void;
};

type Item = { kind: "booking"; booking: Booking; start: number } | { kind: "free"; start: number };

export function DayTimeline({ date, bookings, now, highlightId, onCreate, onEdit }: Props) {
  const today = toISODate(now);
  const pastUntil =
    date < today ? WORKDAY_END : date === today ? Math.min(Math.max(minutesOfDay(now), WORKDAY_START), WORKDAY_END) : null;
  const nowLine = date === today && minutesOfDay(now) >= WORKDAY_START && minutesOfDay(now) <= WORKDAY_END;

  const items: Item[] = [
    ...bookings.map((b): Item => ({ kind: "booking", booking: b, start: toMinutes(b.start) })),
    ...startOptions(date, bookings, now)
      .filter((o) => !o.disabled)
      .map((o): Item => ({ kind: "free", start: toMinutes(o.value) })),
  ].sort((a, b) => a.start - b.start);

  const hours: number[] = [];
  for (let m = WORKDAY_START; m <= WORKDAY_END; m += 60) hours.push(m);
  const lines: number[] = [];
  for (let m = WORKDAY_START; m <= WORKDAY_END; m += SLOT_STEP) lines.push(m);

  return (
    <div className="grid grid-cols-[3rem_1fr] gap-x-2 py-3 sm:grid-cols-[3.5rem_1fr]">
      <div className="relative" style={{ height: TRACK_HEIGHT }} aria-hidden>
        {hours.map((m) => (
          <span
            key={m}
            className="absolute right-0 -translate-y-1/2 text-xs text-slate-500 tabular-nums"
            style={{ top: offset(m) }}
          >
            {fromMinutes(m)}
          </span>
        ))}
      </div>

      <div className="relative" style={{ height: TRACK_HEIGHT }}>
        {lines.map((m) => (
          <div
            key={m}
            aria-hidden
            className={clsx(
              "absolute inset-x-0 border-t",
              m % 60 === 0 ? "border-slate-200" : "border-dashed border-slate-100",
            )}
            style={{ top: offset(m) }}
          />
        ))}

        {pastUntil !== null && pastUntil > WORKDAY_START && (
          <div
            aria-hidden
            className="bg-hatch absolute inset-x-0 top-0 rounded-sm"
            style={{ height: offset(pastUntil) }}
          >
            {offset(pastUntil) >= SLOT_PX && (
              <span className="absolute top-1.5 right-2 text-xs text-slate-500">Время прошло</span>
            )}
          </div>
        )}

        {nowLine && (
          <div aria-hidden className="absolute inset-x-0 z-10 flex items-center" style={{ top: offset(minutesOfDay(now)) }}>
            <span className="-ml-1 size-2 rounded-full bg-red-500" />
            <span className="h-px flex-1 bg-red-500" />
          </div>
        )}

        <ol aria-label={`Расписание на ${formatDateHeading(date).toLowerCase()}`}>
          {items.map((item) =>
            item.kind === "booking" ? (
              <BookingBlock
                key={item.booking.id}
                booking={item.booking}
                now={now}
                highlighted={item.booking.id === highlightId}
                onEdit={onEdit}
              />
            ) : (
              <FreeSlot key={`free-${item.start}`} start={item.start} onCreate={onCreate} />
            ),
          )}
        </ol>
      </div>
    </div>
  );
}

function FreeSlot({ start, onCreate }: { start: number; onCreate: (start: string) => void }) {
  const range = formatRange(fromMinutes(start), fromMinutes(start + SLOT_STEP));
  return (
    <li className="absolute inset-x-1" style={{ top: offset(start) + 1, height: SLOT_PX - 2 }}>
      <button
        type="button"
        onClick={() => onCreate(fromMinutes(start))}
        aria-label={`Свободно ${range}. Создать бронь`}
        className="flex h-full w-full items-center gap-1.5 rounded-lg border border-dashed border-transparent px-3 text-left text-xs text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:border-indigo-500 focus-visible:bg-indigo-50 focus-visible:text-indigo-700 focus-visible:outline-none"
      >
        <Plus className="size-3.5" aria-hidden />
        <span className="tabular-nums">{fromMinutes(start)}</span>
      </button>
    </li>
  );
}

const PHASE_LABEL = { past: "Завершена", ongoing: "Идёт сейчас" } as const;

function BookingBlock({
  booking,
  now,
  highlighted,
  onEdit,
}: {
  booking: Booking;
  now: Date;
  highlighted: boolean;
  onEdit: (booking: Booking) => void;
}) {
  const start = toMinutes(booking.start);
  const end = toMinutes(booking.end);
  const phase = bookingPhase(booking, now);
  const locked = phase !== "upcoming";
  const title = booking.title || "Без названия";
  const range = formatRange(booking.start, booking.end);
  const compact = end - start <= SLOT_STEP;

  const content = (
    <>
      <span className={clsx("flex min-w-0 gap-x-2", compact ? "items-center" : "flex-col")}>
        <span className={clsx("truncate font-medium", !booking.title && "italic")}>{title}</span>
        <span className="shrink-0 text-xs tabular-nums opacity-80">{range}</span>
      </span>
      {locked && (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-white/70 px-2 py-0.5 text-xs">
          <Lock className="size-3" aria-hidden />
          {PHASE_LABEL[phase]}
        </span>
      )}
      {highlighted && (
        <span className="ml-auto shrink-0 self-start rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
          Конфликт
        </span>
      )}
    </>
  );

  const shell = clsx(
    "flex h-full w-full gap-2 overflow-hidden rounded-lg border px-3 text-left text-sm",
    compact ? "items-center py-0" : "py-2",
    locked
      ? "border-slate-200 bg-slate-100 text-slate-600"
      : "border-indigo-200 bg-indigo-50 text-indigo-950 hover:bg-indigo-100",
    highlighted && "ring-2 ring-amber-400 ring-offset-1",
  );

  return (
    <li className="absolute inset-x-1 z-[1]" style={{ top: offset(start) + 1, height: offset(end) - offset(start) - 2 }}>
      {locked ? (
        <div className={shell}>{content}</div>
      ) : (
        <button
          type="button"
          onClick={() => onEdit(booking)}
          aria-label={`${title}, ${range}. Изменить`}
          className={clsx(shell, "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600")}
        >
          {content}
        </button>
      )}
    </li>
  );
}
