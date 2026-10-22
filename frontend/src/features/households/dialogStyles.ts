import { useEffect } from "react";

/** The guest dialogs' look, shared by every household dialog. */
export const backdrop = "fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 dark:bg-black/60";
export const panel =
  "max-h-full w-full max-w-lg overflow-y-auto rounded-[28px] border-[2.5px] border-ink bg-cream p-8 font-playful text-ink";
export const dialogTitle =
  "playful-outline mb-6 font-playful-display text-[32px] uppercase leading-none tracking-wide text-title";
export { fieldLabel } from "../../components/form/styles";
export { primaryButton, secondaryButton } from "../../components/playful/styles";

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
