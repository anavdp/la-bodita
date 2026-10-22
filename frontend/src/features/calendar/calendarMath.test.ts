import { aCalendarEvent, aTask } from "../../testing/planningFactory";
import { entriesOn, monthWeeks, toEntries, upcoming } from "./calendarMath";

describe("monthWeeks", () => {
  it("given October 2026, when its weeks are laid out, then they run Monday to Sunday and cover the whole month", () => {
    const weeks = monthWeeks(2026, 9);

    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(weeks[4][6]).toBe("2026-11-01");
  });

  it("given a month that starts on a Monday, when its weeks are laid out, then nothing of the month before shows", () => {
    expect(monthWeeks(2026, 5)[0][0]).toBe("2026-06-01");
  });
});

describe("toEntries", () => {
  it("given tasks and events, when they become calendar entries, then undated tasks are left out", () => {
    const dated = aTask({ title: "Cake tasting", dueDate: "2026-10-31", dueTime: "11:00:00" });
    const undated = aTask({ title: "Pick a florist" });
    const trip = aCalendarEvent({ title: "Honeymoon", startDate: "2026-11-01", endDate: "2026-11-08" });

    const entries = toEntries([dated, undated], [trip]);

    expect(entries.map((entry) => [entry.title, entry.startDate, entry.endDate, entry.time])).toEqual([
      ["Cake tasting", "2026-10-31", "2026-10-31", "11:00:00"],
      ["Honeymoon", "2026-11-01", "2026-11-08", null],
    ]);
  });
});

describe("entriesOn", () => {
  const fair = aCalendarEvent({ title: "Bridal fair", startDate: "2026-11-03", startTime: "10:00:00" });
  const trip = aCalendarEvent({ title: "Honeymoon", startDate: "2026-11-01", endDate: "2026-11-08" });
  const call = aTask({ title: "Call the florist", dueDate: "2026-11-03", dueTime: "09:00:00" });
  const entries = toEntries([call], [fair, trip]);

  it("given a trip, when a day inside it is asked for, then the trip is on it", () => {
    expect(entriesOn(entries, "2026-11-05").map((entry) => entry.title)).toEqual(["Honeymoon"]);
  });

  it("given a busy day, when it is asked for, then untimed things come first, then by time", () => {
    expect(entriesOn(entries, "2026-11-03").map((entry) => entry.title)).toEqual([
      "Honeymoon",
      "Call the florist",
      "Bridal fair",
    ]);
  });

  it("given the day after a trip, when it is asked for, then the trip is not on it", () => {
    expect(entriesOn(entries, "2026-11-09")).toEqual([]);
  });
});

describe("upcoming", () => {
  it("given past, done and later things, when the next two weeks are asked for, then only open ones still ahead show, soonest first", () => {
    const entries = toEntries(
      [
        aTask({ title: "Done already", dueDate: "2026-10-25", isDone: true }),
        aTask({ title: "Overdue call", dueDate: "2026-10-20" }),
        aTask({ title: "Cake tasting", dueDate: "2026-10-31" }),
        aTask({ title: "Far away", dueDate: "2026-12-20" }),
      ],
      [
        aCalendarEvent({ title: "Trip under way", startDate: "2026-10-20", endDate: "2026-10-24" }),
        aCalendarEvent({ title: "Bridal fair", startDate: "2026-10-27" }),
      ],
    );

    expect(upcoming(entries, "2026-10-22", 14).map((entry) => entry.title)).toEqual([
      "Trip under way",
      "Bridal fair",
      "Cake tasting",
    ]);
  });

  it("given no horizon, when what is next is asked for, then anything still ahead counts", () => {
    const entries = toEntries([aTask({ title: "Far away", dueDate: "2026-12-20" })], []);

    expect(upcoming(entries, "2026-10-22").map((entry) => entry.title)).toEqual(["Far away"]);
  });
});
