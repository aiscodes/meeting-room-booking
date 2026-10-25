"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, useEffect, useState } from "react";
import { type FieldErrors, type Resolver, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { errorMessage, isApiError } from "@/api/errors";
import {
  type Booking,
  endOptions,
  firstFreeStart,
  isLocked,
  isSelectable,
  startOptions,
  suggestEnd,
  validateBooking,
} from "@/domain/booking";
import { BOOKING_STARTED_MESSAGE, violationMessage } from "@/domain/messages";
import { type ISODate, isValidDate, isValidTime, toISODate, toMinutes } from "@/domain/time";
import { formatDateShort, formatDuration } from "./format";
import { useNow } from "./now";
import { bookingsQuery, useBookings, useCreateBooking, useUpdateBooking } from "./queries";
import { type WriteProblem, closeIfStale, describeWriteFailure } from "./write-errors";

export type BookingFormTarget = { mode: "create"; start?: string } | { mode: "edit"; booking: Booking };

export type BookingFormValues = { date: ISODate; start: string; end: string; title: string };

export type BookingFormOptions = {
  target: BookingFormTarget;
  date: ISODate;
  onDone: (savedDate?: ISODate) => void;
  onConflict: (bookingId: string) => void;
};

const NO_BOOKINGS: Booking[] = [];

export function useBookingForm({ target, date, onDone, onConflict }: BookingFormOptions) {
  const now = useNow();
  const editing = target.mode === "edit" ? target.booking : undefined;
  const editingId = editing?.id;
  const [problem, setProblem] = useState<WriteProblem | null>(null);
  const queryClient = useQueryClient();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();

  // The date can change in the form, so it loads that day's schedule itself.
  const [scheduleDate, setScheduleDate] = useState<ISODate>(editing?.date ?? date);
  const schedule = useBookings(scheduleDate);
  const bookings = schedule.data ?? NO_BOOKINGS;
  const scheduleReady = schedule.data !== undefined;

  const resolver: Resolver<BookingFormValues> = (values) => {
    if (editing && isLocked(editing, now)) {
      const errors: FieldErrors<BookingFormValues> = { start: { type: "locked", message: BOOKING_STARTED_MESSAGE } };
      return { values: {}, errors };
    }
    const violations = validateBooking(
      { date: values.date, start: values.start, end: values.end, title: values.title.trim() || undefined },
      bookings,
      now,
      editingId,
    );
    if (violations.length === 0) return { values, errors: {} };
    const errors: FieldErrors<BookingFormValues> = {};
    for (const v of violations) errors[v.field] ??= { type: v.code, message: violationMessage(v) };
    return { values: {}, errors };
  };

  const form = useForm<BookingFormValues>({
    resolver,
    defaultValues: initialValues(target, scheduleDate, bookings, now),
  });
  const { register, handleSubmit, setValue, getValues, setError, trigger, formState } = form;

  useEffect(() => {
    if (problem?.tone === "warning") void trigger();
  }, [bookings, problem, trigger]);

  const start = useWatch({ control: form.control, name: "start" });
  const end = useWatch({ control: form.control, name: "end" });

  const clearProblem = () => setProblem(null);

  async function retime(day: ISODate) {
    const dayBookings = await queryClient.fetchQuery(bookingsQuery(day)).catch(() => undefined);
    if (!dayBookings || getValues("date") !== day) return;
    const options = { shouldValidate: formState.isSubmitted };
    let nextStart = getValues("start");
    if (!isSelectable(startOptions(day, dayBookings, now, editingId), nextStart)) {
      nextStart = firstFreeStart(day, dayBookings, now, editingId) ?? "";
      setValue("start", nextStart, options);
    }
    if (!isSelectable(endOptions(day, nextStart, dayBookings, editingId), getValues("end"))) {
      setValue("end", suggestEnd(day, nextStart, dayBookings, editingId) ?? "", options);
    }
  }

  const fields = {
    title: register("title", { onChange: clearProblem }),
    date: register("date", {
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        clearProblem();
        const next = event.target.value;
        if (!isValidDate(next)) return;
        setScheduleDate(next);
        void retime(next);
      },
    }),
    end: register("end", { onChange: clearProblem }),
    start: register("start", {
      onChange: (event: ChangeEvent<HTMLSelectElement>) => {
        clearProblem();
        const nextStart = event.target.value;
        if (isSelectable(endOptions(scheduleDate, nextStart, bookings, editingId), getValues("end"))) return;
        setValue("end", suggestEnd(scheduleDate, nextStart, bookings, editingId) ?? "", {
          shouldValidate: formState.isSubmitted,
        });
      },
    }),
  };

  const submit = handleSubmit(async (values) => {
    setProblem(null);
    const title = values.title.trim();
    const { date: savedDate, start, end } = values;
    try {
      if (editing) {
        await updateBooking.mutateAsync({ booking: editing, patch: { date: savedDate, start, end, title } });
      } else {
        await createBooking.mutateAsync({ date: savedDate, start, end, title: title || undefined });
      }
      toast.success(editing ? "Бронь обновлена" : "Бронь создана", {
        description: `${formatDateShort(savedDate)}, ${start}–${end}${title ? ` · ${title}` : ""}`,
      });
      onDone(savedDate);
    } catch (error) {
      if (closeIfStale(error, onDone)) return;
      if (isApiError(error, "validation")) {
        for (const v of error.violations) setError(v.field, { type: v.code, message: v.message });
      }
      if (isApiError(error, "conflict") && error.conflictWith) onConflict(error.conflictWith.id);
      setProblem(describeWriteFailure(error));
    }
  });

  const duration =
    isValidTime(start) && isValidTime(end) && toMinutes(end) > toMinutes(start) ? formatDuration(start, end) : null;

  const scheduleStatus = scheduleReady
    ? null
    : schedule.isError
      ? `Не удалось загрузить расписание на эту дату. ${errorMessage(schedule.error)}`
      : "Загружаем расписание на эту дату…";

  return {
    editing,
    fields,
    errors: formState.errors,
    isSubmitting: formState.isSubmitting,
    problem,
    minDate: toISODate(now),
    scheduleReady,
    scheduleStatus,
    startChoices: startOptions(scheduleDate, bookings, now, editingId),
    endChoices: endOptions(scheduleDate, start, bookings, editingId),
    duration,
    submit,
  };
}

function initialValues(target: BookingFormTarget, date: ISODate, bookings: Booking[], now: Date): BookingFormValues {
  if (target.mode === "edit") {
    const { start, end, title } = target.booking;
    return { date, start, end, title: title ?? "" };
  }
  const start = target.start ?? firstFreeStart(date, bookings, now) ?? "";
  const end = start ? (suggestEnd(date, start, bookings) ?? "") : "";
  return { date, start, end, title: "" };
}
