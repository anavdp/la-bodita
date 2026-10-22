/** The planner's form look: soft tinted pills that turn white with a violet edge while in use. */
export const fieldLabel = "mb-1.5 block font-label-md text-label-md uppercase tracking-wide text-on-surface-variant";

export const pillField =
  "h-12 w-full rounded-full border-2 border-transparent bg-surface-container-low px-5 font-body-sm text-body-sm text-on-surface transition-colors placeholder:text-on-surface-variant/70 hover:bg-surface-container focus:border-primary focus:bg-surface-container-lowest focus:outline-none dark:bg-surface-container-highest dark:focus:bg-surface-container-high";

export const textArea =
  "w-full rounded-[20px] border-2 border-transparent bg-surface-container-low px-5 py-3 font-body-sm text-body-sm text-on-surface transition-colors placeholder:text-on-surface-variant/70 focus:border-primary focus:bg-surface-container-lowest focus:outline-none dark:bg-surface-container-highest dark:focus:bg-surface-container-high";

/** The floating card a picker opens in. */
export const popover =
  "absolute left-0 z-20 min-w-full rounded-[24px_24px_24px_8px] border border-outline-variant/60 bg-surface-container-lowest p-3 shadow-[0px_12px_32px_rgba(26,27,46,0.16)] dark:bg-surface-container-high";

/** Below the field, or above it when the field sits too low on the screen for the popover to fit. */
export const popoverPlacement = (opensUp: boolean) => (opensUp ? "bottom-full mb-2" : "top-full mt-2");

/** Whether a popover of about `height` pixels would run off the bottom of the window below `field`. */
export function shouldOpenUp(field: HTMLElement | null, height: number): boolean {
  if (!field) return false;
  const rect = field.getBoundingClientRect();
  return rect.bottom + height > window.innerHeight && rect.top > height;
}
