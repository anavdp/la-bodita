import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { aHousehold } from "../../testing/householdFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { HouseholdDeleteDialog } from "./HouseholdDeleteDialog";

const rossi = aHousehold({ name: "Famiglia Rossi", guestIds: [1, 2] });

describe("HouseholdDeleteDialog", () => {
  it("given a household, when deleting it, then it asks what happens to its guests", () => {
    renderWithProviders(<HouseholdDeleteDialog household={rossi} onConfirm={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Delete Famiglia Rossi?" })).toBeInTheDocument();
    expect(screen.getByText("What should happen to its 2 guests?")).toBeInTheDocument();
  });

  it("given a household of one, when deleting it, then the question is about its one guest", () => {
    renderWithProviders(
      <HouseholdDeleteDialog household={aHousehold({ guestIds: [1] })} onConfirm={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByText("What should happen to its guest?")).toBeInTheDocument();
  });

  it("given the question, when the guests are deleted too, then that is what is confirmed", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<HouseholdDeleteDialog household={rossi} onConfirm={onConfirm} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete the guests too" }));

    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it("given the question, when the guests are kept, then they are kept", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<HouseholdDeleteDialog household={rossi} onConfirm={onConfirm} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Keep the guests, each on their own" }));

    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it("given a delete that fails, when it is confirmed, then the dialog says so", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("boom"));
    renderWithProviders(<HouseholdDeleteDialog household={rossi} onConfirm={onConfirm} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete the guests too" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not delete this household.");
  });

  it("given second thoughts, when it is cancelled or escaped, then nothing is deleted", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<HouseholdDeleteDialog household={rossi} onConfirm={onConfirm} onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
