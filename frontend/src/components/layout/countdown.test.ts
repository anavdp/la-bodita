import { daysUntil } from "./countdown";

describe("daysUntil", () => {
  it("given a future wedding date, when the countdown is read, then it is the number of days away", () => {
    expect(daysUntil("2026-10-29", new Date("2026-08-25T12:00:00Z"))).toBe(65);
  });

  it("given the wedding day itself, when the countdown is read, then nothing is left to wait", () => {
    expect(daysUntil("2026-10-29", new Date("2026-10-29T12:00:00Z"))).toBe(0);
  });

  it("given a date that has passed, when the countdown is read, then it is negative", () => {
    expect(daysUntil("2026-10-29", new Date("2026-10-31T12:00:00Z"))).toBe(-2);
  });

  it("given the day before, when the countdown is read, then only whole days count", () => {
    expect(daysUntil("2026-10-29", new Date("2026-10-28T12:00:00Z"))).toBe(1);
  });
});
