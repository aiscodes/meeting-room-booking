import { queryOptions, useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type BookingPatch, bookingsApi } from "@/api/bookings";
import type { Booking, BookingInput } from "@/domain/booking";
import type { ISODate } from "@/domain/time";

const POLL_MS = 30_000;

const bookingKeys = {
  all: ["bookings"] as const,
  byDate: (date: ISODate) => ["bookings", date] as const,
};

export const bookingsQuery = (date: ISODate) =>
  queryOptions({
    queryKey: bookingKeys.byDate(date),
    queryFn: ({ signal }) => bookingsApi.list(date, signal),
  });

// Polling stands in for push updates: other users' bookings show up without a reload.
export function useBookings(date: ISODate) {
  return useQuery({ ...bookingsQuery(date), refetchInterval: POLL_MS });
}

// Refetch on failure too: after a 409 the form needs fresh bookings.
function useBookingMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  datesOf: (variables: TVariables) => ISODate[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: bookingKeys.all,
    mutationFn,
    onSettled: (_data, _error, variables) =>
      Promise.all(
        [...new Set(datesOf(variables))].map((date) =>
          queryClient.invalidateQueries({ queryKey: bookingKeys.byDate(date) }),
        ),
      ),
  });
}

export function useCreateBooking() {
  return useBookingMutation((input: BookingInput) => bookingsApi.create(input), (input) => [input.date]);
}

export function useUpdateBooking() {
  return useBookingMutation(
    ({ booking, patch }: { booking: Booking; patch: BookingPatch }) => bookingsApi.update(booking.id, patch),
    ({ booking, patch }) => [booking.date, patch.date ?? booking.date],
  );
}

export function useDeleteBooking() {
  return useBookingMutation((booking: Booking) => bookingsApi.remove(booking.id), (booking) => [booking.date]);
}

export function useIsWritingBookings() {
  return useIsMutating({ mutationKey: bookingKeys.all }) > 0;
}
