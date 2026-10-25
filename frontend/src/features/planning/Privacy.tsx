import { useId } from "react";

import { Switch } from "../../components/form/Switch";
import { useTranslation } from "../../i18n/LanguageProvider";

/** The lock beside a private category or item's name. */
export function PrivateMark() {
  const { t } = useTranslation();
  return (
    <span title={t("privacy.onlyYouSee")} className="material-symbols-outlined shrink-0 text-xl text-ink/70">
      lock
    </span>
  );
}

interface PrivacySwitchProps {
  isPrivate: boolean;
  /** Only whoever made it may change who sees it. */
  canChange: boolean;
  /** What else goes hidden with it, said under the switch. */
  hiddenHintKey: "privacy.categoryHidden" | "privacy.itemHidden";
  /** An item in a private category is hidden whatever its own switch says. */
  hiddenByCategory?: boolean;
  onChange: (isPrivate: boolean) => void;
}

/** Whether a category or item is for the two of you, or only for whoever made it. */
export function PrivacySwitch({
  isPrivate: ownSetting,
  canChange,
  hiddenHintKey,
  hiddenByCategory = false,
  onChange,
}: PrivacySwitchProps) {
  const { t } = useTranslation();
  const hintId = useId();
  const isPrivate = ownSetting || hiddenByCategory;
  const hint = hiddenByCategory
    ? t("privacy.hiddenByCategory")
    : !canChange
      ? t("privacy.notYours")
      : isPrivate
        ? t(hiddenHintKey)
        : t("privacy.shared");

  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border-2 border-ink/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-2xl text-ink" aria-hidden="true">
          {isPrivate ? "lock" : "group"}
        </span>
        <div>
          <p className="font-playful text-lg text-ink">{t("privacy.onlyMe")}</p>
          <p id={hintId} className="font-playful text-base text-ink/70">
            {hint}
          </p>
        </div>
      </div>
      <Switch label={t("privacy.onlyMe")} checked={isPrivate} disabled={!canChange || hiddenByCategory} onChange={onChange} />
    </div>
  );
}
