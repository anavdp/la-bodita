import { useId } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import type { GuestFilters } from "./filtering";
import { hasActiveFilters, noGuestFilters } from "./filtering";
import {
  guestSides,
  relationshipLabelKey,
  relationshipTypes,
  rsvpLabelKey,
  rsvpStatuses,
  sideLabelKey,
} from "./vocabulary";

interface GuestFilterBarProps {
  filters: GuestFilters;
  onChange: (filters: GuestFilters) => void;
  /** How many guests the filters leave, out of how many the search found. */
  shown: number;
  total: number;
}

interface FilterOption {
  value: string;
  labelKey: TranslationKey;
}

const selectClass =
  "rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-sm text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

/** One column's filter: "All" first, then the column's own values. */
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: FilterOption[];
  onChange: (value: string | null) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-label-md text-label-md uppercase text-on-surface-variant">
        {label}
      </label>
      <select
        id={id}
        className={selectClass}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
      >
        <option value="">{t("guests.filter.all")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}

const notSetOption: FilterOption = { value: "notSet", labelKey: "guests.filter.notSet" };

/** The guest table's column filters, above the table. */
export function GuestFilterBar({ filters, onChange, shown, total }: GuestFilterBarProps) {
  const { t } = useTranslation();
  const isFiltering = hasActiveFilters(filters);

  // The selects only offer the vocabularies' own values, so the casts below
  // narrow a string the select can only ever hold as one of them.
  const update = (change: Partial<GuestFilters>) => onChange({ ...filters, ...change });

  return (
    <div role="search" aria-label={t("guests.filter.label")} className="mb-4 flex flex-wrap items-end gap-4">
      <FilterSelect
        label={t("guests.column.type")}
        value={filters.type}
        options={[
          { value: "adult", labelKey: "guests.type.adult" },
          { value: "child", labelKey: "guests.type.child" },
        ]}
        onChange={(value) => update({ type: value as GuestFilters["type"] })}
      />
      <FilterSelect
        label={t("guests.column.relationship")}
        value={filters.relationshipType}
        options={[
          ...relationshipTypes.map((relationship) => ({
            value: relationship,
            labelKey: relationshipLabelKey(relationship),
          })),
          notSetOption,
        ]}
        onChange={(value) => update({ relationshipType: value as GuestFilters["relationshipType"] })}
      />
      <FilterSelect
        label={t("guests.column.side")}
        value={filters.side}
        options={[...guestSides.map((side) => ({ value: side, labelKey: sideLabelKey(side) })), notSetOption]}
        onChange={(value) => update({ side: value as GuestFilters["side"] })}
      />
      <FilterSelect
        label={t("guests.column.rsvp")}
        value={filters.rsvpStatus}
        options={rsvpStatuses.map((status) => ({ value: status, labelKey: rsvpLabelKey(status) }))}
        onChange={(value) => update({ rsvpStatus: value as GuestFilters["rsvpStatus"] })}
      />
      {isFiltering && (
        <div className="flex items-center gap-3 pb-2">
          <p aria-live="polite" className="font-body-sm text-body-sm text-on-surface-variant">
            {t("guests.filter.showing", { shown, total })}
          </p>
          <button
            type="button"
            onClick={() => onChange(noGuestFilters)}
            className="font-label-md text-label-md text-primary underline-offset-4 hover:underline"
          >
            {t("guests.filter.clear")}
          </button>
        </div>
      )}
    </div>
  );
}
