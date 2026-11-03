import { anItem } from "../../testing/planningFactory";
import { contactLinks, whatsappLink } from "./contactLinks";

describe("whatsappLink", () => {
  it("given a number with its country code, when linked, then it opens that chat and keeps the number as typed", () => {
    expect(whatsappLink("+58 212 555 0142")).toEqual({
      label: "+58 212 555 0142",
      href: "https://wa.me/582125550142",
    });
  });

  it("given a number starting with 00, when linked, then the 00 is read as the international prefix", () => {
    expect(whatsappLink("0039 333 123 4567")?.href).toBe("https://wa.me/393331234567");
  });

  it("given a Venezuelan number written locally with its leading 0, when linked, then it gets Venezuela's 58", () => {
    expect(whatsappLink("0414-123.45.67")?.href).toBe("https://wa.me/584141234567");
  });

  it("given digits with no prefix at all, when linked, then they are taken as already international", () => {
    expect(whatsappLink("(34) 612 345 678")?.href).toBe("https://wa.me/34612345678");
  });

  it("given a pasted wa.me link, when linked, then it opens as is and shows its number", () => {
    expect(whatsappLink("https://wa.me/584141234567?text=Hola")).toEqual({
      label: "+584141234567",
      href: "https://wa.me/584141234567?text=Hola",
    });
  });

  it("given a pasted WhatsApp link without https, when linked, then it still opens", () => {
    expect(whatsappLink("wa.me/584141234567")).toEqual({
      label: "+584141234567",
      href: "https://wa.me/584141234567",
    });
  });

  it("given a pasted api.whatsapp.com link, when linked, then it shows the number from its phone parameter", () => {
    expect(whatsappLink(" https://api.whatsapp.com/send?phone=34612345678 ")).toEqual({
      label: "+34612345678",
      href: "https://api.whatsapp.com/send?phone=34612345678",
    });
  });

  it("given a WhatsApp link with no number in it, when linked, then it opens as is under a plain WhatsApp label", () => {
    expect(whatsappLink("https://wa.link/abc123")).toEqual({
      label: "WhatsApp",
      href: "https://wa.link/abc123",
    });
  });

  it("given text with no digits, when linked, then there is no chat to open", () => {
    expect(whatsappLink("ask at the shop")).toBeNull();
  });
});

describe("contactLinks", () => {
  it("given an item with every way to reach them, when linked, then each opens its own place, WhatsApp first", () => {
    const item = anItem({
      phone: "0414 123 4567",
      instagramUrl: "@luzdeagua",
      email: "hola@luzdeagua.com",
      websiteUrl: "https://luzdeagua.com",
    });

    expect(contactLinks(item).map(({ channel, href }) => [channel, href])).toEqual([
      ["phone", "https://wa.me/584141234567"],
      ["instagramUrl", "https://instagram.com/luzdeagua"],
      ["email", "mailto:hola@luzdeagua.com"],
      ["websiteUrl", "https://luzdeagua.com"],
    ]);
  });

  it("given only an email, when linked, then there is just the one link", () => {
    expect(contactLinks(anItem({ email: " hola@luzdeagua.com " }))).toEqual([
      { channel: "email", label: "hola@luzdeagua.com", href: "mailto:hola@luzdeagua.com" },
    ]);
  });

  it("given a website typed without https, when linked, then it still opens as a web page", () => {
    expect(contactLinks(anItem({ websiteUrl: "luzdeagua.com" }))[0].href).toBe("https://luzdeagua.com");
  });

  it("given a phone with no digits, when linked, then it is left out", () => {
    expect(contactLinks(anItem({ phone: "ask at the shop" }))).toEqual([]);
  });
});
