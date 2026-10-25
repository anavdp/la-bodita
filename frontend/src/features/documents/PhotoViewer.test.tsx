import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { aDocument } from "../../testing/planningFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { PhotoViewer } from "./PhotoViewer";

const first = aDocument({ title: "Fitting 1", kind: "photo", contentType: "image/jpeg", itemName: "Atelier Valentina" });
const second = aDocument({ title: "Fitting 2", kind: "photo", contentType: "image/jpeg" });
const third = aDocument({ title: "Fitting 3", kind: "photo", contentType: "image/jpeg" });
const photos = [first, second, third];

const shown = () => screen.getByRole("img", { name: /^Fitting \d$/ });

describe("PhotoViewer", () => {
  it("given photos, when one is opened, then it shows large with where it sits among the rest", () => {
    renderWithProviders(<PhotoViewer weddingId={1} photos={photos} startId={second.id} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Photos" })).toBeInTheDocument();
    expect(shown()).toHaveAttribute("alt", "Fitting 2");
    expect(shown()).toHaveAttribute("src", `http://localhost:8000/api/weddings/1/documents/${second.id}/file`);
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open original" })).toHaveAttribute("target", "_blank");
  });

  it("given the viewer, when the arrows are used, then it moves through the photos and stops at the ends", async () => {
    renderWithProviders(<PhotoViewer weddingId={1} photos={photos} startId={first.id} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Previous photo" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(shown()).toHaveAttribute("alt", "Fitting 2");
    await userEvent.keyboard("{ArrowRight}");
    expect(shown()).toHaveAttribute("alt", "Fitting 3");
    expect(screen.getByRole("button", { name: "Next photo" })).toBeDisabled();
    await userEvent.keyboard("{ArrowLeft}");
    expect(shown()).toHaveAttribute("alt", "Fitting 2");
  });

  it("given the viewer on a phone, when the photo is swiped, then it moves to the next or previous one", () => {
    renderWithProviders(<PhotoViewer weddingId={1} photos={photos} startId={second.id} onClose={vi.fn()} />);
    const stage = screen.getByTestId("photo-stage");

    fireEvent.touchStart(stage, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 100 }] });
    expect(shown()).toHaveAttribute("alt", "Fitting 3");

    fireEvent.touchStart(stage, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 120 }] });
    expect(shown()).toHaveAttribute("alt", "Fitting 3");

    fireEvent.touchStart(stage, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 300 }] });
    expect(shown()).toHaveAttribute("alt", "Fitting 2");
  });

  it("given the thumbnails, when one is picked, then that photo shows", async () => {
    renderWithProviders(<PhotoViewer weddingId={1} photos={photos} startId={first.id} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Show Fitting 3" }));

    expect(shown()).toHaveAttribute("alt", "Fitting 3");
    expect(screen.getByRole("button", { name: "Show Fitting 3" })).toHaveAttribute("aria-current", "true");
  });

  it("given the viewer, when Escape or Close is pressed, then it closes", async () => {
    const onClose = vi.fn();
    renderWithProviders(<PhotoViewer weddingId={1} photos={photos} startId={first.id} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("given a photo, when Edit is pressed, then the page is asked to edit that one", async () => {
    const onEdit = vi.fn();
    renderWithProviders(
      <PhotoViewer weddingId={1} photos={photos} startId={third.id} onClose={vi.fn()} onEdit={onEdit} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Edit Fitting 3" }));

    expect(onEdit).toHaveBeenCalledWith(third);
  });

  it("given a photo the browser can't show, when it fails, then it says so and keeps the link to the original", () => {
    renderWithProviders(<PhotoViewer weddingId={1} photos={[first]} startId={first.id} onClose={vi.fn()} />);

    fireEvent.error(shown());

    expect(screen.getByText("This photo can't be shown here.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open original" })).toBeInTheDocument();
  });
});
