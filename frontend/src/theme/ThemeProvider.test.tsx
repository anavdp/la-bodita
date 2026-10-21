import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider, themeStorageKey, useTheme } from "./ThemeProvider";

type Listener = (event: { matches: boolean }) => void;

/** jsdom has no matchMedia: a stand-in whose answer the test can change. */
function stubSystemTheme(prefersDark: boolean) {
  const listeners: Listener[] = [];
  const query = {
    matches: prefersDark,
    addEventListener: (_type: string, listener: Listener) => listeners.push(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.splice(listeners.indexOf(listener), 1),
  };
  window.matchMedia = vi.fn().mockReturnValue(query) as unknown as typeof window.matchMedia;
  return {
    change(nextPrefersDark: boolean) {
      query.matches = nextPrefersDark;
      act(() => listeners.forEach((listener) => listener({ matches: nextPrefersDark })));
    },
  };
}

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
}

const isDark = () => document.documentElement.classList.contains("dark");

describe("ThemeProvider", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("given no saved choice and a dark system, when the planner opens, then it is dark", () => {
    stubSystemTheme(true);

    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    expect(screen.getByRole("button")).toHaveTextContent("dark");
    expect(isDark()).toBe(true);
  });

  it("given no saved choice and a light system, when the planner opens, then it is light", () => {
    stubSystemTheme(false);

    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    expect(screen.getByRole("button")).toHaveTextContent("light");
    expect(isDark()).toBe(false);
  });

  it("given no saved choice, when the system switches to dark, then the planner follows it", () => {
    const system = stubSystemTheme(false);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    system.change(true);

    expect(isDark()).toBe(true);
  });

  it("given the toggle, when it is pressed, then the theme flips and the choice is remembered", async () => {
    stubSystemTheme(false);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    await userEvent.click(screen.getByRole("button"));

    expect(isDark()).toBe(true);
    expect(localStorage.getItem(themeStorageKey)).toBe("dark");
  });

  it("given a saved choice, when the system says otherwise, then the saved choice wins", () => {
    localStorage.setItem(themeStorageKey, "light");
    const system = stubSystemTheme(true);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    system.change(true);

    expect(isDark()).toBe(false);
  });

  it("given a dark planner, when it is left for a guest page, then the page is light again", () => {
    stubSystemTheme(true);
    const { unmount } = render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    unmount();

    expect(isDark()).toBe(false);
  });

  it("given storage the browser refuses, when the theme is toggled, then it still flips", async () => {
    stubSystemTheme(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    await userEvent.click(screen.getByRole("button"));

    expect(isDark()).toBe(true);
    vi.restoreAllMocks();
  });
});
