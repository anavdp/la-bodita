import { aCategory, aDocument, aPaperRequest, aPerson } from "../../testing/planningFactory";
import { formatPaperDate, itemsWaiting, paperRows, papersRunningOut, shelves } from "./papers";

const today = "2026-10-25";
const vicky = aPerson({ displayName: "Vicky" });
const gerardo = aPerson({ displayName: "Gerardo" });

describe("the papers table", () => {
  it("given a paper asked for one of us, when the table is built, then the other one was not asked", () => {
    const request = aPaperRequest({ name: "Nulla osta", personId: gerardo.id });

    const [row] = paperRows([request], [], [vicky, gerardo], today);

    expect(row.name).toBe("Nulla osta");
    expect(row.cells.map((cell) => cell.state)).toEqual(["notAsked", "missing"]);
    expect(row.cells[1].unanswered).toEqual([request]);
  });

  it("given a paper for both of us, when it is still missing, then it is missing for each", () => {
    const [row] = paperRows([aPaperRequest({ name: "Marriage banns form" })], [], [vicky, gerardo], today);

    expect(row.cells.map((cell) => cell.state)).toEqual(["missing", "missing"]);
  });

  it("given two items asking for the same paper, when the table is built, then it is one row asked by both", () => {
    const passport = aDocument({ title: "Passport", personId: vicky.id, expiresOn: "2031-04-02" });
    const requests = [
      aPaperRequest({ name: "Passport", personId: vicky.id, itemId: 4, itemName: "Registro civil", documentId: passport.id, isMissing: false }),
      aPaperRequest({ name: "passport ", personId: vicky.id, itemId: 5, itemName: "Consolato" }),
      aPaperRequest({ name: "Passport", personId: vicky.id, itemId: 5, itemName: "Consolato" }),
    ];

    const rows = paperRows(requests, [passport], [vicky], today);

    expect(rows).toHaveLength(1);
    expect(rows[0].askedBy.map((item) => item.itemName)).toEqual(["Registro civil", "Consolato"]);
    expect(rows[0].cells[0].state).toBe("have");
    expect(rows[0].cells[0].document).toBe(passport);
    expect(rows[0].cells[0].unanswered).toEqual([requests[1], requests[2]]);
  });

  it("given papers that expire, when the table is built, then soon and past ones say so", () => {
    const soon = aDocument({ expiresOn: "2026-12-01" });
    const past = aDocument({ expiresOn: "2026-10-01" });
    const requests = [
      aPaperRequest({ name: "Birth certificate", personId: vicky.id, documentId: soon.id, isMissing: false }),
      aPaperRequest({ name: "Birth certificate", personId: gerardo.id, documentId: past.id, isMissing: false }),
    ];

    const [row] = paperRows(requests, [soon, past], [vicky, gerardo], today);

    expect(row.cells.map((cell) => cell.state)).toEqual(["expiring", "expired"]);
  });

  it("given an answered request whose paper is out of sight, when the table is built, then it still counts as had", () => {
    const request = aPaperRequest({ personId: vicky.id, documentId: 999, isMissing: false });

    const [row] = paperRows([request], [], [vicky], today);

    expect(row.cells[0]).toMatchObject({ state: "have", document: null });
  });
});

describe("the alerts", () => {
  it("given missing papers on two items, when alerts are built, then each item lists what it waits on", () => {
    const requests = [
      aPaperRequest({ itemId: 4, itemName: "Iglesia San José", name: "Confirmation certificate", personId: vicky.id }),
      aPaperRequest({ itemId: 4, itemName: "Iglesia San José", name: "Baptism certificate", isMissing: false, documentId: 1 }),
      aPaperRequest({ itemId: 4, itemName: "Iglesia San José", name: "Marriage banns form" }),
      aPaperRequest({ itemId: 5, itemName: "Consolato", name: "Nulla osta", personId: gerardo.id }),
    ];

    const waiting = itemsWaiting(requests);

    expect(waiting.map((item) => [item.itemName, item.missing.map((request) => request.name)])).toEqual([
      ["Iglesia San José", ["Confirmation certificate", "Marriage banns form"]],
      ["Consolato", ["Nulla osta"]],
    ]);
  });

  it("given papers with expiry dates, when the ones running out are picked, then only papers due within three months come, soonest first", () => {
    const later = aDocument({ title: "Birth certificate", expiresOn: "2027-01-10" });
    const sooner = aDocument({ title: "Fe de vida", expiresOn: "2026-11-20" });
    const documents = [
      later,
      sooner,
      aDocument({ title: "Passport", expiresOn: "2031-04-02" }),
      aDocument({ title: "Fitting", kind: "photo", expiresOn: "2026-11-01" }),
      aDocument({ title: "Contract", expiresOn: null }),
    ];

    expect(papersRunningOut(documents, today)).toEqual([sooner, later]);
  });
});

describe("the shelves", () => {
  it("given files on items, on no category and on nothing, when shelved, then categories come first and ours last", () => {
    const dress = aCategory({ name: "Dress" });
    const church = aCategory({ name: "Church" });
    const fitting = aDocument({ kind: "photo", itemId: 7, itemName: "Atelier Valentina", categoryId: dress.id });
    const quote = aDocument({ itemId: 7, itemName: "Atelier Valentina", categoryId: dress.id });
    const tryOn = aDocument({ kind: "photo", itemId: 8, itemName: "Pronovias", categoryId: dress.id });
    const loose = aDocument({ itemId: 9, itemName: "Florist", categoryId: null });
    const ours = aDocument({ title: "Engagement photo", kind: "photo" });

    const result = shelves([fitting, quote, tryOn, loose, ours], [church, dress]);

    expect(result.map((shelf) => [shelf.key, shelf.count])).toEqual([
      [`category-${dress.id}`, 3],
      ["uncategorized", 1],
      ["ours", 1],
    ]);
    expect(result[0].category).toBe(dress);
    expect(result[0].items.map((item) => [item.itemName, item.documents.length])).toEqual([
      ["Atelier Valentina", 2],
      ["Pronovias", 1],
    ]);
  });
});

describe("the dates", () => {
  it("given an expiry date, when it is shown, then it keeps its year, in either language", () => {
    expect(formatPaperDate("2031-04-02", "en")).toBe("Apr 2, 2031");
    expect(formatPaperDate("2031-04-02T10:00:00", "es")).toBe("2 abr 2031");
  });
});
