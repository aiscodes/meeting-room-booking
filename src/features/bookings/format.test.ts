import { describe, expect, it } from "vitest";
import { formatBookingCount } from "./format";

describe("formatBookingCount", () => {
  it.each([
    [0, "броней нет"],
    [1, "1 бронь"],
    [2, "2 брони"],
    [5, "5 броней"],
    [11, "11 броней"],
    [21, "21 бронь"],
  ])("%i → %s", (count, text) => {
    expect(formatBookingCount(count)).toBe(text);
  });
});
