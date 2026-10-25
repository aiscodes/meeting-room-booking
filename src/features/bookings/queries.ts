import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type BookingPatch, bookingsApi } from "@/api/bookings";
import type { Booking, BookingInput } from "@/domain/booking";
import type { ISODate } from "@/domain/time";

const bookingKeys = {
  all: ["bookings"] as const,
  byDate: (date: ISODate) => ["bookings", date] as const,
};

export function useBookings(date: ISODate) {
  return useQuery({
    queryKey: bookingKeys.byDate(date),
    queryFn: ({ signal }) => bookingsApi.list(date, signal),
  });
}

// Refetch on failure too: after a 409 the form needs fresh bookings.
function useBookingMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  dateOf: (variables: TVariables) => ISODate,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: bookingKeys.all,
    mutationFn,
    onSettled: (_data, _error, variables) =>
      queryClient.invalidateQueries({ queryKey: bookingKeys.byDate(dateOf(variables)) }),
  });
}

export function useCreateBooking() {
  return useBookingMutation((input: BookingInput) => bookingsApi.create(input), (input) => input.date);
}

export function useUpdateBooking() {
  return useBookingMutation(
    ({ booking, patch }: { booking: Booking; patch: BookingPatch }) => bookingsApi.update(booking.id, patch),
    ({ booking }) => booking.date,
  );
}

export function useDeleteBooking() {
  return useBookingMutation((booking: Booking) => bookingsApi.remove(booking.id), (booking) => booking.date);
}

export function useIsWritingBookings() {
  return useIsMutating({ mutationKey: bookingKeys.all }) > 0;
}
