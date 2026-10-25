"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { Booking } from "@/domain/booking";
import { WORKDAY_LABEL } from "@/domain/messages";
import type { ISODate } from "@/domain/time";
import { formatDateHeading } from "../format";
import { useIsWritingBookings } from "../queries";
import type { BookingFormTarget } from "../use-booking-form";
import { BookingForm } from "./booking-form";

type Props = {
  target: BookingFormTarget | null;
  date: ISODate;
  bookings: Booking[];
  onClose: () => void;
  onConflict: (bookingId: string) => void;
};

export function BookingDialog({ target, date, bookings, onClose, onConflict }: Props) {
  // Closing mid-request would lose the result, including a 409.
  const busy = useIsWritingBookings();
  const formKey = target ? (target.mode === "edit" ? target.booking.id : `new-${target.start ?? ""}`) : "closed";

  return (
    <Dialog.Root open={target !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-40 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {target?.mode === "edit" ? "Изменить бронь" : "Новая бронь"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-600">
                {formatDateHeading(date)} · рабочий день {WORKDAY_LABEL}
              </Dialog.Description>
            </div>
            <Dialog.Close
              disabled={busy}
              aria-label="Закрыть"
              className="-m-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-40"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          {target && (
            <BookingForm
              key={formKey}
              target={target}
              date={date}
              bookings={bookings}
              onDone={onClose}
              onConflict={onConflict}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
