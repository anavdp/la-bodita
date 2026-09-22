import { aGuest } from "../../testing/guestFactory";
import { summariseRsvps } from "./guestSummary";

describe("summariseRsvps", () => {
  it("given a guest list, when it is summarised, then each RSVP state is counted", () => {
    const summary = summariseRsvps([
      aGuest({ rsvpStatus: "confirmed" }),
      aGuest({ rsvpStatus: "confirmed" }),
      aGuest({ rsvpStatus: "pending" }),
      aGuest({ rsvpStatus: "declined" }),
    ]);

    expect(summary).toEqual({
      total: 4,
      confirmed: 2,
      pending: 1,
      declined: 1,
      shareConfirmed: 50,
      sharePending: 25,
      shareDeclined: 25,
    });
  });

  it("given no guests yet, when they are summarised, then the shares are zero rather than NaN", () => {
    const summary = summariseRsvps([]);

    expect(summary).toEqual({
      total: 0,
      confirmed: 0,
      pending: 0,
      declined: 0,
      shareConfirmed: 0,
      sharePending: 0,
      shareDeclined: 0,
    });
  });

  it("given a share that does not divide evenly, when it is summarised, then it is rounded", () => {
    const summary = summariseRsvps([
      aGuest({ rsvpStatus: "confirmed" }),
      aGuest({ rsvpStatus: "pending" }),
      aGuest({ rsvpStatus: "pending" }),
    ]);

    expect(summary.shareConfirmed).toBe(33);
    expect(summary.sharePending).toBe(67);
  });
});
