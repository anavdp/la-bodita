import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import type { Language } from "../../i18n/translations";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { EmojiPicker } from "./EmojiPicker";

function Picker({ initial = "", onChange = vi.fn() }: { initial?: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <EmojiPicker
      label="Emoji"
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

describe("EmojiPicker", () => {
  it("given no emoji, when an emoji is picked from the grid, then it becomes the value and the grid closes", async () => {
    const onChange = vi.fn();
    renderPicker({ onChange });

    expect(screen.getByRole("button", { name: "Emoji" })).toHaveTextContent("Pick one");
    await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
    await userEvent.click(screen.getByRole("button", { name: "Wedding cake" }));

    expect(onChange).toHaveBeenCalledWith("🎂");
    expect(screen.getByRole("button", { name: "Emoji" })).toHaveTextContent("🎂");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("given an emoji, when the grid opens, then that emoji is marked as picked", async () => {
    renderPicker({ initial: "⛪" });

    await userEvent.click(screen.getByRole("button", { name: "Emoji" }));

    expect(screen.getByRole("button", { name: "Church" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Wedding cake" })).toHaveAttribute("aria-pressed", "false");
  });

  it("given a search in Spanish, when it is typed without accents, then only matching emojis are listed", async () => {
    renderPicker({}, "es");

    await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
    await userEvent.type(screen.getByRole("searchbox"), "musica");

    expect(screen.getByRole("button", { name: "Música" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iglesia" })).not.toBeInTheDocument();
  });

  it("given a search in English, when it names a keyword, then emojis tagged with it are listed", async () => {
    renderPicker();

    await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
    await userEvent.type(screen.getByRole("searchbox"), "photo");

    expect(screen.getByRole("button", { name: "Camera" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Wedding cake" })).not.toBeInTheDocument();
  });

  it("given a search that matches nothing, when it is typed, then the grid says so", async () => {
    renderPicker();

    await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
    await userEvent.type(screen.getByRole("searchbox"), "zzz");

    expect(screen.getByText("Nothing matches.")).toBeInTheDocument();
  });

  it("given an emoji of their own, when it is pasted into the search, then it can be used as is", async () => {
    const onChange = vi.fn();
    renderPicker({ onChange });

    await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
    await userEvent.type(screen.getByRole("searchbox"), "🦩");
    await userEvent.click(screen.getByRole("button", { name: "Use 🦩" }));

    expect(onChange).toHaveBeenCalledWith("🦩");
  });

  it("given words in the search, when it is typed, then it is not offered as an emoji", async () => {
    renderPicker();

    await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
    await userEvent.type(screen.getByRole("searchbox"), "cake");

    expect(screen.queryByRole("button", { name: /^Use / })).not.toBeInTheDocument();
  });

  it("given an emoji, when no emoji is chosen, then the value is cleared", async () => {
    const onChange = vi.fn();
    renderPicker({ initial: "⛪", onChange });

    await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
    await userEvent.click(screen.getByRole("button", { name: "No emoji" }));

    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("button", { name: "Emoji" })).toHaveTextContent("Pick one");
  });

  it("given the grid open, when Escape is pressed, then it closes", async () => {
    renderPicker();

    await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
