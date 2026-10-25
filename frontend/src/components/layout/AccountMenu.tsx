import { useCallback, useRef, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useDismiss } from "../form/useDismiss";
import { menuItem, menuPanel } from "../playful/styles";

/** The signed-in user's initial in the top bar, opening who they are and sign-out. */
export function AccountMenu() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(wrapper, isOpen, close);

  if (user === null) {
    return null;
  }

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        aria-label={t("layout.account", { name: user.displayName })}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-ink bg-accent font-playful-display text-xl text-ink transition-colors hover:bg-accent-deep"
      >
        {user.displayName.charAt(0).toUpperCase()}
      </button>
      {isOpen && (
        <div role="menu" className={`${menuPanel} right-0 min-w-[220px]`}>
          <div className="px-3 pb-2 pt-1">
            <p className="text-lg">{user.displayName}</p>
            <p className="text-base text-ink/70">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              void signOut().catch(() => undefined);
            }}
            className={menuItem}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              logout
            </span>
            {t("layout.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
