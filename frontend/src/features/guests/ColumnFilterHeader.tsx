import { useRef } from "react";

import type { GuestRelationshipType, GuestSide } from "../../api/types";
import { useDismiss } from "../../components/form/useDismiss";
import { menuPanel } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { toggleColumnFilter } from "./filtering";
import type { ColumnFilterValues, GuestColumnFilters, GuestFilterColumn } from "./filtering";
import { guestSides, relationshipLabelKey, relationshipTypes, sideCode, sideLabelKey, sideTone } from "./vocabulary";

interface ColumnFilterHeaderProps {
  column: GuestFilterColumn;
  label: string;
  filters: GuestColumnFilters;
  isOpen: boolean;
  onChange: (filters: GuestColumnFilters) => void;
  /** The funnel was clicked: the table opens this menu and closes any other. */
  onToggle: () => void;
  onClose: () => void;
  className: string;
}

/** What each column's menu offers, in the order the guest form lists them. */
const choicesOf: { [column in GuestFilterColumn]: ColumnFilterValues[column][] } = {
  type: ["adult", "child"],
  relationship: [...relationshipTypes, "notSet"],
  side: [...guestSides, "notSet"],
};

function choiceLabelKey(column: GuestFilterColumn, choice: string): TranslationKey {
  if (choice === "notSet") {
    return "guests.filter.notSet";
  }
  if (column === "type") {
    return choice === "child" ? "guests.type.child" : "guests.type.adult";
  }
  return column === "relationship" ? relationshipLabelKey(choice as GuestRelationshipType) : sideLabelKey(choice as GuestSide);
}

/**
 * A column header with a funnel, the way the sortable headers have an arrow. It
 * opens a checklist of the column's values; while any is ticked the header
 * turns accent and says how many.
 */
export function ColumnFilterHeader({
  column,
  label,
  filters,
  isOpen,
  onChange,
  onToggle,
  onClose,
  className,
}: ColumnFilterHeaderProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  useDismiss(containerRef, isOpen, onClose);

  const ticked: string[] = filters[column];
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
          className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors ${
            isActive ? "-mx-3 -my-1 rounded-full border-2 border-ink bg-accent px-3 py-1" : "hover:text-ink/70"
          }`}
        >
          {label}
          {isActive ? (
            <span className="ml-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-sm text-cream-light">
              {ticked.length}
            </span>
          ) : (
            <span className="material-symbols-outlined text-[18px] text-ink/40" aria-hidden="true">
              filter_alt
            </span>
          )}
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label={t("guests.filter.showOnly")}
            className={`${menuPanel} left-0 top-full z-20 min-w-[230px] normal-case tracking-normal`}
          >
            <p aria-hidden="true" className="px-3 pt-1 text-sm uppercase tracking-wider text-ink/60">
              {t("guests.filter.showOnly")}
            </p>
            {choicesOf[column].map((choice) => {
              const isTicked = ticked.includes(choice);
              return (
                <button
                  key={choice}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isTicked}
                  onClick={() => onChange(toggleColumnFilter(filters, column, choice))}
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
                  {column === "side" && choice !== "notSet" && (
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-playful-display text-xs ${
                        sideTone[choice as GuestSide]
                      }`}
                    >
                      {sideCode[choice as GuestSide]}
                    </span>
                  )}
                  <span className={choice === "notSet" ? "text-ink/60" : ""}>{t(choiceLabelKey(column, choice))}</span>
                </button>
              );
            })}
            <div className="mt-1 flex justify-between gap-6 border-t-2 border-ink/15 px-3 pt-2">
              <button
                type="button"
                onClick={() => onChange({ ...filters, [column]: [] })}
                className="text-lg text-ink/70 underline"
              >
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
