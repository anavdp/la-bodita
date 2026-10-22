/**
 * The redesign proof of concept's shared look: cream paper, thick ink
 * outlines, periwinkle and sky pills. Only the shell and the Guest List use it
 * so far; rolling it out means moving the other screens onto these too.
 */

const outlinedPill =
  "inline-flex items-center justify-center gap-2 rounded-[22px] border-[2.5px] border-ink font-playful text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/** The page's main action: sky blue with white lettering. */
export const primaryButton = `${outlinedPill} bg-sky px-6 py-3 text-[22px] !text-white hover:bg-sky-deep`;

/** Every other action: periwinkle pink. */
export const secondaryButton = `${outlinedPill} bg-periwinkle px-6 py-3 text-[22px] hover:bg-periwinkle-deep`;

/** The same pink, sized for the top bar. */
export const compactButton = `${outlinedPill} bg-periwinkle px-5 py-2 text-lg hover:bg-periwinkle-deep`;

/** The outlined card everything on a screen sits in. */
export const outlinedCard = "rounded-[28px] border-[2.5px] border-ink bg-cream-light";

/** The page title: chunky sky-blue capitals with an ink outline. */
export const pageTitle =
  "playful-outline font-playful-display text-[56px] uppercase leading-none tracking-wide text-sky md:text-[72px]";

export const pageTagline = "mt-3 font-playful text-xl text-ink";

/** Initials avatars cycle through the soft pastels, so neighbours rarely match. */
export const avatarTones = ["bg-periwinkle", "bg-sky-soft", "bg-mint-soft", "bg-lilac", "bg-peach"];

/** A floating menu, as opened from a table row. */
export const menuPanel =
  "absolute z-10 mt-2 flex w-max flex-col gap-1 rounded-2xl border-2 border-ink bg-cream-light p-2 font-playful shadow-[4px_4px_0_rgba(31,29,43,0.15)]";
export const menuItem =
  "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-lg text-ink transition-colors hover:bg-periwinkle/60";
