import { NavLink } from "react-router-dom";

import { useTranslation } from "../../i18n/LanguageProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { daysUntil } from "./countdown";
import { navigationItems } from "./navigationItems";

const activeItem = "bg-primary text-on-primary scale-95 shadow-sm";
const restingItem = "text-on-primary-container hover:bg-white/40";

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
    <aside className="fixed left-0 top-0 z-20 hidden h-full w-[260px] flex-col rounded-r-3xl border-r border-outline-variant bg-primary-container py-gutter shadow-sm md:flex">
      <div className="px-6 mb-8">
        <h1 className="font-headline-md text-headline-md font-bold text-on-primary-container">
          {wedding?.name ?? "La Bodita"}
        </h1>
        <p className="font-body-sm text-body-sm text-on-primary-container">{countdown()}</p>
      </div>

      <nav aria-label={t("layout.mainNavigation")} className="flex-1 overflow-y-auto px-2">
        {navigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `m-2 flex items-center rounded-xl px-4 py-3 transition-colors ${
                isActive ? activeItem : restingItem
              }`
            }
          >
            <span className="material-symbols-outlined mr-3" aria-hidden="true">
              {item.icon}
            </span>
            <span className="font-label-md text-label-md">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 mt-auto">
        <button
          type="button"
          onClick={toggleLanguage}
          className="mb-4 flex w-full items-center justify-center rounded-full border border-secondary bg-surface-container-lowest py-2 font-label-md text-label-md text-secondary transition-colors hover:bg-secondary/5"
        >
          {t("layout.language", { code: language.toUpperCase() })}
        </button>
        <div className="flex items-center">
          <div className="mr-3 h-8 w-8 rounded-full bg-primary" aria-hidden="true" />
          <span className="font-label-md text-label-md text-on-primary-container">{t("layout.user")}</span>
        </div>
      </div>
    </aside>
  );
}
