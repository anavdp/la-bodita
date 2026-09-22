import type { Guest } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import { summariseRsvps } from "./guestSummary";
import { rsvpIcon } from "./vocabulary";

interface StatCardProps {
  label: string;
  count: number;
  share: number;
  icon: string;
  /** The design system's asymmetric squircle, varied per card. */
  shapeClass: string;
  toneClass: string;
  barClass: string;
}

function StatCard({ label, count, share, icon, shapeClass, toneClass, barClass }: StatCardProps) {
  return (
    <div role="group" aria-label={label} className={`p-6 shadow-md ${shapeClass} ${toneClass}`}>
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
          <span className="material-symbols-outlined" aria-hidden="true">
            {icon}
          </span>
        </div>
        <div>
          <p className="font-headline-md text-headline-md">{count}</p>
          {/* 19px bold, at full opacity: that is what puts the label over the 3:1
              large-text bar on every card. `opacity-80` alone dropped pending to
              2.55:1, below even that. */}
          <p className="font-label-lg text-label-lg uppercase">{label}</p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={share}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-white/20"
      >
        <div className={`h-full ${barClass}`} style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}

export function GuestStats({ guests }: { guests: Guest[] }) {
  const { t } = useTranslation();
  const summary = summariseRsvps(guests);

  // DESIGN.md's breakpoints: one column on a phone, two on a tablet, three from
  // desktop up. Three across a tablet clips the card labels.
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label={t("guests.confirmed")}
        count={summary.confirmed}
        share={summary.shareConfirmed}
        icon={rsvpIcon.confirmed}
        shapeClass="organic-shape-2"
        toneClass="bg-secondary text-on-secondary"
        barClass="bg-on-secondary"
      />
      <StatCard
        label={t("guests.pending")}
        count={summary.pending}
        share={summary.sharePending}
        icon={rsvpIcon.pending}
        shapeClass="organic-shape-3"
        toneClass="bg-tertiary text-on-tertiary"
        barClass="bg-on-tertiary"
      />
      <StatCard
        label={t("guests.declined")}
        count={summary.declined}
        share={summary.shareDeclined}
        icon={rsvpIcon.declined}
        shapeClass="organic-shape-1"
        toneClass="bg-secondary-container text-on-secondary-container"
        barClass="bg-on-secondary-container"
      />
    </div>
  );
}
