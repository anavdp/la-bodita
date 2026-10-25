import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { SettingsPanel } from "../../features/settings/SettingsPanel";

import { useTranslation } from "../../i18n/LanguageProvider";
import { useSearch } from "../../search/SearchProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { compactButton } from "../playful/styles";
import { AccountMenu } from "./AccountMenu";

const iconButton =
  "flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50";

interface TopBarProps {
  /** Whether the phone's menu drawer is out. */
  isMenuOpen?: boolean;
  /** Whether the laptop's sidebar is folded to its icons, so the bar starts where it ends. */
  isSidebarCollapsed?: boolean;
  /** Slides the phone's menu drawer in; left out where the sidebar sits beside the page. */
  onOpenMenu?: () => void;
}

export function TopBar({ isMenuOpen = false, isSidebarCollapsed = false, onOpenMenu }: TopBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { term, setTerm } = useSearch();
  const { theme, toggleTheme } = useTheme();
  const themeLabel = t(theme === "dark" ? "layout.lightMode" : "layout.darkMode");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className={`fixed top-0 right-0 left-0 z-10 flex h-20 items-center justify-between gap-2 border-b-2 border-ink/15 bg-cream px-margin-mobile font-playful md:px-margin-desktop ${
          isSidebarCollapsed ? "md:left-[88px]" : "md:left-[260px]"
        }`}>
        {onOpenMenu !== undefined && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label={t("layout.menu")}
            aria-expanded={isMenuOpen}
            aria-controls="main-menu"
            className={`${iconButton} shrink-0 md:hidden`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              menu
            </span>
          </button>
        )}
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

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {/* A task can be added from any screen; it opens the checklist's new task form.
              Notifications land with their own issue and stay disabled until then. */}
          <button
            type="button"
            onClick={() => navigate("/checklist?add=task")}
            aria-label={t("layout.addTask")}
            className={`${compactButton} max-sm:h-10 max-sm:w-10 max-sm:px-0`}
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
          {/* A placeholder, so a phone's narrow bar leaves it out. */}
          <button type="button" disabled aria-label={t("layout.notifications")} title={t("layout.unavailable")} className={`${iconButton} max-sm:hidden`}>
            <span className="material-symbols-outlined" aria-hidden="true">
              notifications
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label={t("layout.settings")}
            title={t("layout.settings")}
            className={iconButton}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              settings
            </span>
          </button>
          <AccountMenu />
        </div>
      </header>
      {/* Outside the header, whose z-index would otherwise keep the drawer under the sidebar. */}
      {isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}
    </>
  );
}
