import { useEffect } from "react";

/** The guest dialogs' look, shared by every household dialog. */
export const backdrop = "fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4";
export const panel =
  "max-h-full w-full max-w-lg overflow-y-auto rounded-[30px_10px_40px_20px] bg-surface-container-lowest p-8 shadow-lg";
export const dialogTitle = "mb-6 font-headline-md text-headline-md text-primary";
export const primaryButton =
  "rounded-full bg-primary px-8 py-3 font-label-md text-label-md text-on-primary shadow-md transition-opacity hover:opacity-90 disabled:opacity-50";
export const secondaryButton =
  "rounded-full border border-primary px-6 py-3 font-label-md text-label-md text-primary transition-colors hover:bg-primary/5 disabled:opacity-50";
export const field =
  "w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface focus:border-primary focus:outline-none";
export const fieldLabel = "mb-1 block font-label-md text-label-md uppercase text-on-surface-variant";

export function useCloseOnEscape(onClose: () => void): void {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
}
