import { aBudgetLine, aCategory } from "../../testing/planningFactory";
import { amountOf, canSwitchOn, formatMoney, formatTotals, groupByCategory, summarise } from "./budgetMath";

describe("budget math", () => {
  it("given a final price, when a line's amount is read, then it wins over the quote", () => {
    expect(amountOf(aBudgetLine({ estimatedAmount: 300, actualAmount: 320 }))).toBe(320);
    expect(amountOf(aBudgetLine({ estimatedAmount: 300, actualAmount: null }))).toBe(300);
    expect(amountOf(aBudgetLine({ estimatedAmount: null, actualAmount: null }))).toBeNull();
  });

  it("given a line waiting for its quote, when it is checked, then it cannot be switched on", () => {
    expect(canSwitchOn(aBudgetLine({ estimatedAmount: null }))).toBe(false);
    expect(canSwitchOn(aBudgetLine({ estimatedAmount: 0 }))).toBe(true);
  });

  it("given lines in every state, when they are summed, then off lines are left out and confirmed ones split out", () => {
    const summary = summarise([
      aBudgetLine({ status: "paid", estimatedAmount: 300 }),
      aBudgetLine({ status: "confirmed", estimatedAmount: 1200 }),
      aBudgetLine({ status: "considering", estimatedAmount: 1800 }),
      aBudgetLine({ status: "idea", estimatedAmount: 1500 }),
    ]);

    expect(summary.get("USD")).toEqual({ total: 3300, paid: 300, booked: 1200, confirmed: 1500, open: 1800 });
  });

  it("given lines in two currencies, when they are summed, then each currency keeps its own total", () => {
    const summary = summarise([
      aBudgetLine({ status: "considering", estimatedAmount: 2000 }),
      aBudgetLine({ status: "considering", currency: "EUR", estimatedAmount: 600 }),
    ]);

    expect(formatTotals(summary, "total", "en")).toBe("$2,000 + €600");
  });

  it("given nothing switched on, when the total is shown, then it reads zero dollars", () => {
    expect(formatTotals(summarise([aBudgetLine({ status: "idea" })]), "total", "en")).toBe("$0");
  });

  it("given cents, when an amount is shown, then they are kept, and dropped when there are none", () => {
    expect(formatMoney(1750.5, "USD", "en")).toBe("$1,750.50");
    expect(formatMoney(1800, "EUR", "es")).toBe("1800\u00a0€");
  });

  it("given lines of several categories, when they are grouped, then categories keep their order and loose lines come last", () => {
    const church = aCategory({ name: "Church" });
    const cake = aCategory({ name: "Cake" });
    const empty = aCategory({ name: "Music" });
    const fee = aBudgetLine({ title: "Parish fee", categoryId: church.id });
    const tiers = aBudgetLine({ title: "3 tiers", categoryId: cake.id });
    const flights = aBudgetLine({ title: "Flights" });

    const groups = groupByCategory([flights, tiers, fee], [church, cake, empty]);

    expect(groups.map((group) => [group.key, group.category?.name ?? null, group.lines.map((l) => l.title)])).toEqual([
      [String(church.id), "Church", ["Parish fee"]],
      [String(cake.id), "Cake", ["3 tiers"]],
      ["none", null, ["Flights"]],
    ]);
  });
});
