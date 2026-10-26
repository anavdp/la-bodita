import { useId } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { CategoryIcon } from "../../components/playful/IconPicker";
import { iconUrl } from "../../components/playful/icons";
import { outlinedCard } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import { formatMoney } from "../budget/budgetMath";
import type { SpendSlice } from "./dashboardMath";

interface SummaryCardProps {
  /** The screen's own title art, so the card reads as that screen at a glance. */
  art: string;
  title: string;
  /** The screen the card sums up; its title leads there. */
  to: string;
  children: ReactNode;
}

/** One screen summed up: its drawing and name on top, leading to it, and what it shows below. */
export function SummaryCard({ art, title, to, children }: SummaryCardProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={`${outlinedCard} flex flex-col gap-3 p-4 font-playful text-ink sm:p-5`}
    >
      <h2 id={headingId}>
        <Link to={to} className="group flex items-center gap-3">
          <img src={iconUrl(art)} alt="" className="h-11 w-14 shrink-0 object-contain" />
          <span className="font-playful-display text-xl uppercase tracking-wide group-hover:underline">{title}</span>
          <span className="material-symbols-outlined ml-auto text-ink/60" aria-hidden="true">
            chevron_right
          </span>
        </Link>
      </h2>
      {children}
    </section>
  );
}

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  /** A CSS color, from the theme tokens so it follows dark mode. */
  color: string;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** The paper showing between two segments, along the ring. */
const GAP = 3;

interface DonutProps {
  segments: DonutSegment[];
  /** What the hole says: a figure and what it counts. */
  figure: string;
  caption: string;
  label: string;
}

/** A ring split into its parts; each part names itself on hover, and the legend beside it names them all. */
export function Donut({ segments, figure, caption, label }: DonutProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const shown = segments.filter((segment) => segment.value > 0);
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={label} className="h-28 w-28 shrink-0 -rotate-90">
      <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="14" className="stroke-ink/10" />
      {total > 0 &&
        shown.map((segment) => {
          const length = (segment.value / total) * CIRCUMFERENCE;
          const drawn = shown.length > 1 ? Math.max(length - GAP, 0.5) : length;
          const arc = (
            <circle
              key={segment.key}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="14"
              stroke={segment.color}
              strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
              strokeDashoffset={-offset}
            >
              <title>{`${segment.label}: ${segment.value}`}</title>
            </circle>
          );
          offset += length;
          return arc;
        })}
      <g className="rotate-90" style={{ transformOrigin: "50px 50px" }}>
        <text x="50" y="50" textAnchor="middle" className="fill-ink font-playful-display text-[22px]">
          {figure}
        </text>
        <text x="50" y="66" textAnchor="middle" className="fill-ink/70 font-playful text-[11px]">
          {caption}
        </text>
      </g>
    </svg>
  );
}

/** The legend beside a donut: each part's color, name and count. */
export function DonutLegend({ segments }: { segments: DonutSegment[] }) {
  return (
    <ul className="flex min-w-0 flex-col gap-1">
      {segments.map((segment) => (
        <li key={segment.key} className="flex items-center gap-2 text-lg">
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-ink"
            style={{ backgroundColor: segment.color }}
          />
          <span className="font-playful-display tabular-nums">{segment.value}</span>
          <span className="truncate">{segment.label}</span>
        </li>
      ))}
    </ul>
  );
}

interface CategoryBarsProps {
  slices: SpendSlice[];
  currency: string;
  /** How many categories get their own bar; the rest share one. */
  limit?: number;
}

/** Money per category as bars in the category's own color, longest first, each named and priced. */
export function CategoryBars({ slices, currency, limit = 4 }: CategoryBarsProps) {
  const { t, language } = useTranslation();
  const shown = slices.slice(0, limit);
  const rest = slices.slice(limit).reduce((sum, slice) => sum + slice.amount, 0);
  const rows = [
    ...shown.map((slice) => ({
      key: slice.key,
      name: slice.category?.name ?? t("planning.uncategorized"),
      icon: slice.category?.emoji ?? null,
      color: slice.category?.color ?? "rgb(var(--color-play-ink) / 0.35)",
      amount: slice.amount,
    })),
    ...(rest > 0
      ? [
          {
            key: "rest",
            name: t("dashboard.otherCategories"),
            icon: null,
            color: "rgb(var(--color-play-ink) / 0.35)",
            amount: rest,
          },
        ]
      : []),
  ];
  const biggest = Math.max(...rows.map((row) => row.amount), 1);
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.key} title={`${row.name}: ${formatMoney(row.amount, currency, language)}`}>
          <div className="flex items-center gap-2 text-base">
            <CategoryIcon value={row.icon} className="h-5 w-5" />
            <span className="min-w-0 flex-1 truncate">{row.name}</span>
            <span className="tabular-nums">{formatMoney(row.amount, currency, language)}</span>
          </div>
          <div className="mt-1 h-3 rounded-full bg-ink/10">
            <div
              className="h-full rounded-full border-2 border-ink"
              style={{ width: `${Math.max((row.amount / biggest) * 100, 4)}%`, backgroundColor: row.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
