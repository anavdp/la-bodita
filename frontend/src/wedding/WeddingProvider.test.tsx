import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useWedding, WeddingProvider } from "./WeddingProvider";

function Probe() {
  const { wedding, isLoading, error } = useWedding();
  if (isLoading) return <p>loading</p>;
  if (error) return <p>{error}</p>;
  return <p>{wedding?.name ?? "no wedding"}</p>;
}

function Renamer() {
  const { saveWedding } = useWedding();
  return (
    <button type="button" onClick={() => void saveWedding({ name: "Vicky & Vitale", wedding_date: "2027-05-15" })}>
      rename
    </button>
  );
}

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

describe("WeddingProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given the app starts, when the wedding loads, then it is shared with the screens", async () => {
    vi.stubGlobal("fetch", () => jsonResponse([{ id: 1, name: "La Bodita", wedding_date: null }]));

    render(
      <WeddingProvider>
        <Probe />
      </WeddingProvider>,
    );

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("La Bodita")).toBeInTheDocument();
  });

  it("given a database with no wedding yet, when it loads, then there is simply none", async () => {
    vi.stubGlobal("fetch", () => jsonResponse([]));

    render(
      <WeddingProvider>
        <Probe />
      </WeddingProvider>,
    );

    expect(await screen.findByText("no wedding")).toBeInTheDocument();
  });

  it("given the API is unreachable, when the wedding is loaded, then the failure is reported", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("connection refused")));

    render(
      <WeddingProvider>
        <Probe />
      </WeddingProvider>,
    );

    await waitFor(() => expect(screen.getByText("connection refused")).toBeInTheDocument());
  });

  it("given a loaded wedding, when settings save it, then the change is sent and every screen sees it", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      init?.method === "PATCH"
        ? jsonResponse({ id: 1, name: "Vicky & Vitale", wedding_date: "2027-05-15" })
        : jsonResponse([{ id: 1, name: "La Bodita", wedding_date: null }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <WeddingProvider>
        <Probe />
        <Renamer />
      </WeddingProvider>,
    );
    await screen.findByText("La Bodita");
    await userEvent.click(screen.getByRole("button", { name: "rename" }));

    expect(await screen.findByText("Vicky & Vitale")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("http://localhost:8000/api/weddings/1");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ name: "Vicky & Vitale", wedding_date: "2027-05-15" });
  });

  it("given no wedding, when settings try to save, then it refuses", async () => {
    vi.stubGlobal("fetch", () => jsonResponse([]));
    let save: ReturnType<typeof useWedding>["saveWedding"] = () => Promise.resolve();
    function Grab() {
      save = useWedding().saveWedding;
      return null;
    }

    render(
      <WeddingProvider>
        <Probe />
        <Grab />
      </WeddingProvider>,
    );
    await screen.findByText("no wedding");

    await expect(save({ name: "Otra" })).rejects.toThrow();
  });
});
