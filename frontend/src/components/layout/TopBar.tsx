import { useNavigate } from "react-router-dom";

import { useTranslation } from "../../i18n/LanguageProvider";
import { useSearch } from "../../search/SearchProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { compactButton } from "../playful/styles";

const iconButton =
  "flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-bubblegum/60 disabled:cursor-not-allowed disabled:opacity-50";

export function TopBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { term, setTerm } = useSearch();
  const { theme, toggleTheme } = useTheme();
  const themeLabel = t(theme === "dark" ? "layout.lightMode" : "layout.darkMode");

  return (
    <header className="fixed top-0 right-0 left-0 z-10 flex h-20 items-center justify-between gap-4 border-b-2 border-ink/15 bg-cream px-margin-mobile font-playful md:left-[260px] md:px-margin-desktop">
      <div className="relative w-full max-w-[560px]">
        <span
          className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-ink"
          aria-hidden="true"
        >
          search
        </span>
        <input
          type="search"
          aria-label={t("layout.searchLabel")}
          placeholder={t("layout.searchPlaceholder")}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          className="w-full rounded-[20px] border-[2.5px] border-ink bg-cream-light py-2 pl-12 pr-4 text-lg text-ink placeholder:text-ink/60 focus:border-sky focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* A task can be added from any screen; it opens the checklist's new task form.
            Notifications and settings land with their own issues and stay disabled until then. */}
        <button
          type="button"
          onClick={() => navigate("/checklist?add=task")}
          className={compactButton}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            add
          </span>
          {/* The label would wrap to two lines in a phone's top bar. */}
          <span className="hidden sm:inline">{t("layout.addTask")}</span>
        </button>
        <button type="button" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel} className={iconButton}>
          <span className="material-symbols-outlined" aria-hidden="true">
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
        <button type="button" disabled aria-label={t("layout.notifications")} title={t("layout.unavailable")} className={iconButton}>
          <span className="material-symbols-outlined" aria-hidden="true">
            notifications
          </span>
        </button>
        <button type="button" disabled aria-label={t("layout.settings")} title={t("layout.unavailable")} className={iconButton}>
          <span className="material-symbols-outlined" aria-hidden="true">
            settings
          </span>
        </button>
      </div>
    </header>
  );
}
