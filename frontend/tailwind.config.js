/**
 * Ported from the Stitch mockups' inline Tailwind config
 * (design/mockups/.../dashboard/code.html), which is what the approved
 * screenshots were rendered with. Colour and type tokens match
 * organic_celebration/DESIGN.md; the radius scale is the mockups' own, so a
 * class like `rounded-xl` means here exactly what it means there.
 */
/**
 * Colours are CSS variables (channels only, so `bg-primary/5` still works) set
 * in index.css: the light values on :root, the dark ones under `.dark`, which
 * the planner puts on <html> when its theme is dark.
 */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: token("background"),
        "on-background": token("on-background"),
        surface: token("surface"),
        "surface-dim": token("surface-dim"),
        "surface-bright": token("surface-bright"),
        "surface-container-lowest": token("surface-container-lowest"),
        "surface-container-low": token("surface-container-low"),
        "surface-container": token("surface-container"),
        "surface-container-high": token("surface-container-high"),
        "surface-container-highest": token("surface-container-highest"),
        "surface-variant": token("surface-variant"),
        "surface-tint": token("surface-tint"),
        "on-surface": token("on-surface"),
        "on-surface-variant": token("on-surface-variant"),
        "inverse-surface": token("inverse-surface"),
        "inverse-on-surface": token("inverse-on-surface"),
        outline: token("outline"),
        "outline-variant": token("outline-variant"),
        primary: token("primary"),
        "on-primary": token("on-primary"),
        "primary-container": token("primary-container"),
        "on-primary-container": token("on-primary-container"),
        "inverse-primary": token("inverse-primary"),
        "primary-fixed": token("primary-fixed"),
        "primary-fixed-dim": token("primary-fixed-dim"),
        "on-primary-fixed": token("on-primary-fixed"),
        "on-primary-fixed-variant": token("on-primary-fixed-variant"),
        secondary: token("secondary"),
        "on-secondary": token("on-secondary"),
        "secondary-container": token("secondary-container"),
        "on-secondary-container": token("on-secondary-container"),
        "secondary-fixed": token("secondary-fixed"),
        "secondary-fixed-dim": token("secondary-fixed-dim"),
        "on-secondary-fixed": token("on-secondary-fixed"),
        "on-secondary-fixed-variant": token("on-secondary-fixed-variant"),
        tertiary: token("tertiary"),
        "on-tertiary": token("on-tertiary"),
        "tertiary-container": token("tertiary-container"),
        "on-tertiary-container": token("on-tertiary-container"),
        "tertiary-fixed": token("tertiary-fixed"),
        "tertiary-fixed-dim": token("tertiary-fixed-dim"),
        "on-tertiary-fixed": token("on-tertiary-fixed"),
        "on-tertiary-fixed-variant": token("on-tertiary-fixed-variant"),
        error: token("error"),
        "on-error": token("on-error"),
        "error-container": token("error-container"),
        "on-error-container": token("on-error-container"),
        // Redesign proof of concept ("playful" look), used by the shell, the Guest
        // List and the side panels. Tokens like the rest, so dark mode can swap them.
        ink: token("play-ink"),
        cream: { DEFAULT: token("play-cream"), light: token("play-cream-light") },
        sky: { DEFAULT: token("play-sky"), deep: token("play-sky-deep"), soft: token("play-sky-soft") },
        periwinkle: { DEFAULT: token("play-periwinkle"), deep: token("play-periwinkle-deep") },
        butter: { DEFAULT: token("play-butter"), deep: token("play-butter-deep") },
        mint: { DEFAULT: token("play-mint"), soft: token("play-mint-soft") },
        coral: { DEFAULT: token("play-coral"), soft: token("play-coral-soft") },
        sidebar: token("play-sidebar"),
        lilac: token("play-lilac"),
        peach: token("play-peach"),
        // The logo's lettering stays paper white on the blue in either theme.
        paper: "#fdf5e6",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        base: "8px",
        gutter: "24px",
        "margin-mobile": "16px",
        "margin-desktop": "40px",
        sidebar_width: "260px",
        topbar_height: "80px",
      },
      fontFamily: {
        "display-lg": ["Quicksand", "sans-serif"],
        "headline-lg": ["Quicksand", "sans-serif"],
        "headline-md": ["Quicksand", "sans-serif"],
        "headline-lg-mobile": ["Quicksand", "sans-serif"],
        "title-lg": ["Be Vietnam Pro", "sans-serif"],
        "body-lg": ["Be Vietnam Pro", "sans-serif"],
        "body-sm": ["Be Vietnam Pro", "sans-serif"],
        "label-lg": ["Be Vietnam Pro", "sans-serif"],
        "label-md": ["Be Vietnam Pro", "sans-serif"],
        // The guests' RSVP pages only: a quiet sans for the text, a display serif
        // for the titles (Cormorant stands in for The Seasons, which we can't
        // licence), and a script for the couple's signature (Allura, a free
        // look-alike for Brigovin, which reads too thin on a phone).
        // Redesign proof of concept: a hand-lettered body, a chunky display face
        // for page titles, and a bubbly one for the logo.
        playful: ["Itim", "Be Vietnam Pro", "sans-serif"],
        "playful-display": ["Lilita One", "Quicksand", "sans-serif"],
        "playful-logo": ["Chewy", "Quicksand", "cursive"],
        guest: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        "guest-display": ["Cormorant", "Times New Roman", "serif"],
        "guest-script": ["Allura", "cursive"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "headline-lg-mobile": ["28px", { lineHeight: "36px", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "title-lg": ["19px", { lineHeight: "26px", fontWeight: "600" }],
        "body-lg": ["17px", { lineHeight: "26px", fontWeight: "400" }],
        "body-sm": ["15px", { lineHeight: "22px", fontWeight: "400" }],
        "label-lg": ["19px", { lineHeight: "24px", letterSpacing: "0.02em", fontWeight: "700" }],
        "label-md": ["13px", { lineHeight: "18px", letterSpacing: "0.05em", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};
