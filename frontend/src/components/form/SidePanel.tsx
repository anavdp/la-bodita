import { useId } from "react";
import type { ReactNode } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";
import { useCloseOnEscape } from "../../features/households/dialogStyles";

/** The scrolling middle of a panel, and the bar that keeps its buttons at the bottom. */
export const panelBody = "flex flex-1 flex-col gap-5 overflow-y-auto px-8 py-6";
export const panelFooter =
  "flex justify-end gap-3 border-t border-outline-variant/50 bg-surface-container-lowest px-8 py-4 dark:bg-surface-container";

interface SidePanelProps {
  title: string;
  onClose: () => void;
  /** Usually a form holding a `panelBody` and a `panelFooter`. */
  children: ReactNode;
}

/**
 * Forms slide in from the right, beside the list they change, the way the item
 * detail does, instead of covering the page.
 */
export function SidePanel({ title, onClose, children }: SidePanelProps) {
  const { t } = useTranslation();
  const titleId = useId();
  useCloseOnEscape(onClose);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        data-testid="side-panel-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/20 dark:bg-black/50"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full max-w-md flex-col rounded-l-[32px] bg-surface-container-lowest shadow-[-12px_0_40px_rgba(26,27,46,0.12)] dark:bg-surface-container"
      >
        <header className="flex items-center justify-between gap-4 px-8 pb-2 pt-8">
          <h2 id={titleId} className="font-headline-md text-headline-md text-primary">
            {title}
          </h2>
          <button
            type="button"
            aria-label={t("panel.close")}
            onClick={onClose}
            className="h-10 w-10 shrink-0 rounded-full text-xl text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            ×
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}
