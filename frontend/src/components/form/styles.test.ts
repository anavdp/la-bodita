import { popoverPlacement, shouldOpenUp } from "./styles";

const fieldAt = (top: number, bottom: number) =>
  ({ getBoundingClientRect: () => ({ top, bottom }) }) as unknown as HTMLElement;

describe("popover placement", () => {
  beforeEach(() => {
    vi.stubGlobal("innerHeight", 900);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given room below the field, when a popover opens, then it opens downwards", () => {
    expect(shouldOpenUp(fieldAt(100, 148), 380)).toBe(false);
    expect(popoverPlacement(false)).toContain("top-full");
  });

  it("given a field near the bottom with room above, when a popover opens, then it opens upwards", () => {
    expect(shouldOpenUp(fieldAt(780, 828), 380)).toBe(true);
    expect(popoverPlacement(true)).toContain("bottom-full");
  });

  it("given no room above either, or no field yet, when a popover opens, then it stays below", () => {
    expect(shouldOpenUp(fieldAt(200, 700), 380)).toBe(false);
    expect(shouldOpenUp(null, 380)).toBe(false);
  });
});
