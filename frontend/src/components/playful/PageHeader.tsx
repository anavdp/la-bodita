import type { ReactNode } from "react";

import { iconUrl } from "./icons";
import { pageTagline, pageTitle, primaryButton, secondaryButton } from "./styles";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  /** The page's illustration, a file in the icons folder; decorative, so screen readers skip it. */
  art?: string;
  /** The page's main actions, on the right. */
  children?: ReactNode;
}

/** How every planner screen opens: the big outlined title, its tagline and illustration, and its actions. */
export function PageHeader({ title, subtitle, art, children }: PageHeaderProps) {
  return (
    // On a phone the actions shrink to round icons and stay beside the title.
    <header className="mb-6 flex items-start justify-between gap-4 sm:flex-wrap sm:items-center sm:gap-6">
      <div className="flex min-w-0 items-center gap-6">
        <div>
          <h1 className={pageTitle}>{title}</h1>
          <p className={pageTagline}>{subtitle}</p>
        </div>
        {art !== undefined && (
          <img src={iconUrl(art)} alt="" className="hidden h-28 w-auto max-w-[220px] object-contain lg:block" />
        )}
      </div>
      {children !== undefined && <div className="flex shrink-0 flex-wrap justify-end gap-2 sm:gap-3">{children}</div>}
    </header>
  );
}

/** A header action's leading Material Symbols icon. */
export function ActionIcon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true">
      {name}
    </span>
  );
}

interface HeaderActionProps {
  /** A Material Symbols icon: the whole button on a phone. */
  icon: string;
  label: string;
  /** The page's main action is sky blue; any other is the accent. */
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick: () => void;
}

/** One of the page header's actions: icon and label, or just a round icon on a phone. */
export function HeaderAction({ icon, label, variant = "primary", disabled = false, onClick }: HeaderActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`${variant === "primary" ? primaryButton : secondaryButton} max-sm:h-12 max-sm:w-12 max-sm:px-0`}
    >
      <ActionIcon name={icon} />
      <span className="max-sm:sr-only">{label}</span>
    </button>
  );
}
