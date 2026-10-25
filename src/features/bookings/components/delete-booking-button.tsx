"use client";

import { Trash, TriangleAlert } from "lucide-react";
import { AlertDialog } from "radix-ui";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/domain/booking";
import { bookingLabel } from "@/domain/messages";
import { formatDateShort } from "../format";
import { useDeleteBooking } from "../queries";
import { closeIfStale } from "../write-errors";

type Props = { booking: Booking; disabled?: boolean; onDeleted: () => void };

export function DeleteBookingButton({ booking, disabled, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const deleteBooking = useDeleteBooking();
  const description = `${formatDateShort(booking.date)}, ${bookingLabel(booking)}`;

  const finish = () => {
    setOpen(false);
    onDeleted();
  };

  async function confirm() {
    setFailure(null);
    try {
      await deleteBooking.mutateAsync(booking);
      toast.success("Бронь удалена", { description });
      finish();
    } catch (error) {
      if (!closeIfStale(error, finish)) setFailure(errorMessage(error));
    }
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (deleteBooking.isPending) return;
        setFailure(null);
        setOpen(next);
      }}
    >
      <AlertDialog.Trigger asChild>
        <Button variant="danger-ghost" disabled={disabled} className="sm:-ml-2">
          <Trash className="size-4" aria-hidden />
          Удалить
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-900/50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <AlertDialog.Title className="text-lg font-semibold text-slate-900">Удалить бронь?</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-slate-600">
            {description}. Это действие нельзя отменить.
          </AlertDialog.Description>
          {failure && (
            <p role="alert" className="mt-4 flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {failure}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button disabled={deleteBooking.isPending}>Отмена</Button>
            </AlertDialog.Cancel>
            <Button variant="danger" loading={deleteBooking.isPending} onClick={confirm}>
              {deleteBooking.isPending ? "Удаляем…" : "Удалить"}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
