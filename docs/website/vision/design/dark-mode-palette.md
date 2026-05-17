---
title: Dark-mode palette — sibling substrate for the cool-neutral identity
short_title: Dark-mode palette
description: Specifies the dark-mode counterpart to Sophie's cool-neutral light-mode identity (visual-polish-target.md). Defines the surface stack, brand and status luminance shifts, callout title-bar tint percentages, and the card-elevation language used when [data-theme="dark"] is active. Plugs into the three-layer theming graph (ADR 0005) as a token-only extension — components do not change.
tags: [vision, design, dark-mode, typography, components, theming]
---

# Dark-mode palette — sibling substrate for the cool-neutral identity

What Sophie's chapter pages should *look like* under `[data-theme="dark"]`.
Mirrors the rhetorical role [`visual-polish-target.md`](visual-polish-target.md)
plays for light mode: a measurable destination per token, so each per-component
dark-mode VR baseline iterates against a named contract rather than drifting.

The `data-theme` toggle infrastructure already ships
([`packages/astro/src/preferences/theme.ts`](https://github.com/drannarosen/sophie/tree/main/packages/astro/src/preferences/theme.ts)) —
this doc fills in the token values it switches between. No component code
changes; the dark identity is purely a token-layer emission per
[ADR 0005](../../decisions/0005-theming-three-layers.md).

## The largest call — soft dark, not OLED black

Three reasonable dark-mode aesthetics for a long-form reading platform:

| Option | Page bg | Affect | Why |
|---|---|---|---|
| **Soft dark (locked)** | gray-900 (`#111827`) | Restrained, reading-first | Mirrors light-mode's "subtle off-white" decision (gray-50 not pure white); same designed-restraint philosophy applied at the other end |
| True dark / OLED black | gray-950 (`#030712`) | Developer-tools drama | High contrast; ergonomic for short bursts; eye-fatiguing across a chapter |
| Cool-tinted dark (slate) | slate-900 (`#0f172a`) | Linear / Vercel feel | Literal carry of the cool cast across modes; introduces tint-math complications for brand-color contrast validation |

Sophie commits to **soft dark**. The cool-neutral identity is about *what
gets used on the page* (palette + type), not about a literal cool cast in
the substrate. Soft dark is reading-first; OLED black is screen-first; tinted
slate is distinctive but pays for its distinctiveness with substrate-tint
math that complicates every brand-color contrast check. Reading-first wins
on a textbook platform.

## Surface stack

| Token | Light | Dark | Role |
|---|---|---|---|
| `--sophie-bg` | `#f9fafb` (gray-50) | `#111827` (gray-900) | Page substrate |
| `--sophie-surface-1` | `#ffffff` | `#1f2937` (gray-800) | Tier 1 + Tier 2 card body |
| `--sophie-surface-2` | `#f3f4f6` (gray-100) | `#374151` (gray-700) | Hover, secondary elevation |
| `--sophie-surface-3` | `#e5e7eb` (gray-200) | `#4b5563` (gray-600) | Tertiary elevation |
| `--sophie-border` | `#e5e7eb` (gray-200) | `#374151` (gray-700) | Card outer border (1px) |
| `--sophie-border-subtle` | `#f3f4f6` (gray-100) | `#1f2937` (gray-800) | Tier-3 dissolution rule, dividers |
| `--sophie-text` | `#0f1115` | `#f3f4f6` (gray-100) | Body prose |
| `--sophie-text-muted` | gray-500/600 | `#9ca3af` (gray-400) | Small-caps markers, captions |
| `--sophie-text-on-accent` | `#ffffff` | `#ffffff` | White on saturated brand/status fills |

Three judgment calls embedded:

1. **Card border inverts role**. In light mode the `gray-200` border sits
   between a `white` card and a `gray-50` page — *darker* than both, reads as
   a soft shadow line. In dark mode, `gray-700` on a `gray-800` card adjacent
   to a `gray-900` page is *lighter* than both — reads as a soft highlight
   line. Standard dark-mode card-border convention; no contrast loss.

2. **`border-subtle = surface-1` (same hex in dark mode)**. Tier-3 Asides
   live in *page* prose, not inside cards. A `gray-800` stripe on a
   `gray-900` page reproduces the barely-visible dissolution-rule
   relationship light-mode achieves with gray-100-on-gray-50. The token
   names stay distinct because their semantic roles are distinct, even
   when their resolved values coincide in dark.

3. **Body text is gray-100, not pure white**. Same "subtle off-white"
   restraint as the light-mode page-bg decision. Gives ~17:1 contrast on
   gray-900 — well above AAA — without the eye-strain of `#fff` on near-
   black for chapter-length reads.

## Brand and status luminance

The light-mode `brand-{teal,rose,violet}` map already ships with paired
`{fill, text}` values (`anchors.ts`) — `fill` for accent rules and icons,
`text` for title-bar foreground on the pale-tint title bar. Dark mode needs
the *symmetric* asymmetry: `fill` lighter for visibility on `surface-1 =
gray-800`, `text` even lighter for title text on the dark-tinted title bar.

Schema: add `darkBrand` and `darkStatus` maps alongside the existing
`lightSurfaces` map. Explicit values, no derivation magic — auditable
when reviewing per-PR.

### Brand colors

| Color | Light fill | Light text | Dark fill | Dark text |
|---|---|---|---|---|
| `brand-teal` | `#2f8c8d` | `#1f6f70` | `#5eead4` (Tailwind teal-300) | `#99f6e4` (teal-200) |
| `brand-rose` | `#b07a93` | `#8c5a73` | `#fda4af` (rose-300) | `#fecdd3` (rose-200) |
| `brand-violet` | `#6d7794` | `#515a7a` | `#a3acc7` | `#cbd0dc` |

**Brand-violet stays desaturated.** The light variant is essentially slate
— adding saturation in dark mode would shift the brand *identity* (slate
→ indigo), not just the *luminance*. Dark-fill values were derived by
lifting L in OKLCH while holding hue + chroma, so brand-violet reads as
"lighter slate" in dark, not "shiny indigo."

**Brand text in dark goes Tailwind-200, not Tailwind-100.** Title-bar text
needs to stand out against a `color-mix(brand 12%, gray-800)` tint without
becoming the loudest thing on the card. 200-shade pops cleanly; 100-shade
would compete with body-text gray-100 and read as "shouting."

### Status colors

| Status | Light | Dark | Δ |
|---|---|---|---|
| `success` | `#34d399` | unchanged | passes ~10:1 on gray-900 |
| `warning` | `#fbbf24` | unchanged | passes ~11:1 |
| `danger` | `#fb7185` | unchanged | passes ~5:1 |
| `info` | `#2563eb` (true blue) | `#60a5fa` (blue-400) | 3.2:1 → 7:1 |
| `neutral` | `#6b7280` (gray-500) | `#9ca3af` (gray-400) | 3.5:1 → 7:1 |

Bright status colors (success, warning, danger) sit comfortably above the
3:1 non-text-contrast threshold against gray-900 — no rebinding needed.
True blue and mid-luminance gray sit below it; the dark-mode lifts move
both above 7:1. The brand-vs-status split locked in `anchors.ts:33` is
preserved: `status-info` stays visually distinct from `brand-teal` in
both modes.

## Callout title-bar tints

The light-mode `calloutTitleBg` map derives per-variant title-bar tints
via `color-mix(in oklch, <accent> X%, <surface-1>)`. Dark mode needs the
*same derivation* against a *different substrate*, with a *different
percentage* — `color-mix(in oklch, <darkAccent> X%, gray-800)` lands closer
to "barely tinted gray" at the light-mode 8% if not bumped.

Schema change: `{accent, tintPct}` → `{accent, tintPctLight, tintPctDark}`.
Starting values: `tintPctDark = tintPctLight + 4`. Validate per-variant
during VR review; tune individually if any reads off.

| Variant | tintPctLight | tintPctDark |
|---|---|---|
| `info`, `tip`, `warning`, `key-insight`, `misconception`, `definition`, `summary`, `roadmap` | 8 | 12 |
| `caution` | 4 | 6 |
| `danger` | 8 | 12 |

Same split applies to the validation-tracker tint tokens
(`--sophie-validation-{pass,fail,warn,info}-{stripe,bg}`) — they share the
title-bar derivation pattern.

## Card elevation in Tier 1

`--sophie-shadow-card` resolves to **`none`** under `[data-theme="dark"]`.
Soft drop shadows on `gray-800` cards over a `gray-900` page are visually
inert — the shadow color and the page background are within ~3% luminance,
so the shadow has nothing to land on. Inflating shadow opacity would fight
the soft-dark identity (the page would acquire a halo around every Tier 1
card, contradicting the "restrained, reading-first" frame).

Tier 1 vs Tier 2 differentiation in dark mode comes from two contracts that
were already locked in [`visual-polish-target.md`](visual-polish-target.md):

1. **4px vs 3px left rule width** (`--sophie-card-rule-{strong,light}`).
   Unchanged in dark; the brand-color fill is lighter, so the rule remains
   the dominant visual signal.
2. **Border-as-highlight ring**. The 1px `--sophie-border` (gray-700) on a
   gray-800 card adjacent to a gray-900 page reads as a *lighter* outline
   on both sides — cards visually "lift" off the page via the highlight
   ring, not a shadow drop. Standard dark-mode elevation language (macOS,
   Linear, GitHub Dark).

Explicit design statement: *in dark mode, card elevation is signaled by
border weight, not shadow*.

## What Sophie deliberately does *not* match in dark mode

- **Tailwind's `dark:` utility-class pattern.** Sophie's `data-theme="dark"`
  attribute drives a single token-layer emission (per ADR 0005); components
  consume CSS variables that switch substrate-level under the attribute.
  No `dark:bg-gray-900` sprinkled in component classes — the token graph
  owns the switch.
- **Inverted typography weight in dark.** Some dark-mode designs bump body
  weight to compensate for perceived stroke-thinning on dark substrates.
  IBM Plex Sans renders cleanly at weight 400 on both light and dark; no
  inversion needed. Keeps the type system coherent across modes.
- **Per-component dark variants of brand colors.** The 3-teal / 2-violet /
  2-rose allocation locked for Tier 1 (`visual-polish-target.md`) is
  preserved in dark — same components, same brand families, lighter
  luminance values. No re-allocation.

## References

- [Visual polish target](visual-polish-target.md) — the light-mode spec this doc mirrors.
- [`packages/theme/src/anchors.ts`](https://github.com/drannarosen/sophie/tree/main/packages/theme/src/anchors.ts) — where `lightSurfaces`, `darkSurfaces`, `darkBrand`, `darkStatus`, `calloutTitleBg` live.
- [`packages/astro/src/preferences/theme.ts`](https://github.com/drannarosen/sophie/tree/main/packages/astro/src/preferences/theme.ts) — the `data-theme` toggle infra that this palette plugs into.
- [ADR 0005 — Three-layer theming](../../decisions/0005-theming-three-layers.md) — TS tokens → CSS vars → Tailwind preset; dark mode is a token-layer change.
- [ADR 0039 — Lucide-two adapter convention](../../decisions/0039-lucide-two-adapter-convention.md) — icon-fill colors consume the brand `fill` values.
- [ADR 0057 — VR baseline self-hosting](../../decisions/0057-vr-baseline-self-hosting.md) — the infrastructure used to lock dark-mode visual evidence per-component.
- [WS3 completion audit § Section 7 (Backlog P2-1)](../../../reviews/2026-05-16-workstream-3-completion-audit.md) — the audit that surfaced the dark-mode-parity gap this spec closes.
