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

  it("given a public address is configured, when the link is built, then it points there instead of this app", () => {
    vi.stubEnv("VITE_PUBLIC_URL", "https://labodita.example");

    expect(rsvpUrl("abc")).toBe("https://labodita.example/rsvp/abc");

    vi.unstubAllEnvs();
  });

  it("given the public address ends in a slash, when the link is built, then the path has no double slash", () => {
    vi.stubEnv("VITE_PUBLIC_URL", "https://labodita.example/");

    expect(rsvpUrl("abc")).toBe("https://labodita.example/rsvp/abc");

    vi.unstubAllEnvs();
  });
});
