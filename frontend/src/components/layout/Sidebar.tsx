import { NavLink } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";
import { useCloseOnEscape } from "../../features/households/dialogStyles";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { CountdownSticker } from "./CountdownSticker";
import { navigationItems } from "./navigationItems";

const activeItem = "border-ink bg-accent";
const restingItem = "border-transparent hover:bg-white/15";

interface SidebarProps {
  /** Whether a phone's menu drawer is out; from tablet width up the sidebar always shows. */
  isOpen?: boolean;
  /** A laptop's sidebar folded to a strip of icons, each still named by a tooltip. */
  isCollapsed?: boolean;
  /** Folds and unfolds a laptop's sidebar; left out for the phone's drawer. */
  onToggleCollapsed?: () => void;
  onClose?: () => void;
}

const stayOpen = () => {};

export function Sidebar({ isOpen = false, isCollapsed = false, onToggleCollapsed, onClose = stayOpen }: SidebarProps) {
  const { t, language, toggleLanguage } = useTranslation();
  const { wedding } = useWedding();
  const { user } = useAuth();
  useCloseOnEscape(onClose);

  return (
    <>
      {isOpen && (
        <div
          data-testid="menu-backdrop"
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 md:hidden dark:bg-black/60"
        />
      )}
      <aside
        id="main-menu"
        className={`fixed left-0 top-0 h-full flex-col overflow-x-hidden transition-[width] ${isCollapsed ? "w-[88px]" : "w-[260px]"} border-r-[2.5px] border-ink bg-sidebar py-6 font-playful text-ink md:z-20 md:flex ${
          isOpen ? "z-50 flex" : "hidden"
        }`}
      >
        {onToggleCollapsed !== undefined && (
          <div className={`-mt-3 mb-1 flex px-3 ${isCollapsed ? "justify-center" : "justify-end"}`}>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={t(isCollapsed ? "layout.expandMenu" : "layout.collapseMenu")}
              aria-expanded={!isCollapsed}
              title={t(isCollapsed ? "layout.expandMenu" : "layout.collapseMenu")}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            >
              <span className="material-symbols-outlined text-[26px]" aria-hidden="true">
                {isCollapsed ? "left_panel_open" : "left_panel_close"}
              </span>
            </button>
          </div>
        )}
        {!isCollapsed && (
          <div className="mb-6 px-6">
            {/* The confetti dashes and the sticker's hearts are the mockup's doodles, kept as plain marks. */}
            <h1 className="playful-outline -rotate-3 font-playful-logo text-[52px] leading-none break-words text-paper [--playful-outline:#1f1d2b]">
              {wedding?.name ?? "La Bodita"}
            </h1>
            <div className="mt-5">
              <CountdownSticker weddingDate={wedding?.wedding_date ?? null} />
            </div>
          </div>
        )}

        <nav aria-label={t("layout.mainNavigation")} className="flex-1 overflow-y-auto px-3">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              title={isCollapsed ? t(item.labelKey) : undefined}
              className={({ isActive }) =>
                `my-1 flex items-center rounded-full border-[2.5px] py-2 text-[20px] transition-colors ${
                  isCollapsed ? "justify-center px-0" : "px-4"
                } ${isActive ? activeItem : restingItem}`
              }
            >
              <span className={`material-symbols-outlined text-[26px] ${isCollapsed ? "" : "mr-3"}`} aria-hidden="true">
                {item.icon}
              </span>
              <span className={isCollapsed ? "sr-only" : undefined}>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className={`mt-2 border-t-2 ${isCollapsed ? "mx-3" : "mx-4"} border-ink/70 pt-3`}>
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={t("layout.language", { code: language.toUpperCase() })}
            className={`mb-3 flex items-center gap-2 rounded-full px-2 py-1 text-lg ${isCollapsed ? "mx-auto" : ""} transition-colors hover:bg-white/15`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              language
            </span>
            {language.toUpperCase()}
          </button>
          <div className={`flex items-center ${isCollapsed ? "justify-center" : ""}`}>
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-ink bg-accent font-playful-display text-xl"
              aria-hidden="true"
            >
              {user?.displayName.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && <span className="ml-3 text-lg">{user?.displayName}</span>}
          </div>
        </div>
      </aside>
    </>
  );
}
