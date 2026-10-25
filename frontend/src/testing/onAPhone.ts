/** Answers media queries as a phone-width screen would; restore with vi.restoreAllMocks. */
export const onAPhone = () =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: query.includes("max-width"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
