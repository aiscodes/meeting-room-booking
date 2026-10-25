"use client";

import { toISODate } from "@/domain/time";
import { BookingPage } from "@/features/bookings/components/booking-page";
import { useNow } from "@/features/bookings/now";
import { useSelectedDate } from "@/features/bookings/use-selected-date";
import { DevPanel } from "@/mocks/dev-panel";

export function BookingApp() {
  const now = useNow();
  const [date, setDate] = useSelectedDate(toISODate(now));
  return (
    <>
      <BookingPage date={date} onDateChange={setDate} />
      <DevPanel date={date} />
    </>
  );
}
