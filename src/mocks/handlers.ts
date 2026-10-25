import { delay, http, HttpResponse, type HttpResponseResolver, type PathParams } from "msw";
import { z } from "zod";
import type { ApiErrorBody } from "@/api/contract";
import { type Booking, type BookingInput, isLocked, validateBooking } from "@/domain/booking";
import { violationMessage } from "@/domain/messages";
import { isValidDate } from "@/domain/time";
import type { MockControlsStore } from "./controls";
import type { BookingStore } from "./store";

const bookingInputSchema = z.object({
  date: z.string(),
  start: z.string(),
  end: z.string(),
  title: z.string().optional(),
});
const bookingPatchSchema = bookingInputSchema.partial();

const fail = (status: number, error: ApiErrorBody["error"]) => HttpResponse.json<ApiErrorBody>({ error }, { status });

async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | Response> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  return parsed.success ? parsed.data : fail(400, { message: "Некорректное тело запроса" });
}

function normalize(input: BookingInput): BookingInput {
  const title = input.title?.trim();
  return { date: input.date, start: input.start, end: input.end, ...(title ? { title } : {}) };
}

type Deps = { store: BookingStore; controls: MockControlsStore; now: () => Date };

export function createHandlers({ store, controls, now }: Deps) {
  function withNetwork<Params extends PathParams>(resolver: HttpResponseResolver<Params>): HttpResponseResolver<Params> {
    return async (info) => {
      const { latencyMs, failNextRequest } = controls.get();
      if (latencyMs > 0) await delay(latencyMs);
      if (failNextRequest) {
        controls.set({ failNextRequest: false });
        return fail(500, { message: "Внутренняя ошибка сервера (симуляция)" });
      }
      return resolver(info);
    };
  }

  function findWritable(id: string): Booking | Response {
    const booking = store.get(id);
    if (!booking) return fail(404, { message: "Бронь не найдена — возможно, её уже удалили" });
    if (isLocked(booking, now())) {
      return fail(423, { message: "Бронь уже началась или закончилась — её нельзя изменить или удалить" });
    }
    return booking;
  }

  function rejectWrite(input: BookingInput, editingId?: string): Response | null {
    const violations = validateBooking(input, store.list(input.date), now(), editingId);
    const [first] = violations;
    if (first?.code === "overlap" && violations.length === 1) {
      return fail(409, { message: "Это время уже занято другой бронью", conflictWith: first.conflictWith });
    }
    if (first) {
      return fail(400, {
        message: violationMessage(first),
        violations: violations.map((v) => ({ ...v, message: violationMessage(v) })),
      });
    }
    if (controls.get().raceNextWrite) {
      controls.set({ raceNextWrite: false });
      const competitor = store.insert({ ...input, title: "Другой пользователь" });
      return fail(409, {
        message: "Пока вы заполняли форму, это время занял другой пользователь",
        conflictWith: competitor,
      });
    }
    return null;
  }

  return [
    http.get(
      "*/api/bookings",
      withNetwork(({ request }) => {
        const date = new URL(request.url).searchParams.get("date") ?? "";
        if (!isValidDate(date)) return fail(400, { message: "Параметр date должен быть в формате YYYY-MM-DD" });
        return HttpResponse.json(store.list(date));
      }),
    ),

    http.post(
      "*/api/bookings",
      withNetwork(async ({ request }) => {
        const body = await parseBody(request, bookingInputSchema);
        if (body instanceof Response) return body;
        const input = normalize(body);
        return rejectWrite(input) ?? HttpResponse.json(store.insert(input), { status: 201 });
      }),
    ),

    http.patch(
      "*/api/bookings/:id",
      withNetwork<{ id: string }>(async ({ request, params }) => {
        const existing = findWritable(params.id);
        if (existing instanceof Response) return existing;
        const patch = await parseBody(request, bookingPatchSchema);
        if (patch instanceof Response) return patch;
        const { date, start, end, title } = existing;
        const next = normalize({ date, start, end, title, ...patch });
        return rejectWrite(next, existing.id) ?? HttpResponse.json(store.update(existing.id, next));
      }),
    ),

    http.delete(
      "*/api/bookings/:id",
      withNetwork<{ id: string }>(({ params }) => {
        const existing = findWritable(params.id);
        if (existing instanceof Response) return existing;
        store.remove(existing.id);
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}
