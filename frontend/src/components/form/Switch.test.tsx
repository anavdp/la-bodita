import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Switch } from "./Switch";

describe("Switch", () => {
  it("given an off switch, when it is pressed, then it asks to be turned on", async () => {
    const onChange = vi.fn();
    render(<Switch label="Count the choir" checked={false} onChange={onChange} />);

    await userEvent.click(screen.getByRole("switch", { name: "Count the choir" }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("given a disabled switch, when it is pressed, then nothing changes", async () => {
    const onChange = vi.fn();
    render(<Switch label="Count the choir" checked disabled onChange={onChange} />);

    const toggle = screen.getByRole("switch", { name: "Count the choir" });
    await userEvent.click(toggle);

    expect(toggle).toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });
});
