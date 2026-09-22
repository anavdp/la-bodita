import { useTranslation } from "../../i18n/LanguageProvider";
import { useSearch } from "../../search/SearchProvider";

const iconButton =
  "flex h-10 w-10 items-center justify-center rounded-full border border-surface-variant bg-surface-container-lowest text-on-surface-variant shadow-sm transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-50";

export function TopBar() {
  const { t } = useTranslation();
  const { term, setTerm } = useSearch();

  return (
    <header className="fixed top-0 right-0 left-0 z-10 flex h-20 items-center justify-between gap-4 bg-transparent px-margin-mobile md:left-[260px] md:px-margin-desktop">
      <div className="relative w-full max-w-96">
        <span
          className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
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
          className="w-full rounded-full border border-surface-variant bg-surface-container-lowest py-3 pl-12 pr-4 font-body-lg text-body-lg text-primary focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Tasks, notifications and settings each land with their own issue; the
            shell shows them in place but does not pretend they work yet. */}
        <button
          type="button"
          disabled
          title={t("layout.addTaskUnavailable")}
          className="flex items-center rounded-full bg-secondary px-4 py-3 sm:px-6 font-label-md text-label-md text-on-secondary shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined sm:mr-2" aria-hidden="true">
            add
          </span>
          {/* The label would wrap to two lines in a phone's top bar. */}
          <span className="hidden sm:inline">{t("layout.addTask")}</span>
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
