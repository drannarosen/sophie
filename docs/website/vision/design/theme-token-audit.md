---
title: Theme token audit — gaps to close before visual polish PRs
short_title: Theme token audit
description: Audit of the @sophie/theme token graph and component CSS-module consumption against the visual polish target. Identifies one outstanding bug (8 components reference non-existent tokens), missing token slots needed for Workstream 3, value redirects per the new aesthetic direction, and a recommended order of token operations for the polish sweep.
tags: [vision, design, theme, tokens, audit, workstream-3]
---

# Theme token audit — pre-Workstream-3

The companion to [visual-polish-target.md](./visual-polish-target.md). This
audit names (a) what the current token graph gets right, (b) one outstanding
bug worth a hard fix, (c) the token additions needed before component polish
PRs land, (d) the value redirects from the current warm-cream-paper aesthetic
to the locked cool-neutral aesthetic, and (e) a recommended order for the
Workstream 3 token sweep.

**Scope:** read-only audit. The token *changes* themselves ship as the first
system-level PRs in Workstream 3, not in this doc.

## Section 1 — what's working (the bedrock)

**Zero hardcoded colors across 22 component CSS modules.** A grep for
`#[0-9a-f]{3,8}|rgba?(|hsla?(` against every `*.module.css` returns nothing.
Every color reference goes through a `--sophie-*` token. This is unusual
discipline — most design systems have ~20–30% hardcoded colors after a year
of organic growth. Sophie's structural posture (token-graph-first, ADR 0035
flat-kindless naming, ADR 0005 three-layer theming) paid off.

**Broad token consumption.** Top tokens by usage frequency across components:

| Token | Uses | Role |
|---|---|---|
| `--sophie-surface-1` | 29 | Card backgrounds |
| `--sophie-space-2` | 25 | Small gap/padding |
| `--sophie-text-muted` | 19 | Secondary text |
| `--sophie-border-subtle` | 19 | Subtle dividers |
| `--sophie-space-4` | 16 | Medium padding |
| `--sophie-text` | 15 | Primary text |
| `--sophie-text-sm` | 14 | Small text |
| `--sophie-radius-md` | 11 | Component radius |
| `--sophie-accent` | 11 | Accent color |

The spread is healthy — semantic tokens (`text`, `text-muted`, `border-subtle`)
dominate over scale tokens (`space-*`, `text-*`), which is the right shape.

**Component CSS is dimensionally restrained.** Hardcoded length values
exist (`2px outline-offset`, `999px` pill radii, `1px` SVG strokes, `0.15em`
gaps for inline elements) but are micro-tuning constants, not values that
should have been tokenized. No widespread "8px / 12px / 16px" drift.

## Section 2 — one outstanding bug

**8 components reference tokens that don't exist in the generated CSS.** The
grep for component usage shows references to:

