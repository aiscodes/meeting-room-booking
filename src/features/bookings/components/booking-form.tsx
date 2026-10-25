"use client";

import clsx from "clsx";
import { TriangleAlert } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { FormField, controlClassName } from "@/components/ui/form-field";
import { TITLE_MAX_LENGTH } from "@/domain/booking";
import { DURATION_LIMITS_LABEL } from "@/domain/messages";
import { type BookingFormOptions, useBookingForm } from "../use-booking-form";
import type { WriteProblem } from "../write-errors";
import { DeleteBookingButton } from "./delete-booking-button";
import { TimeSelect } from "./time-select";

export function BookingForm(props: BookingFormOptions) {
  const {
    editing,
    fields,
    errors,
    isSubmitting,
    problem,
    minDate,
    scheduleReady,
    scheduleStatus,
    startChoices,
    endChoices,
    duration,
    submit,
  } = useBookingForm(props);
  const durationId = useId();
  const scheduleStatusId = useId();

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-5">
      <ProblemAlert problem={problem} />

      <FormField
        label={
          <>
            Название <span className="font-normal text-slate-500">(необязательно)</span>
          </>
        }
        error={errors.title?.message}
      >
        {(control) => (
          <input
            {...control}
            {...fields.title}
            type="text"
            autoComplete="off"
            maxLength={TITLE_MAX_LENGTH}
            placeholder="Например, планирование спринта"
            className={controlClassName}
          />
        )}
      </FormField>

      <FormField label="Дата" error={errors.date?.message} describedBy={scheduleStatusId}>
        {(control) => (
          <input {...control} {...fields.date} type="date" min={minDate} className={`${controlClassName} tabular-nums`} />
        )}
      </FormField>
      <p id={scheduleStatusId} role="status" className="-mt-3 text-sm text-slate-600 empty:hidden">
        {scheduleStatus}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Начало" error={errors.start?.message}>
          {(control) => <TimeSelect {...control} {...fields.start} options={startChoices} />}
        </FormField>
        <FormField label="Окончание" error={errors.end?.message} describedBy={durationId}>
          {(control) => <TimeSelect {...control} {...fields.end} options={endChoices} />}
        </FormField>
      </div>

      <p id={durationId} className="text-sm text-slate-600">
        Длительность: {duration ?? DURATION_LIMITS_LABEL}
      </p>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
        {editing && (
          <DeleteBookingButton booking={editing} disabled={isSubmitting} onDeleted={() => props.onDone()} />
        )}
        <div className="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row">
          <Button onClick={() => props.onDone()} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={!scheduleReady}>
            {isSubmitting ? "Сохраняем…" : editing ? "Сохранить" : "Забронировать"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ProblemAlert({ problem }: { problem: WriteProblem | null }) {
  return (
    <div aria-live="assertive">
      {problem && (
        <div
          role="alert"
          className={clsx(
            "flex gap-3 rounded-lg border p-3 text-sm",
            problem.tone === "warning"
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-red-300 bg-red-50 text-red-900",
          )}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{problem.message}</p>
        </div>
      )}
    </div>
  );
}
