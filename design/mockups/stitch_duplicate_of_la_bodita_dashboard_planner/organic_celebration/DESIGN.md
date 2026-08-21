---
name: Organic Celebration
colors:
  surface: '#f5fafa'
  surface-dim: '#d5dbdb'
  surface-bright: '#f5fafa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff5f4'
  surface-container: '#e9efef'
  surface-container-high: '#e4e9e9'
  surface-container-highest: '#dee4e3'
  on-surface: '#171d1d'
  on-surface-variant: '#3d4949'
  inverse-surface: '#2c3132'
  inverse-on-surface: '#ecf2f1'
  outline: '#6d7a79'
  outline-variant: '#bcc9c8'
  surface-tint: '#006a69'
  primary: '#006a69'
  on-primary: '#ffffff'
  primary-container: '#2faead'
  on-primary-container: '#003c3b'
  inverse-primary: '#64d8d7'
  secondary: '#b6231f'
  on-secondary: '#ffffff'
  secondary-container: '#fd574b'
  on-secondary-container: '#5c0004'
  tertiary: '#954920'
  on-tertiary: '#ffffff'
  tertiary-container: '#e28658'
  on-tertiary-container: '#5e2300'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#82f5f3'
  primary-fixed-dim: '#64d8d7'
  on-primary-fixed: '#002020'
  on-primary-fixed-variant: '#00504f'
  secondary-fixed: '#ffdad6'
  secondary-fixed-dim: '#ffb4ab'
  on-secondary-fixed: '#410002'
  on-secondary-fixed-variant: '#93000a'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb693'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#77320a'
  background: '#f5fafa'
  on-background: '#171d1d'
  surface-variant: '#dee4e3'
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

## Brand & Style

The design system is crafted for the wedding planning experience, balancing the logistical complexity of event management with the joy and whimsy of a wedding. It targets couples and professional planners who require high-utility tools that don't feel clinical or cold.

The aesthetic is **Playful Modernism**. It rejects the rigid, perfect symmetry of traditional SaaS products in favor of organic, "blobby" shapes and asymmetric corner radii that feel hand-drawn and human. The UI evokes a sense of celebration through vibrant colors while maintaining clarity through generous whitespace and a persistent architectural structure.

Key visual pillars:
- **Asymmetry:** Intentional variation in roundedness to create a friendly, less "corporate" rhythm.
- **Vibrancy:** High-saturation primary and secondary colors used as functional backgrounds rather than just accents.
- **Tactile Softness:** Elements appear soft to the touch, utilizing subtle gradients and translucent overlays to suggest depth without heavy shadows.

## Colors

The palette is anchored by a sophisticated **Deep Teal** which provides a professional foundation. This is contrasted by **Coral** and **Orange** to inject energy and urgency into the planning process.

### Functional Application
- **Primary (Teal):** Used for the main sidebar, active states, and "Success" or "Task" related metrics.
- **Secondary (Coral):** Reserved for high-importance metrics like Budget tracking and "Urgent" status indicators.
- **Tertiary (Orange):** Used for guest-related data and primary Action Buttons (CTAs) to ensure they stand out against the cool background.
- **Neutral (Gray):** Primarily for secondary text and icons to ensure legibility without competing with the vibrant brand colors.
- **Background:** A very light mint-tinted gray (#F4F8F7) featuring a subtle dotted grid pattern (8px spacing) to reinforce the "planner" or "notebook" feel.

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
- **Primary CTA:** Pill-shaped, tertiary orange (#E28658) background, white text. Large padding (16px vertical, 32px horizontal).
- **Secondary:** Pill-shaped, teal outline or transparent background with teal text.

### Stat Cards
- **Solid Fill:** Cards for "Tasks", "Budget", and "Guests" use full-bleed primary, secondary, and tertiary colors.
- **Icon Container:** Icons within these cards sit inside a circular white container with 20% opacity.
- **Progress Bars:** Highly contrasting pill-shaped tracks (e.g., dark teal bar on a light teal card) to show progress at a glance.

### List Rows
- **Container:** White background with a standard 16px radius.
- **Checkbox:** Circular stroke (not square). When checked, it fills with Teal and shows a white checkmark.
- **Status Pills:** Small, uppercase labels with background colors matching the importance (Red/Coral for Urgent, Gray for Scheduled).

### Navigation
- **Active State:** The active sidebar item features a solid teal background with a "pill" shape and white text/icon.
- **Hover State:** Subtle shift in background color or light gray fill.

### Inputs
- **Search Bar:** Large, pill-shaped input with a light border and a search icon prefix. Background should be white or a slightly lighter tint of the background color.