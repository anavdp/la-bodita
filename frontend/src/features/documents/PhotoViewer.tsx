import { useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";

import { documentFileUrl } from "../../api/documents";
import type { WeddingDocument } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";

interface PhotoViewerProps {
  weddingId: number;
  /** The photos to page through, in the order they show on the page. */
  photos: WeddingDocument[];
  startId: number;
  onClose: () => void;
  onEdit?: (photo: WeddingDocument) => void;
}

/** How far a finger has to travel sideways before it counts as a swipe. */
const SWIPE_PIXELS = 50;

const roundButton =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[2.5px] border-white/80 bg-black/40 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30";

/**
 * Photos large, one at a time, without leaving the planner: arrows or keys on
 * a computer, a swipe on the phone, thumbnails to jump.
 */
export function PhotoViewer({ weddingId, photos, startId, onClose, onEdit }: PhotoViewerProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(() => Math.max(0, photos.findIndex((photo) => photo.id === startId)));
  const [brokenIds, setBrokenIds] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number | null>(null);
  const photo = photos[index];
  const canGoBack = index > 0;
  const canGoOn = index < photos.length - 1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex((current) => Math.max(0, current - 1));
      if (event.key === "ArrowRight") setIndex((current) => Math.min(photos.length - 1, current + 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, photos.length]);

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined || Math.abs(end - start) < SWIPE_PIXELS) return;
    setIndex((current) => (end < start ? Math.min(photos.length - 1, current + 1) : Math.max(0, current - 1)));
  };

  if (photo === undefined) return null;
  const url = documentFileUrl(weddingId, photo.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("documents.viewer.label")}
      // A fixed near-black in both themes: photos read best on dark.
      style={{ backgroundColor: "rgb(12 10 18)" }}
      className="fixed inset-0 z-50 flex flex-col font-playful text-white"
    >
      <header className="flex items-center gap-3 px-4 py-3 md:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl">{photo.title}</p>
          <p className="truncate text-sm text-white/70">
            <span>{t("documents.viewer.counter", { index: index + 1, total: photos.length })}</span>
            {photo.itemName && <span> · {photo.itemName}</span>}
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={t("documents.viewer.original")}
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/20"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            open_in_new
          </span>
        </a>
        {onEdit !== undefined && (
          <button
            type="button"
            aria-label={t("documents.edit", { title: photo.title })}
            onClick={() => onEdit(photo)}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/20"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              edit
            </span>
          </button>
        )}
        <button
          type="button"
          aria-label={t("documents.viewer.close")}
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/20"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      </header>

      <div
        data-testid="photo-stage"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-20"
      >
        {brokenIds.has(photo.id) ? (
          <p className="flex flex-col items-center gap-3 text-center text-lg text-white/80">
            <span className="material-symbols-outlined text-5xl" aria-hidden="true">
              image
            </span>
            {t("documents.viewer.cantShow")}
          </p>
        ) : (
          <img
            key={photo.id}
            src={url}
            alt={photo.title}
            onError={() => setBrokenIds((current) => new Set(current).add(photo.id))}
            className="max-h-full max-w-full select-none rounded-xl object-contain"
          />
        )}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label={t("documents.viewer.previous")}
              disabled={!canGoBack}
              onClick={() => setIndex(index - 1)}
              className={`${roundButton} absolute left-3 top-1/2 hidden -translate-y-1/2 md:flex`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                chevron_left
              </span>
            </button>
            <button
              type="button"
              aria-label={t("documents.viewer.next")}
              disabled={!canGoOn}
              onClick={() => setIndex(index + 1)}
              className={`${roundButton} absolute right-3 top-1/2 hidden -translate-y-1/2 md:flex`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                chevron_right
              </span>
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <ul className="flex shrink-0 justify-start gap-2 sm:justify-center overflow-x-auto px-4 py-3">
          {photos.map((each, at) => (
            <li key={each.id} className="shrink-0">
              <button
                type="button"
                aria-label={t("documents.viewer.show", { title: each.title })}
                aria-current={at === index}
                onClick={() => setIndex(at)}
                className={`block h-14 w-14 overflow-hidden rounded-lg border-2 transition-opacity ${
                  at === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={documentFileUrl(weddingId, each.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
