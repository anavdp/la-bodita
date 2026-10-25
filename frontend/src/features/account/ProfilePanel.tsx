import { useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField } from "../../components/form/styles";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";

const hint = "mt-1.5 text-base text-ink/70";

/**
 * The account menu's drawer: the signed-in user's own name. The email is shown
 * but not editable: it is their Google sign-in and the allow-list entry, so
 * changing it here could lock them out. `python -m app.users` manages it.
 */
export function ProfilePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { user, saveDisplayName } = useAuth();

  const [name, setName] = useState(user?.displayName ?? "");
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") {
      setError("profile.nameRequired");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await saveDisplayName(name.trim());
      onClose();
    } catch {
      setError("planning.saveFailed");
      setIsSaving(false);
    }
  };

  const initial = (name.trim() || user?.displayName || "?").charAt(0).toUpperCase();

  return (
    <SidePanel title={t("profile.title")} sticker={<span className="font-playful-display">{initial}</span>} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          <div>
            <label htmlFor="profile-name" className={fieldLabel}>
              {t("profile.name")}
            </label>
            <input
              id="profile-name"
              value={name}
              maxLength={100}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              className={pillField}
            />
            <p className={hint}>{t("profile.nameHint")}</p>
          </div>
          <div>
            <label htmlFor="profile-email" className={fieldLabel}>
              {t("profile.email")}
            </label>
            <input
              id="profile-email"
              value={user?.email ?? ""}
              readOnly
              aria-describedby="profile-email-hint"
              className={pillField}
            />
            <p id="profile-email-hint" className={hint}>
              {t("profile.emailHint")}
            </p>
          </div>
          {error !== null && (
            <p role="alert" className="text-lg text-coral">
              {t(error)}
            </p>
          )}
        </div>
        <div className={panelFooter}>
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
