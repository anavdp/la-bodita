import type { ReactNode } from "react";

import { iconUrl } from "./icons";
import { pageTagline, pageTitle } from "./styles";

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
    <header className="mb-6 flex flex-wrap items-center justify-between gap-6">
      <div className="flex items-center gap-6">
        <div>
          <h1 className={pageTitle}>{title}</h1>
          <p className={pageTagline}>{subtitle}</p>
        </div>
        {art !== undefined && (
          <img src={iconUrl(art)} alt="" className="hidden h-28 w-auto max-w-[220px] object-contain lg:block" />
        )}
      </div>
      {children !== undefined && <div className="flex flex-wrap gap-3">{children}</div>}
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
