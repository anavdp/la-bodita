import { useRef } from "react";
import type { ReactNode } from "react";

import { useDismiss } from "../form/useDismiss";
import { menuPanel } from "../playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";

export interface FilterChoice {
  value: string;
  label: string;
  /** Drawn between the tick box and the label, as the column's cells draw it. */
  icon?: ReactNode;
  /** "Not set" and the like read quieter than the real values. */
  isMuted?: boolean;
}

interface FilterHeaderProps {
  label: string;
  choices: FilterChoice[];
  /** The values ticked; an empty list lets every row through. */
  ticked: string[];
  isOpen: boolean;
  onToggleChoice: (value: string) => void;
  onClear: () => void;
  /** The funnel was clicked: the table opens this menu and closes any other. */
  onToggle: () => void;
  onClose: () => void;
  className: string;
  /** Where the menu hangs from the header; under its left edge unless told otherwise. */
  menuPosition?: string;
  /** On a phone the funnel sits under the word, so the column grows no wider. */
  isCompact?: boolean;
}

/**
 * A column header with a funnel, the way the sortable headers have an arrow. It
 * opens a checklist of the column's values; while any is ticked the header
 * turns accent and says how many. Every filterable column in every table uses it.
 */
export function FilterHeader({
  label,
  choices,
  ticked,
  isOpen,
  onToggleChoice,
  onClear,
  onToggle,
  onClose,
  className,
  menuPosition = "left-0",
  isCompact = false,
}: FilterHeaderProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  useDismiss(containerRef, isOpen, onClose);

  const isActive = ticked.length > 0;

  return (
    <th className={className}>
      <div ref={containerRef} className="relative inline-block">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label={
            isActive
              ? t("guests.filter.openActive", { column: label, count: ticked.length })
              : t("guests.filter.open", { column: label })
          }
          className={`inline-flex items-center uppercase transition-colors ${
            isCompact ? "flex-col gap-0.5" : "gap-1 tracking-wider"
          } ${
            isActive
              ? `border-2 border-ink bg-accent ${
                  isCompact ? "-mx-2.5 -my-1 rounded-2xl px-2 py-1" : "-mx-3 -my-1 rounded-full px-3 py-1"
                }`
              : "hover:text-ink/70"
          }`}
        >
          {label}
          {isActive ? (
            <span
              className={`flex items-center justify-center rounded-full bg-ink text-cream-light ${
                isCompact ? "h-5 min-w-5 px-1 text-xs" : "ml-1 h-6 min-w-6 px-1.5 text-sm"
              }`}
            >
              {ticked.length}
            </span>
          ) : (
            <span className="material-symbols-outlined text-[18px] leading-none text-ink/40" aria-hidden="true">
              filter_alt
            </span>
          )}
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label={t("guests.filter.showOnly")}
            className={`${menuPanel} ${menuPosition} top-full z-20 min-w-[230px] text-left normal-case tracking-normal`}
          >
            <p aria-hidden="true" className="px-3 pt-1 text-sm uppercase tracking-wider text-ink/60">
              {t("guests.filter.showOnly")}
            </p>
            {choices.map((choice) => {
              const isTicked = ticked.includes(choice.value);
              return (
                <button
                  key={choice.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isTicked}
                  onClick={() => onToggleChoice(choice.value)}
                  className="flex items-center gap-3 rounded-xl px-3 py-1.5 text-left text-lg text-ink transition-colors hover:bg-accent/60"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 border-ink ${
                      isTicked ? "bg-accent" : "bg-cream-light"
                    }`}
                  >
                    {isTicked && <span className="material-symbols-outlined text-[18px]">check</span>}
                  </span>
                  {choice.icon}
                  <span className={choice.isMuted ? "text-ink/60" : ""}>{choice.label}</span>
                </button>
              );
            })}
            <div className="mt-1 flex justify-between gap-6 border-t-2 border-ink/15 px-3 pt-2">
              <button type="button" onClick={onClear} className="text-lg text-ink/70 underline">
                {t("guests.filter.clear")}
              </button>
              <button type="button" onClick={onClose} className="text-lg text-sky-deep">
                {t("guests.filter.done")}
              </button>
            </div>
          </div>
        )}
      </div>
    </th>
  );
}
