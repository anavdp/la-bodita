/** The planner's form look (redesign proof of concept): ink-outlined pills on cream that glow sky blue while in use. */
export const fieldLabel = "mb-1.5 block font-playful text-[15px] uppercase tracking-wider text-ink";

export const pillField =
  "h-12 w-full rounded-[18px] border-[2.5px] border-ink bg-cream-light px-5 text-left font-playful text-lg text-ink transition-shadow placeholder:text-ink/50 hover:bg-white focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/25";

export const textArea =
  "w-full rounded-[18px] border-[2.5px] border-ink bg-cream-light px-5 py-3 font-playful text-lg text-ink transition-shadow placeholder:text-ink/50 focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/25";

/** The floating card a picker opens in. */
export const popover =
  "absolute left-0 z-20 min-w-full rounded-[20px] border-[2.5px] border-ink bg-cream-light p-3 font-playful text-ink shadow-[4px_4px_0_rgba(31,29,43,0.15)]";

/** Below the field, or above it when the field sits too low on the screen for the popover to fit. */
export const popoverPlacement = (opensUp: boolean) => (opensUp ? "bottom-full mb-2" : "top-full mt-2");

/** Whether a popover of about `height` pixels would run off the bottom of the window below `field`. */
export function shouldOpenUp(field: HTMLElement | null, height: number): boolean {
  if (!field) return false;
  const rect = field.getBoundingClientRect();
  return rect.bottom + height > window.innerHeight && rect.top > height;
}
