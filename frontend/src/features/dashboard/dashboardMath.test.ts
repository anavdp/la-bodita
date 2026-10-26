import { aDocument, aPaperRequest, aPerson, aTask } from "../../testing/planningFactory";
import { aBudgetLine, aCategory } from "../../testing/planningFactory";
import { daysLate, paperProgress, needsYou, spendByCategory } from "./dashboardMath";

const today = new Date(2026, 9, 25);
const todayIso = "2026-10-25";
const vicky = aPerson({ displayName: "Vicky" });
const gerardo = aPerson({ displayName: "Gerardo" });

describe("what needs us", () => {
  it("given open tasks past their date, when the list is built, then they come first, the oldest at the top", () => {
    const yesterday = aTask({
      title: "Send the table plan",
      dueDate: "2026-10-24",
    });
    const lastWeek = aTask({
      title: "Pay the choir deposit",
      dueDate: "2026-10-18",
    });
    const done = aTask({
      title: "Church visit",
      dueDate: "2026-10-10",
      isDone: true,
    });
    const soon = aTask({ title: "Cake tasting", dueDate: "2026-10-31" });

    const list = needsYou({ tasks: [yesterday, soon, lastWeek, done], requests: [], documents: [] }, today);

    expect(list.map((entry) => entry.key)).toEqual([`late-${lastWeek.id}`, `late-${yesterday.id}`]);
    expect(list[0]).toMatchObject({
      kind: "lateTask",
      task: lastWeek,
      daysLate: 7,
    });
  });

  it("given papers running out, when the list is built, then they follow the late tasks, the soonest first", () => {
    const late = aTask({ dueDate: "2026-10-20" });
    const passport = aDocument({
      title: "Vicky's passport",
      expiresOn: "2026-12-15",
    });
    const expired = aDocument({ title: "Old ID", expiresOn: "2026-09-01" });
    const fine = aDocument({
      title: "Gerardo's passport",
      expiresOn: "2031-01-01",
    });
    const photo = aDocument({ kind: "photo", expiresOn: null });

    const list = needsYou(
      {
        tasks: [late],
        requests: [],
        documents: [passport, fine, expired, photo],
      },
      today,
    );

    expect(list.map((entry) => entry.key)).toEqual([
      `late-${late.id}`,
      `expiring-${expired.id}`,
      `expiring-${passport.id}`,
    ]);
    expect(list[1]).toMatchObject({ kind: "runningOut", isExpired: true });
    expect(list[2]).toMatchObject({ kind: "runningOut", isExpired: false });
  });

  it("given items still waiting on papers, when the list is built, then each item comes last with what it waits on", () => {
    const baptism = aPaperRequest({
      name: "Baptism certificate",
      itemId: 3,
      itemName: "Iglesia San José",
    });
    const course = aPaperRequest({
      name: "Marriage course",
      itemId: 3,
      itemName: "Iglesia San José",
    });
    const answered = aPaperRequest({
      name: "Passport",
      itemId: 4,
      itemName: "Registro civil",
      isMissing: false,
    });

    const list = needsYou({ tasks: [], requests: [baptism, answered, course], documents: [] }, today);

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "waitingPapers", key: "waiting-3" });
    expect(list[0].kind === "waitingPapers" && list[0].item.missing).toEqual([baptism, course]);
  });

  it("given nothing late, running out or missing, when the list is built, then it is empty", () => {
    expect(
      needsYou(
        {
          tasks: [aTask({ dueDate: "2026-11-01" })],
          requests: [],
          documents: [],
        },
        today,
      ),
    ).toEqual([]);
  });
});

describe("the figures", () => {
  it("given a task due three days ago, when its lateness is counted, then it is three days late", () => {
    expect(daysLate("2026-10-22", today)).toBe(3);
  });

  it("given papers for both of us and for one, when they are counted, then each person's copy counts", () => {
    const requests = [
      aPaperRequest({ name: "Birth certificate", personId: null }),
      aPaperRequest({ name: "Nulla osta", personId: gerardo.id }),
      aPaperRequest({ name: "Passport", personId: vicky.id, isMissing: false, documentId: 99 }),
    ];

    expect(paperProgress(requests, [], [vicky, gerardo], todayIso)).toEqual({ inHand: 1, missing: 3 });
  });
});

describe("spending by category", () => {
  const church = aCategory({ name: "Church", color: "#7b61c9" });
  const dress = aCategory({ name: "Dress", color: "#6a7cf0" });

  it("given booked and paid lines, when they are summed, then each category gets its share, the biggest first", () => {
    const lines = [
      aBudgetLine({ status: "paid", estimatedAmount: 300, categoryId: church.id }),
      aBudgetLine({ status: "confirmed", estimatedAmount: 250, actualAmount: 280, categoryId: church.id }),
      aBudgetLine({ status: "confirmed", estimatedAmount: 1200, categoryId: dress.id }),
      aBudgetLine({ status: "considering", estimatedAmount: 5000, categoryId: dress.id }),
      aBudgetLine({ status: "paid", estimatedAmount: 90, categoryId: null }),
    ];

    const [usd] = spendByCategory(lines, [church, dress]);

    expect(usd.currency).toBe("USD");
    expect(usd.total).toBe(1870);
    expect(usd.slices.map((slice) => [slice.category?.name ?? null, slice.amount])).toEqual([
      ["Dress", 1200],
      ["Church", 580],
      [null, 90],
    ]);
  });

  it("given money in two currencies, when it is summed, then each currency stands alone, the bigger first", () => {
    const lines = [
      aBudgetLine({ status: "paid", currency: "EUR", estimatedAmount: 600, categoryId: dress.id }),
      aBudgetLine({ status: "paid", currency: "USD", estimatedAmount: 900, categoryId: church.id }),
    ];

    expect(spendByCategory(lines, [church, dress]).map((group) => [group.currency, group.total])).toEqual([
      ["USD", 900],
      ["EUR", 600],
    ]);
  });

  it("given nothing booked yet, when it is summed, then there is nothing to show", () => {
    expect(spendByCategory([aBudgetLine({ status: "considering" })], [])).toEqual([]);
  });
});