| Referenced token | Actually defined in `theme.css`? | Used by |
|---|---|---|
| `--sophie-color-text` | No (correct: `--sophie-text`) | FigureRef, EquationRef, ChapterRef, Search/*, GlossaryTerm |
| `--sophie-color-text-muted` | No (correct: `--sophie-text-muted`) | Same |
| `--sophie-color-surface-2` | No (correct: `--sophie-surface-2`) | Same |
| `--sophie-color-border` | No (correct: `--sophie-border`) | Same |
| `--sophie-focus-ring` | No (correct: `--sophie-focus-width` + `--sophie-focus-color`) | Same 8 components |
| `--sophie-radius-full` | No (not defined; closest is `--sophie-radius-lg`) | 2 components (Search subcomponents) |

**Effect:** browser-default fallback (transparent / unset). Visible in any
component that depends on these properties for hierarchy. Most likely manifests
as missing focus rings, missing borders, or transparent backgrounds in 8
components — which is partially masked because focus-visible styles are
fallback-able via `outline: revert` on most browsers.

**Why it happened:** namespace migration. ADR 0035 (token-naming-flat-kindless)
flattened `--sophie-color-foo` → `--sophie-foo`, but the 8 listed components
didn't update their consumers. Pre-existing carryover from PR-2 audit's
P3-2 (`sa-` migration).

**Fix:** hard rename consumers (no dual-shape alias — pre-launch per
[feedback_no_backcompat_prelaunch]). One sweep PR or fold into Workstream 3's
first system PR.

## Section 3 — token gaps vs visual target

The [visual polish target](./visual-polish-target.md) introduces visual
contracts that the current token graph cannot express without additions:

### 3a — Per-callout-variant title-bar background tints

The target's MyST-anatomy card chrome has a **pale-tinted title bar** at
~6–10% saturation of the variant's accent. Today: no token slot for this; the
current `Callout.module.css` puts the tint on the **whole body** via inline
`color-mix(in oklab, accent 4-6%, surface-1)` per variant, not the title bar.

New tokens needed (10):

```css
--sophie-callout-info-title-bg:        /* 6-10% of --sophie-status-info */
--sophie-callout-tip-title-bg:         /* 6-10% of --sophie-status-success */
--sophie-callout-warning-title-bg:     /* 6-10% of --sophie-status-warning */
--sophie-callout-caution-title-bg:     /* 3-5% of --sophie-status-warning (lighter than warning) */
--sophie-callout-danger-title-bg:      /* 6-10% of --sophie-status-danger */
--sophie-callout-key-insight-title-bg: /* 6-10% of --sophie-brand-teal */
--sophie-callout-misconception-title-bg: /* 6-10% of --sophie-brand-rose */
--sophie-callout-definition-title-bg:  /* 6-10% of --sophie-brand-violet */
--sophie-callout-summary-title-bg:     /* 6-10% of --sophie-status-neutral */
--sophie-callout-roadmap-title-bg:     /* 6-10% of --sophie-status-neutral */
```

Derived via `color-mix(in oklch, var(--accent) 8%, var(--surface-1))` — same
mechanism the validation tracker already uses (ADR 0056). No new infrastructure;
just new slot definitions in `anchors.ts` + `generate-css.ts`.

### 3b — Tier-1 vs Tier-2 left-rule width

The visual target specifies **4px Tier 1, 3px Tier 2** as the cognitive-weight
differentiator. Today: hardcoded as `border-left: 3px solid` (Callout) or
`4px solid` (other components) — no token slot.

New tokens (2):

```css
--sophie-card-rule-strong: 4px;
--sophie-card-rule-light: 3px;
```

### 3c — Asymmetric heading margins

The target locks **h2: 1.75em / 0.4em**, **h3: 1.25em / 0.3em** (top / bottom).
Today: no centralized heading-margin tokens; headings in components and chrome
layouts each set their own margins, inviting drift.

New tokens (6):

```css
--sophie-heading-h2-margin-top:    1.75em;
--sophie-heading-h2-margin-bottom: 0.4em;
--sophie-heading-h3-margin-top:    1.25em;
--sophie-heading-h3-margin-bottom: 0.3em;
--sophie-heading-h1-margin-top:    0;       /* h1 already at section start */
--sophie-heading-h1-margin-bottom: 0.45em;
```

### 3d — Body base size

The target locks **17px** body. Today: `--sophie-text-base` = `1rem` (16px).
Either:

- **Option A:** raise `--sophie-text-base` to `1.0625rem` (17px). Cleaner — every
  consumer using `text-base` shifts in lockstep. Risk: knock-on dimensional
  shifts in components that assumed 16px gridding.
- **Option B:** add a new `--sophie-text-body` = `1.0625rem` token specifically
  for prose. Leaves `--sophie-text-base` at 16px for UI chrome (small labels,
  meta strips, button text where 17px is too large).

**Lean: Option B** — body prose at 17px, UI chrome stays at 16px. Two
distinct semantic roles, two slots.

### 3e — Drop tokens / re-color tokens

Per [feedback_aesthetic_unlocked_prelaunch], the following tokens get either
dropped or hard-rebound — no back-compat aliases:

| Token | Action | Reason |
|---|---|---|
| `--sophie-font-serif` (`Source Serif 4` stack) | **DROP** | Plex Sans direction; no serif body |
| `--sophie-font-sans` (`Source Sans 3` stack) | **REBIND** to `"IBM Plex Sans", ...` | Visual target lock |
| `--sophie-font-mono` (system mono) | **REBIND** to `"IBM Plex Mono", ...` | Visual target lock |
| `--sophie-bg` (`#fbfaf7` cream) | **REBIND** anchor to `#f9fafb` (gray-50) | Visual target lock |
| `--sophie-surface-1` (color-mix derived warm tint) | **REBIND** to hard `#ffffff` | Cards = pure white, not derivative |
| `--sophie-border` (color-mix 8% ink) | **REBIND** to hard `#e5e7eb` (gray-200) | Cool-neutral palette |
| `--sophie-border-subtle` (color-mix 5%) | **REBIND** to hard `#f3f4f6` (gray-100) | Cool-neutral palette |
| `--sophie-radius-sm` (`0.375rem` = 6px) | **TIGHTEN** to `0.3125rem` (5px) | Card chrome target |
| `--sophie-prose-max-width` (`68ch`) | **TIGHTEN** to `66ch` | Bringhurst optimum |
| `--sophie-status-info` (`#2f8c8d` = brand-teal duplicate) | **DISAMBIGUATE** to a true blue (e.g., `#2563eb`) | Per visual target — info and brand-teal should be visually distinct |

### 3f — Brand-vs-status color reassignment in `Callout.module.css`

The current variant-to-color mappings predate the visual target's "brand =
durable concept, status = ephemeral signal" rule. Several need rebinding:

| Variant | Current binding | Target binding |
|---|---|---|
| `info` | `brand-teal` (dup of brand-teal) | **`status-info`** (true blue) |
| `tip` | `brand-rose` | **`status-success`** (green) |
| `warning` | `status-warning` | unchanged ✓ |
| `caution` | `brand-violet` | **`status-warning`** (lighter tint) |
| `roadmap` | `text-muted` | unchanged ✓ |
| `summary` | `status-success` | **`status-neutral`** (per target — summary is structural chrome, not pedagogically rare) |
| `key-insight` | `status-warning` | **`brand-teal`** (durable concept) |
| `misconception` | `status-danger` | **`brand-rose`** (durable concept) |

