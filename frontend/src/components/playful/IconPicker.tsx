import { useCallback, useId, useRef, useState } from "react";

import { fold } from "../form/fold";
import { fieldLabel, pillField, popover, popoverPlacement, shouldOpenUp } from "../form/styles";
import { useDismiss } from "../form/useDismiss";
import { useTranslation } from "../../i18n/LanguageProvider";
import { iconCatalog, isIconName } from "./iconCatalog";
import { iconUrl } from "./icons";

/** A category's icon, or nothing for an older emoji, which its text label already carries. */
export function CategoryIcon({ value, className = "h-6 w-6" }: { value: string | null | undefined; className?: string }) {
  if (!isIconName(value)) return null;
  return <img src={iconUrl(`${value}.png`)} alt="" className={`${className} shrink-0 object-contain`} />;
}

interface IconPickerProps {
  label: string;
  /** The picked icon's name, or "" for none. */
  value: string;
  onChange: (value: string) => void;
}

/** A grid of Vicky's icons to tag a category with, searchable in either language. */
export function IconPicker({ label, value, onChange }: IconPickerProps) {
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
    setOpensUp(shouldOpenUp(wrapper.current, 380));
    setIsOpen(true);
  };

  const choose = (next: string) => {
    onChange(next);
    setIsOpen(false);
  };

  const term = fold(search.trim());
  const matches = iconCatalog.filter(
    (entry) => term === "" || fold(`${entry.en} ${entry.es} ${entry.keywords}`).includes(term),
  );
  const picked = iconCatalog.find((entry) => entry.name === value);

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
        className={`${pillField} flex items-center gap-3`}
      >
        {picked ? (
          <>
            <CategoryIcon value={picked.name} className="h-8 w-8" />
            <span>{picked[language]}</span>
          </>
        ) : (
          <span className="text-ink/50">{t("iconPicker.placeholder")}</span>
        )}
      </button>
      {isOpen && (
        <div role="dialog" aria-label={t("iconPicker.dialog")} className={`${popover} ${popoverPlacement(opensUp)} w-80`}>
          <input
            type="search"
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("iconPicker.search")}
            aria-label={t("iconPicker.search")}
            className={`${pillField} mb-2`}
          />
          {matches.length > 0 ? (
            <div className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto">
              {matches.map((entry) => {
                const name = entry[language];
                return (
                  <button
                    key={entry.name}
                    type="button"
                    title={name}
                    aria-label={name}
                    aria-pressed={entry.name === value}
                    onClick={() => choose(entry.name)}
                    className={`flex h-16 items-center justify-center rounded-2xl transition-colors hover:bg-accent/60 ${
                      entry.name === value ? "bg-accent ring-2 ring-inset ring-ink" : ""
                    }`}
                  >
                    <CategoryIcon value={entry.name} className="h-12 w-12" />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="px-2 py-3 text-lg text-ink/70">{t("picker.noMatches")}</p>
          )}
          <div className="mt-2 flex justify-end border-t-2 border-ink/15 pt-2">
            <button
              type="button"
              onClick={() => choose("")}
              className="rounded-full px-3 py-1 text-lg text-ink/70 hover:text-ink"
            >
              {t("iconPicker.clear")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
