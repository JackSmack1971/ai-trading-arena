---
version: alpha
name: Arena OS
description: "Cyber-research dark arena for AI-vs-AI paper trading simulations. Raw observability meets terminal density. Neon signal accents pulse against void-black surfaces in a competitive research aesthetic built for developer-grade clarity."
colors:
  # ── Surface Hierarchy (colorimetric depth; no shadows ever) ──────────────
  void: "#0A0A0A"
  surface: "#111115"
  surface-raised: "#18181E"
  surface-high: "#222228"

  # ── Structural Chrome ─────────────────────────────────────────────────────
  border: "#2A2A33"
  border-active: "#3D3D4A"

  # ── Text Weight Ladder ────────────────────────────────────────────────────
  text-high: "#F0F0F0"
  text-mid: "#8A8A9A"
  text-low: "#6B6B7A"
  text-on-bright: "#0A0A0A"

  # ── Trade Signal Pair (exclusive semantic ownership) ──────────────────────
  long: "#22C55E"
  long-dim: "#052814"
  short: "#EF4444"
  short-dim: "#2D0A0A"

  # ── Agent Identity Accents ────────────────────────────────────────────────
  alpha: "#00E5FF"
  alpha-dim: "#0A2A30"
  beta: "#A78BFA"
  beta-dim: "#1A0D3B"

  # ── Risk System ───────────────────────────────────────────────────────────
  warn: "#F59E0B"
  warn-dim: "#2A1A00"

typography:
  # ── Arena Identity (Space Grotesk) ────────────────────────────────────────
  display:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "-0.03em"

  heading-lg:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"

  heading-md:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3

  # ── UI Prose (Inter) ──────────────────────────────────────────────────────
  body-md:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5

  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5

  label-caps:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    letterSpacing: "0.12em"
    fontFeature: "'cpsp' 1, 'tnum' 1"

  # ── Numeric Data (JetBrains Mono — tabular numerals mandatory) ────────────
  data-lg:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.1
    fontFeature: "'tnum' 1"

  data-md:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.2
    fontFeature: "'tnum' 1"

  data-sm:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
    fontFeature: "'tnum' 1"

  code:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "'calt' 1, 'liga' 1"

spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  xxl: "80px"
  grid-columns: 12

rounded:
  none: "0px"
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "12px"
  full: "9999px"

