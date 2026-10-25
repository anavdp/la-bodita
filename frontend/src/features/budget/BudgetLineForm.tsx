import { useId, useState } from "react";
import type { FormEvent } from "react";

import type { BudgetLine, BudgetLineDraft, Item } from "../../api/types";
import { Dropdown } from "../../components/form/Dropdown";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField, textArea } from "../../components/form/styles";
import { screenIcons } from "../../components/playful/icons";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { counts } from "./budgetMath";

/** Dollars for Venezuela, euros for Italy and Spain. */
const currencies = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
];

interface BudgetLineFormProps {
  /** The line being edited, or null to add one. */
  line: BudgetLine | null;
  items: Item[];
  /** A new line's currency: the one used last, so a run of euro quotes stays in euros. */
  defaultCurrency: string;
  onSave: (draft: BudgetLineDraft) => Promise<void>;
  /** Offered only while editing. */
  onDelete?: () => void;
  onClose: () => void;
}

const asText = (amount: number | null) => (amount === null ? "" : String(amount));

/** "1800", "1800.50" or "1800,50" as a number; null for blank; NaN for anything else. */
function parseAmount(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return null;
  return /^\d+(\.\d{1,2})?$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/**
 * A cost in the side drawer like every other form: usually a vendor's quote,
 * so picking the item is enough to name it.
 */
export function BudgetLineForm({ line, items, defaultCurrency, onSave, onDelete, onClose }: BudgetLineFormProps) {
  const { t } = useTranslation();
  const formId = useId();
  const idFor = (name: string) => `${formId}-${name}`;

  const [title, setTitle] = useState(line?.title ?? "");
  const [itemId, setItemId] = useState(line?.itemId?.toString() ?? "");
  const [currency, setCurrency] = useState(line?.currency ?? defaultCurrency);
  const [quote, setQuote] = useState(asText(line?.estimatedAmount ?? null));
  const [finalPrice, setFinalPrice] = useState(asText(line?.actualAmount ?? null));
  const [notes, setNotes] = useState(line?.notes ?? "");
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currencyOptions = [
    ...currencies,
    ...(currencies.some(({ code }) => code === currency) ? [] : [{ code: currency, symbol: currency }]),
  ].map(({ code, symbol }) => ({ value: code, label: `${code} (${symbol})` }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const pickedItem = items.find((item) => String(item.id) === itemId) ?? null;
    const name = title.trim() || pickedItem?.name || "";
    const estimatedAmount = parseAmount(quote);
    const actualAmount = parseAmount(finalPrice);
    if (name === "") {
      setError("budget.titleRequired");
      return;
    }
    if (Number.isNaN(estimatedAmount) || Number.isNaN(actualAmount)) {
      setError("budget.amountInvalid");
      return;
    }
    if (line !== null && counts(line) && estimatedAmount === null && actualAmount === null) {
      setError("budget.amountNeeded");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        title: name,
        itemId: pickedItem?.id ?? null,
        currency,
        estimatedAmount,
        actualAmount,
        notes: notes.trim() === "" ? null : notes.trim(),
      });
    } catch {
      setError("planning.saveFailed");
      setIsSaving(false);
    }
  };

  return (
    <SidePanel title={t(line === null ? "budget.new" : "budget.editTitle")} icon={screenIcons.budget} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          <div>
            <Dropdown
              searchable
              label={t("budget.item")}
              value={itemId}
              options={[
                { value: "", label: t("budget.noItem") },
                ...items.map((item) => ({ value: String(item.id), label: item.name })),
              ]}
              onChange={setItemId}
            />
            <p className="mt-1.5 text-base text-ink/70">{t("budget.itemHint")}</p>
          </div>
          <div>
            <label htmlFor={idFor("title")} className={fieldLabel}>
              {t("budget.lineTitle")}
            </label>
            <input
              id={idFor("title")}
              value={title}
              placeholder={t("budget.titlePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
              className={pillField}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-36 flex-1">
              <label htmlFor={idFor("quote")} className={fieldLabel}>
                {t("budget.quote")}
              </label>
              <input
                id={idFor("quote")}
                inputMode="decimal"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                className={pillField}
              />
            </div>
            <div className="w-40">
              <Dropdown label={t("budget.currency")} value={currency} options={currencyOptions} onChange={setCurrency} />
            </div>
          </div>
          <div>
            <label htmlFor={idFor("final")} className={fieldLabel}>
              {t("budget.finalPrice")}
            </label>
            <input
              id={idFor("final")}
              inputMode="decimal"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              className={pillField}
            />
          </div>
          <div>
            <label htmlFor={idFor("notes")} className={fieldLabel}>
              {t("budget.notes")}
            </label>
            <textarea
              id={idFor("notes")}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={textArea}
            />
          </div>
          {error !== null && (
            <p role="alert" className="text-lg text-coral">
              {t(error)}
            </p>
          )}
        </div>
        <div className={panelFooter}>
          {onDelete !== undefined && (
            <button type="button" onClick={onDelete} className="mr-auto text-lg text-coral underline-offset-4 hover:underline">
              {t("planning.delete")}
            </button>
          )}
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t("planning.cancel")}
          </button>
          <button type="submit" disabled={isSaving} className={primaryButton}>
            {t("planning.save")}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
