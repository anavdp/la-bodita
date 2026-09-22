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
          <p className="font-label-md text-label-md uppercase tracking-wider opacity-80">{label}</p>
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

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      <StatCard
        label={t("guests.confirmed")}
        count={summary.confirmed}
        share={summary.shareConfirmed}
        icon={rsvpIcon.confirmed}
        shapeClass="organic-shape-2"
        toneClass="bg-primary text-on-primary"
        barClass="bg-on-primary"
      />
      <StatCard
        label={t("guests.pending")}
        count={summary.pending}
        share={summary.sharePending}
        icon={rsvpIcon.pending}
        shapeClass="organic-shape-3"
        toneClass="bg-tertiary-container text-on-tertiary-container"
        barClass="bg-on-tertiary-container"
      />
      <StatCard
        label={t("guests.declined")}
        count={summary.declined}
        share={summary.shareDeclined}
        icon={rsvpIcon.declined}
        shapeClass="organic-shape-1"
        toneClass="bg-secondary-container text-on-secondary"
        barClass="bg-on-secondary"
      />
    </div>
  );
}
