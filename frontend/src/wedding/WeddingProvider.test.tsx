import { render, screen, waitFor } from "@testing-library/react";

import { useWedding, WeddingProvider } from "./WeddingProvider";

function Probe() {
  const { wedding, isLoading, error } = useWedding();
  if (isLoading) return <p>loading</p>;
  if (error) return <p>{error}</p>;
  return <p>{wedding?.name ?? "no wedding"}</p>;
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
});
