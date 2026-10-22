import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";
import { fold } from "./fold";
import {
  fieldLabel,
  pillField,
  popover,
  popoverPlacement,
  shouldOpenUp,
} from "./styles";
import { useDismiss } from "./useDismiss";

export interface SelectOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label: string;
  /** Shows the label to screen readers only, for a field whose purpose is plain from where it sits. */
  hideLabel?: boolean;
  /** Opens on a search box: for lists that grow, like categories or households. */
  searchable?: boolean;
  /** Restyles the field itself, e.g. as a status pill. */
  triggerClassName?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

/**
 * The planner's one dropdown, so every list opens the same way instead of in the
 * browser's own menu. Lists that grow open on a search box.
 */
export function Dropdown({
  label,
  hideLabel = false,
  searchable = false,
  triggerClassName = pillField,
  value,
  options,
  onChange,
}: DropdownProps) {
  const { t } = useTranslation();
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const matches = useMemo(
    () =>
      options.filter((option) =>
        fold(option.label).includes(fold(search.trim())),
      ),
    [options, search],
  );
  const current = options.find((option) => option.value === value);

  const list = useRef<HTMLUListElement>(null);
  // Without a search box the list itself takes the keys.
  useEffect(() => {
    if (isOpen && !searchable) list.current?.focus();
  }, [isOpen, searchable]);

  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(wrapper, isOpen, close);

  const open = () => {
    setSearch("");
    setHighlighted(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    );
    setOpensUp(shouldOpenUp(wrapper.current, 340));
    setIsOpen(true);
  };

  const pick = (option: SelectOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const onListKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted((index) =>
        Math.min(Math.max(index + step, 0), matches.length - 1),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = matches[highlighted] ?? matches[0];
      if (option) pick(option);
    }
  };

  return (
    <div ref={wrapper} className="relative">
      <span id={`${id}-label`} className={hideLabel ? "sr-only" : fieldLabel}>
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
        className={`${triggerClassName} flex items-center justify-between gap-3 text-left`}
      >
        <span className="truncate">{current?.label}</span>
        {/* The arrow is drawn by CSS so the field reads as just its value. */}
        <span
          aria-hidden="true"
          className={`text-ink transition-transform after:content-['▾'] ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className={`${popover} ${popoverPlacement(opensUp)} w-max max-w-[min(24rem,90vw)]`}>
          {searchable && (
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
              onKeyDown={onListKey}
              className={`${pillField} mb-2 h-10`}
            />
          )}
          {matches.length === 0 ? (
            <p className="px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
              {t("picker.noMatches")}
            </p>
          ) : (
            <ul
              id={`${id}-list`}
              role="listbox"
              aria-labelledby={`${id}-label`}
              ref={list}
              tabIndex={searchable ? undefined : -1}
              onKeyDown={searchable ? undefined : onListKey}
              className="max-h-64 overflow-y-auto focus:outline-none"
            >
              {matches.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => pick(option)}
                  className={`flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-[14px] px-4 py-2 text-lg ${
                    index === highlighted ? "bg-bubblegum/60" : ""
                  } ${option.value === value ? "text-sky-deep after:content-['✓']" : "text-ink"}`}
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
