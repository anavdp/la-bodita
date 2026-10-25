import { NavLink } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { CountdownSticker } from "./CountdownSticker";
import { navigationItems } from "./navigationItems";

const activeItem = "border-ink bg-accent";
const restingItem = "border-transparent hover:bg-white/15";

export function Sidebar() {
  const { t, language, toggleLanguage } = useTranslation();
  const { wedding } = useWedding();
  const { user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-20 hidden h-full w-[260px] flex-col border-r-[2.5px] border-ink bg-sidebar py-6 font-playful text-ink md:flex">
      <div className="mb-6 px-6">
        {/* The confetti dashes and the sticker's hearts are the mockup's doodles, kept as plain marks. */}
        <h1 className="playful-outline -rotate-3 font-playful-logo text-[52px] leading-none break-words text-paper [--playful-outline:#1f1d2b]">
          {wedding?.name ?? "La Bodita"}
        </h1>
        <div className="mt-5">
          <CountdownSticker weddingDate={wedding?.wedding_date ?? null} />
        </div>
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
            className="mr-3 flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-ink bg-accent font-playful-display text-xl"
            aria-hidden="true"
          >
            {user?.displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-lg">{user?.displayName}</span>
        </div>
      </div>
    </aside>
  );
}
