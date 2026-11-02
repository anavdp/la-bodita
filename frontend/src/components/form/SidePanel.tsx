import { useId } from "react";
import type { ReactNode } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";
import { iconUrl } from "../playful/icons";
import { useCloseOnEscape } from "../../features/households/dialogStyles";

/** The scrolling middle of a panel, and the bar that keeps its buttons at the bottom. */
export const panelBody = "flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-6 font-playful text-ink sm:px-8";
export const panelFooter = "flex flex-wrap justify-end gap-3 border-t-[2.5px] border-ink bg-accent/40 px-5 py-4 sm:px-8";

interface SidePanelProps {
  title: string;
  onClose: () => void;
  /** The hand-drawn icon beside the title: its screen's, from `screenIcons`. */
  icon: string;
  /** Room for a table, as the CSV preview needs. */
  wide?: boolean;
  /** Usually a form holding a `panelBody` and a `panelFooter`. */
  children: ReactNode;
}

/**
 * Forms slide in from the right, beside the list they change, the way the item
 * detail does, instead of covering the page. On a phone they fill the screen.
 */
export function SidePanel({ title, icon, wide = false, onClose, children }: SidePanelProps) {
  const { t } = useTranslation();
  const titleId = useId();
  useCloseOnEscape(onClose);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        data-testid="side-panel-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 dark:bg-black/60"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex h-full w-full flex-col overflow-hidden border-ink bg-cream sm:rounded-l-[32px] sm:border-y-[2.5px] sm:border-l-[2.5px] ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <header className="flex items-center justify-between gap-4 border-b-[2.5px] border-ink bg-accent px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 -rotate-6 items-center justify-center rounded-xl border-[2.5px] border-ink bg-butter">
              <img src={iconUrl(icon)} alt="" className="h-10 w-10 object-contain" />
            </span>
            <h2
              id={titleId}
              className="playful-outline font-playful-display text-[32px] uppercase leading-none tracking-wide text-title"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label={t("panel.close")}
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink bg-cream-light text-ink transition-colors hover:bg-butter"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}
