import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { SearchableSelect } from "./SearchableSelect";

const categories = [
  { value: "", label: "No category" },
  { value: "1", label: "⛪ Church" },
  { value: "2", label: "📸 Photographer" },
  { value: "3", label: "👗 Dress" },
];

function Picker({ onChange = vi.fn() }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("1");
  return (
    <SearchableSelect
      label="Category"
      value={value}
      options={categories}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("SearchableSelect", () => {
  it("given a value, when it shows, then the picked option's label is on the field", () => {
    renderWithProviders(<Picker />);

    expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent("⛪ Church");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("given the field, when it is opened, then every option is listed with the current one selected", async () => {
    renderWithProviders(<Picker />);

    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(
      categories.map((option) => option.label),
    );
    expect(screen.getByRole("option", { name: "⛪ Church" })).toHaveAttribute("aria-selected", "true");
  });

  it("given a search, when letters are typed, then only matching options stay, ignoring accents and case", async () => {
    renderWithProviders(<Picker />);
    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));

    await userEvent.type(screen.getByRole("searchbox"), "fotó");

    expect(screen.queryAllByRole("option")).toEqual([]);
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "PHOTO");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["📸 Photographer"]);
  });

  it("given nothing matches, when searching, then it says so", async () => {
    renderWithProviders(<Picker />);
    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));

    await userEvent.type(screen.getByRole("searchbox"), "zzz");

    expect(screen.getByText("Nothing matches.")).toBeInTheDocument();
  });

  it("given the list, when an option is clicked, then it is picked and the list closes", async () => {
    const onChange = vi.fn();
    renderWithProviders(<Picker onChange={onChange} />);

    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));
    await userEvent.click(screen.getByRole("option", { name: "👗 Dress" }));

    expect(onChange).toHaveBeenCalledWith("3");
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent("👗 Dress");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("given a search, when Enter is pressed, then the first match is picked", async () => {
    const onChange = vi.fn();
    renderWithProviders(<Picker onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));

    await userEvent.type(screen.getByRole("searchbox"), "dre{Enter}");

    expect(onChange).toHaveBeenCalledWith("3");
  });

  it("given the arrow keys, when moving down and pressing Enter, then the highlighted option is picked", async () => {
    const onChange = vi.fn();
    renderWithProviders(<Picker onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));

    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("3");
  });

  it("given the open list, when Escape is pressed or the page is clicked, then it closes without a change", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <div>
        <Picker onChange={onChange} />
        <p>Elsewhere</p>
      </div>,
    );

    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));
    await userEvent.click(screen.getByText("Elsewhere"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
