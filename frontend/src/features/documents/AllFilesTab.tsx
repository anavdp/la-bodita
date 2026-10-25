import { useState } from "react";
import { Link } from "react-router-dom";

import type { Category, DocumentKind, WeddingDocument } from "../../api/types";
import { fold } from "../../components/form/fold";
import { CategoryIcon } from "../../components/playful/IconPicker";
import { outlinedCard } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import { categoryLabel, chip } from "../planning/CategoryChips";
import { DocumentTile } from "./DocumentTile";
import { shelves } from "./papers";
import type { Shelf } from "./papers";

interface AllFilesTabProps {
  weddingId: number;
  categories: Category[];
  documents: WeddingDocument[];
  searchTerm: string;
  onEdit: (document: WeddingDocument) => void;
}

/** Every photo and file, on a shelf per category and a row per item; ours, on no item, last. */
export function AllFilesTab({ weddingId, categories, documents, searchTerm, onEdit }: AllFilesTabProps) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<DocumentKind | null>(null);

  const needle = fold(searchTerm.trim());
  const searched = documents.filter((document) =>
    [document.title, document.itemName, document.fileName, document.requirementTitle].some(
      (text) => text !== null && fold(text).includes(needle),
    ),
  );
  const shown = searched.filter((document) => kind === null || document.kind === kind);
  const countOf = (each: DocumentKind) => searched.filter((document) => document.kind === each).length;

  const shelfLabel = (shelf: Shelf) => {
    if (shelf.category !== null) return categoryLabel(shelf.category);
    return shelf.kind === "ours" ? t("documents.ours") : t("planning.uncategorized");
  };

  if (documents.length === 0) {
    return <p className={`${outlinedCard} p-6 font-playful text-xl text-ink/70`}>{t("documents.empty")}</p>;
  }

  return (
    <>
      <div role="group" aria-label={t("documents.filter.label")} className="mb-4 flex flex-wrap gap-2">
        <button type="button" aria-pressed={kind === null} onClick={() => setKind(null)} className={chip(kind === null)}>
          {t("documents.filter.all", { count: searched.length })}
        </button>
        {(["photo", "paper"] as const).map((each) => (
          <button
            key={each}
            type="button"
            aria-pressed={kind === each}
            onClick={() => setKind(kind === each ? null : each)}
            className={chip(kind === each)}
          >
            {t(`documents.filter.${each}`, { count: countOf(each) })}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className={`${outlinedCard} p-6 font-playful text-xl text-ink/70`}>{t("documents.noMatches")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {shelves(shown, categories).map((shelf) => (
            <section key={shelf.key} aria-label={shelfLabel(shelf)} className={`${outlinedCard} px-4 py-4 md:px-6`}>
              <h2 className="mb-2 flex items-center gap-3 text-ink">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 rounded-full border-2 border-ink"
                  style={{ backgroundColor: shelf.category?.color ?? "transparent" }}
                />
                {shelf.category !== null && <CategoryIcon value={shelf.category.emoji} className="h-9 w-9" />}
                <span className="min-w-0 truncate text-2xl">{shelfLabel(shelf)}</span>
                <span className="ml-auto shrink-0 text-base text-ink/60">
                  {shelf.count === 1 ? t("documents.fileCountOne") : t("documents.fileCount", { count: shelf.count })}
                </span>
              </h2>
              {shelf.items.map((item) => (
                <div key={item.itemId ?? "ours"} className="border-t-2 border-ink/10 py-3 first-of-type:border-t-0">
                  {item.itemId !== null && (
                    <Link
                      to={`/items?item=${item.itemId}`}
                      className="mb-2 inline-block text-lg underline-offset-4 hover:underline"
                    >
                      {item.itemName}
                    </Link>
                  )}
                  <ul className="flex flex-wrap gap-4 pt-2">
                    {item.documents.map((document) => (
                      <DocumentTile key={document.id} weddingId={weddingId} document={document} onEdit={onEdit} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
