import { createBudgetLine, deleteBudgetLine, listBudgetLines, updateBudgetLine } from "./budget";

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const linePayload = {
  id: 4,
  title: "Photo + video, 8 hours",
  status: "considering",
  currency: "USD",
  estimated_amount: 1800,
  actual_amount: null,
  notes: "Includes the civil ceremony",
  item_id: 7,
  item_name: "Luz de Agua Foto",
  category_id: 2,
};

describe("the budget API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a wedding, when its budget lines are listed, then they come back in app terms", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse([linePayload]));
    vi.stubGlobal("fetch", fetchMock);

    const lines = await listBudgetLines(3);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/budget-lines");
    expect(lines).toEqual([
      {
        id: 4,
        title: "Photo + video, 8 hours",
        status: "considering",
        currency: "USD",
        estimatedAmount: 1800,
        actualAmount: null,
        notes: "Includes the civil ceremony",
        itemId: 7,
        itemName: "Luz de Agua Foto",
        categoryId: 2,
      },
    ]);
  });

  it("given a new quote, when it is created, then it is sent in API terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(linePayload, 201));
    vi.stubGlobal("fetch", fetchMock);

    await createBudgetLine(3, {
      title: "Photo + video, 8 hours",
      itemId: 7,
      currency: "USD",
      estimatedAmount: 1800,
      actualAmount: null,
      notes: null,
    });

    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      title: "Photo + video, 8 hours",
      item_id: 7,
      currency: "USD",
      estimated_amount: 1800,
      actual_amount: null,
      notes: null,
    });
  });

  it("given a status change, when a line is updated, then only the status is sent", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ ...linePayload, status: "paid" }));
    vi.stubGlobal("fetch", fetchMock);

    const line = await updateBudgetLine(3, 4, { status: "paid" });

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/budget-lines/4");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ status: "paid" });
    expect(line.status).toBe("paid");
  });

  it("given a line, when it is deleted, then the API is asked to delete it", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await deleteBudgetLine(3, 4);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/budget-lines/4");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});
