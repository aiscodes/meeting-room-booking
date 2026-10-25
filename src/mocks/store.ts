import { bookingListSchema } from "@/api/contract";
import type { Booking, BookingInput } from "@/domain/booking";
import { addDays, type ISODate, toISODate } from "@/domain/time";

export type BookingStore = {
  list(date: ISODate): Booking[];
  get(id: string): Booking | undefined;
  insert(input: BookingInput): Booking;
  update(id: string, next: BookingInput): Booking;
  remove(id: string): void;
  reset(): void;
};

type Persistence = { load(): Booking[] | null; save(bookings: Booking[]): void };

function seedBookings(today: ISODate): Booking[] {
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);
  return [
    { id: "seed-1", date: yesterday, start: "11:00", end: "12:00", title: "Ретро спринта" },
    { id: "seed-2", date: today, start: "09:30", end: "10:00", title: "Стендап" },
    { id: "seed-3", date: today, start: "13:00", end: "14:30", title: "Синк с дизайном" },
    { id: "seed-4", date: today, start: "16:00", end: "17:00" },
    { id: "seed-5", date: tomorrow, start: "10:00", end: "11:00", title: "Планирование" },
    { id: "seed-6", date: tomorrow, start: "15:00", end: "17:00", title: "Интервью с кандидатом" },
  ];
}

export function createBookingStore(options: {
  seed: () => Booking[];
  persistence?: Persistence;
}): BookingStore {
  let bookings: Booking[] = options.persistence?.load() ?? options.seed();
  const commit = (next: Booking[]) => {
    bookings = next;
    options.persistence?.save(bookings);
  };

  return {
    list: (date) => bookings.filter((b) => b.date === date),
    get: (id) => bookings.find((b) => b.id === id),
    insert(input) {
      const booking: Booking = { id: crypto.randomUUID(), ...input };
      commit([...bookings, booking]);
      return booking;
    },
    update(id, next) {
      const booking: Booking = { id, ...next };
      commit(bookings.map((b) => (b.id === id ? booking : b)));
      return booking;
    },
    remove(id) {
      commit(bookings.filter((b) => b.id !== id));
    },
    reset() {
      commit(options.seed());
    },
  };
}

const STORAGE_KEY = "meeting-room-booking:v1";

export const localStoragePersistence: Persistence = {
  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      // Corrupted or outdated data falls back to the seed instead of breaking the app.
      const parsed = bookingListSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
  save(bookings) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    } catch {
      // Private mode or full quota: keep working in memory.
    }
  },
};

export const seedForToday = () => seedBookings(toISODate(new Date()));
