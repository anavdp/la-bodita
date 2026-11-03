/** Most vendors are in Venezuela, so a number written the local way (0414…) gets its code. */
const localCountryCode = "58";

/** A pasted link, with or without its https://. */
const linkPattern = /^(https?:\/\/|wa\.me\/|(api|web)\.whatsapp\.com\/)/i;

/**
 * A vendor's phone as a WhatsApp chat: a number typed any way (+58 414…, 0039…,
 * 0414-…) becomes a wa.me link, and a pasted WhatsApp link opens as it is.
 * Null when there is nothing to dial.
 */
export function whatsappLink(value: string): { label: string; href: string } | null {
  const trimmed = value.trim();
  if (linkPattern.test(trimmed)) {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(href);
    const number = url.hostname === "wa.me" ? url.pathname.split("/").find(Boolean) : url.searchParams.get("phone");
    const digits = number?.replace(/\D/g, "");
    return { label: digits ? `+${digits}` : "WhatsApp", href };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  return { label: trimmed, href: `https://wa.me/${internationalDigits(trimmed, digits)}` };
}

function internationalDigits(typed: string, digits: string): string {
  if (typed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return localCountryCode + digits.slice(1);
  return digits;
}

/** "https://instagram.com/luzdeagua" (or "@luzdeagua") as "@luzdeagua", linking to the profile. */
export function instagramHandle(value: string): { handle: string; href: string } {
  const name = value.startsWith("http") ? (new URL(value).pathname.split("/").find(Boolean) ?? value) : value;
  const bare = name.replace(/^@/, "");
  return { handle: `@${bare}`, href: value.startsWith("http") ? value : `https://instagram.com/${bare}` };
}

/** The ways an item can be reached, the usual one first. */
export type ContactChannel = "phone" | "instagramUrl" | "email" | "websiteUrl";
export const contactChannels: ContactChannel[] = ["phone", "instagramUrl", "email", "websiteUrl"];

export interface ContactLink {
  channel: ContactChannel;
  label: string;
  href: string;
}

type Reachable = Partial<Record<ContactChannel, string | null>>;

function linkFor(channel: ContactChannel, value: string): ContactLink | null {
  switch (channel) {
    case "phone": {
      const chat = whatsappLink(value);
      return chat && { channel, ...chat };
    }
    case "instagramUrl": {
      const { handle, href } = instagramHandle(value);
      return { channel, label: handle, href };
    }
    case "email":
      return { channel, label: value, href: `mailto:${value}` };
    case "websiteUrl":
      return { channel, label: value, href: /^https?:\/\//i.test(value) ? value : `https://${value}` };
  }
}

/** Every way to reach an item that is filled in, each as the link that opens it. */
export function contactLinks(item: Reachable): ContactLink[] {
  return contactChannels.flatMap((channel) => {
    const value = item[channel]?.trim();
    const link = value ? linkFor(channel, value) : null;
    return link ? [link] : [];
  });
}

/**
 * Web links open in a new tab so the planner stays put; an email opens the mail
 * app instead, and a new tab for it would just be left blank.
 */
export function opensOutside(channel: ContactChannel): { target?: string; rel?: string } {
  return channel === "email" ? {} : { target: "_blank", rel: "noreferrer" };
}
