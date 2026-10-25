import { describe, expect, it } from "vitest";
import {
  type Booking,
  type BookingInput,
  bookingPhase,
  earliestStart,
  endOptions,
  isLocked,
  overlaps,
  startOptions,
  suggestEnd,
  validateBooking,
} from "./booking";
import { DURATION_LIMITS_LABEL, WORKDAY_LABEL, violationMessage } from "./messages";
import { addDays, fromMinutes, toISODate } from "./time";

const NOW = new Date(2030, 0, 15, 10, 10);
const TODAY = toISODate(NOW);
const TOMORROW = addDays(TODAY, 1);
const YESTERDAY = addDays(TODAY, -1);

const booking = (start: string, end: string, extra: Partial<Booking> = {}): Booking => ({
  id: `${start}-${end}`,
  date: TOMORROW,
  start,
  end,
  ...extra,
});

const input = (start: string, end: string, date = TOMORROW): BookingInput => ({ date, start, end });

const codes = (i: BookingInput, existing: Booking[] = [], editingId?: string) =>
  validateBooking(i, existing, NOW, editingId).map((v) => v.code);

describe("overlaps", () => {
  it("treats touching boundaries as free", () => {
    expect(overlaps({ start: "10:00", end: "11:00" }, { start: "11:00", end: "12:00" })).toBe(false);
    expect(overlaps({ start: "11:00", end: "12:00" }, { start: "10:00", end: "11:00" })).toBe(false);
  });

  it("detects partial and full overlap", () => {
    expect(overlaps({ start: "10:00", end: "11:00" }, { start: "10:30", end: "11:30" })).toBe(true);
    expect(overlaps({ start: "10:00", end: "12:00" }, { start: "10:30", end: "11:00" })).toBe(true);
    expect(overlaps({ start: "10:30", end: "11:00" }, { start: "10:00", end: "12:00" })).toBe(true);
  });
});

describe("validateBooking", () => {
  it("accepts a valid booking", () => {
    expect(codes(input("10:00", "11:00"))).toEqual([]);
  });

  it("rule 1: keeps the booking inside 09:00–18:00", () => {
    expect(codes(input("08:30", "09:30"))).toContain("start_outside_hours");
    expect(codes(input("17:30", "18:30"))).toContain("end_outside_hours");
    expect(codes(input("09:00", "10:00"))).toEqual([]);
    expect(codes(input("17:00", "18:00"))).toEqual([]);
  });

  it("rule 2: requires start < end", () => {
    expect(codes(input("11:00", "11:00"))).toEqual(["end_not_after_start"]);
    expect(codes(input("12:00", "11:00"))).toEqual(["end_not_after_start"]);
  });

  it("rule 3: allows exactly 30 minutes", () => {
    expect(codes(input("10:00", "10:30"))).toEqual([]);
  });

  it("rule 4: allows exactly 2 hours and rejects longer", () => {
    expect(codes(input("10:00", "12:00"))).toEqual([]);
    expect(codes(input("10:00", "12:30"))).toEqual(["too_long"]);
  });

  it("rejects times off the 30-minute grid", () => {
    expect(codes(input("10:15", "11:00"))).toContain("off_grid");
  });

  it("rule 5: rejects overlaps and reports the conflicting booking", () => {
    const existing = [booking("10:00", "11:00", { title: "Стендап" })];
    const violations = validateBooking(input("10:30", "11:30"), existing, NOW);
    expect(violations).toMatchObject([{ code: "overlap", conflictWith: { id: existing[0]?.id } }]);
    expect(violations.map(violationMessage)).toEqual(["Пересекается с бронью 10:00–11:00 «Стендап»"]);
  });

  it("rule 5: allows touching an existing booking on both sides", () => {
    const existing = [booking("10:00", "11:00"), booking("12:00", "13:00")];
    expect(codes(input("11:00", "12:00"), existing)).toEqual([]);
  });

  it("rule 5: ignores bookings on other dates", () => {
    const existing = [booking("10:00", "11:00", { date: addDays(TOMORROW, 1) })];
    expect(codes(input("10:00", "11:00"), existing)).toEqual([]);
  });

  it("rule 6: rejects past dates", () => {
    expect(codes(input("10:00", "11:00", YESTERDAY))).toEqual(["past_date"]);
  });

  it("rule 6: rejects slots that already started today", () => {
    expect(codes(input("10:00", "11:00", TODAY))).toEqual(["past_time"]);
    expect(codes(input("10:30", "11:30", TODAY))).toEqual([]);
  });

  it("rule 7: an edited booking does not conflict with itself", () => {
    const own = booking("10:00", "11:00");
    expect(codes(input("10:00", "11:30"), [own], own.id)).toEqual([]);
    expect(codes(input("10:00", "11:30"), [own])).toEqual(["overlap"]);
  });

  it("rejects malformed values", () => {
    expect(codes(input("", "11:00"))).toEqual(["missing_start"]);
    expect(codes(input("10:00", "11:00", "2030-02-30"))).toEqual(["invalid_date"]);
  });

  it("limits title length", () => {
    expect(codes({ ...input("10:00", "11:00"), title: "x".repeat(81) })).toEqual(["title_too_long"]);
  });
});

