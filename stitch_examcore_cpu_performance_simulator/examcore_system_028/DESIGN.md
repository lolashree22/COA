---
name: EXAMCORE — SYSTEM 028
colors:
  surface: '#fcf9f1'
  surface-dim: '#dddad2'
  surface-bright: '#fcf9f1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3eb'
  surface-container: '#f1eee6'
  surface-container-high: '#ebe8e0'
  surface-container-highest: '#e5e2da'
  on-surface: '#1c1c17'
  on-surface-variant: '#444938'
  inverse-surface: '#31312b'
  inverse-on-surface: '#f4f1e9'
  outline: '#757966'
  outline-variant: '#c4c9b2'
  surface-tint: '#4d6700'
  primary: '#4d6700'
  on-primary: '#ffffff'
  primary-container: '#c8f169'
  on-primary-container: '#516d00'
  inverse-primary: '#add450'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#5e5f58'
  on-tertiary: '#ffffff'
  tertiary-container: '#e4e3da'
  on-tertiary-container: '#64655e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c8f169'
  primary-fixed-dim: '#add450'
  on-primary-fixed: '#151f00'
  on-primary-fixed-variant: '#394d00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#e4e3da'
  tertiary-fixed-dim: '#c7c7be'
  on-tertiary-fixed: '#1b1c17'
  on-tertiary-fixed-variant: '#464741'
  background: '#fcf9f1'
  on-background: '#1c1c17'
  surface-variant: '#e5e2da'
typography:
  headline-2xl:
    fontFamily: Syne
    fontSize: 5.5rem
    fontWeight: '800'
    lineHeight: '0.92'
    letterSpacing: -0.04em
  headline-2xl-mobile:
    fontFamily: Syne
    fontSize: 3rem
    fontWeight: '800'
    lineHeight: '0.95'
    letterSpacing: -0.03em
  headline-xl:
    fontFamily: Syne
    fontSize: 3.75rem
    fontWeight: '700'
    lineHeight: '0.96'
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Syne
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Syne
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: '1.05'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Syne
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.15'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Syne
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: 0em
  body-lg:
    fontFamily: Space Mono
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: -0.01em
  body-md:
    fontFamily: Space Mono
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.55'
    letterSpacing: 0em
  body-sm:
    fontFamily: Space Mono
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.02em
  label-lg:
    fontFamily: Space Mono
    fontSize: 0.875rem
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-md:
    fontFamily: Space Mono
    fontSize: 0.75rem
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Space Mono
    fontSize: 0.625rem
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: 0.1em
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 2rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style

This design system operates at the collision point of mid-century Swiss International Typographic Style, mission-critical industrial telemetry panels, and high-impact brutalist digital surfaces. It rejects ornamental skeuomorphism, soft blurs, and gradient-driven interfaces in favor of raw architectural precision, uncompromising typographic hierarchy, and structural legibility.

### Personality & Attitude
- **Architectural & Rigorous:** Structural grid lines delineate surfaces rather than implied soft boundaries. Form follows computational logic.
- **Kinetic Tension:** Expressive, sculpturally bold display typography confronts ultra-dense, mechanical monospaced telemetry data.
- **Instrumental Pragmatism:** Every pixel, border, and metric exists as an operational readout. Color is deployed strictly as semantic charge or active operational signal rather than aesthetic filler.

### Visual Style
A hyper-flat, high-contrast brutalist framework defined by zero-radius boundaries, razor-sharp 1px structural grid matrices, massive negative space, and surgical injections of acid lime against warm, non-sterile ivory surfaces.

## Colors

The palette leverages a calibrated high-contrast relationship between deep pitch-black structural ink, raw warm ivory substrate, and an arresting acid lime accent.

### Palette Architecture
- **Primary Accent (`#C8F169`):** High-voltage acid lime. Reserved strictly for active execution states, high-priority primary triggers, current selection indicators, and critical telemetry alerts.
- **Secondary (`#151515`):** Near-black carbon ink. Forms all structural boundaries, primary typography, dense containers, and high-emphasis visual anchors.
- **Neutral Substrate (`#F3F0E8`):** Warm unbleached paper/ivory. Serves as the primary canvas and base surface, softening ocular fatigue while preserving stark contrast against the black structural ink.
- **Tertiary & Technical (`#92928A`):** Muted slate grey. Applied to grid crosshairs, dimensional axes, metadata captions, hardware timestamps, and inactive wireframes.
- **Status & Diagnostic Signaling:**
  - **Alert / Failure:** `#E54D2E` (Crimson Orange)
  - **Nominal / Verified:** `#2B8A3E` (Industrial Green)
  - **Sub-System Link:** `#151515` inverted against `#F3F0E8`

### Color Rules
- Background fills remain flat `#F3F0E8` or structural blocks of solid `#151515`.
- Never use gradients, drop shadow tints, or translucent color washes.
- Acid lime (`#C8F169`) must never be paired with light text; always pair it with `#151515` to preserve strict WCAG AAA contrast ratios.

## Typography

The typography system sets up a deliberate, high-voltage tension between the fluid, sculptural geometry of **Syne** and the rigid, calculated pulse of **Space Mono**.

