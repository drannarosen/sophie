---
title: Visual polish target — MyST-comparison spec for Workstream 3
short_title: Visual polish target
description: The target Sophie's component visual language iterates toward during Workstream 3 polish PRs. Captures the three-tier component model, MyST-anatomy-bound-to-Sophie-tokens card chrome, IBM Plex type system, MyST-restrained-academic spacing rhythm, and a cool-neutral surface palette. Replaces Sophie's current warm-cream-paper aesthetic with a modern-minimal-academic identity.
tags: [vision, design, visual-polish, typography, components, workstream-3]
---

# Visual polish target — MyST-comparison spec

What Sophie's chapter pages should *look like* once Workstream 3's component
CSS polish lands. Captures the visual direction in enough detail that each
polish PR can iterate against a specified target rather than drift toward
"slightly different from what we have." Without this target, the
[2026-05-16 state-of-the-platform audit](../../../reviews/2026-05-16-state-of-the-platform-audit.md)
called out that Workstream 3 PRs would have no measurable destination.

## The largest call — three-tier component model

Sophie's current visual language renders **every pedagogy component as a
rounded card with a colored left rule on a cream page**. The chrome is uniform
across roles — a `<KeyEquation>` looks about as "important" as a brief
`<Aside>`, even though they're different cognitive types. Visual hierarchy is
flat. Students get visual exhaustion: every paragraph looks important, so
nothing does.

The target replaces this with three tiers, distinguished by **chrome weight**:

| Tier | Visual treatment | Pedagogical role | Components |
|---|---|---|---|
| **1 — Card-strong** | White card on gray-50 page, 4px left rule in accent color, pale-tint title bar, Lucide icon, **drop shadow** (elevated) | Durable, interactive, named-and-keep-coming-back-to | `KeyEquation`, `LearningObjectives`, `Predict`, `ComprehensionGate`, `EffortLog`, `ConfidenceCheck`, `Reflection` |
| **2 — Card-light** | Same chrome family, but **3px left rule** and **no drop shadow** (flat on page) | Signal / admonition / mid-emphasis pedagogical move | All `Callout` variants (`info`, `tip`, `warning`, `caution`, `danger`, `key-insight`, `misconception`, `summary`, `roadmap`) |
| **3 — Typographic dissolution** | **No card chrome.** Thin gray left rule (3px, `border-subtle`), 18px indent, italic body, small-caps label *or* bolded defined term | Inline-flow notes, part of reading rhythm | All `Aside` variants (`note`, `definition`, `digression`, `key-insight`, `misconception`, `long-body`) |

**Single chrome language, scaled by weight.** Tier 1 and Tier 2 share the
MyST-anatomy template (border + left rule + tinted title bar + body); they
differ only in left-rule thickness and shadow presence. Students learn one
chrome language and read everything fluently; the title-bar accent color +
icon do the semantic work.

### Aside / Callout overlap kept deliberately

`Aside--key-insight` and `Callout--key-insight` both exist and remain distinct
visual tiers. Same pedagogical concept, two different rhetorical weights. An
author writing chapter 3 may want a small inline "this is worth noticing"
mid-flow (Aside, dissolution) *and* a strong "this is the punchline" block at
section end (Callout, card-light). Two components for one concept; author
picks based on emphasis level. Same logic for `misconception` and `definition`.

## Type system — IBM Plex family

Replaces Sophie's currently-declared `Source Sans 3` + `Source Serif 4`. Plex
is a coherent type system designed at one shop (Bold Monday for IBM) with
explicit cross-family kerning compatibility — sans, serif, mono drawn to
harmonize.

