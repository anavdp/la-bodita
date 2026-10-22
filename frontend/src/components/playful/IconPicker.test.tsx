import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import type { Language } from "../../i18n/translations";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { CategoryIcon, IconPicker } from "./IconPicker";

function Picker({ initial = "", onChange = vi.fn() }: { initial?: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <IconPicker
      label="Icon"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

const renderPicker = (props: Parameters<typeof Picker>[0] = {}, language: Language = "en") =>
  renderWithProviders(<Picker {...props} />, { language });

describe("IconPicker", () => {
  it("given no icon, when one is picked from the grid, then its name becomes the value and the grid closes", async () => {
    const onChange = vi.fn();
    renderPicker({ onChange });

    expect(screen.getByRole("button", { name: "Icon" })).toHaveTextContent("Pick one");
    await userEvent.click(screen.getByRole("button", { name: "Icon" }));
    await userEvent.click(screen.getByRole("button", { name: "Cake" }));

    expect(onChange).toHaveBeenCalledWith("cake");
    expect(screen.getByRole("button", { name: "Icon" }).querySelector("img")).toHaveAttribute("src", "/icons/cake.png");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("given an icon, when the grid opens, then that icon is marked as picked", async () => {
    renderPicker({ initial: "church" });

    await userEvent.click(screen.getByRole("button", { name: "Icon" }));

    expect(screen.getByRole("button", { name: "Church" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Cake" })).toHaveAttribute("aria-pressed", "false");
  });

  it("given Spanish, when a word is searched, then only the matching icons stay", async () => {
    renderPicker({}, "es");

    await userEvent.click(screen.getByRole("button", { name: "Icon" }));
    await userEvent.type(screen.getByRole("searchbox"), "pastel");

    expect(screen.getByRole("button", { name: "Pastel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iglesia" })).not.toBeInTheDocument();
  });

  it("given a search with no match, when it is typed, then the picker says so", async () => {
    renderPicker();

    await userEvent.click(screen.getByRole("button", { name: "Icon" }));
    await userEvent.type(screen.getByRole("searchbox"), "zzz");

    expect(screen.getByText("Nothing matches.")).toBeInTheDocument();
  });

  it("given an icon, when it is cleared, then the value is empty", async () => {
    const onChange = vi.fn();
    renderPicker({ initial: "cake", onChange });

    await userEvent.click(screen.getByRole("button", { name: "Icon" }));
    await userEvent.click(screen.getByRole("button", { name: "No icon" }));

    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("CategoryIcon", () => {
  it("given an icon name, when it is drawn, then it is that icon's image", () => {
    const { container } = renderWithProviders(<CategoryIcon value="venue" />);

    expect(container.querySelector("img")).toHaveAttribute("src", "/icons/venue.png");
  });

  it("given an emoji from before the icons, when it is drawn, then nothing is drawn: the label carries it", () => {
    const { container } = renderWithProviders(<CategoryIcon value="📸" />);

    expect(container).toBeEmptyDOMElement();
  });
});
