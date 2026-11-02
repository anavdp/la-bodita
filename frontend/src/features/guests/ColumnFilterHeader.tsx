import type { GuestRelationshipType, GuestSide } from "../../api/types";
import { FilterHeader } from "../../components/table/FilterHeader";
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

/** The guest table's Type, Relationship and Side headers, each with its funnel. */
export function ColumnFilterHeader({ column, filters, onChange, ...header }: ColumnFilterHeaderProps) {
  const { t } = useTranslation();

  const choices = choicesOf[column].map((choice) => ({
    value: choice,
    label: t(choiceLabelKey(column, choice)),
    isMuted: choice === "notSet",
    icon:
      column === "side" && choice !== "notSet" ? (
        <span
          aria-hidden="true"
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-playful-display text-xs ${
            sideTone[choice as GuestSide]
          }`}
        >
          {sideCode[choice as GuestSide]}
        </span>
      ) : undefined,
  }));

  return (
    <FilterHeader
      {...header}
      choices={choices}
      ticked={filters[column]}
      onToggleChoice={(value) =>
        onChange(toggleColumnFilter(filters, column, value as ColumnFilterValues[typeof column]))
      }
      onClear={() => onChange({ ...filters, [column]: [] })}
    />
  );
}
