import { formatMinutes } from "@/domain/messages";
import { type ClockTime, type ISODate, parseISODate, toMinutes } from "@/domain/time";

const headingFormat = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" });
const shortFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

export function formatDateHeading(date: ISODate): string {
  const text = headingFormat.format(parseISODate(date));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDateShort(date: ISODate): string {
  return shortFormat.format(parseISODate(date));
}

const plural = new Intl.PluralRules("ru-RU");
const BOOKING_WORD: Record<Intl.LDMLPluralRule, string> = {
  zero: "броней",
  one: "бронь",
  two: "брони",
  few: "брони",
  many: "броней",
  other: "брони",
};

export function formatBookingCount(count: number): string {
  return count === 0 ? "броней нет" : `${count} ${BOOKING_WORD[plural.select(count)]}`;
}

export function formatDuration(start: ClockTime, end: ClockTime): string {
  return formatMinutes(toMinutes(end) - toMinutes(start));
}
