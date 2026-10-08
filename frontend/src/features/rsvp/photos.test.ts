import { photoUrl } from "./photos";

describe("photoUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("given no photo address is configured, when a photo is looked up, then the bundled placeholder is used", () => {
    vi.stubEnv("VITE_PHOTOS_URL", "");

    expect(photoUrl("rsvp-banner.jpg")).toBe("/rsvp-banner.jpg");
  });

  it("given a photo address is configured, when a photo is looked up, then it comes from there", () => {
    vi.stubEnv("VITE_PHOTOS_URL", "https://storage.googleapis.com/gerardoyvicky-rsvp-photos");

    expect(photoUrl("rsvp-banner.jpg")).toBe(
      "https://storage.googleapis.com/gerardoyvicky-rsvp-photos/rsvp-banner.jpg",
    );
  });

  it("given the photo address ends in a slash, when a photo is looked up, then the path has no double slash", () => {
    vi.stubEnv("VITE_PHOTOS_URL", "https://photos.example/");

    expect(photoUrl("rsvp-banner.jpg")).toBe("https://photos.example/rsvp-banner.jpg");
  });
});
