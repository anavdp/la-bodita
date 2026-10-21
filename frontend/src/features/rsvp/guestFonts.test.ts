import { addGuestFonts } from "./guestFonts";

const fontRules = () => [...document.head.querySelectorAll("style")].map((style) => style.textContent ?? "").join("");

describe("addGuestFonts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.innerHTML = "";
  });

  it("given no photo address is configured, when the guest fonts are added, then the signature script comes from the local copy", () => {
    vi.stubEnv("VITE_PHOTOS_URL", "");

    addGuestFonts();

    expect(fontRules()).toContain('font-family: "Brigovin"');
    expect(fontRules()).toContain('url("/fonts/Brigovin.woff2")');
    // The page shows the fallback script while the font loads, rather than blank text.
    expect(fontRules()).toContain("font-display: swap");
  });

  it("given a photo address is configured, when the guest fonts are added, then the signature script comes from the bucket", () => {
    vi.stubEnv("VITE_PHOTOS_URL", "https://storage.googleapis.com/gerardoyvicky-rsvp-photos");

    addGuestFonts();

    expect(fontRules()).toContain('url("https://storage.googleapis.com/gerardoyvicky-rsvp-photos/fonts/Brigovin.woff2")');
  });

  it("given the guest fonts are already added, when they are added again, then the rule is not repeated", () => {
    addGuestFonts();
    addGuestFonts();

    expect(document.head.querySelectorAll("style")).toHaveLength(1);
  });
});
