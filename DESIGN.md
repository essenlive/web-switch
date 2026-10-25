---
name: switch
description: A small line-shifting puzzle game on quiet trays with four tile colors.
colors:
  page-light: "#f3f4f6"
  page-dark: "#101828"
  tray-light: "#ffffff"
  tray-dark: "#0a0a0a"
  ink-light: "#0a0a0a"
  ink-dark: "#fafafa"
  muted-ink: "#737373"
  hairline-light: "#e5e5e5"
  hairline-dark: "#262626"
  tile-red: "#ef4444"
  tile-red-dark: "#dc2626"
  tile-blue: "#3b82f6"
  tile-blue-dark: "#2563eb"
  tile-green: "#22c55e"
  tile-green-dark: "#16a34a"
  tile-yellow: "#eab308"
  tile-yellow-dark: "#ca8a04"
typography:
  title:
    fontFamily: "Nunito, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "normal"
  headline:
    fontFamily: "Nunito, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
  body:
    fontFamily: "Nunito, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: "1.75rem"
  label:
    fontFamily: "Nunito, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
components:
  tray:
    backgroundColor: "{colors.tray-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.lg}"
    padding: "12px"
  tile:
    backgroundColor: "{colors.tile-blue}"
    rounded: "{rounded.sm}"
    size: "24px"
  button-primary:
    backgroundColor: "{colors.ink-light}"
    textColor: "{colors.tray-light}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  icon-tray-button:
    backgroundColor: "{colors.tray-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.lg}"
    padding: "12px"
---

# Design System: switch

## Overview

**Creative North Star: "The Pocket Puzzle"**

A small handheld-era toy. The page is a quiet gray surface; every piece of interface chrome sits on a plain white (near-black in dark) rounded tray; color is reserved for the four tile hues where the game actually lives. Nothing competes with the grid.

The system is icon-first and compact, built for a thumb on a phone: a single centered column no wider than `max-w-xl` (36rem), 16px gutters, trays that hold one icon or one number. Components feel tactile and plain: soft 8px trays, a gentle scale-up on hover, and no decoration.

**Key Characteristics:**
- One neutral surface, one tray color, four tile colors.
- Icon plus number beats labels; trays hold one idea each.
- Light and dark are full peers, switched by the system theme.
- Motion is brief and functional (0.2s fades, small hover scale).

## Colors

A neutral gray page and tray stack with a saturated four-color tile set; no brand accent on chrome.

### Primary
- **Ink** (#0a0a0a light / #fafafa dark): text, icons, and the default button fill. Inverts between themes.

### Neutral
- **Pale Slate Page** (#f3f4f6 light): the page background behind all trays.
- **Midnight Slate Page** (#101828 dark): the dark page background.
- **White Tray** (#ffffff) / **Near-Black Tray** (#0a0a0a): every header cell, score cell, and panel.
- **Muted Ink** (#737373): secondary text.
- **Hairline** (#e5e5e5 light / #262626 dark): borders.

### Tertiary (tile hues)
- **Red / Blue / Green / Yellow** (500 steps light: #ef4444, #3b82f6, #22c55e, #eab308; 600 steps dark: #dc2626, #2563eb, #16a34a, #ca8a04): the four tile values. Empty cells reuse the page color so the grid reads as holes.

### Named Rules
**The Color Lives In The Grid Rule.** Saturated color appears only on tiles. Chrome stays neutral.

**The Shape Backs The Hue Rule.** Per PRODUCT.md, tiles must stay distinguishable without color alone. Each hue carries its own shape (red circle, blue square, green triangle, yellow diamond), and the cursor tile has a foreground ring. Keep that pairing in new tile work.

## Typography

**Display/Body Font:** Nunito (Google Fonts, `display: swap`), sans-serif fallback.

**Character:** Rounded, friendly sans that matches the soft corners; weight, not size, creates hierarchy.

### Hierarchy
- **Title** (700, 1.5rem, 2rem line): the lowercase "switch" wordmark and section titles.
- **Headline** (700, 1.25rem): scores and panel headings.
- **Body** (400, 1.25rem, 1.75rem): About, Rules, and result copy; generous size for mobile.
- **Label** (500, 0.875rem): button text and small captions.

### Named Rules
**The Weight Not Size Rule.** Scores and headings are bold; do not add intermediate sizes.

## Layout

Single centered column, `max-w-xl`, 16px page padding, 8px between every tray (stacks and rows alike); 16px padding inside content trays, 12px inside compact control trays, 12px between groups within a tray, full dynamic viewport height (`min-h-dvh`). The header is a row of trays: a growing wordmark tray plus square icon trays (leaderboard, community, help, theme). The score bar mirrors it: moves on the left, restart and random in the center, highscore on the right. The grid grows to fill the remaining height and centers. Tiles are squares up to 40px that shrink to fit the column, with 8px gaps. Home mode cards are separate natural-height trays, 8px apart, tinted on hover. Boolean options are switches (48x28px track, ink when on), never raw checkboxes. Overlay screens (help) fill the page and stack trays.

## Elevation & Depth

Flat. Depth comes from tonal layering: white tray on pale gray page, near-black tray on dark page. The only shadows are the small ones on shadcn buttons (`shadow-sm`, `shadow-xs`). No blurs or glows.

### Named Rules
**The Tonal Tray Rule.** Separation is a surface step, never a drop shadow.

## Shapes

Soft and consistent: trays use 8px radius (`rounded-lg`), buttons 6px, tiles 4px. Header icon trays (48px, 8px gaps) are square (`aspect-square`). No pills, no sharp corners.

## Components

### Trays
- **Corner Style:** 8px
- **Background:** white / near-black; no border, no shadow.
- **Padding:** 12px for header and score cells, 16 to 32px for content panels.
- **Hover:** scale 1.05 to 1.1 on interactive trays (Framer Motion).

### Buttons
- **Shape:** 6px radius, 36px tall, 16px horizontal padding.
- **Primary:** ink fill, inverse text, `shadow-sm`; 90% opacity on hover.
- **Outline / Ghost / Link:** shadcn variants available; ring-1 focus.
- **Icon button:** a square tray with a 24px Lucide icon.

### Tiles (signature)
24px square, 4px radius, one of four hues; the cursor tile takes the cursor value color; hover scales 1.05; 0.2s opacity fade in and out as rows and columns appear and disappear.

### Navigation
Icon trays in the header; no text labels except the wordmark. Leaderboard and community links carry aria-labels. The help tray is a labelled button; the current page's tray is inverted (ink fill) with aria-current.

## Do's and Don'ts

### Do:
- **Do** put every control on a white / near-black 8px tray over the gray page.
- **Do** keep color to the four tile hues.
- **Do** keep light and dark in parity.
- **Do** favor an icon plus a number over a text label.
- **Do** keep motion at 0.2s fades and small hover scale, and respect reduced motion.

### Don't:
- **Don't** add drop shadows or glows for depth.
- **Don't** introduce a chrome accent color.
- **Don't** rely on hue alone to tell tiles apart in new work.
- **Don't** widen the column past `max-w-xl`.
