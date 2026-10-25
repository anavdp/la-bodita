import { useState } from "react";

import { documentFileUrl } from "../../api/documents";
import type { WeddingDocument } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";

interface DocumentTileProps {
  weddingId: number;
  document: WeddingDocument;
  onEdit: (document: WeddingDocument) => void;
  /** Opens a photo in the viewer; a paper always opens in its own tab. */
  onView: (document: WeddingDocument) => void;
}

/** "PDF", "JPG": what a paper tile says it is. */
const extensionOf = (document: WeddingDocument) =>
  (document.fileName.match(/\.([a-z0-9]+)$/i)?.[1] ?? document.kind).toUpperCase().slice(0, 4);

/**
 * A file on a shelf: a photo as its thumbnail, a paper as a card. Tapping a
 * photo opens the viewer, a paper opens the file; the pencil opens its details.
 */
export function DocumentTile({ weddingId, document, onEdit, onView }: DocumentTileProps) {
  const { t } = useTranslation();
  // HEIC straight from an iPhone shows in Safari but not in every browser.
  const [isBroken, setIsBroken] = useState(false);
  const href = documentFileUrl(weddingId, document.id);
  const showsImage = document.kind === "photo" && document.contentType.startsWith("image/") && !isBroken;
  const subline = document.requirementTitle ?? document.fileName;

  const editButton = (
    <button
      type="button"
      aria-label={t("documents.edit", { title: document.title })}
      onClick={() => onEdit(document)}
      className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-cream-light text-ink transition-colors hover:bg-accent"
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
        edit
      </span>
    </button>
  );

  if (document.kind === "photo") {
    return (
      <li className="relative w-24 shrink-0">
        <button
          type="button"
          aria-label={t("documents.view", { title: document.title })}
          onClick={() => onView(document)}
          className="block w-full text-left"
        >
          {showsImage ? (
            <img
              src={href}
              alt={document.title}
              loading="lazy"
              onError={() => setIsBroken(true)}
              className="h-24 w-24 rounded-2xl border-[2.5px] border-ink bg-accent/30 object-cover"
            />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-2xl border-[2.5px] border-ink bg-accent/40">
              <span className="material-symbols-outlined text-4xl text-ink/70" aria-hidden="true">
                image
              </span>
            </span>
          )}
          <span className="mt-1 block truncate text-sm text-ink/80">{document.title}</span>
        </button>
        {editButton}
      </li>
    );
  }

  return (
    <li className="relative w-full sm:w-[230px]">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-cream-light px-3 py-2.5 transition-colors hover:bg-accent/25"
      >
        <span className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-sky-soft text-[11px]">
          {extensionOf(document)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[17px] leading-tight">{document.title}</span>
          <span className="block truncate text-[13px] text-ink/60">{subline}</span>
        </span>
      </a>
      {editButton}
    </li>
  );
}
