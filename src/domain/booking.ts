import {
  type ClockTime,
  type ISODate,
  MAX_DURATION,
  MIN_DURATION,
  SLOT_STEP,
  WORKDAY_END,
  WORKDAY_START,
  fromMinutes,
  isValidDate,
  isValidTime,
  minutesOfDay,
  toISODate,
  toMinutes,
} from "./time";

export type Booking = {
  id: string;
  date: ISODate;
  start: ClockTime;
  end: ClockTime;
  title?: string;
};

export type BookingInput = Omit<Booking, "id">;

export const TITLE_MAX_LENGTH = 80;

export type ViolationCode =
  | "invalid_date"
  | "missing_start"
  | "missing_end"
  | "past_date"
  | "off_grid"
  | "start_outside_hours"
  | "end_outside_hours"
  | "end_not_after_start"
  | "too_short"
  | "too_long"
  | "past_time"
  | "title_too_long"
  | "overlap";

export type Violation = {
  code: ViolationCode;
  field: "date" | "start" | "end" | "title";
  conflictWith?: Booking;
};

type Interval = { start: ClockTime; end: ClockTime };

/** Half-open intervals: touching boundaries (10:00–11:00 and 11:00–12:00) do not overlap. */
export function overlaps(a: Interval, b: Interval): boolean {
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

export function findConflict(
  input: BookingInput,
  bookings: readonly Booking[],
  excludeId?: string,
): Booking | undefined {
  return bookings.find((b) => b.id !== excludeId && b.date === input.date && overlaps(b, input));
}

export type BookingPhase = "past" | "ongoing" | "upcoming";

export function bookingPhase(booking: Booking, now: Date): BookingPhase {
  const today = toISODate(now);
  if (booking.date !== today) return booking.date < today ? "past" : "upcoming";
  const current = minutesOfDay(now);
  if (toMinutes(booking.end) <= current) return "past";
  if (toMinutes(booking.start) <= current) return "ongoing";
  return "upcoming";
}

export function isLocked(booking: Booking, now: Date): boolean {
  return bookingPhase(booking, now) !== "upcoming";
}

export function earliestStart(date: ISODate, now: Date): number | null {
  const today = toISODate(now);
  if (date < today) return null;
  const first =
    date === today
      ? Math.max(WORKDAY_START, Math.ceil(minutesOfDay(now) / SLOT_STEP) * SLOT_STEP)
      : WORKDAY_START;
  return first + MIN_DURATION <= WORKDAY_END ? first : null;
}

export function validateBooking(
  input: BookingInput,
  bookings: readonly Booking[],
  now: Date,
  editingId?: string,
): Violation[] {
  const formatErrors: Violation[] = [];
  if (!isValidDate(input.date)) formatErrors.push({ code: "invalid_date", field: "date" });
  if (!isValidTime(input.start)) formatErrors.push({ code: "missing_start", field: "start" });
  if (!isValidTime(input.end)) formatErrors.push({ code: "missing_end", field: "end" });
  if (formatErrors.length > 0) return formatErrors;

  const violations: Violation[] = [];
  const start = toMinutes(input.start);
  const end = toMinutes(input.end);
  const today = toISODate(now);

  if ((input.title?.trim().length ?? 0) > TITLE_MAX_LENGTH) {
    violations.push({ code: "title_too_long", field: "title" });
  }
  if (input.date < today) {
    violations.push({ code: "past_date", field: "date" });
    return violations;
  }
  if (start % SLOT_STEP !== 0 || end % SLOT_STEP !== 0) {
    violations.push({ code: "off_grid", field: start % SLOT_STEP !== 0 ? "start" : "end" });
  }
  if (start < WORKDAY_START || start >= WORKDAY_END) {
    violations.push({ code: "start_outside_hours", field: "start" });
  }
  if (end <= WORKDAY_START || end > WORKDAY_END) {
    violations.push({ code: "end_outside_hours", field: "end" });
  }
  if (end <= start) {
    violations.push({ code: "end_not_after_start", field: "end" });
  } else if (end - start < MIN_DURATION) {
    violations.push({ code: "too_short", field: "end" });
  } else if (end - start > MAX_DURATION) {
    violations.push({ code: "too_long", field: "end" });
  }
  if (input.date === today && start < minutesOfDay(now)) {
    violations.push({ code: "past_time", field: "start" });
  }
  if (violations.length > 0) return violations;

  const conflict = findConflict(input, bookings, editingId);
  return conflict ? [{ code: "overlap", field: "start", conflictWith: conflict }] : [];
}

export type TimeOption = {
  value: ClockTime;
  disabled: boolean;
  reason?: "past" | "busy" | "too_long";
};

export function startOptions(
  date: ISODate,
  bookings: readonly Booking[],
  now: Date,
  editingId?: string,
): TimeOption[] {
  const first = earliestStart(date, now);
  const options: TimeOption[] = [];
  for (let m = WORKDAY_START; m + MIN_DURATION <= WORKDAY_END; m += SLOT_STEP) {
    const value = fromMinutes(m);
    const slot = { date, start: value, end: fromMinutes(m + SLOT_STEP) };
    if (first === null || m < first) options.push({ value, disabled: true, reason: "past" });
    else if (findConflict(slot, bookings, editingId)) options.push({ value, disabled: true, reason: "busy" });
    else options.push({ value, disabled: false });
  }
  return options;
}

export function endOptions(
  date: ISODate,
  start: ClockTime,
  bookings: readonly Booking[],
  editingId?: string,
): TimeOption[] {
  const startMin = isValidTime(start) ? toMinutes(start) : null;
  const options: TimeOption[] = [];
  for (let m = WORKDAY_START + MIN_DURATION; m <= WORKDAY_END; m += SLOT_STEP) {
    const value = fromMinutes(m);
    if (startMin === null || m <= startMin) {
      options.push({ value, disabled: true });
    } else if (m - startMin > MAX_DURATION) {
      options.push({ value, disabled: true, reason: "too_long" });
    } else if (findConflict({ date, start, end: value }, bookings, editingId)) {
      options.push({ value, disabled: true, reason: "busy" });
    } else {
      options.push({ value, disabled: false });
    }
  }
  return options;
}

export function isSelectable(options: readonly TimeOption[], value: ClockTime): boolean {
  return options.some((o) => o.value === value && !o.disabled);
}

export function suggestEnd(
  date: ISODate,
  start: ClockTime,
  bookings: readonly Booking[],
  editingId?: string,
): ClockTime | undefined {
  const free = endOptions(date, start, bookings, editingId).filter((o) => !o.disabled);
  const oneHour = isValidTime(start) ? fromMinutes(toMinutes(start) + 60) : undefined;
  return free.find((o) => o.value === oneHour)?.value ?? free.at(-1)?.value;
}

export function firstFreeStart(
  date: ISODate,
  bookings: readonly Booking[],
  now: Date,
  editingId?: string,
): ClockTime | undefined {
  return startOptions(date, bookings, now, editingId).find((o) => !o.disabled)?.value;
}

export function sortByStart(bookings: readonly Booking[]): Booking[] {
  return [...bookings].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}
