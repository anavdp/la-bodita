import html from "../index.html?raw";
import css from "./index.css?raw";
import manifestText from "../public/manifest.webmanifest?raw";

/**
 * On an iPhone the planner is opened from the Home Screen as a web app. There
 * it showed a plain grey "L" and, because the Google-hosted icon font never
 * arrived, raw icon names ("menu", "dark_mode") instead of icons.
 */
const page = new DOMParser().parseFromString(html, "text/html");
const publicFiles = Object.keys(import.meta.glob("../public/*.{png,svg}"));
const fontFiles = Object.keys(import.meta.glob("./assets/fonts/*.woff2"));

describe("the planner on a phone's Home Screen", () => {
  it("given the static page, when it loads, then the icon font comes from the app, not from Google", () => {
    expect(page.querySelector('link[href*="Material+Symbols"]')).toBeNull();
    expect(css).toMatch(/@font-face\s*{[^}]*font-family:\s*"Material Symbols Outlined"/);
    expect(css).toContain('url("./assets/fonts/material-symbols-outlined.woff2")');
    expect(fontFiles).toContain("./assets/fonts/material-symbols-outlined.woff2");
  });

  it("given the icon font is still loading, when an icon renders, then its name never spills out as text", () => {
    // Hidden until the font arrives, and never wider than one icon.
    expect(css).toMatch(/@font-face\s*{[^}]*font-display:\s*block/);
    expect(css).toMatch(/\.material-symbols-outlined\s*{[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/\.material-symbols-outlined\s*{[^}]*width:\s*1em/);
  });

  it("given the page is added to the Home Screen, when iOS picks an icon, then it finds the wedding ring", () => {
    expect(page.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href")).toBe("/apple-touch-icon.png");
    expect(page.querySelector('link[rel="icon"]')?.getAttribute("href")).toBe("/favicon.png");
    expect(page.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute("content")).toBe("La Bodita");
    expect(publicFiles).toEqual(expect.arrayContaining(["../public/apple-touch-icon.png", "../public/favicon.png"]));
  });

  it("given the web app manifest, when a phone installs the planner, then it gets the name, icons and its own window", () => {
    expect(page.querySelector('link[rel="manifest"]')?.getAttribute("href")).toBe("/manifest.webmanifest");
    const manifest = JSON.parse(manifestText);

    expect(manifest.name).toBe("La Bodita");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icon of manifest.icons) expect(publicFiles).toContain(`../public${icon.src}`);
  });
});
