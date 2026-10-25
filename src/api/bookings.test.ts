import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { bookingsApi } from "./bookings";
import { ApiError } from "./errors";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const booking = { id: "b1", date: "2030-01-15", start: "10:00", end: "11:00", title: "Синк" };

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe("bookingsApi", () => {
  it("returns a list that matches the contract", async () => {
    server.use(http.get("*/api/bookings", () => HttpResponse.json([booking])));
    await expect(bookingsApi.list("2030-01-15")).resolves.toEqual([booking]);
  });

  it("rejects a response that does not match the contract", async () => {
    server.use(http.get("*/api/bookings", () => HttpResponse.json([{ ...booking, start: "10am" }])));
    const error = await caught(bookingsApi.list("2030-01-15"));
    expect(error.kind).toBe("server");
    expect(error.message).toMatch(/неожиданном формате/);
  });

  it("maps a 409 with details to a conflict error", async () => {
    server.use(
      http.post("*/api/bookings", () =>
        HttpResponse.json({ error: { message: "Занято", conflictWith: booking } }, { status: 409 }),
      ),
    );
    const error = await caught(bookingsApi.create({ date: "2030-01-15", start: "10:00", end: "11:00" }));
    expect(error).toMatchObject({ kind: "conflict", status: 409, message: "Занято", conflictWith: booking });
  });

  it("falls back to the status when the error body is unexpected", async () => {
    server.use(http.patch("*/api/bookings/:id", () => HttpResponse.text("Conflict", { status: 409 })));
    const error = await caught(bookingsApi.update("b1", { end: "11:30" }));
    expect(error).toMatchObject({ kind: "conflict", message: "Это время уже занято", conflictWith: undefined });
  });

  it("treats 204 on delete as success", async () => {
    server.use(http.delete("*/api/bookings/:id", () => new HttpResponse(null, { status: 204 })));
    await expect(bookingsApi.remove("b1")).resolves.toBeUndefined();
  });
});
