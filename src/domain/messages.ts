import { type Booking, TITLE_MAX_LENGTH, type Violation, type ViolationCode } from "./booking";
import { MAX_DURATION, MIN_DURATION, SLOT_STEP, WORKDAY_END, WORKDAY_START, formatRange, fromMinutes } from "./time";

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} мин`;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
}

export const WORKDAY_LABEL = formatRange(fromMinutes(WORKDAY_START), fromMinutes(WORKDAY_END));
export const DURATION_LIMITS_LABEL = `от ${formatMinutes(MIN_DURATION)} до ${formatMinutes(MAX_DURATION)}`;

export const BOOKING_STARTED_MESSAGE = "Бронь уже началась — её нельзя изменить";

export function bookingLabel(booking: Booking): string {
  const range = formatRange(booking.start, booking.end);
  return booking.title ? `${range} «${booking.title}»` : range;
}

const MESSAGES: Record<Exclude<ViolationCode, "overlap">, string> = {
  invalid_date: "Некорректная дата",
  missing_start: "Выберите время начала",
  missing_end: "Выберите время окончания",
  past_date: "Нельзя бронировать прошедшую дату",
  off_grid: `Время выбирается с шагом ${formatMinutes(SLOT_STEP)}`,
  start_outside_hours: `Начало — в пределах рабочего дня ${WORKDAY_LABEL}`,
  end_outside_hours: `Окончание — не позже ${fromMinutes(WORKDAY_END)}`,
  end_not_after_start: "Окончание должно быть позже начала",
  too_short: `Минимальная длительность — ${formatMinutes(MIN_DURATION)}`,
  too_long: `Максимальная длительность — ${formatMinutes(MAX_DURATION)}`,
  past_time: "Это время уже прошло",
  title_too_long: `Название — не длиннее ${TITLE_MAX_LENGTH} символов`,
};

export function violationMessage(violation: Violation): string {
  if (violation.code === "overlap") {
    return violation.conflictWith
      ? `Пересекается с бронью ${bookingLabel(violation.conflictWith)}`
      : "Пересекается с другой бронью";
  }
  return MESSAGES[violation.code];
}