components:
  # ── Primary CTA (Launch / Simulate) ───────────────────────────────────────
  button-cta:
    backgroundColor: "{colors.long}"
    textColor: "{colors.text-on-bright}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
    height: "40px"

  button-cta-hover:
    backgroundColor: "#16A34A"
    textColor: "{colors.text-on-bright}"

  button-cta-disabled:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.text-low}"

  # ── Secondary Ghost Controls (Export / Replay / Configure) ────────────────
  button-ghost:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-high}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
    height: "36px"

  button-ghost-hover:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.text-high}"

  button-ghost-disabled:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-low}"

  # ── Danger (Emergency Stop / Arena Reset) ─────────────────────────────────
  button-danger:
    backgroundColor: "{colors.short}"
    textColor: "{colors.text-on-bright}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
    height: "40px"

  button-danger-hover:
    backgroundColor: "#DC2626"
    textColor: "{colors.text-on-bright}"

  # ── Agent Identity Badges ─────────────────────────────────────────────────
  badge-alpha:
    backgroundColor: "{colors.alpha-dim}"
    textColor: "{colors.alpha}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.xs}"
    padding: "{spacing.xs}"

  badge-beta:
    backgroundColor: "{colors.beta-dim}"
    textColor: "{colors.beta}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.xs}"
    padding: "{spacing.xs}"

  # ── Simulation Safety Fixture (always visible) ────────────────────────────
  badge-sim:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-mid}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.xs}"
    padding: "{spacing.xs}"

  # ── Trade Signal Badges ───────────────────────────────────────────────────
  badge-long:
    backgroundColor: "{colors.long-dim}"
    textColor: "{colors.long}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.xs}"
    padding: "{spacing.xs}"

  badge-short:
    backgroundColor: "{colors.short-dim}"
    textColor: "{colors.short}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.xs}"
    padding: "{spacing.xs}"

  # ── Risk & Operational Badges ─────────────────────────────────────────────
  badge-warn:
    backgroundColor: "{colors.warn-dim}"
    textColor: "{colors.warn}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.xs}"
    padding: "{spacing.xs}"

  badge-risk-block:
    backgroundColor: "{colors.short-dim}"
    textColor: "{colors.short}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.xs}"
    padding: "{spacing.xs}"

  badge-noop:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.text-mid}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.xs}"
    padding: "{spacing.xs}"

  # ── Feed Health Pills (pill shape exclusively reserved for these) ──────────
  pill-feed-ok:
    backgroundColor: "{colors.long-dim}"
    textColor: "{colors.long}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
    height: "20px"

  pill-feed-error:
    backgroundColor: "{colors.short-dim}"
    textColor: "{colors.short}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
    height: "20px"

  pill-feed-warn:
    backgroundColor: "{colors.warn-dim}"
    textColor: "{colors.warn}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
    height: "20px"

  # ── Agent Cards ───────────────────────────────────────────────────────────
  card-agent:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"

  card-agent-active:
    backgroundColor: "{colors.surface-high}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"

  # ── Market View Canvas ────────────────────────────────────────────────────
  card-market:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"

  # ── Telemetry Sub-Panels ──────────────────────────────────────────────────
  card-telemetry:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"

  # ── Agent Thesis Drawer Content ───────────────────────────────────────────
  card-thesis:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"

  # ── Scoreboard Rows ───────────────────────────────────────────────────────
  card-scoreboard:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"

  card-scoreboard-leader:
    backgroundColor: "{colors.surface-high}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
---

## Overview

Arena OS is a **Research-Grade Cyber Arena** for AI agent vs. AI agent paper trading simulations. The visual identity is built on three hard-wired principles: void dominance, signal precision, and research clarity.

**Void dominance**: `{colors.void}` saturates 70–80% of any given viewport. The vast darkness between panels is structural — it performs the same function as white space in traditional design, but with a competitive nocturnal quality that reads as instrumentation, not emptiness. The arena does not fill space; it stages content.

**Signal precision**: Neon signal accents (`{colors.long}`, `{colors.short}`, `{colors.alpha}`, `{colors.beta}`) are not decorative. Each carries a singular, exclusive semantic meaning. Signal colors activate only when an agent is live, a trade fires, or a risk event surfaces. At rest, only the dim-surface badge variants are shown. This discipline is what makes a signal readable in a dense multi-panel layout during a long simulation run.

**Research clarity**: The arena is always `SIMULATION ONLY — LOCAL PAPER ARENA`. This is a non-negotiable persistent fixture, not a screen-level disclaimer. Every CTA reads "SIMULATE" or "LAUNCH" — never "TRADE", "BUY", or "SELL". The audience — quantitative developers, LLM experimenters, and open-source researchers — must never receive a visual cue suggesting real capital is at risk.

**Three-family type system**: Space Grotesk owns arena identity and navigation hierarchy. Inter owns UI labels, prose, and supporting body copy. JetBrains Mono is the mandatory font for every numeric value, equity figure, percentage, latency reading, and timestamp in the system — no exceptions.

## Colors

The palette is a strict **functional hierarchy**: one void plane, three surface elevation steps, a text weight ladder, a closed trade signal pair, two isolated agent identity channels, and a risk warning channel.

