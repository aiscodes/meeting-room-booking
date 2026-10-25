import { z } from "zod";
import { type Booking, VIOLATION_CODES, type Violation } from "@/domain/booking";
import { isValidDate, isValidTime } from "@/domain/time";

export type ApiViolation = Violation & { message: string };

export type ApiErrorBody = {
  error: {
    message: string;
    violations?: ApiViolation[];
    conflictWith?: Booking;
  };
};

export const bookingSchema: z.ZodType<Booking> = z.object({
  id: z.string().min(1),
  date: z.string().refine(isValidDate, "Expected YYYY-MM-DD"),
  start: z.string().refine(isValidTime, "Expected HH:mm"),
  end: z.string().refine(isValidTime, "Expected HH:mm"),
  title: z.string().optional(),
});

export const bookingListSchema = z.array(bookingSchema);

const violationSchema: z.ZodType<ApiViolation> = z.object({
  code: z.enum(VIOLATION_CODES),
  field: z.enum(["date", "start", "end", "title"]),
  message: z.string(),
  conflictWith: bookingSchema.optional(),
});

export const apiErrorBodySchema: z.ZodType<ApiErrorBody> = z.object({
  error: z.object({
    message: z.string(),
    violations: z.array(violationSchema).optional(),
    conflictWith: bookingSchema.optional(),
  }),
});
