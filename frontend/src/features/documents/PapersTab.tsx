import { useId } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import { documentFileUrl } from "../../api/documents";
import type { Category, PaperRequest, Person, WeddingDocument } from "../../api/types";
import { fold } from "../../components/form/fold";
import { CategoryIcon } from "../../components/playful/IconPicker";
import { avatarTones, compactButton, outlinedCard } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { FilesPreset } from "./AddFilesForm";
import { formatPaperDate, itemsWaiting, paperRows, papersRunningOut } from "./papers";
import type { PaperCell, PaperRow, PaperState } from "./papers";

interface PapersTabProps {
  weddingId: number;
  categories: Category[];
  documents: WeddingDocument[];
  requests: PaperRequest[];
  people: Person[];
  /** ISO date, so the tests can pin it. */
  today: string;
  searchTerm: string;
  onUpload: (preset: FilesPreset) => void;
  onAsk: () => void;
  onAnswer: (requestIds: number[], documentId: number) => void;
}

const textLink = "font-playful text-base text-sky-deep underline underline-offset-4 hover:text-ink";

const statePill: Record<Exclude<PaperState, "notAsked">, string> = {
  have: "border-ink bg-mint-soft",
  expiring: "border-ink bg-butter",
  expired: "border-ink bg-coral-soft",
  missing: "border-dashed border-coral bg-cream-light",
};

const alertCard = (tone: string) =>
  `flex w-[85%] shrink-0 snap-start flex-col gap-2 rounded-[24px] border-[2.5px] border-ink ${tone} p-5 md:w-auto`;

