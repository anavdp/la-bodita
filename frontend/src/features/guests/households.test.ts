import { aGuest } from "../../testing/guestFactory";
import { membersOf, rsvpUrl } from "./households";

describe("membersOf", () => {
  it("given a household, when its members are looked up, then only its own guests come back", () => {
    const maria = aGuest({ householdId: 10 });
    const paolo = aGuest({ householdId: 10 });
    const carlos = aGuest({ householdId: 20 });

    expect(membersOf({ id: 10 }, [maria, carlos, paolo])).toEqual([maria, paolo]);
  });
});

describe("rsvpUrl", () => {
  it("given a token, when the link is built, then it points at this app's RSVP page", () => {
    expect(rsvpUrl("abc")).toBe(`${window.location.origin}/rsvp/abc`);
  });
});
