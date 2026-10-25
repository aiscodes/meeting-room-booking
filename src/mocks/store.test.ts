import { afterEach, describe, expect, it } from "vitest";
import { createBookingStore, localStoragePersistence } from "./store";

const STORAGE_KEY = "meeting-room-booking:v1";
const seed = () => [{ id: "seed", date: "2030-01-15", start: "09:00", end: "10:00" }];

afterEach(() => window.localStorage.clear());

describe("localStoragePersistence", () => {
  it.each([
    ["invalid JSON", "{not json"],
    ["a different shape", JSON.stringify({ bookings: [] })],
    ["a booking with a broken time", JSON.stringify([{ id: "x", date: "2030-01-15", start: "9am", end: "10:00" }])],
  ])("falls back to the seed when storage holds %s", (_, raw) => {
    window.localStorage.setItem(STORAGE_KEY, raw);
    const store = createBookingStore({ seed, persistence: localStoragePersistence });
    expect(store.list("2030-01-15").map((b) => b.id)).toEqual(["seed"]);
  });

  it("restores valid bookings", () => {
    const saved = [{ id: "saved", date: "2030-01-15", start: "11:00", end: "12:00", title: "Ретро" }];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    const store = createBookingStore({ seed, persistence: localStoragePersistence });
    expect(store.list("2030-01-15")).toEqual(saved);
  });
});