describe("locking and phases", () => {
  it("locks ended and in-progress bookings, not upcoming ones", () => {
    expect(isLocked(booking("09:00", "10:00", { date: TODAY }), NOW)).toBe(true);
    expect(isLocked(booking("10:00", "11:00", { date: TODAY }), NOW)).toBe(true);
    expect(isLocked(booking("10:30", "11:00", { date: TODAY }), NOW)).toBe(false);
    expect(isLocked(booking("09:00", "10:00", { date: YESTERDAY }), NOW)).toBe(true);
    expect(isLocked(booking("09:00", "10:00"), NOW)).toBe(false);
  });

  it("reports the phase of a booking", () => {
    expect(bookingPhase(booking("09:00", "10:00", { date: TODAY }), NOW)).toBe("past");
    expect(bookingPhase(booking("10:00", "11:00", { date: TODAY }), NOW)).toBe("ongoing");
    expect(bookingPhase(booking("11:00", "12:00", { date: TODAY }), NOW)).toBe("upcoming");
  });
});

describe("slot options", () => {
  it("rounds today's earliest start up to the next slot", () => {
    expect(earliestStart(TODAY, NOW)).toBe(10 * 60 + 30);
    expect(earliestStart(TOMORROW, NOW)).toBe(9 * 60);
    expect(earliestStart(YESTERDAY, NOW)).toBeNull();
    expect(earliestStart(TODAY, new Date(2030, 0, 15, 17, 40))).toBeNull();
  });

  it("marks past and busy start slots", () => {
    const existing = [booking("11:00", "12:00", { date: TODAY })];
    const options = startOptions(TODAY, existing, NOW);
    const byValue = Object.fromEntries(options.map((o) => [o.value, o]));
    expect(options[0]?.value).toBe("09:00");
    expect(options.at(-1)?.value).toBe("17:30");
    expect(byValue["10:00"]?.reason).toBe("past");
    expect(byValue["10:30"]?.disabled).toBe(false);
    expect(byValue["11:00"]?.reason).toBe("busy");
    expect(byValue["11:30"]?.reason).toBe("busy");
    expect(byValue["12:00"]?.disabled).toBe(false);
  });

  it("limits end options by duration and the next booking", () => {
    const existing = [booking("12:00", "13:00")];
    const free = endOptions(TOMORROW, "10:30", existing)
      .filter((o) => !o.disabled)
      .map((o) => o.value);
    expect(free).toEqual(["11:00", "11:30", "12:00"]);
  });

  it("caps end options at 2 hours and the end of the day", () => {
    const free = endOptions(TOMORROW, "17:00", []).filter((o) => !o.disabled).map((o) => o.value);
    expect(free).toEqual(["17:30", "18:00"]);
    const long = endOptions(TOMORROW, "09:00", []).filter((o) => !o.disabled).map((o) => o.value);
    expect(long.at(-1)).toBe(fromMinutes(11 * 60));
  });

  it("suggests a one-hour booking, or the longest free span", () => {
    expect(suggestEnd(TOMORROW, "10:00", [])).toBe("11:00");
    expect(suggestEnd(TOMORROW, "10:00", [booking("10:30", "11:00")])).toBe("10:30");
  });
});

describe("messages", () => {
  it("derives labels from the rule constants", () => {
    expect(WORKDAY_LABEL).toBe("09:00–18:00");
    expect(DURATION_LIMITS_LABEL).toBe("от 30 мин до 2 ч");
  });
});
