---
title: Interactive figure target
short_title: Interactive figures
description: The measurable design spec for Sophie interactive figures. Parallel to visual-polish-target.md but specifying the Tier-1+ figure category — Tier-1+ card chrome, role-name pill + underline pattern, KaTeX-for-math, HTML-overlay-over-SVG pattern, oklch role color palette.
tags: [vision, design, interactive-figures, reasoning-os, tier-1-plus]
---

# Interactive figure target

The measurable design spec for the Sophie Interactive Figure category.
Parallel to [visual-polish-target.md](./visual-polish-target.md) but
specifying the **Tier-1+ figure** — the highest-density pedagogical
surface in Sophie. Underwritten by
[ADR 0058](../../decisions/0058-epistemic-component-contract.md) (epistemic
role contract) and
[ADR 0059](../../decisions/0059-linked-representation-state-primitive.md)
(A11 linked-representation primitive).

## Section 1 — Positioning & design principles

**Tier 1+ category.** Interactive figures are the highest-density pedagogical surface in Sophie. A new tier above WS3's Tier-1 card. Tier-1 cards signal *durable concept*; Tier-1+ figures signal *the thing the page exists to demonstrate.* Chapter prose orbits the figure.

**Five principles** (each load-bearing for downstream sections):

1. **Every element earns its pixels.** No defaults; no decoration.
2. **Role is named, not just colored.** Plex Mono uppercase pill + thin color treatment — never Material-Design colored border.
3. **Plot typography is Sophie typography — Plex for prose, LaTeX for math.** Plex Sans for prose labels; Plex Mono `tabular-nums` for pure-numeric readouts; **KaTeX for all math** — subscripts, superscripts, composite units, Greek symbols. Never Unicode math kludges.
4. **Motion is meaning.** 200ms ease-out transitions, oklch-space color lerps, cinematic *what-changed* signaling. Gated by `prefers-reduced-motion`.
5. **Restrained chrome, considered detail.** Tier-1+ card anatomy (1px border, 4px brand left rule, tinted title bar, Lucide icon, Plex semibold title). Inside the card, every magic-number → token; every decision → principle.

## Section 2 — Visual identity (tokens)

**Role color palette** (oklch for perceptual lerping):

| Role | Token | oklch (light) | Meaning |
|---|---|---|---|
| `model` | `--sophie-role-model` | `oklch(58% 0.13 195)` (brand teal) | Confident, "construction" |
| `inference` | `--sophie-role-inference` | `oklch(63% 0.16 12)` (brand rose) | Probabilistic, posterior-coded |
| `observable` | `--sophie-role-observable` | `oklch(48% 0.02 60)` (warm slate) | Data, instrument-coded |
| `approximation` | `--sophie-role-approximation` | `oklch(70% 0.04 60)` (faded amber) | Validity-fades |

Dark variants: L shifted ~+25%.

**Plot-specific colors.** Axis strokes 0.5px in `--sophie-border`; tick labels Plex Sans 11px in `--sophie-text-muted`; **no grid lines** (Tufte); primary curve 2px in `--sophie-role-model`; approximation overlays 1.5px dashed at 70% opacity in `--sophie-role-approximation`; Wien-peak tick 1.5px in `--sophie-role-inference`.

**New typographic token:** `--sophie-text-pill` (0.6875rem, `letter-spacing: 0.06em`) for Plex Mono uppercase role pills.

**Motion vocabulary:**

| What | Duration | Easing |
|---|---|---|
| Numeric readout crossfade | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Color swatch lerp (oklch) | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Slider thumb position | 100ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Hover/focus chrome | 100ms | ease |
| **All** | **0ms** | when `prefers-reduced-motion: reduce` |

**New spacing token:** `--sophie-space-half` (0.125rem).

## Section 3 — Composition & layout

**Tier-1+ card anatomy** (outer container): 1px border `--sophie-border` + 5px radius (`--sophie-radius-sm`) + 4px left rule in `--sophie-role-model` (declares figure's primary role at the edge) + `--sophie-shadow-card` + title-bar tint `color-mix(in oklch, var(--sophie-role-model) 8%, var(--sophie-surface-1))` + Lucide `Telescope` 20px + Plex Sans semibold title.

**Body layout (desktop, top-to-bottom):**

1. Title bar
2. Slider row — Plex Sans label + Radix slider + Plex Mono numeric readout + ghost "Reset to Sun" button (Lucide `Sun` 14px + label)
3. Body — 2:1 split (plot column : readouts aside)
4. Approximation toggles — bottom, dashed amber left rule

Mobile: single column stack.

**Readout group composition** — role-pill *above*, value below, 1px underline beneath in role color. No left-border:

```text
INFERENCE                  ← Plex Mono 11px uppercase, role color
λ_peak = 502 nm            ← KaTeX, 1px underline in role color
```

**Color swatch:** 56×56 circle, `oklch(...)` background lerps on T change (300ms ease-out), 1px ring in `--sophie-border`, accompanying inline KaTeX prose: *chromaticity at $T = 5772\,\mathrm{K}$*.

**Solar-anchor button:** Ghost style — no fill, 1px `--sophie-border`, Plex Sans 14px. Hover fill → `--sophie-surface-elevated`. Lucide `Sun` 14px icon prefix.

## Section 4 — Plot internals (SVG + HTML overlay)

**Architecture: SVG + HTML overlay.** Plot container is `position: relative` div. Observable Plot's SVG inside. Three absolutely-positioned HTML overlays for KaTeX: y-axis label (rotated 90°), x-axis label (centered), Wien-peak tick + label (positioned at x = λ_peak via Plot's scale API). Decouples typography (HTML) from rasterizable geometry (SVG). Stable across Linux/Mac VR (avoids `<foreignObject>`).

**SVG typography (tick labels only):**

```css
.spectrum-plot svg text {
  font-family: var(--sophie-font-sans);
  font-size: 11px;
  fill: var(--sophie-text-muted);
}
```

Plot's own axis labels suppressed via `label: null`.

**Visible-band rendering** — two layers:

1. Base wash: `Plot.rectX` over 380–740 nm, `oklch(85% 0.04 80 / 0.05)` (barely-there).
2. Spectral gradient strip: 6px-tall band at plot top, ~15 discrete `Plot.rectX` bins filled to spectral colors (violet 380 → red 700, oklch-interpolated).

**Wien-peak treatment** — replace full-height dashed line with:

- 12px downward tick at plot top, stroke `--sophie-role-inference` 1.5px
- KaTeX label above tick: $\lambda_\text{peak} = 502\,\mathrm{nm}$
- Position lerps via `transition: left 300ms cubic-bezier(...)` as T changes
- Subtle 1px guide line at 15% opacity from tick down to curve

**Approximation overlays:** both 1.5px in `--sophie-role-approximation` at 70% opacity. RJ dash `[4 3]`, Wien dash `[2 3]`. Future enhancement (deferred): graduated-opacity SVG-linear-gradient stroke for validity-fade.

**Primary spectrum curve:** 2px stroke in `--sophie-role-model`. No crossfade on parameter change — curve snap-redraws. Motion lives in readouts, Wien-peak position, color swatch, slider thumb.
