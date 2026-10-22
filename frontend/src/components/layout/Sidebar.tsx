import { NavLink } from "react-router-dom";

import { useTranslation } from "../../i18n/LanguageProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { daysUntil } from "./countdown";
import { navigationItems } from "./navigationItems";

const activeItem = "border-ink bg-accent";
const restingItem = "border-transparent hover:bg-white/15";

export function Sidebar() {
  const { t, language, toggleLanguage } = useTranslation();
  const { wedding } = useWedding();

  const countdown = (): string => {
    if (!wedding?.wedding_date) {
      return t("layout.dateToBeDecided");
    }
    const remaining = daysUntil(wedding.wedding_date);
    return remaining > 0 ? t("layout.daysToGo", { count: remaining }) : t("layout.today");
  };

  return (
    <aside className="fixed left-0 top-0 z-20 hidden h-full w-[260px] flex-col border-r-[2.5px] border-ink bg-sidebar py-6 font-playful text-ink md:flex">
      <div className="mb-6 px-6">
        {/* The confetti dashes and the sticker's hearts are the mockup's doodles, kept as plain marks. */}
        <h1 className="playful-outline -rotate-3 font-playful-logo text-[52px] leading-none text-paper [--playful-outline:#1f1d2b]">
          {wedding?.name ?? "La Bodita"}
        </h1>
        <p className="mt-5 inline-block -rotate-6 rounded-md border-[2.5px] border-ink bg-butter px-4 py-2 font-playful-display text-2xl uppercase leading-tight shadow-[3px_3px_0_rgba(31,29,43,0.2)]">
          {countdown()}
        </p>
      </div>

      <nav aria-label={t("layout.mainNavigation")} className="flex-1 overflow-y-auto px-3">
        {navigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `my-1 flex items-center rounded-full border-[2.5px] px-4 py-2 text-[20px] transition-colors ${
                isActive ? activeItem : restingItem
              }`
            }
          >
            <span className="material-symbols-outlined mr-3 text-[26px]" aria-hidden="true">
              {item.icon}
            </span>
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Stand-in for the mockup's getaway car illustration. */}
      <p aria-hidden="true" className="px-6 pb-2 text-5xl">
        🚗💨
      </p>

      <div className="mx-4 mt-2 border-t-2 border-ink/70 pt-3">
        <button
          type="button"
          onClick={toggleLanguage}
          aria-label={t("layout.language", { code: language.toUpperCase() })}
          className="mb-3 flex items-center gap-2 rounded-full px-2 py-1 text-lg transition-colors hover:bg-white/15"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            language
          </span>
          {language.toUpperCase()}
        </button>
        <div className="flex items-center">
          <div
            className="mr-3 flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-ink bg-accent text-xl"
            aria-hidden="true"
          >
            👰
          </div>
          <span className="text-lg">{t("layout.user")}</span>
        </div>
      </div>
    </aside>
  );
}
