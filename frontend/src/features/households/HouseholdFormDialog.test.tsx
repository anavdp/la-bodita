import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { aGuest } from "../../testing/guestFactory";
import { aHousehold } from "../../testing/householdFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { HouseholdFormDialog } from "./HouseholdFormDialog";

const maria = aGuest({ firstName: "Maria", lastName: "Rossi", householdId: 10 });
const paolo = aGuest({ firstName: "Paolo", lastName: "Rossi", householdId: 11 });
const carlos = aGuest({ firstName: "Carlos", lastName: "Mendoza", householdId: 20 });
const lucia = aGuest({ firstName: "Lucia", lastName: "Mendoza", householdId: 20 });
const households = [
  aHousehold({ id: 10, name: "Maria Rossi", guestIds: [maria.id] }),
  aHousehold({ id: 11, name: "Paolo Rossi", guestIds: [paolo.id] }),
  aHousehold({ id: 20, name: "Mendoza", guestIds: [carlos.id, lucia.id] }),
];
const guests = [carlos, lucia, maria, paolo];

describe("HouseholdFormDialog", () => {
  it("given no household, when guests are picked, then the new household is saved with all of them at once", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <HouseholdFormDialog household={null} guests={guests} households={households} onSave={onSave} onClose={vi.fn()} />,
    );

    expect(screen.getByRole("dialog", { name: "Add Household" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Household name"), "Famiglia Rossi");
    await userEvent.click(screen.getByRole("checkbox", { name: /Maria Rossi/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Paolo Rossi/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ name: "Famiglia Rossi", guestIds: [maria.id, paolo.id] });
  });

  it("given a guest in another household, when the list shows, then it says where they are now", () => {
    renderWithProviders(
      <HouseholdFormDialog household={null} guests={guests} households={households} onSave={vi.fn()} onClose={vi.fn()} />,
    );

    const option = screen.getByRole("checkbox", { name: /Carlos Mendoza/ }).closest("label") as HTMLElement;
    expect(within(option).getByText("Now in Mendoza")).toBeInTheDocument();
  });

  it("given a guest on their own, when the list shows, then it does not repeat their name as a household", () => {
    renderWithProviders(
      <HouseholdFormDialog household={null} guests={guests} households={households} onSave={vi.fn()} onClose={vi.fn()} />,
    );

    const option = screen.getByRole("checkbox", { name: /Maria Rossi/ }).closest("label") as HTMLElement;
    expect(within(option).queryByText(/Now in/)).not.toBeInTheDocument();
  });

  it("given an existing household, when it opens, then its name and members are filled in", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <HouseholdFormDialog
        household={households[2]}
        guests={guests}
        households={households}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Edit Household" })).toBeInTheDocument();
    expect(screen.getByLabelText("Household name")).toHaveValue("Mendoza");
    expect(screen.getByRole("checkbox", { name: /Carlos Mendoza/ })).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: /Lucia Mendoza/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ name: "Mendoza", guestIds: [carlos.id] });
  });

  it("given a search, when guests are listed, then only matching names are offered", async () => {
    renderWithProviders(
      <HouseholdFormDialog household={null} guests={guests} households={households} onSave={vi.fn()} onClose={vi.fn()} />,
    );

    await userEvent.type(screen.getByLabelText("Search guests"), "ross");

    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("given no name or no guests, when it is saved, then it asks for what is missing", async () => {
    const onSave = vi.fn();
    renderWithProviders(
      <HouseholdFormDialog household={null} guests={guests} households={households} onSave={onSave} onClose={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Give the household a name.");

    await userEvent.type(screen.getByLabelText("Household name"), "Rossi");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Pick at least one guest.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("given a save that fails, when it is tried, then the dialog stays open and says so", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("boom"));
    renderWithProviders(
      <HouseholdFormDialog household={households[2]} guests={guests} households={households} onSave={onSave} onClose={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save this household.");
  });

  it("given the dialog, when it is cancelled or escaped, then it closes", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <HouseholdFormDialog household={null} guests={guests} households={households} onSave={vi.fn()} onClose={onClose} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
