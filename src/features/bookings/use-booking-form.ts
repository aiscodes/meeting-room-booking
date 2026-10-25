"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { type FieldErrors, type Resolver, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { isApiError } from "@/api/errors";
import {
  type Booking,
  type Violation,
  endOptions,
  firstFreeStart,
  isSelectable,
  startOptions,
  suggestEnd,
  validateBooking,
} from "@/domain/booking";
import { violationMessage } from "@/domain/messages";
import { type ISODate, isValidTime, toMinutes } from "@/domain/time";
import { formatDateShort, formatDuration } from "./format";
import { useNow } from "./now";
import { useCreateBooking, useUpdateBooking } from "./queries";
import { type WriteProblem, closeIfStale, describeWriteFailure } from "./write-errors";

export type BookingFormTarget = { mode: "create"; start?: string } | { mode: "edit"; booking: Booking };

export type BookingFormValues = { start: string; end: string; title: string };

type Field = keyof BookingFormValues;

const fieldOf = (violation: Violation): Field => (violation.field === "date" ? "start" : violation.field);

export type BookingFormOptions = {
  target: BookingFormTarget;
  date: ISODate;
  bookings: Booking[];
  onDone: () => void;
  onConflict: (bookingId: string) => void;
};

export function useBookingForm({ target, date, bookings, onDone, onConflict }: BookingFormOptions) {
  const now = useNow();
  const editing = target.mode === "edit" ? target.booking : undefined;
  const editingId = editing?.id;
  const [problem, setProblem] = useState<WriteProblem | null>(null);
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();

  const resolver: Resolver<BookingFormValues> = (values) => {
    const violations = validateBooking(
      { date, start: values.start, end: values.end, title: values.title.trim() || undefined },
      bookings,
      now,
      editingId,
    );
    if (violations.length === 0) return { values, errors: {} };
    const errors: FieldErrors<BookingFormValues> = {};
    for (const v of violations) errors[fieldOf(v)] ??= { type: v.code, message: violationMessage(v) };
    return { values: {}, errors };
  };

  const form = useForm<BookingFormValues>({
    resolver,
    defaultValues: initialValues(target, date, bookings, now),
  });
  const { register, handleSubmit, setValue, getValues, setError, trigger, formState } = form;

  // Re-validate after a 409 refetch to show which booking is in the way.
  useEffect(() => {
    if (problem?.tone === "warning") void trigger();
  }, [bookings, problem, trigger]);

  const start = useWatch({ control: form.control, name: "start" });
  const end = useWatch({ control: form.control, name: "end" });

  const clearProblem = () => setProblem(null);

  const fields = {
    title: register("title", { onChange: clearProblem }),
    end: register("end", { onChange: clearProblem }),
    start: register("start", {
      onChange: (event: ChangeEvent<HTMLSelectElement>) => {
        clearProblem();
        const nextStart = event.target.value;
        if (isSelectable(endOptions(date, nextStart, bookings, editingId), getValues("end"))) return;
        setValue("end", suggestEnd(date, nextStart, bookings, editingId) ?? "", {
          shouldValidate: formState.isSubmitted,
        });
      },
    }),
  };

  const submit = handleSubmit(async (values) => {
    setProblem(null);
    const title = values.title.trim();
    try {
      if (editing) {
        await updateBooking.mutateAsync({ booking: editing, patch: { start: values.start, end: values.end, title } });
      } else {
        await createBooking.mutateAsync({ date, start: values.start, end: values.end, title: title || undefined });
      }
      toast.success(editing ? "Бронь обновлена" : "Бронь создана", {
        description: `${formatDateShort(date)}, ${values.start}–${values.end}${title ? ` · ${title}` : ""}`,
      });
      onDone();
    } catch (error) {
      if (closeIfStale(error, onDone)) return;
      if (isApiError(error, "validation")) {
        for (const v of error.violations) setError(fieldOf(v), { type: v.code, message: v.message });
      }
      if (isApiError(error, "conflict") && error.conflictWith) onConflict(error.conflictWith.id);
      setProblem(describeWriteFailure(error));
    }
  });

  const duration =
    isValidTime(start) && isValidTime(end) && toMinutes(end) > toMinutes(start) ? formatDuration(start, end) : null;

  return {
    editing,
    fields,
    errors: formState.errors,
    isSubmitting: formState.isSubmitting,
    problem,
    startChoices: startOptions(date, bookings, now, editingId),
    endChoices: endOptions(date, start, bookings, editingId),
    duration,
    submit,
  };
}

function initialValues(target: BookingFormTarget, date: ISODate, bookings: Booking[], now: Date): BookingFormValues {
  if (target.mode === "edit") {
    const { start, end, title } = target.booking;
    return { start, end, title: title ?? "" };
  }
  const start = target.start ?? firstFreeStart(date, bookings, now) ?? "";
  const end = start ? (suggestEnd(date, start, bookings) ?? "") : "";
  return { start, end, title: "" };
}
