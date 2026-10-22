import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { DatePicker } from "./DatePicker";

function Picker({ initial, onChange = vi.fn() }: { initial: string | null; onChange?: (value: string | null) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <DatePicker
      label="Date"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("DatePicker", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 22, 9, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("given no date, when it shows, then it invites picking one", () => {
    renderWithProviders(<Picker initial={null} />);

    expect(screen.getByRole("button", { name: "Date" })).toHaveTextContent("Pick a date");
  });

  it("given the field, when it shows, then the calendar illustration marks it", () => {
    renderWithProviders(<Picker initial={null} />);

    const mark = screen.getByRole("button", { name: "Date" }).querySelector("img");
    expect(mark).toHaveAttribute("src", "/icons/title-calendar.png");
  });

  it("given a date, when it shows, then it reads as a short date", () => {
    renderWithProviders(<Picker initial="2026-12-22" />);

    expect(screen.getByRole("button", { name: "Date" })).toHaveTextContent("Tue, Dec 22");
  });

  it("given no date, when it opens, then this month shows with today marked", async () => {
    renderWithProviders(<Picker initial={null} />);

    await userEvent.click(screen.getByRole("button", { name: "Date" }));

    const calendar = screen.getByRole("dialog", { name: "Choose a date" });
    expect(within(calendar).getByText("October 2026")).toBeInTheDocument();
    expect(within(calendar).getByRole("button", { name: "Thursday, October 22, 2026" })).toHaveAttribute(
      "aria-current",
      "date",
    );
  });

  it("given a later month, when a day is picked, then that ISO date is chosen and the calendar closes", async () => {
    const onChange = vi.fn();
    renderWithProviders(<Picker initial={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Date" }));

    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await userEvent.click(screen.getByRole("button", { name: "Monday, November 2, 2026" }));

    expect(onChange).toHaveBeenCalledWith("2026-11-02");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Date" })).toHaveTextContent("Mon, Nov 2");
  });

  it("given a date, when it opens, then its month shows with the day selected, and an earlier month is a click away", async () => {
    renderWithProviders(<Picker initial="2026-12-22" />);

    await userEvent.click(screen.getByRole("button", { name: "Date" }));

    expect(screen.getByRole("button", { name: "Tuesday, December 22, 2026" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("November 2026")).toBeInTheDocument();
  });

  it("given a date, when it is cleared, then no date is chosen", async () => {
    const onChange = vi.fn();
    renderWithProviders(<Picker initial="2026-12-22" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Date" }));

    await userEvent.click(screen.getByRole("button", { name: "No date" }));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByRole("button", { name: "Date" })).toHaveTextContent("Pick a date");
  });

  it("given the open calendar, when Escape is pressed or the page is clicked, then it closes", async () => {
    renderWithProviders(
      <div>
        <Picker initial={null} />
        <p>Elsewhere</p>
      </div>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Date" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Date" }));
    await userEvent.click(screen.getByText("Elsewhere"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("given Spanish, when it opens, then the date, month and weekdays are in Spanish", async () => {
    renderWithProviders(<Picker initial="2026-12-22" />, { language: "es" });

    expect(screen.getByRole("button", { name: "Date" })).toHaveTextContent("mar, 22 dic");
    await userEvent.click(screen.getByRole("button", { name: "Date" }));
    expect(screen.getByText("diciembre de 2026")).toBeInTheDocument();
    expect(screen.getByText("lu")).toBeInTheDocument();
  });
});
