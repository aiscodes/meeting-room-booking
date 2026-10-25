export type ISODate = string;
export type ClockTime = string;

export const WORKDAY_START = 9 * 60;
export const WORKDAY_END = 18 * 60;
export const SLOT_STEP = 30;
export const MIN_DURATION = 30;
export const MAX_DURATION = 120;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, "0");

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function toMinutes(time: ClockTime): number {
  const match = TIME_RE.exec(time);
  if (!match) throw new RangeError(`Invalid time: ${time}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

export function fromMinutes(minutes: number): ClockTime {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function isValidDate(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// `new Date("YYYY-MM-DD")` parses as UTC, so dates are built from parts.
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(value: ISODate, delta: number): ISODate {
  const date = parseISODate(value);
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatRange(start: ClockTime, end: ClockTime): string {
  return `${start}–${end}`;
}
