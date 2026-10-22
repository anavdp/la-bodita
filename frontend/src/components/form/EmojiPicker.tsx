import { useCallback, useId, useRef, useState } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";
import { emojiCatalog } from "./emojiCatalog";
import { fold } from "./fold";
import { fieldLabel, pillField, popover, popoverPlacement, shouldOpenUp } from "./styles";
import { useDismiss } from "./useDismiss";

interface EmojiPickerProps {
  label: string;
  /** The picked emoji, or "" for none. */
  value: string;
  onChange: (value: string) => void;
}

/** Only emoji (flags and joined families included), so typed words are never taken for one. */
const isEmoji = (text: string) =>
  /^[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Component}‍️]+$/u.test(text) &&
  /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(text);

/**
 * A grid of wedding emojis to tag a category with, searchable in either
 * language; one pasted from elsewhere can still be used as is.
 */
export function EmojiPicker({ label, value, onChange }: EmojiPickerProps) {
  const { t, language } = useTranslation();
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const [search, setSearch] = useState("");

  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(wrapper, isOpen, close);

  const open = () => {
    setSearch("");
    setOpensUp(shouldOpenUp(wrapper.current, 360));
    setIsOpen(true);
  };

  const choose = (next: string) => {
    onChange(next);
    setIsOpen(false);
  };

  const term = search.trim();
  const matches = emojiCatalog.filter(
    (entry) =>
      term === "" ||
      entry.emoji === term ||
      fold(`${entry.en} ${entry.es} ${entry.keywords}`).includes(fold(term)),
  );
  const ownEmoji = isEmoji(term) && !matches.some((entry) => entry.emoji === term) ? term : null;

  return (
    <div ref={wrapper} className="relative">
      <span id={`${id}-label`} className={fieldLabel}>
        {label}
      </span>
      <button
        type="button"
        aria-labelledby={`${id}-label`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : open())}
        className={`${pillField} flex items-center gap-3 text-left`}
      >
        {value ? (
          <span className="text-[22px] leading-none">{value}</span>
        ) : (
          <span className="text-on-surface-variant/70">{t("emojiPicker.placeholder")}</span>
        )}
      </button>
      {isOpen && (
        <div role="dialog" aria-label={t("emojiPicker.dialog")} className={`${popover} ${popoverPlacement(opensUp)} w-80`}>
          <input
            type="search"
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("emojiPicker.search")}
            aria-label={t("emojiPicker.search")}
            className={`${pillField} mb-2`}
          />
          {ownEmoji !== null && (
            <button
              type="button"
              onClick={() => choose(ownEmoji)}
              className="mb-2 w-full rounded-full bg-primary-container/40 px-4 py-2 text-left font-label-md text-label-md text-primary hover:bg-primary-container/70"
            >
              {t("emojiPicker.use", { emoji: ownEmoji })}
            </button>
          )}
          {matches.length > 0 ? (
            <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
              {matches.map((entry) => {
                const name = entry[language];
                return (
                  <button
                    key={entry.emoji}
                    type="button"
                    title={name}
                    aria-label={name}
                    aria-pressed={entry.emoji === value}
                    onClick={() => choose(entry.emoji)}
                    className={`flex h-9 items-center justify-center rounded-xl text-[22px] transition-colors hover:bg-primary-container/50 ${
                      entry.emoji === value ? "bg-primary-container ring-2 ring-inset ring-primary" : ""
                    }`}
                  >
                    {entry.emoji}
                  </button>
                );
              })}
            </div>
          ) : (
            ownEmoji === null && (
              <p className="px-2 py-3 font-body-sm text-body-sm text-on-surface-variant">{t("picker.noMatches")}</p>
            )
          )}
          <div className="mt-2 flex justify-end border-t border-outline-variant/50 pt-2">
            <button
              type="button"
              onClick={() => choose("")}
              className="rounded-full px-3 py-1 font-label-md text-label-md text-on-surface-variant hover:text-primary"
            >
              {t("emojiPicker.clear")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