### Display & Headlines (Syne)
- Used for editorial impact, section declarations, system index names, and prominent thematic titles.
- Rendered with ultra-tight line heights and negative tracking to achieve an architectural, printed poster presence.
- Retains structural gravitas at all scales, operating as visual weight rather than merely functional text.

### Telemetry & Instrumentation (Space Mono)
- Deployed across all body copy, interaction elements, data tables, metrics, indexes, and micro-labels.
- All technical markers and micro-labels (`label-sm`, `label-md`) are set in uppercase with deliberate positive letter spacing to simulate industrial hardware engravings.
- Preserves absolute vertical and horizontal character alignment across tabular telemetry screens.

## Layout & Spacing

The layout model is anchored in Swiss grid discipline and raw brutalist framing. The canvas is partitioned via visible, hair-thin coordinate lines that organize space into strict technical fields.

### Grid Framework
- **Desktop (≥ 1280px):** 12-column fluid grid bounded by a `3rem` (`margin-lg`) margin and `2rem` (`gutter-lg`) gutters. Layout modules snap to explicit continuous lines.
- **Tablet (768px – 1279px):** 8-column layout with `2rem` (`margin-md`) outer margins and `1.5rem` (`gutter-md`) gutters.
- **Mobile (< 768px):** 4-column layout with `1rem` (`margin`) outer margins and `1rem` (`gutter`) gutters. Modules stack into continuous bordered cells.

### Spacing Philosophy
- Spacing is rhythmic and strict, adhering strictly to multiples of `0.25rem` (4px baseline).
- Elements are encased inside perimeter grids rather than floating in arbitrary white space.
- Internal component padding relies on `space-sm` for dense data strips and `space-md` to `space-lg` for interactive modules.

## Elevation & Depth

This system operates entirely on a single geometric plane. Standard depth mechanisms such as atmospheric drops, layered blur filters, or progressive ambient shadows are entirely absent.

### Techniques for Visual Hierarchy
- **1px Structural Wireframes:** Containers, panels, and data fields are defined by a crisp 1px solid border (`#151515` or muted `rgba(21, 21, 21, 0.2)` for interior subdivisions).
- **High-Contrast Surface Inversion:** Depth is communicated through mass inversion. Elevating an active viewport or active cell is accomplished by switching its fill from `#F3F0E8` to `#151515` with crisp `#F3F0E8` or `#C8F169` text.
- **Hard Technical Offset Shadows:** When physical separation is functionally mandated (e.g., active modals or floating toolheads), use an unblurred 2px to 4px hard black drop offset (`box-shadow: 3px 3px 0px #151515`).
- **Surface Nesting:** Embedded sub-assemblies use `#151515` keylines, creating an interlocking architectural matrix akin to printed schematics or hardware control racks.

## Shapes

The interface geometry is entirely uncompromising: **0px border radius across every interactive element, container, input, and badge.**

### Geometric Principles
- **Total Orthogonality:** Rectilinear purity ensures every element locks tightly to adjacent layout tracks without dead space or softened contours.
- **Structural Integrity:** Corners remain razor sharp to reinforce the feeling of precision machinery, punch cards, and blueprints.
- **Dividers & Cut-Points:** Structural separations are created using full-width 1px solid rule lines, notched borders, and clean square geometry.

## Components

### Buttons & Triggers
- **Primary:** Background in `#C8F169`, 1px solid `#151515` border, text in `#151515` (`Space Mono`, `label-md`). Hover state inverts to `#151515` fill with `#C8F169` text. Zero corner radius.
- **Secondary / Ghost:** Background in `#F3F0E8`, 1px solid `#151515` border, text in `#151515`. Hover state swaps background to `#151515` and text to `#F3F0E8`.
- **System Destructive:** Background in `#E54D2E`, 1px solid `#151515` border, text in `#F3F0E8`.
- **Sizing:** Strict internal padding (`0.5rem 1rem` for standard, `0.25rem 0.5rem` for compact data-strip triggers).

### Chips & Badges
- Encapsulated monospaced tags (`label-sm`) with 1px solid borders in `#151515`.
- Inactive badges use `#F3F0E8` background and `#92928A` border/text.
- Status badges feature a leading square character marker (`■`) in `#C8F169`, `#E54D2E`, or `#151515`.

### Input Fields & Controls
- **Inputs:** Flat containers with 1px solid `#151515` borders, filled with `#F3F0E8`. Text set in `body-md` (`Space Mono`). Focus state is indicated by a 2px solid `#151515` outline or a solid `#C8F169` active perimeter highlight.
- **Checkboxes & Radios:** Sharp square geometries (0px radius). Checked status is signaled by a solid `#151515` or `#C8F169` internal fill box, omitting rounded circular motifs entirely.

### Cards & Telemetry Containers
- Enclosed modules with an outer 1px solid `#151515` border.
- Headers are constructed as distinct top technical strips separated by a 1px horizontal rule, containing an uppercase system identifier (`label-sm`), timestamp, and state flag.
- Canvas areas inside containers maintain flat, non-elevated surfaces.

### Lists & Data Tables
- Continuous horizontal rows partitioned by 1px solid hairline rules (`rgba(21, 21, 21, 0.15)`).
- Alternate row striping is prohibited; hover feedback uses a flat background change to `#C8F169` or solid `#151515` with inverted content.
- Headers are fixed, sticky, uppercase, and tracked out (`label-sm`).