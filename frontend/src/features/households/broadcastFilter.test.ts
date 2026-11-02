import { aHousehold } from "../../testing/householdFactory";
import { filterHouseholdsByBroadcast, toggleBroadcastFilter } from "./broadcastFilter";

const onBride = aHousehold({ name: "Bianchi", broadcastList: "bride" });
const onGroom = aHousehold({ name: "Neri", broadcastList: "groom" });
const onNone = aHousehold({ name: "Verdi", broadcastList: null });
const households = [onBride, onGroom, onNone];

describe("filterHouseholdsByBroadcast", () => {
  it("given nothing ticked, when households are filtered, then every household is kept", () => {
    expect(filterHouseholdsByBroadcast(households, [])).toEqual(households);
  });

  it("given the bride's list is ticked, when households are filtered, then only hers are kept", () => {
    expect(filterHouseholdsByBroadcast(households, ["bride"])).toEqual([onBride]);
  });

  it("given not set and the groom's list are ticked, when households are filtered, then either is kept", () => {
    expect(filterHouseholdsByBroadcast(households, ["groom", "notSet"])).toEqual([onGroom, onNone]);
  });
});

describe("toggleBroadcastFilter", () => {
  it("given a list not ticked, when it is toggled, then it is ticked", () => {
    expect(toggleBroadcastFilter(["bride"], "notSet")).toEqual(["bride", "notSet"]);
  });

  it("given a list ticked, when it is toggled, then it is unticked", () => {
    expect(toggleBroadcastFilter(["bride", "groom"], "bride")).toEqual(["groom"]);
  });
});