`Callout.module.css` also currently:

- **Tints the whole body** via `color-mix accent 4-6% + surface-1`. Target says
  **only the title bar** gets tinted; body stays pure white.
- **Uppercase-tracks the title** (`text-transform: uppercase; letter-spacing: 0.04em`).
  Target locks **title-case, no tracking**.
- **Has no separate title-bar element** — the title sits directly on the body.
  Target requires title-bar as a distinct row with its own background tint.
- **Has no icon support** — Lucide icons left of title are part of the target
  contract.
- **Uses `--sophie-radius-md`** (0.625rem = 10px). Target says `radius-sm`
  (5px after the redirect above).

This is a **structural rebuild** of Callout, not a CSS retune. Same level of
work applies to KeyEquation, Aside, LearningObjectives, etc. — each needs its
markup + CSS updated to consume the new chrome anatomy.

## Section 4 — recommended order of operations for Workstream 3

Sequencing matters; doing some changes before others avoids re-doing work.

| Step | Scope | Why first / last |
|---|---|---|
| **A. Fix namespace-drift bug** (8 components → `--sophie-*`) | Component CSS modules only | Removes a real bug; bounded; zero coupling to visual changes. Land first or fold into B's PR. |
| **B. Surface palette redirect** (bg cream → gray-50; surface-1 white; border/border-subtle cool) | `anchors.ts` + 1 PR. Validates surface contrast via VR baselines on Linux. | **Largest single-PR visible change.** All components inherit the new palette via tokens. Should be one PR with VR baseline regen so the new look ships coherently. |
| **C. Type system swap** (Plex Sans/Mono fonts, drop Source family, add `--sophie-text-body` 17px slot) | `anchors.ts` + font-loading wiring + global stylesheet | After surface (palette) so the type renders on the final ground. Affects every page; one PR; VR baseline regen. |
| **D. Heading + math calibration tokens** (h2/h3 asymmetric margins, KaTeX inline 1.05× sizing) | `anchors.ts` + chapter-shell + KaTeX wrapper | Smaller delta than B+C; lands before per-component polish so headings have their final rhythm when each component is re-styled. |
| **E. Add callout-title-bg tokens + card-rule-strong/light** (per-variant tints, tier rule widths) | `anchors.ts` + `generate-css.ts` | Prerequisite for per-component polish. Token-only PR; no component changes yet. |
| **F. Disambiguate `status-info` from `brand-teal`** | `anchors.ts` | One-line change; could fold into B or E. |
| **G. Component-level chrome rebuilds** (Callout, KeyEquation, Aside, etc. — adopt new anatomy + consume new tokens) | One PR per component or small batch | The big polish round. Each PR validates its component against VR. Brand-vs-status color reassignments in Callout land here. |
| **H. Tighten radii + measure** (`radius-sm` 6px → 5px; `prose-max-width` 68ch → 66ch) | `anchors.ts` | Could go anywhere; lowest risk; fold into B or G. |

**Critical-path rule:** A and B/C/D/E/F are *system-level* and should ship
before G. Doing component polish (G) before the system is rebound means
re-doing every component's CSS once the system shifts. The system goes first.

## Section 5 — non-goals of this audit

- **Not auditing dark-mode parity.** Sophie's dark scheme exists (`[data-theme="dark"]` + `prefers-color-scheme`). The cool-neutral surface palette will need dark-mode counterparts (gray-900 page, gray-800 cards, gray-700 borders). That's a separate sweep; light-mode polish ships first.
- **Not auditing dimension drift across the broader chrome.** This audit focused on `packages/components/src/components/**/*.module.css`. The Astro page templates (`packages/astro/src/styles/*.css`) and the chapter-shell CSS (`textbook-layout.css`) also consume tokens and may have their own gaps. Out of scope for the v1 visual target.
- **Not specifying the new color values for `status-info` blue or other refinements.** That's a per-PR decision in Workstream 3.

## References

- [Visual polish target](./visual-polish-target.md) — what the tokens are aiming at.
- [ADR 0005 — Three-layer theming](../../decisions/0005-theming-three-layers.md) — the token-graph architecture this audit measures against.
- [ADR 0035 — Token naming flat-kindless](../../decisions/0035-token-naming-flat-kindless.md) — the naming convention the 8 buggy components didn't follow.
- [ADR 0056 — Validation tracker](../../decisions/0056-validation-tracker.md) — the `color-mix(in oklch, accent X%, transparent)` derivation pattern used for validation status; same mechanism applies to per-variant callout title-bg tints.
- [feedback_no_backcompat_prelaunch](../../../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_no_backcompat_prelaunch.md) (project memory) — the pre-launch posture for hard renames over alias shims.
- [feedback_aesthetic_unlocked_prelaunch](../../../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_aesthetic_unlocked_prelaunch.md) (project memory) — the broader pre-launch posture extending to visual decisions.
