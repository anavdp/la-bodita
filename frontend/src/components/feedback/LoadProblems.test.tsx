import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "../../api/client";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { LoadProblems } from "./LoadProblems";

const broken = (reference: string) =>
  new ApiError("Something went wrong on our side.", 500, { code: "internal_error", requestId: reference });
const offline = () => new ApiError("offline", 0);

describe("LoadProblems", () => {
  it("given nothing failed, when it renders, then it shows nothing", () => {
    const { container } = renderWithProviders(<LoadProblems failures={[]} onRetry={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("given one list failed on the server, when it renders, then it names the list and the reference", () => {
    renderWithProviders(
      <LoadProblems failures={[{ part: "errors.part.events", error: broken("1a2b3c4d") }]} onRetry={vi.fn()} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your events.");
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong on our side. Reference: 1a2b3c4d");
  });

  it("given several lists failed, when it renders, then it names them all in one sentence", () => {
    renderWithProviders(
      <LoadProblems
        failures={[
          { part: "errors.part.tasks", error: offline() },
          { part: "errors.part.events", error: offline() },
        ]}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your tasks and your events.");
    expect(screen.getByRole("alert")).toHaveTextContent("You seem to be offline.");
  });

  it("given a failure on the server among others, when it renders, then the reference is not lost", () => {
    renderWithProviders(
      <LoadProblems
        failures={[
          { part: "errors.part.tasks", error: new ApiError("Not found", 404) },
          { part: "errors.part.events", error: broken("cafe0001") },
        ]}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Reference: cafe0001");
  });

  it("given the server is down, when it renders, then it says to wait and try again", () => {
    renderWithProviders(
      <LoadProblems failures={[{ part: "errors.part.items", error: new ApiError("", 502) }]} onRetry={vi.fn()} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("isn't answering");
  });

  it("given a failure, when try again is pressed, then it asks to load again", async () => {
    const onRetry = vi.fn();
    renderWithProviders(<LoadProblems failures={[{ part: "errors.part.items", error: offline() }]} onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("given Spanish, when two lists failed, then the sentence is in Spanish", () => {
    renderWithProviders(
      <LoadProblems
        failures={[
          { part: "errors.part.tasks", error: offline() },
          { part: "errors.part.events", error: offline() },
        ]}
        onRetry={vi.fn()}
      />,
      { language: "es" },
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar tus tareas y tus eventos.");
  });
});
