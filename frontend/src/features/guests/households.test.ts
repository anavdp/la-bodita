import { aGuest } from "../../testing/guestFactory";
import { groupByHousehold, householdLabel, rsvpUrl } from "./households";

describe("householdLabel", () => {
  it("given a named household, when it is labelled, then the name wins", () => {
    expect(householdLabel("Familia Mendoza", [aGuest({ lastName: "Mendoza" })])).toBe("Familia Mendoza");
  });

  it("given a household of one, when it is labelled, then it is that guest's full name", () => {
    expect(householdLabel(null, [aGuest({ firstName: "Maria", lastName: "Rossi" })])).toBe("Maria Rossi");
  });

  it("given an unnamed family, when it is labelled, then it is their surnames, each once", () => {
    const members = [
      aGuest({ firstName: "Maria", lastName: "Rossi" }),
      aGuest({ firstName: "Paolo", lastName: "Rossi" }),
      aGuest({ firstName: "Lucia", lastName: "Mendoza" }),
    ];

    expect(householdLabel(null, members)).toBe("Rossi & Mendoza");
  });
});

describe("groupByHousehold", () => {
  const maria = aGuest({ firstName: "Maria", lastName: "Rossi", householdId: 10 });
  const carlos = aGuest({ firstName: "Carlos", lastName: "Mendoza", householdId: 20 });
  const paolo = aGuest({ firstName: "Paolo", lastName: "Rossi", householdId: 10 });
  const households = [
    { id: 10, name: null, rsvpToken: "rossi-token", guestIds: [maria.id, paolo.id] },
    { id: 20, name: null, rsvpToken: "mendoza-token", guestIds: [carlos.id] },
  ];

  it("given guests in households, when they are grouped, then each household is one group in list order", () => {
    const groups = groupByHousehold([maria, carlos, paolo], [maria, carlos, paolo], households);

    expect(groups.map((group) => [group.label, group.guests.map((guest) => guest.firstName)])).toEqual([
      ["Rossi", ["Maria", "Paolo"]],
      ["Carlos Mendoza", ["Carlos"]],
    ]);
    expect(groups[0].rsvpToken).toBe("rossi-token");
  });

  it("given a filtered list, when it is grouped, then the label still names the whole household", () => {
    const groups = groupByHousehold([paolo], [maria, carlos, paolo], households);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Rossi");
    expect(groups[0].memberCount).toBe(2);
  });

  it("given households that have not loaded, when guests are grouped, then groups still form without links", () => {
    const groups = groupByHousehold([maria, paolo], [maria, paolo], []);

    expect(groups).toHaveLength(1);
    expect(groups[0].rsvpToken).toBeNull();
  });
});

describe("rsvpUrl", () => {
  it("given a token, when the link is built, then it points at this app's RSVP page", () => {
    expect(rsvpUrl("abc")).toBe(`${window.location.origin}/rsvp/abc`);
  });
});
