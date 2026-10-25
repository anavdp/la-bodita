import { screen } from "@testing-library/react";

import { ApiError } from "../../api/client";
import { renderWithProviders } from "../../testing/renderWithProviders";
import type { Problem } from "./problems";
import { failedTo } from "./problems";
import { useProblemText } from "./useProblemText";

function Shows({ problem }: { problem: Problem }) {
  const problemText = useProblemText();
  return <p>{problemText(problem)}</p>;
}

describe("useProblemText", () => {
  it("given a plain message, when it is shown, then it is only translated", () => {
    renderWithProviders(<Shows problem="planning.nameRequired" />);

    expect(screen.getByText("Give it a name.", { exact: false })).toBeInTheDocument();
  });

  it("given a save that failed on the server, when it is shown, then it says what failed and the reference", () => {
    const error = new ApiError("Something went wrong", 500, { requestId: "1a2b3c4d" });

    renderWithProviders(<Shows problem={failedTo("errors.save", error)} />);

    expect(screen.getByText("We could not save that. Something went wrong on our side. Reference: 1a2b3c4d")).toBeInTheDocument();
  });

  it("given a crash with no reference, when it is shown, then it still says it was on our side", () => {
    renderWithProviders(<Shows problem={failedTo("errors.save", new ApiError("boom", 500))} />);

    expect(screen.getByText("We could not save that. Something went wrong on our side.")).toBeInTheDocument();
  });

  it("given a save made offline, when it is shown, then it says the changes are still there", () => {
    renderWithProviders(<Shows problem={failedTo("errors.save", new ApiError("offline", 0))} />);

    expect(screen.getByText(/You seem to be offline/)).toBeInTheDocument();
  });

  it("given a save the server refused, when it is shown, then it asks to check it", () => {
    renderWithProviders(<Shows problem={failedTo("errors.save", new ApiError("Item not found", 422))} />);

    expect(screen.getByText("We could not save that. The server did not accept it. Check it and try again.")).toBeInTheDocument();
  });

  it("given a session that ended, when it is shown, then it says to sign in again", () => {
    renderWithProviders(<Shows problem={failedTo("errors.save", new ApiError("Sign in", 401))} />);

    expect(screen.getByText(/Sign in again/)).toBeInTheDocument();
  });

  it("given something that is not an API error, when it is shown, then it reads as a fault on our side", () => {
    renderWithProviders(<Shows problem={failedTo("errors.save", new Error("undefined is not a function"))} />);

    expect(screen.getByText("We could not save that. Something went wrong on our side.")).toBeInTheDocument();
  });
});