| Role | Family | Notes |
|---|---|---|
| Body, display, UI chrome | **IBM Plex Sans** | One variable file, weights 300–700 |
| Code (`<CodeCell>`, code blocks) | **IBM Plex Mono** | No ligatures — pedagogically deliberate ([anti-ligature argument](https://practicaltypography.com/ligatures-in-programming-fonts.html): students need to see `=>` as two characters, not one glyph) |
| Math (KaTeX) | Keep KaTeX defaults (Computer Modern serif) | Don't fight; CM math harmonizes with KaTeX's own font metric tables |

Why Plex over Inter (the obvious workhorse modern sans): coherent companion
families. Inter has no native serif or mono designed to pair; Plex Mono in
`<CodeCell>` and Plex Serif's italic for definitional text both share metrics
with Plex Sans. Visual integration of math + code + prose gets cleaner.

## Spacing rhythm — MyST-restrained-academic

| Token | Value | Why |
|---|---|---|
| Body base size | **17px** (~1.0625rem) | Larger than MyST's 16px — Sophie is *read*, not scanned |
| Body line-height | **1.65** | Inline KaTeX needs vertical room without ascender collisions |
| Paragraph bottom-margin | 0.85em | Restrained — flow over breath |
| `<h2>` top / bottom margins | 1.75em / **0.4em** | **Asymmetric** — generous before, tight after (heading "owns" the next paragraph) |
| `<h3>` top / bottom margins | 1.25em / 0.3em | Tighter still — subsection coupling |
| Block components (Tier 1/2) top/bottom | 1.25em | Slightly more than paragraph |
| Measure (prose max-width) | **66ch** | [Bringhurst optimum](https://en.wikipedia.org/wiki/Robert_Bringhurst); classic book proportion |
| Heading size scale | 1.25× (perfect fourth) | h1=32, h2=25.6, h3=20.4, h4=17 |
| All headings weight | **600** | Same weight throughout; size carries hierarchy (MyST move) |
| Inline math size | **1.05×** surrounding text | KaTeX defaults to ~1.21× — too large; 1.05× lets math sit *with* prose |

**No uppercase tracking on labels.** Sophie's current `Aside--note` uses
uppercase-tracked "NOTE" in teal. The target drops this — title-case in
callout title bars ("Note", "Tip", "Key insight"). Uppercase tracking reads as
"warning-banner shouting"; title-case reads as "designed label."

## Surface palette — cool neutral

Replaces the warm-cream-paper palette with a cool-neutral surface stack.
[Subtle off-whites help readability for long-form content](https://www.nngroup.com/articles/text-on-backgrounds/) — luminance
reduced ~2% from pure white, contrast preserved at 18.5:1 (well above WCAG AAA).

| Token | New value | Role |
|---|---|---|
| `--sophie-bg` | `#f9fafb` (Tailwind gray-50) | Page background — subtle neutral-cool |
| `--sophie-surface-1` | `#ffffff` | Card surfaces (Tier 1 + Tier 2 bodies) |
| `--sophie-surface-2` | `#f3f4f6` (gray-100) | Hover, secondary elevation |
| `--sophie-surface-3` | `#e5e7eb` (gray-200) | Tertiary elevation |
| `--sophie-border` | `#e5e7eb` (gray-200) | Default borders |
| `--sophie-border-subtle` | `#f3f4f6` (gray-100) | Subtle dividers, dissolution rules |

Brand colors (teal/rose/violet) and status colors unchanged in role; the
surface stack alone shifts.

## Card chrome anatomy

Single MyST-derived template, used by Tier 1 and Tier 2:

- **White body** (`--sophie-surface-1`) on gray-50 page
- **1px border** (`--sophie-border`) + **left rule** in accent color (4px Tier 1, 3px Tier 2)
- **Pale-tinted title bar** across top (~6–10% saturation of accent — new per-variant token slot `--sophie-callout-{variant}-title-bg`)
- **Lucide icon** left of title in accent color (20px Tier 1, 18px Tier 2)
- **Title** semibold, **title-case**, no uppercase tracking
- **Body** in regular weight on white
- **5px border radius** (`--sophie-radius-sm`)
- **Drop shadow** (`--sophie-shadow-card`, MyST-soft) **only on Tier 1**; Tier 2 is flat against page

## Lucide icon mapping

Status icons use enclosed-geometry shapes (road-sign vocabulary); brand icons
use object/scene glyphs. Shape language reinforces ephemeral-vs-durable
without explicit labeling.

| Variant | Color token | Lucide icon |
|---|---|---|
| `info` / `note` | `status-info` | `Info` |
| `tip` | `status-success` | `Lightbulb` |
| `warning` | `status-warning` | `TriangleAlert` |
| `caution` | `status-warning` (lighter tint) | `AlertCircle` |
| `danger` / `error` | `status-danger` | `OctagonAlert` |
| `key-insight` | `brand-teal` | **`Zap`** (lightning bolt — locked over Sparkles) |
| `misconception` | `brand-rose` | `CircleAlert` |
| `definition` | `brand-violet` (Callout); plain bold (Aside) | `BookMarked` |
| `summary` | neutral | `ListChecks` |
| `roadmap` | neutral | `Milestone` |

## Aside dissolution — typographic contract

Tier 3 components share one visual contract:

- **No card chrome.** No border, no shadow, no rounded corners.
- **3px solid left rule** in `--sophie-border-subtle` running paragraph height.
- **18px left indent** of content past the rule.
- **Italic body** (Plex Sans italic), same font size as surrounding prose (17px), same line-height (1.65).
- **Labeling** varies by variant:
  - `note` / `digression` / `long-body` / `key-insight` / `misconception`: small-caps inline label at start (e.g., `KEY INSIGHT —`), color `--sophie-text-muted`.
  - `definition`: **bolded non-italic defined term as the title** (e.g., **`Effective temperature`** *Teff is …*). The defined term IS the label — semantic and visual at once. Matches the Wikipedia / academic-textbook convention.

## What Sophie deliberately does *not* match from MyST

- **System-font stack.** MyST uses `ui-sans-serif, system-ui`. Sophie commits to a designed type system (Plex) because Sophie is a long-form reading platform, not a tooling-docs site. System fonts read as "I didn't decide"; Plex reads as "I chose this."
- **Pure white page.** MyST uses white. Sophie uses gray-50 — designed surface stack, better card elevation, slightly easier on eyes for hours-long reads.
- **Single weight per heading hierarchy.** MyST's heading typography is fine but Sophie commits more deliberately to weight-600-throughout with size-driven hierarchy.
- **MyST's directive system for admonition variants.** Sophie's typed components (`<Callout variant="key-insight">`) carry more semantic weight than MyST's `:::{tip}` directive — different authoring model, different visual responsibilities.

## References

- [MyST admonitions guide](https://mystmd.org/guide/admonitions) — the inspiration reference for card anatomy.
- [Bringhurst, *The Elements of Typographic Style*](https://en.wikipedia.org/wiki/The_Elements_of_Typographic_Style) — the 66ch measure rule + heading rhythm conventions.
- [ADR 0005 — Three-layer theming](../../decisions/0005-theming-three-layers.md) — TS tokens → CSS vars → Tailwind preset (the token graph this target plugs into).
- [ADR 0039 — Lucide-two adapter convention](../../decisions/0039-lucide-two-adapter-convention.md) — how Lucide icons are imported/registered.
- [Visual regression baseline](../../reference/visual-regression.md) — the test surface Workstream 3 polish PRs iterate against.
- [2026-05-16 state-of-the-platform audit § 4](../../../reviews/2026-05-16-state-of-the-platform-audit.md) — visual-polish gap that this doc closes.
