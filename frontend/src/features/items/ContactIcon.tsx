import { iconUrl } from "../../components/playful/icons";
import type { TranslationKey } from "../../i18n/translations";
import type { ContactChannel } from "./contactLinks";

/** What each way to reach someone is called beside its icon, in the detail and the checklist. */
export const contactLabelKey: Record<ContactChannel, TranslationKey> = {
  phone: "items.whatsapp",
  instagramUrl: "items.instagram",
  email: "items.email",
  websiteUrl: "items.website",
};

const drawn: Record<Exclude<ContactChannel, "websiteUrl">, string> = {
  phone: "contact-whatsapp.png",
  instagramUrl: "contact-instagram.png",
  email: "contact-mail.png",
};

const sizes = {
  sm: "h-7 w-7 text-sm",
  md: "h-9 w-9 text-base",
} as const;

/**
 * The hand-drawn WhatsApp, Instagram and mail icons. A website has no drawing,
 * so it gets a "W" in the same tinted circle as the guest list's Side column.
 */
export function ContactIcon({ channel, size = "md" }: { channel: ContactChannel; size?: keyof typeof sizes }) {
  if (channel === "websiteUrl") {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-sky-soft font-playful-display text-ink ${sizes[size]}`}
      >
        W
      </span>
    );
  }
  return <img src={iconUrl(drawn[channel])} alt="" aria-hidden="true" className={`shrink-0 object-contain ${sizes[size]}`} />;
}