function Avatar({ person, index }: { person: Person; index: number }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink text-sm ${
        avatarTones[index % avatarTones.length]
      }`}
    >
      {person.displayName.slice(0, 1).toUpperCase()}
    </span>
  );
}

interface CellProps {
  weddingId: number;
  row: PaperRow;
  cell: PaperCell;
  person: Person;
  index: number;
  onUpload: (preset: FilesPreset) => void;
  onAnswer: (requestIds: number[], documentId: number) => void;
}

/** One of us for one paper: have it (and until when), missing (and upload it), or not asked. */
function Cell({ weddingId, row, cell, person, index, onUpload, onAnswer }: CellProps) {
  const { t, language } = useTranslation();
  const { state, document, unanswered } = cell;
  const label =
    state === "notAsked" ? (
      <span className="text-[15px] text-ink/40">{t("documents.state.notAsked")}</span>
    ) : (
      <span className={`rounded-full border-2 px-2.5 text-[14px] ${statePill[state]}`}>
        {t(`documents.state.${state}`)}
      </span>
    );

  const upload = () =>
    onUpload({
      kind: "paper",
      personId: unanswered[0]?.personId ?? person.id,
      itemId: unanswered[0]?.itemId ?? null,
      requirementId: unanswered[0]?.requirementId ?? null,
      title: row.name,
      answers: unanswered.map((request) => request.id),
    });

  return (
    <div role="cell" className="flex flex-wrap items-center gap-x-3 gap-y-1 md:order-none">
      <span className="flex w-32 items-center gap-2 md:hidden">
        <Avatar person={person} index={index} />
        <span className="truncate text-lg">{person.displayName}</span>
      </span>
      {document !== null ? (
        <a
          href={documentFileUrl(weddingId, document.id)}
          target="_blank"
          rel="noreferrer"
          aria-label={t("documents.open", { title: document.title })}
        >
          {label}
        </a>
      ) : (
        label
      )}
      {document?.expiresOn && (
        <span className="text-[14px] text-ink/60">
          {t("documents.until", { date: formatPaperDate(document.expiresOn, language) })}
        </span>
      )}
      {state === "missing" && (
        <button
          type="button"
          aria-label={t("documents.uploadFor", { paper: row.name, person: person.displayName })}
          onClick={upload}
          className={`${textLink} ml-auto md:ml-0`}
        >
          {t("documents.uploadShort")}
        </button>
      )}
      {document !== null && unanswered.length > 0 && (
        <button
          type="button"
          onClick={() => onAnswer(unanswered.map((request) => request.id), document.id)}
          className={textLink}
        >
          {t("documents.reuse", { count: unanswered.length })}
        </button>
      )}
    </div>
  );
}

/**
 * The paperwork binder: what each office and church asks for, in a row per
 * paper with a column per person, and alerts for what is missing or running out.
 */
export function PapersTab({
  weddingId,
  categories,
  documents,
  requests,
  people,
  today,
  searchTerm,
  onUpload,
  onAsk,
  onAnswer,
}: PapersTabProps) {
  const { t, language } = useTranslation();
  const headingId = useId();
  const emojiOf = (categoryId: number | null) => categories.find((category) => category.id === categoryId)?.emoji;
  const personName = (personId: number | null) =>
    people.find((person) => person.id === personId)?.displayName ?? null;

  const needle = fold(searchTerm.trim());
  const rows = paperRows(requests, documents, people, today).filter(
    (row) => fold(row.name).includes(needle) || row.askedBy.some((item) => fold(item.itemName).includes(needle)),
  );
  const waiting = itemsWaiting(requests);
  const runningOut = papersRunningOut(documents, today);

  const alerts = [
    ...waiting.map((item) => {
      const title = t(item.missing.length === 1 ? "documents.alert.waitingOne" : "documents.alert.waitingMany", {
        item: item.itemName,
        count: item.missing.length,
      });
      const names = item.missing
        .map((request) => {
          const whose = personName(request.personId);
          return whose === null ? request.name : `${request.name} (${whose})`;
        })
        .join(", ");
      return (
        <section key={`waiting-${item.itemId}`} aria-label={title} className={alertCard("bg-coral-soft")}>
          <h3 className="flex items-start gap-2 text-[19px] leading-snug">
            <span className="material-symbols-outlined" aria-hidden="true">
              assignment_late
            </span>
            {title}
          </h3>
          <p className="text-[15px] text-ink/80">{names}</p>
          <Link to={`/items?item=${item.itemId}`} className={`${compactButton} mt-auto self-start !text-[15px]`}>
            {t("documents.alert.seeMissing")}
          </Link>
        </section>
      );
    }),
    ...runningOut.map((document) => {
      const whose = personName(document.personId);
      const title = whose === null ? document.title : `${document.title} · ${whose}`;
      const isPast = (document.expiresOn as string) < today;
      return (
        <section key={`expiring-${document.id}`} aria-label={title} className={alertCard("bg-butter")}>
          <h3 className="flex items-start gap-2 text-[19px] leading-snug">
            <span className="material-symbols-outlined" aria-hidden="true">
              hourglass_bottom
            </span>
            {title}
          </h3>
          <p className="text-[15px] text-ink/80">
            {t(isPast ? "documents.alert.expired" : "documents.alert.expires", {
              date: formatPaperDate(document.expiresOn as string, language),
            })}
          </p>
          <button
            type="button"
            onClick={() =>
              onUpload({
                kind: "paper",
                personId: document.personId,
                itemId: document.itemId,
                title: document.title,
                answers: requests.filter((request) => request.documentId === document.id).map((request) => request.id),
              })
            }
            className={`${compactButton} mt-auto self-start !text-[15px]`}
          >
            {t("documents.alert.renew")}
          </button>
        </section>
      );
    }),
  ];

  const columns = { "--people": Math.max(people.length, 1) } as CSSProperties;
  const gridColumns =
    "md:grid md:grid-cols-[minmax(0,1.3fr)_repeat(var(--people),minmax(0,1fr))_minmax(0,1.5fr)] md:items-center md:gap-4";

  return (
    <>
      {alerts.length > 0 && (
        <div
          role="group"
          aria-label={t("documents.alerts")}
          className="-mx-margin-mobile mb-6 flex snap-x gap-4 overflow-x-auto px-margin-mobile pb-1 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] md:overflow-visible md:px-0"
        >
          {alerts}
        </div>
      )}

      <section aria-labelledby={headingId} className={`${outlinedCard} px-4 py-4 md:px-6`}>
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id={headingId} className="font-playful-display text-2xl uppercase tracking-wide">
            {t("documents.papers.heading")}
          </h2>
          <span className="hidden text-[14px] text-ink/60 lg:inline">{t("documents.papers.hint")}</span>
          <button type="button" onClick={onAsk} className={`${compactButton} ml-auto !text-base`}>
            {t("documents.papers.ask")}
          </button>
        </div>

        {requests.length === 0 ? (
          <p className="py-4 text-lg text-ink/70">{t("documents.papers.empty")}</p>
        ) : rows.length === 0 ? (
          <p className="py-4 text-lg text-ink/70">{t("documents.noMatches")}</p>
        ) : (
          <div role="table" aria-labelledby={headingId} style={columns} className="flex flex-col gap-3 md:gap-0">
            <div role="row" className={`hidden pb-2 text-[15px] text-ink/60 ${gridColumns}`}>
              <span role="columnheader">{t("documents.papers.paper")}</span>
              {people.map((person, index) => (
                <span role="columnheader" key={person.id} className="flex items-center gap-2">
                  <Avatar person={person} index={index} />
                  {person.displayName}
                </span>
              ))}
              <span role="columnheader">{t("documents.papers.askedBy")}</span>
            </div>
            {rows.map((row) => (
              <div
                role="row"
                key={row.key}
                className={`flex flex-col gap-2 rounded-[22px] border-2 border-ink/30 p-4 md:rounded-none md:border-0 md:border-t-2 md:border-ink/10 md:px-0 md:py-3 ${gridColumns}`}
              >
                <div role="cell" className="order-first flex items-center gap-3 md:order-none">
                  <span className="material-symbols-outlined text-ink/70" aria-hidden="true">
                    description
                  </span>
                  <span className="text-[18px] leading-tight">{row.name}</span>
                  {row.cells.some((cell) => cell.state === "missing") && (
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-coral md:hidden" />
                  )}
                </div>
                {row.cells.map((cell, index) => (
                  <Cell
                    key={cell.personId}
                    weddingId={weddingId}
                    row={row}
                    cell={cell}
                    person={people[index]}
                    index={index}
                    onUpload={onUpload}
                    onAnswer={onAnswer}
                  />
                ))}
                <div role="cell" className="order-first flex flex-wrap gap-1.5 pl-9 md:order-none md:pl-0">
                  {row.askedBy.map((item) => (
                    <Link
                      key={item.itemId}
                      to={`/items?item=${item.itemId}`}
                      className="inline-flex items-center gap-1 rounded-full border-2 border-ink/40 px-2 text-[14px] transition-colors hover:bg-accent/40"
                    >
                      <CategoryIcon value={emojiOf(item.categoryId)} className="h-4 w-4" />
                      {item.itemName}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
