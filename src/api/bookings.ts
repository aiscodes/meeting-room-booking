import type { BookingInput } from "@/domain/booking";
import type { ISODate } from "@/domain/time";
import { bookingListSchema, bookingSchema } from "./contract";
import { request, requestNoContent } from "./http";

export type BookingPatch = Partial<BookingInput>;

const byId = (id: string) => `/bookings/${encodeURIComponent(id)}`;

export const bookingsApi = {
  list: (date: ISODate, signal?: AbortSignal) =>
    request(`/bookings?date=${encodeURIComponent(date)}`, bookingListSchema, { signal }),
  create: (input: BookingInput) => request("/bookings", bookingSchema, { method: "POST", body: input }),
  update: (id: string, patch: BookingPatch) => request(byId(id), bookingSchema, { method: "PATCH", body: patch }),
  remove: (id: string) => requestNoContent(byId(id), { method: "DELETE" }),
};
