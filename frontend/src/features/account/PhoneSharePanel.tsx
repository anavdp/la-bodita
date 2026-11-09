import { useEffect, useState } from "react";

import { getPhoneKey, makePhoneKey, removePhoneKey } from "../../api/auth";
import { apiUrl } from "../../api/client";
import { failedTo } from "../../components/feedback/problems";
import type { Problem } from "../../components/feedback/problems";
import { useProblemText } from "../../components/feedback/useProblemText";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField } from "../../components/form/styles";
import { screenIcons } from "../../components/playful/icons";
import { compactButton, primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";

const hint = "mt-1.5 text-base text-ink/70";
const address = "mt-1 block break-all rounded-xl bg-accent/50 px-3 py-1.5 font-mono text-[15px]";

/** The planner's own address for a share route, as the Shortcut on the phone must type it. */
function shareUrl(path: string): string {
  return new URL(apiUrl(path), window.location.origin).href;
}

const steps: { text: TranslationKey; url?: string }[] = [
  { text: "phoneShare.step.new" },
  { text: "phoneShare.step.shareSheet" },
  { text: "phoneShare.step.items", url: "/api/share/items" },
  { text: "phoneShare.step.chooseItem" },
  { text: "phoneShare.step.repeat" },
  { text: "phoneShare.step.send", url: "/api/share" },
  { text: "phoneShare.step.notify" },
];

/**
 * An iPhone web app can't sit in the share menu, so an iOS Shortcut does (#43):
 * it asks where the files go and sends them in with this person's phone key.
 * The key is shown once, when it is made; the server keeps only its hash.
 */
export function PhoneSharePanel({ onClose }: { onClose: () => void }) {
  const { t, language } = useTranslation();
  const problemText = useProblemText();
  const [createdAt, setCreatedAt] = useState<string | null | undefined>(undefined);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Problem | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    getPhoneKey()
      .then((status) => isCurrent && setCreatedAt(status.createdAt))
      .catch((failure: unknown) => isCurrent && setError(failedTo("phoneShare.loadFailed", failure)));
    return () => {
      isCurrent = false;
    };
  }, []);

  const run = async (change: () => Promise<void>) => {
    setError(null);
    setIsBusy(true);
    try {
      await change();
    } catch (failure) {
      setError(failedTo("errors.save", failure));
    } finally {
      setIsBusy(false);
    }
  };

  const makeKey = () =>
    run(async () => {
      setNewKey(`Bearer ${await makePhoneKey()}`);
      setCreatedAt(new Date().toISOString());
      setIsCopied(false);
    });

  const turnOff = () =>
    run(async () => {
      await removePhoneKey();
      setNewKey(null);
      setCreatedAt(null);
    });

  const copyKey = async () => {
    if (newKey === null) return;
    await navigator.clipboard.writeText(newKey);
    setIsCopied(true);
  };

  return (
    <SidePanel title={t("phoneShare.title")} icon={screenIcons.documents} onClose={onClose}>
      <div className={panelBody}>
        <p className="text-lg">{t("phoneShare.intro")}</p>

        <section aria-labelledby="phone-key-heading">
          <h3 id="phone-key-heading" className={fieldLabel}>
            {t("phoneShare.keyHeading")}
          </h3>
          {newKey !== null ? (
            <div>
              <label htmlFor="phone-key" className="sr-only">
                {t("phoneShare.keyLabel")}
              </label>
              <div className="flex items-center gap-2">
                <input id="phone-key" value={newKey} readOnly className={`${pillField} font-mono text-base`} />
                {navigator.clipboard !== undefined && (
                  <button
                    type="button"
                    onClick={() => void copyKey()}
                    className={`${compactButton} shrink-0`}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {isCopied ? "check" : "content_copy"}
                    </span>
                    <span>{isCopied ? t("phoneShare.copied") : t("phoneShare.copy")}</span>
                  </button>
                )}
              </div>
              <p className={hint}>{t("phoneShare.keyOnce")}</p>
            </div>
          ) : createdAt ? (
            <p className="text-lg">
              {t("phoneShare.keySince", {
                date: new Date(createdAt).toLocaleDateString(language === "es" ? "es-ES" : "en-GB", {
                  day: "numeric",
                  month: "long",
                }),
              })}
            </p>
          ) : (
            createdAt === null && <p className="text-lg">{t("phoneShare.noKey")}</p>
          )}
          {createdAt !== undefined && (
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" disabled={isBusy} onClick={() => void makeKey()} className={compactButton}>
                {createdAt ? t("phoneShare.newKey") : t("phoneShare.makeKey")}
              </button>
              {createdAt && (
                <button type="button" disabled={isBusy} onClick={() => void turnOff()} className={compactButton}>
                  {t("phoneShare.turnOff")}
                </button>
              )}
            </div>
          )}
          {error !== null && (
            <p role="alert" className="mt-2 text-lg text-coral">
              {problemText(error)}
            </p>
          )}
        </section>

        <section>
          <h3 id="shortcut-steps-heading" className={fieldLabel}>
            {t("phoneShare.stepsHeading")}
          </h3>
          <ol aria-labelledby="shortcut-steps-heading" className="flex list-decimal flex-col gap-3 pl-6 text-lg">
            {steps.map((step) => (
              <li key={step.text}>
                {t(step.text)}
                {step.url !== undefined && <code className={address}>{shareUrl(step.url)}</code>}
              </li>
            ))}
          </ol>
          <p className={`${hint} mt-4`}>{t("phoneShare.tryIt")}</p>
        </section>
      </div>
      <div className={panelFooter}>
        <button type="button" onClick={onClose} className={newKey ? primaryButton : secondaryButton}>
          {t("phoneShare.done")}
        </button>
      </div>
    </SidePanel>
  );
}
