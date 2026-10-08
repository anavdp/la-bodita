import html from "../index.html?raw";

/**
 * WhatsApp's link preview reads the raw HTML without running any JavaScript, so
 * the Open Graph tags have to be in index.html itself, not added by React.
 */
const page = new DOMParser().parseFromString(html, "text/html");

const meta = (attribute: "property" | "name", key: string) =>
  page.querySelector(`meta[${attribute}="${key}"]`)?.getAttribute("content");

describe("the shared link preview", () => {
  it("given the static page, when a crawler reads it, then it finds a title, description and type", () => {
    expect(meta("property", "og:title")).toBeTruthy();
    expect(meta("property", "og:description")).toBeTruthy();
    expect(meta("property", "og:type")).toBe("website");
    expect(meta("name", "twitter:card")).toBe("summary_large_image");
  });

  it("given the static page, when a crawler reads the image, then it points at a file the app serves", () => {
    const image = meta("property", "og:image") ?? "";

    expect(image).toMatch(/invitation-preview\.jpg$/);
    expect(Object.keys(import.meta.glob("../public/invitation-preview.jpg"))).toHaveLength(1);
    expect(meta("name", "twitter:image")).toBe(image);
  });

  it("given the static page, when it is built, then the image address is filled in with the photo address", () => {
    // Crawlers ignore relative image paths; Vite replaces %VITE_PHOTOS_URL% at build time.
    expect(meta("property", "og:image")).toBe("%VITE_PHOTOS_URL%/invitation-preview.jpg");
  });
});
