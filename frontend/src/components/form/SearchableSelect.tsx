import { useCallback, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";
import { fieldLabel, pillField, popover, popoverPlacement, shouldOpenUp } from "./styles";
import { useDismiss } from "./useDismiss";

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

/** "Fotó" finds "Foto": the planner's names mix Spanish, Italian and English. */
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * A select for lists that grow, like categories or households: it looks like the
 * planner's other fields and opens on a search box, so the list never has to be
 * scrolled through.
 */
export function SearchableSelect({ label, value, options, onChange }: SearchableSelectProps) {
  const { t } = useTranslation();
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const matches = useMemo(
    () => options.filter((option) => fold(option.label).includes(fold(search.trim()))),
    [options, search],
  );
  const current = options.find((option) => option.value === value);

  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(wrapper, isOpen, close);

  const open = () => {
    setSearch("");
    setHighlighted(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpensUp(shouldOpenUp(wrapper.current, 340));
    setIsOpen(true);
  };

  const pick = (option: SelectOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const onSearchKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted((index) => Math.min(Math.max(index + step, 0), matches.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = matches[highlighted] ?? matches[0];
      if (option) pick(option);
    }
  };

  return (
    <div ref={wrapper} className="relative">
      <span id={`${id}-label`} className={fieldLabel}>
        {label}
      </span>
      <button
        type="button"
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-list`}
        onClick={() => (isOpen ? close() : open())}
        className={`${pillField} flex items-center justify-between gap-3 text-left`}
      >
        <span className="truncate">{current?.label}</span>
        <span aria-hidden="true" className={`text-on-surface-variant transition-transform ${isOpen ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {isOpen && (
        <div className={`${popover} ${popoverPlacement(opensUp)}`}>
          <input
            type="search"
            autoFocus
            value={search}
            placeholder={t("picker.search")}
            aria-label={t("picker.search")}
            aria-controls={`${id}-list`}
            onChange={(event) => {
              setSearch(event.target.value);
              setHighlighted(0);
            }}
            onKeyDown={onSearchKey}
            className={`${pillField} mb-2 h-10`}
          />
          {matches.length === 0 ? (
            <p className="px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">{t("picker.noMatches")}</p>
          ) : (
            <ul id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="max-h-64 overflow-y-auto">
              {matches.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => pick(option)}
                  className={`flex cursor-pointer items-center justify-between rounded-full px-4 py-2.5 font-body-sm text-body-sm ${
                    index === highlighted ? "bg-primary-container/50" : ""
                  } ${option.value === value ? "font-semibold text-primary after:content-['✓']" : "text-on-surface"}`}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
