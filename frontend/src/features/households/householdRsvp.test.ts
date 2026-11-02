import { aGuest } from "../../testing/guestFactory";
import { aHousehold } from "../../testing/householdFactory";
import { householdRsvpOf, householdShowsUnder, membersOf } from "./householdRsvp";

const confirmed = () => aGuest({ rsvpStatus: "confirmed" });
const declined = () => aGuest({ rsvpStatus: "declined" });
const pending = () => aGuest({ rsvpStatus: "pending" });

describe("householdRsvpOf", () => {
  it("given everyone confirmed, when the household is summed up, then it is confirmed", () => {
    expect(householdRsvpOf([confirmed(), confirmed()])).toBe("confirmed");
  });

  it("given everyone declined, when the household is summed up, then it is declined", () => {
    expect(householdRsvpOf([declined(), declined()])).toBe("declined");
  });

  it("given some confirmed and some declined, when the household is summed up, then it is mixed", () => {
    expect(householdRsvpOf([confirmed(), declined(), confirmed()])).toBe("mixed");
  });

  it("given anyone still pending, when the household is summed up, then pending wins over every answer", () => {
    expect(householdRsvpOf([confirmed(), pending()])).toBe("pending");
    expect(householdRsvpOf([declined(), pending()])).toBe("pending");
    expect(householdRsvpOf([confirmed(), declined(), pending()])).toBe("pending");
  });

  it("given nobody in the household, when it is summed up, then it has no RSVP", () => {
    expect(householdRsvpOf([])).toBeNull();
  });
});

describe("membersOf", () => {
  it("given a household, when its members are looked up, then they come from its guest ids and unknown ids are skipped", () => {
    const lucia = confirmed();
    const marco = declined();
    const someoneElse = pending();
    const household = aHousehold({ guestIds: [lucia.id, marco.id, 9999] });

    expect(membersOf(household, [someoneElse, marco, lucia])).toEqual([lucia, marco]);
  });
});

describe("householdShowsUnder", () => {
  it("given a mixed household, when the summary filters, then it shows under confirmed and declined but not pending", () => {
    expect(householdShowsUnder("mixed", "confirmed")).toBe(true);
    expect(householdShowsUnder("mixed", "declined")).toBe(true);
    expect(householdShowsUnder("mixed", "pending")).toBe(false);
  });

  it("given a single-status household, when the summary filters, then it shows only under that status", () => {
    expect(householdShowsUnder("pending", "pending")).toBe(true);
    expect(householdShowsUnder("pending", "confirmed")).toBe(false);
    expect(householdShowsUnder("confirmed", "declined")).toBe(false);
  });

  it("given a household with nobody in it, when the summary filters, then it shows under no status", () => {
    expect(householdShowsUnder(null, "pending")).toBe(false);
  });
});
