import { aDocument, aPaperRequest, aPerson, aTask } from "../../testing/planningFactory";
import { daysLate, missingPaperCount, needsYou } from "./dashboardMath";

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

  it("given papers for both of us and for one, when the missing ones are counted, then each person's copy counts", () => {
    const requests = [
      aPaperRequest({ name: "Birth certificate", personId: null }),
      aPaperRequest({ name: "Nulla osta", personId: gerardo.id }),
      aPaperRequest({
        name: "Passport",
        personId: vicky.id,
        isMissing: false,
        documentId: 99,
      }),
    ];

    expect(missingPaperCount(requests, [], [vicky, gerardo], todayIso)).toBe(3);
  });
});
