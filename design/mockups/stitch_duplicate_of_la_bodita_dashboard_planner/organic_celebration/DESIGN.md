---
name: Organic Celebration
colors:
  surface: '#f7f9ff'
  surface-dim: '#d9dff0'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff3fd'
  surface-container: '#e8edfa'
  surface-container-high: '#e1e8f7'
  surface-container-highest: '#d9e1f2'
  on-surface: '#1a1b2e'
  on-surface-variant: '#44485f'
  inverse-surface: '#2e3048'
  inverse-on-surface: '#eff1fb'
  outline: '#737892'
  outline-variant: '#c3c8dc'
  surface-tint: '#624cab'
  primary: '#624cab'
  on-primary: '#ffffff'
  primary-container: '#c1cefe'
  on-primary-container: '#1a1b2e'
  inverse-primary: '#a0ddff'
  secondary: '#624cab'
  on-secondary: '#ffffff'
  secondary-container: '#ef233c'
  on-secondary-container: '#ffffff'
  tertiary: '#7189ff'
  on-tertiary: '#ffffff'
  tertiary-container: '#7189ff'
  on-tertiary-container: '#ffffff'
  error: '#b3261e'
  on-error: '#ffffff'
  error-container: '#f9dedc'
  on-error-container: '#8c1d18'
  primary-fixed: '#e2e6ff'
  primary-fixed-dim: '#c1cefe'
  on-primary-fixed: '#17023f'
  on-primary-fixed-variant: '#4a357f'
  secondary-fixed: '#dfe4ff'
  secondary-fixed-dim: '#c1cefe'
  on-secondary-fixed: '#101643'
  on-secondary-fixed-variant: '#4f5fa8'
  tertiary-fixed: '#d4f0ff'
  tertiary-fixed-dim: '#a0ddff'
  on-tertiary-fixed: '#05202c'
  on-tertiary-fixed-variant: '#1a5e7a'
  background: '#f7f9ff'
  on-background: '#1a1b2e'
  surface-variant: '#d9e1f2'
typography:
  display-lg:
    fontFamily: Quicksand
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Quicksand
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Quicksand
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 19px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  sidebar_width: 260px
  topbar_height: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

> **The palette was replaced after the mockups were exported.** The `screen.png`
> and `code.html` files beside this one still show the original teal / coral /
> orange scheme. Their layout, spacing, type scale and corner-radius guidance is
> still the reference; their **colors are not** - never color-pick from a mockup.
> This file and `frontend/tailwind.config.js` are the only sources of truth for
> color, and they must agree.

## Brand & Style

The design system is crafted for the wedding planning experience, balancing the logistical complexity of event management with the joy and whimsy of a wedding. It targets couples and professional planners who require high-utility tools that don't feel clinical or cold.

The aesthetic is **Playful Modernism**. It rejects the rigid, perfect symmetry of traditional SaaS products in favor of organic, "blobby" shapes and asymmetric corner radii that feel hand-drawn and human. The shapes carry the personality; the color stays quiet, because this is a tool someone opens daily for months.

Key visual pillars:
- **Asymmetry:** Intentional variation in roundedness to create a friendly, less "corporate" rhythm.
- **Calm chrome, loud status:** The furniture of the app is cool and quiet so it can be looked at daily; the RSVP states are vivid so they can be read at a glance. Color is spent where it carries meaning.
- **Tactile Softness:** Elements appear soft to the touch, utilizing subtle gradients and translucent overlays to suggest depth without heavy shadows.

## Colors

The palette has two jobs, and they are kept apart.