- **Void (`{colors.void}`, #0A0A0A)**: The absolute canvas ground plane. Fills the viewport background. Also used as `{colors.text-on-bright}` (text on bright CTA buttons). Never assigned as a component surface background.
- **Surface (`{colors.surface}`, #111115)**: Default card and panel layer. Agent Cards, the Market View container, the fixed top bar, and the Trade Tape tray all live at this elevation.
- **Surface Raised (`{colors.surface-raised}`, #18181E)**: Second-tier elevation. Used for telemetry sub-panels, thesis expansion drawers, tooltips, and ghost button fills. Provides perceivable contrast against `{colors.surface}` without any shadow artifact.
- **Surface High (`{colors.surface-high}`, #222228)**: Active and focused state layer. Drives `card-agent-active`, hover fills for ghost controls, the leading scoreboard row, and disabled button backgrounds.
- **Border (`{colors.border}`, #2A2A33)**: Default hairline separator. Applied as `border: 1px solid` on all card containers and panel divisions.
- **Border Active (`{colors.border-active}`, #3D3D4A)**: Focus ring state. Applied as `outline: 2px solid` on `:focus-visible`. Never suppressed.
- **Text High (`{colors.text-high}`, #F0F0F0)**: Primary readable text. All critical numeric values, thesis narrative, event log content, and primary UI labels.
- **Text Mid (`{colors.text-mid}`, #8A8A9A)**: Supporting metadata — timestamps, secondary labels, simulation badge text. Verified **5.44:1** contrast on `{colors.void}` and **5.59:1** on `{colors.surface-raised}`. WCAG 2.1 AA compliant.
- **Text Low (`{colors.text-low}`, #6B6B7A)**: **Disabled-UI-only token. WCAG 1.4.3 exempt.** Never assign to live informational content. Restricted exclusively to disabled button labels and inactive input placeholders where the visual affordance of "unavailable" is the primary communication. Any use on informational content will produce an inaccessible interface.
- **Text On Bright (`{colors.text-on-bright}`, #0A0A0A)**: Text rendered on luminous accent surfaces (CTA buttons, active signal badges). Achieves **8.7:1** on `{colors.long}` and maintains legibility across all bright signal backgrounds.
- **Long (`{colors.long}`, #22C55E)**: Positive P&L, buy/long orders, and bullish agent actions. Exclusively semantic — **this color carries zero decorative meaning in the system**. Never use for general "success" states unrelated to a trade signal.
- **Long Dim (`{colors.long-dim}`, #052814)**: Resting background for long badges. Verified **6.98:1** contrast against `{colors.long}`.
- **Short (`{colors.short}`, #EF4444)**: Negative P&L, sell/short orders, and risk-blocked events. Symmetric semantic ownership to `{colors.long}`. Never repurpose for UI error states outside the trade signal context.
- **Short Dim (`{colors.short-dim}`, #2D0A0A)**: Resting background for short badges. Verified **4.85:1** contrast against `{colors.short}`.
- **Alpha (`{colors.alpha}`, #00E5FF)**: Exclusive identity accent for Agent A. Activated on the Agent A card border, scoreboard Alpha row, chart overlay legend, and trade tape entries from Agent A. **Never applied to Agent B elements.**
- **Alpha Dim (`{colors.alpha-dim}`, #0A2A30)**: Agent Alpha badge background. Verified **9.8:1** contrast against `{colors.alpha}`.
- **Beta (`{colors.beta}`, #A78BFA)**: Exclusive identity accent for Agent B. Symmetric logic to Alpha. The two agent accents are visually distinguishable at all times; they must never be swapped within a session.
- **Beta Dim (`{colors.beta-dim}`, #1A0D3B)**: Agent Beta badge background. Verified **6.63:1** contrast against `{colors.beta}`.
- **Warn (`{colors.warn}`, #F59E0B)**: Rate-limit proximity warnings, strategy validation failures, and feed degradation alerts. Distinct from `{colors.short}` — warn signals an operational system condition, not a trade direction. Never used for trade signal labeling.
- **Warn Dim (`{colors.warn-dim}`, #2A1A00)**: Warning badge background. Verified **7.87:1** contrast against `{colors.warn}`.

## Typography

Three font families establish strict domain separation. The split is not aesthetic preference — it encodes information architecture:

- **Space Grotesk** owns arena identity, run-level displays, and navigation hierarchy.
- **Inter** owns all UI labels, body prose, and non-numeric supporting copy.
- **JetBrains Mono** owns every numeric value in the system without exception. Prices, equity figures, percentages, token counts, latency readings, timestamps, and schema IDs all render in a `data-*` class.

**Tabular numeral mandate**: All `data-*` classes carry `'tnum' 1` via `fontFeature`. Columns of values in the trade tape, telemetry panel, and scoreboard must align vertically — this enables rapid visual diffing between Agent A and Agent B figures without scanning individual digits.

- `display` — Arena header displays, onboarding wizard step headings, run result summaries. Tightly tracked at -0.03em with compressed 1.0 leading. Always title-case or uppercase; never sentence-case.
- `heading-lg` — Sidebar panel titles and Agent Decision Drawer headers. Negative tracking (-0.01em) maintains authority at medium scale.
- `heading-md` — Agent card section headers, scoreboard column headers, sub-panel labels.
- `body-md` — Agent thesis narrative, strategy descriptions, and event log entries. **Maximum 72 characters per line** within the Thesis Drawer for long-session readability. Line length enforcement is mandatory — do not allow full-width prose in narrow drawers.
- `body-sm` — Secondary metadata: feed pill labels, tooltip body, bottom tray summary preview text.
- `label-caps` — All uppercase button labels, badge text, column headers, and tab labels. Capital spacing (`'cpsp' 1`) applied. Tabular numerals active for count displays within labels (e.g., "14 EVENTS", "3 REJECTS").
- `data-lg` — Primary equity totals, the scoreboard P&L delta, run-level portfolio value. 1.1 leading enables tight vertical stacking of Agent A and Agent B values without ambiguity.
- `data-md` — Per-position values, drawdown percentages, spread readings on the Market View ribbon.
- `data-sm` — Timestamped trade tape entries, all telemetry panel readings (latency ms, token count, schema validation rate), and price axis labels within the Lightweight Charts canvas.
- `code` — Raw JSON evidence blocks inside the Thesis Drawer, NOOP schema repair logs, and strategy manifest previews. Ligature support (`'calt' 1, 'liga' 1`) active for JetBrains Mono's contextual ligature set.

## Layout & Spacing

Arena OS uses a **12-column CSS Grid** derived from `{spacing.grid-columns}` as the desktop scaffold. Viewport maximum: `1800px` centered with `margin: 0 auto`.

**Panel split (desktop ≥ 1280px)**:
- Left Sidebar: ~2.5 columns (≈20%). Agent Cards stack vertically. Min-width 260px, max-width 340px. Resizable via `@radix-ui/react-separator` with a drag handle.
- Center Panel: ~7 columns (≈58%). Lightweight Charts price canvas + equity overlay lines. Hard minimum 600px. Fills remaining space with `flex: 1`.
- Right Sidebar: ~2.5 columns (≈20%). Live Scoreboard, risk gate status, and projected winner readout. Mirrors left sidebar sizing constraints.
- Bottom Tray: Full-width, collapsible. Collapsed: 40px (single-row tape summary). Expanded: 260px maximum. Transition via CSS `height` with `overflow: hidden`; no JS animation library required.

**Fixed Top Bar**: Height 48px. `background-color: {colors.surface}`. `border-bottom: 1px solid {colors.border}`. Contents from left to right: run-status pill → feed health indicators (`pill-feed-*`) → elapsed timer in `{typography.data-md}` → current symbol → replay controls (`button-ghost`) → `badge-sim` anchored to the far right edge. The `badge-sim` element **never moves, hides, or shrinks**.

**Spacing rhythm**: Base unit is `{spacing.xs}` (4px). All spacing values are multiples of this unit — never use arbitrary pixel values outside the token scale.
- `{spacing.xs}` (4px): Badge padding, tight chip gaps, icon-to-label offsets.
- `{spacing.sm}` (8px): Compact data surface padding (`card-market`, `card-telemetry`), ghost button padding.
- `{spacing.md}` (16px): Readable content card padding (`card-agent`, `card-thesis`), CTA button padding.
- `{spacing.lg}` (24px): Between stacked agent cards, between chart and sidebar columns.
- `{spacing.xl}` (48px): Between major semantic sections (top bar to panel grid).
- `{spacing.xxl}` (80px): Onboarding wizard container vertical padding.

**Mobile breakpoint (<768px)**: Panels collapse to single-column vertical stack: Fixed Top Bar → Scoreboard → Market View (height 300px) → Agent Cards (horizontal scroll row) → Bottom Tray (always expanded). Arena is desktop-primary; mobile is secondary monitoring only.

## Elevation & Depth

Arena OS uses **colorimetric-only depth**. Box shadows, drop shadows, and `filter: drop-shadow()` are permanently banned from the rendering output. No generation context, however well-intentioned, overrides this constraint.

Depth is communicated exclusively through the surface tonal sequence:
1. `{colors.void}` — Ground plane: the viewport canvas.
2. `{colors.surface}` — Base layer: primary panels, cards, and the top bar.
3. `{colors.surface-raised}` — Raised layer: drawers expanded over base panels, tooltips, inline sub-panels.
4. `{colors.surface-high}` — Active/focus layer: the currently focused card, the hover fill state, the leading scoreboard row.

**Hairline borders** are the sole structural separator. Apply `border: 1px solid {colors.border}` to all card containers. For keyboard focus states, apply `outline: 2px solid {colors.border-active}; outline-offset: 2px` — never `outline: none`.

**Agent active "glow"**: When an agent holds an open position, its card transitions to `card-agent-active` and receives `border: 2px solid {colors.alpha}` (Agent A) or `border: 2px solid {colors.beta}` (Agent B). This high-chroma border against the void reads as luminous activation without blur, shadows, or filter effects.

**Z-index scale** (enforce via CSS custom properties — define in `:root`):
- `--z-base: 0` — Panel surfaces and inert content
- `--z-overlay: 10` — Expanded bottom tray, sticky top bar
- `--z-drawer: 20` — Agent decision drawers, replay modal
- `--z-tooltip: 30` — Tooltips, model picker dropdowns
- `--z-toast: 40` — Sonner toast notifications (NOOP alerts, risk block toasts, feed error toasts)

## Shapes

Shape language is **functionally tiered** — the radius of an element communicates its role in the information hierarchy:

- **Zero radius (`{rounded.none}`)**: The Lightweight Charts price canvas, major structural panel containers, and the primary top bar. Zero rounding signals a data instrument — an element that performs rather than decorates. Apply to surfaces that contain live numerical data.
- **Micro radius (`{rounded.xs}`, 2px)**: All `badge-*` components. Prevents optical harshness at small badge scale without introducing a softness that undermines the arena identity.
- **Standard radius (`{rounded.sm}`, 4px)**: Ghost buttons, `card-telemetry`, and `card-thesis`. The default softened-functional state for interactive elements that are not primary data surfaces.
- **Medium radius (`{rounded.md}`, 6px)**: Agent cards (`card-agent`, `card-agent-active`). Slightly elevated rounding marks agent identity blocks as distinct from flat infrastructure panels.
- **Large radius (`{rounded.lg}`, 12px)**: Modal dialogs, the onboarding wizard container. Provides contextual separation from the sharp arena surfaces, signaling an interruptive layer.
- **Pill (`{rounded.full}`, 9999px)**: **Feed health status pills exclusively** (`pill-feed-ok`, `pill-feed-error`, `pill-feed-warn`). The pill shape is a closed reserved signal for binary live-status indicators. Never apply to buttons, badge components, cards, or chart containers.

## Components

**Buttons**:
- `button-cta` renders "LAUNCH ARENA", "SIMULATE ORDER", or "START REPLAY". Green background (`{colors.long}`) carries deliberate semantic weight: initiating a simulation is a constructive action. Label text must use all-caps via `{typography.label-caps}`. Text must never read "TRADE", "BUY", "SELL", or "EXECUTE".
- `button-ghost` is the workhorse secondary control for Export, Replay, Configure, and Model Picker interactions. Its `{colors.surface-raised}` background distinguishes it from the raw void without competing with the CTA.
- `button-danger` is reserved for Emergency Stop and Arena Reset — destructive simulation-state actions only. Red background is its visual authority; it must never appear as a general-purpose "close" or "cancel" control in non-destructive contexts.
- **Disabled states** (`button-cta-disabled`, `button-ghost-disabled`): Use `{colors.text-low}` per WCAG 1.4.3 disabled-element exemption. This is the only permitted use of `{colors.text-low}`. All disabled buttons must also carry `aria-disabled="true"` and `cursor: not-allowed`.

**Badges** (`badge-*`):
- All badge components use `{typography.label-caps}` — uppercase Inter at 0.625rem, tracked at 0.12em. Visual uniformity across the trade tape, risk event log, and telemetry output is non-negotiable.
- `badge-alpha` and `badge-beta` are strict agent identity markers. They appear on the agent card header, chart overlay legend, and each trade tape entry attributed to that agent. The two accents (`{colors.alpha}` and `{colors.beta}`) are visually unambiguous and must never be swapped between agents during a session.
- `badge-sim` renders the permanent text "LOCAL PAPER ARENA" or "SIMULATION ONLY". It lives in the top bar far-right, always at `--z-overlay`, and is **never hidden, minimized, collapsed, or abbreviated to an icon**. This is an unconditional safety fixture, not a notification.
- `badge-risk-block` fires on every risk gate rejection. It is accompanied by a `border-left: 3px solid {colors.short}` accent on the corresponding trade tape row. Risk blocks are never silently suppressed.
- `badge-noop` fires when an LLM output fails schema validation and the system defaults to no-operation. The neutral gray state (`{colors.surface-high}` background, `{colors.text-mid}` text) communicates that the system handled the failure gracefully — it must not appear alarming, as a NOOP is a safe, expected outcome of schema repair logic.

**Cards**:
- `card-agent` transitions to `card-agent-active` when that agent holds an open position. The active card receives `background-color: {colors.surface-high}` and `border: 2px solid {colors.alpha}` (or `{colors.beta}`). At rest, border width is 1px in `{colors.border}`.
- `card-market` is a zero-radius container for the Lightweight Charts canvas. The chart library manages its internal coordinate padding; the card provides only the `{colors.surface}` background floor. Do not apply additional padding that would offset chart axes.
- `card-thesis` hosts the full agent decision rationale within the Agent Decision Drawer. Thesis narrative renders in `{typography.body-md}` with a hard 72-character line-length cap. Raw JSON evidence blocks render in `{typography.code}` with a `{colors.void}` background inset.
- `card-telemetry` renders compact readouts for LLM latency (ms), token count (input/output), schema validation success rate, and rate-limit queue depth. Data values render in `{typography.data-sm}`; row labels in `{typography.label-caps}`.
- `card-scoreboard-leader` applies to the currently leading agent's scoreboard row. The `{colors.surface-high}` background lift combined with the agent's identity accent border creates an unambiguous visual leader state without any decoration beyond the surface tonal shift.

**Feed Health Pills**:
- Three-state binary indicator: `pill-feed-ok` (green), `pill-feed-error` (red), `pill-feed-warn` (amber). The pill shape (`{rounded.full}`) is exclusively reserved for these live-status elements.
- Rendered in the fixed top bar, one pill per active data provider. Clicking a pill expands a `{colors.surface-raised}` tooltip containing the provider name, last successful timestamp, error reason (if any), and reconnect latency. Tooltip uses `--z-tooltip: 30`.

**Toast Notifications** (via `sonner`):
- NOOP events → render with `badge-noop` coloring: `{colors.surface-high}` background, `{colors.text-mid}` text. Message: "NOOP • Schema repair attempted".
- Risk block events → render with `badge-risk-block` coloring: `{colors.short-dim}` background, `{colors.short}` text. Message includes the rejection reason string.
- Feed error events → render with `pill-feed-error` coloring. Toasts live at `--z-toast: 40`.

**Icons** (via `lucide-react`):
- All icons render in `{colors.text-mid}` at rest and `{colors.text-high}` on hover/active states.
- Icon size: 16px for inline label icons, 20px for standalone controls, 24px for primary navigation actions.
- Never use emoji as UI icons. Never use custom SVG fills that conflict with the signal color palette.

**Focus and Keyboard Navigation**:
- All interactive elements receive `outline: 2px solid {colors.border-active}; outline-offset: 2px` on `:focus-visible`. Never use `outline: none`.
- Trade tape and reasoning timeline support keyboard navigation: `↑`/`↓` arrows scroll entries; `Enter` expands the Agent Decision Drawer; `Escape` collapses.
- All metric displays carry `role="status"` and a descriptive `aria-label` (e.g., `aria-label="Agent Alpha equity: $104,250.00"`). All badge indicators carry `aria-label` matching their full visible text plus role context.

## Do's and Don'ts

**Do:**
- **Do** render every numeric value — equity, P&L, latency, token count, timestamp — in a `data-*` typography class with tabular numerals (`'tnum' 1`) active.
- **Do** keep `badge-sim` visible at all times in the top bar. Its text ("LOCAL PAPER ARENA") must remain readable at all viewport widths above 480px. It is a safety fixture, not a notification.
- **Do** use `{colors.long}` and `{colors.short}` exclusively for P&L direction and trade signal semantics. These two tokens carry zero additional meaning in the system.
- **Do** label every simulation action CTA as "SIMULATE ORDER", "LAUNCH ARENA", "REPLAY FROM HERE", or "RESET ARENA" — never "BUY", "SELL", "TRADE", "EXECUTE", or "LIVE".
- **Do** render every risk gate rejection as `badge-risk-block` in the trade tape with the full rejection reason string. Risk blocks are never hidden, collapsed, or styled as informational.
- **Do** display every NOOP event as `badge-noop` with an associated log entry. A NOOP is a safe, recoverable outcome — render it neutrally, not alarmingly.
- **Do** allow `{colors.void}` to dominate the viewport between panels. Generous negative space is structural, not wasted.
- **Do** apply `border-left: 3px solid {colors.alpha}` (or `{colors.beta}`) to trade tape rows belonging to each respective agent, reinforcing agent identity throughout all data surfaces.

**Don't:**
- **Don't** use `box-shadow`, `text-shadow`, `drop-shadow`, or any CSS filter-based depth property. The depth model is colorimetric only — this constraint is permanent and unconditional.
- **Don't** apply `{rounded.full}` to buttons, badges, cards, or chart containers. The pill shape is reserved exclusively for `pill-feed-*` live-status indicators.
- **Don't** use `{colors.alpha}` or `{colors.beta}` outside their designated agent identity contexts. These accents must not appear on decorative borders, hover highlights, or any element unrelated to that specific agent's live state.
- **Don't** repurpose `{colors.long}` as a generic "success" color for non-trade events. A successful API call is not a long signal. Use `{colors.text-mid}` or `{colors.warn}` for operational system states.
- **Don't** use `{colors.text-low}` on any informational, live, or readable content. It is a disabled-UI-only token under WCAG 1.4.3 exemption. Misuse on live data will produce an inaccessible interface.
- **Don't** mix `{colors.alpha}` and `{colors.beta}` on the same element. Side-by-side comparison must use separate, adjacent elements for each agent's accent — never blend them on a single node.
- **Don't** introduce unapproved accent colors into the system: no purple gradients, no orange highlights, no teal variants beyond `{colors.alpha}`, no blue states. The signal palette is closed.
- **Don't** abbreviate `badge-sim` to an icon, a dot indicator, or a short code. Full text is mandatory. A developer unfamiliar with the product must immediately understand the simulation context without any prior knowledge.
- **Don't** use `{typography.display}` or `{typography.heading-lg}` in sentence-case. Arena identity typography is always uppercase or title-case — lowercase undermines the authority of the display layer.
- **Don't** use `ccxt`, broker SDKs, or any real-execution adapter import in the `apps/web` package. The dashboard has no execution pathway — any component that implies a real transaction (a "confirm order" modal, a live P&L disclaimer, a broker connection status) is a design anti-pattern, not a feature.
