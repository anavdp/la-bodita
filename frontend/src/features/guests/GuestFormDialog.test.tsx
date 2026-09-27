import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { aGuest } from "../../testing/guestFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { GuestFormDialog } from "./GuestFormDialog";

describe("GuestFormDialog", () => {
  it("given no guest, when the dialog opens, then it is an empty create form", () => {
    renderWithProviders(<GuestFormDialog guest={null} onSave={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Add Guest" })).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("");
    expect(screen.getByLabelText("RSVP status")).toHaveValue("pending");
    expect(screen.getByLabelText("Relationship")).toHaveValue("");
    expect(screen.getByLabelText("Side")).toHaveValue("");
  });

  it("given only a name, when a new guest is saved, then relationship and side are left empty", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<GuestFormDialog guest={null} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("First name"), "Maria");
    await userEvent.type(screen.getByLabelText("Last name"), "Rossi");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ relationshipType: null, side: null }),
    );
  });

  it("given a guest with a side, when it is set back to not specified, then the side is cleared", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <GuestFormDialog guest={aGuest({ side: "italy" })} onSave={onSave} onClose={vi.fn()} />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Side"), "");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ side: null }));
  });

  it("given an existing guest, when the dialog opens, then it is filled in for editing", () => {
    renderWithProviders(
      <GuestFormDialog
        guest={aGuest({
          firstName: "Lucia",
          lastName: "Mendoza",
          isChild: true,
          gender: "female",
          relationshipType: "friends",
          side: "venezuela",
          rsvpStatus: "declined",
          phone: "+58 412 555 0134",
          email: "lucia@example.com",
        })}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Edit Guest" })).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("Lucia");
    expect(screen.getByLabelText("Last name")).toHaveValue("Mendoza");
    expect(screen.getByLabelText("This guest is a child")).toBeChecked();
    expect(screen.getByLabelText("Gender")).toHaveValue("female");
    expect(screen.getByLabelText("Relationship")).toHaveValue("friends");
    expect(screen.getByLabelText("Side")).toHaveValue("venezuela");
    expect(screen.getByLabelText("RSVP status")).toHaveValue("declined");
    expect(screen.getByLabelText("Phone")).toHaveValue("+58 412 555 0134");
    expect(screen.getByLabelText("Email")).toHaveValue("lucia@example.com");
  });

  it("given a filled form, when it is saved, then the draft is handed to the caller", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<GuestFormDialog guest={null} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("First name"), "Alejandro");
    await userEvent.type(screen.getByLabelText("Last name"), "Garcia");
    await userEvent.selectOptions(screen.getByLabelText("Side"), "spain");
    await userEvent.selectOptions(screen.getByLabelText("Relationship"), "other");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({
      firstName: "Alejandro",
      lastName: "Garcia",
      isChild: false,
      gender: null,
      relationshipType: "other",
      side: "spain",
      rsvpStatus: "pending",
      phone: null,
      email: null,
    });
  });

  it("given a missing name, when the form is saved, then it says what is required", async () => {
    const onSave = vi.fn();
    renderWithProviders(<GuestFormDialog guest={null} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("First and last name are required.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("given a save that fails, when the API rejects it, then the dialog stays open and explains", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Guest not found"));
    renderWithProviders(<GuestFormDialog guest={aGuest()} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Guest not found")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("given an open dialog, when it is cancelled, then it closes without saving", async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    renderWithProviders(<GuestFormDialog guest={null} onSave={onSave} onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("given an open dialog, when escape is pressed, then it closes", async () => {
    const onClose = vi.fn();
    renderWithProviders(<GuestFormDialog guest={null} onSave={vi.fn()} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});