**The chrome** is cool and quiet, so the interface recedes: a **Deep Violet**
(#624CAB) for the brand and every action, **Lavender** (#C1CEFE) for the
navigation drawer, and **Sky** (#A0DDFF) for the dotted grid behind every screen.

**The statuses** are three separate hues, chosen so a glance tells you which is
which. They do not belong to the chrome family and are not meant to blend with
it - that legibility is the whole point.

| Token | Value | Role | On white text |
| --- | --- | --- | --- |
| `primary` | `#624CAB` Violet | Brand, headings, active nav, every CTA, **Confirmed** | 6.69:1 |
| `tertiary` | `#7189FF` Periwinkle | **Pending** | 3.12:1 |
| `secondary-container` | `#EF233C` Red | **Declined** | 4.22:1 |
| `primary-container` | `#C1CEFE` Lavender | The drawer, with dark ink | 10.91:1 (ink) |

Confirmed and Pending are neighbours on purpose - two shades of "nothing is
wrong" - with Declined the outlier. Pending is the one color here that does not
clear 4.5:1 against white; see below for how it earns its place anyway.

### The contrast rule that shapes everything

Filled surfaces carry white text, and most colors picked by eye are not dark
enough for that: `#5EB1BF` is 2.47:1 against white, `#F27059` is 2.90:1. There
are two honest ways out, and this system uses both.

**Darken the color.** Cap the saturation (45% is a good ceiling), then lower the
lightness until white clears 4.5:1. Darkening alone is not enough - it turns
`#7189FF` into an electric `#2549FF`, louder than what you started with.

**Or size the type up.** WCAG's threshold drops to 3:1 for large text, which
means **at least 18.66px and bold (700)**, or 24px at any weight. Nothing smaller
qualifies - 14px semibold is still normal text and still needs 4.5:1. This is why
stat card labels are `label-lg` (19px/700) rather than the 12px `label-md` a
caption would normally use: it lets `#7189FF` keep the hue it was chosen for at
3.12:1, and it is what the cards are built around.

**Translucent text must be measured composited.** `opacity-80` white on
`#7189FF` is 2.55:1, not 3.12:1 - below even the large-text bar. Status text is
therefore always full opacity. Reading `color` alone will tell you the wrong
number.

Together these buy a property worth protecting: **a token works as a fill and as
an icon or text on white.** A status icon and its summary card are the same token
and match exactly, instead of the icon needing a darker sibling. Pending's icon
sits at 3.12:1, above the 3:1 required of a graphical object.

One accepted exception: **the lavender drawer** is the single light fill,
carrying dark ink at 10.9:1.

### Functional Application
- **Primary (Deep Violet):** Brand mark, headings, the active nav pill, every
  call to action - and Confirmed. The CTA and the Confirmed status share this
  color by choice; violet is the brand color and the CTA earns it. This is the
  one place a status and an action overlap, and it stays the only one.
- **Status tones (Periwinkle / Red):** Owned by their status and used nowhere
  else, as fills and as icons alike.
- **Lavender:** The navigation drawer only - the single light fill, carrying dark
  ink at 10.9:1.
- **Neutral (Cool Gray):** Secondary text and icons. The ramp is blue-tinted
  (#F7F9FF through #D9E1F2); a mint-tinted neutral fights this palette.
- **Background:** #F7F9FF with a dotted grid at 8px spacing, the dots in Sky at
  55% opacity. At full strength the grid turns the page into a wash.

### Status color

Status colors are the one place the interface is allowed to be loud. Confirmed
`#624CAB`, Pending `#7189FF`, Declined `#EF233C` - the first two close together,
the third deliberately apart, so "somebody said no" is the thing that catches the
eye on a full guest list.

Color is still never the *only* signal: every status carries its own icon
(`check_circle`, `hourglass_empty`, `cancel`), which is what carries the meaning
for anyone who cannot separate the hues. A status icon and its summary card
always use the same token, so they match exactly.

## Typography

This design system uses a dual-font strategy to balance character with readability.

- **Headings:** **Quicksand** is used for all headlines. Its rounded terminals mirror the organic shape language of the UI, creating a cohesive visual identity. Headlines should always use the Bold weight.
- **Body & UI:** **Be Vietnam Pro** provides a clean, contemporary contrast. Its high x-height and geometric clarity make it ideal for data-heavy lists and long-form planning notes.

**Scale:** Large display titles use tight letter spacing to feel impactful. Labels use increased letter spacing and uppercase styling for better scannability in dense interfaces.

## Layout & Spacing

The design system employs a **Fixed Sidebar / Fluid Content** model.

### Grid & Containers
- **Sidebar:** A persistent 260px vertical navigation bar on the left with a subtle border or light elevation.
- **Top Bar:** A 80px horizontal bar for search and global actions.
- **Main Canvas:** Uses a fluid layout with a maximum container width of 1440px. 
- **The Dotted Grid:** The background features a dot pattern at 8px increments. All components should align their outer margins to this 8px base unit.

### Breakpoints
- **Desktop (1024px+):** Full sidebar visible. 3-column grid for stat cards.
- **Tablet (768px - 1023px):** Sidebar collapses to icons or a hamburger menu. 2-column grid for stat cards.
- **Mobile (Under 768px):** Single column layout. Margins reduce to 16px. Top bar becomes the primary navigation anchor.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Soft Transparency** rather than heavy shadows.

- **Surface Tiers:** The background is the lowest level. White "Card" surfaces sit on top with a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)).
- **Translucency:** Use semi-transparent white overlays (opacity 20%) for icon circles within colored cards. This allows the background color to bleed through, maintaining a vibrant but unified look.
- **Gradients:** Subtle, large-scale radial gradients are used for "Blob" features (e.g., the countdown widget) to suggest a 3D organic volume.

## Shapes

The defining characteristic of this design system is its **asymmetric organic geometry**.

- **Feature Cards & Blobs:** Use a varied corner radius (Top-Left: 24px, Top-Right: 8px, Bottom-Right: 24px, Bottom-Left: 32px) to create a custom "squircle" effect.
- **Standard UI Elements:** Secondary elements like input fields or smaller cards use a standard `rounded-lg` (16px) radius.
- **Interactive Elements:** Buttons and status pills are always **Pill-shaped** (fully rounded) to maximize touch-affordance and friendliness.

## Components

### Buttons
- **Primary CTA:** Pill-shaped, deep violet (#624CAB) background, white text. Large padding (16px vertical, 32px horizontal).
- **Secondary:** Pill-shaped, deep violet outline on white with deep violet text.

### Stat Cards
- **Solid Fill:** Full-bleed status tone, white text, white progress bar.
- **Label:** `label-lg` (19px/700) uppercase at full opacity, not a small caption. The size is load-bearing - see the contrast rule above.
- **Grid:** Three across from `lg` up, two on a tablet, one on a phone. Three across a tablet clips the labels.
- **Icon Container:** Icons within these cards sit inside a circular white container with 20% opacity.
- **Progress Bars:** Pill-shaped tracks in the card's own text color (white), so the bar contrasts with the fill the same way the label does.

### List Rows
- **Container:** White background with a standard 16px radius.
- **Checkbox:** Circular stroke (not square). When checked, it fills with deep violet and shows a white checkmark. (Not implemented anywhere yet - see issue #37.)
- **Status Icons:** A filled Material Symbols glyph in the status's own color, right-aligned beside the row's actions. Labels are carried by `aria-label` and a hover title, not by visible text.

### Navigation
- **Drawer:** Lavender (#C1CEFE) with dark ink text throughout.
- **Active State:** The active sidebar item features a solid deep violet background with a "pill" shape and white text/icon.
- **Hover State:** A translucent white fill (`white/40`), which reads on the lavender drawer where a gray fill would not.

### Inputs
- **Search Bar:** Large, pill-shaped input with a light border and a search icon prefix. Background should be white or a slightly lighter tint of the background color.