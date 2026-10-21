import "@testing-library/jest-dom/vitest";

// jsdom has no matchMedia; the planner's theme asks it for the system's
// preference. Tests that care stub their own answer.
if (window.matchMedia === undefined) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

// A theme toggled in one test must not leak into the next.
afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});
