---
date: 2026-05-30T00:00:00.000Z
tags:
  - astro
  - css
  - theming
  - layout
  - accessibility
  - structural-defense
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-30"
  evidence:
    - kind: deployment
      ref: packages/astro/src/components/SophieHead.astro
      date: "2026-05-30"
      notes: "Shared `<head>` for every route: emits charset/viewport/title/description, a base-aware favicon `<link>`, the global CSS imports (theme tokens → theme/base element layer → components → KaTeX → math override), and `<TextbookHead>` boot scripts. Used by ChapterLayout + InfoPageShell + (via InfoPageShell) section-landing; CSS side-effect imports removed from SophieChapter.tsx."
    - kind: deployment
      ref: packages/theme/dist/base.css
      date: "2026-05-30"
      notes: "New `@sophie/theme/base` element layer (built by build-theme.ts; `./base` export). Token-driven body/heading/link/code/`:focus-visible` defaults — the previously-missing layer between tokens and components. No `box-sizing` reset; not loaded into Storybook, so component VR baselines are unaffected."
    - kind: test
      ref: examples/packed-smoke/e2e/spine-styling.spec.ts
      date: "2026-05-30"
      notes: "RED→GREEN guard for B1/B2: computed `body` font resolves to the Plex sans stack (not Times) on `/`, `/sections/test-section/`, and `/syllabus/`, and section-landing emits a non-empty `<title>`. The sibling info-pages-render.spec.ts only asserted *some* `/_astro/*.css` link, which the token-only sheet satisfied even while the spine rendered unstyled — this spec asserts the bug-direct condition. 4/4 green against the packed (dist/tarball) consumer."
---

# ADR 0095: Global CSS delivery via a shared document head

:::{admonition} ADR metadata
- **Status**: shipped
- **Deciders**: anna
:::

## Context

The astr201 frontend design review (F1/F2, handoff B1/B2) found the
entire non-reading "course spine" — the landing page, every section
landing, and every info page — shipping **unstyled**: browser-default
Times, `rgb(0,0,0)` text, default-blue links, no theme. The moment a
visitor opens a reading the site becomes a polished textbook; the first
impression and the whole navigation/syllabus surface look broken.

Root cause, confirmed in source:

- The element/component stylesheet `@sophie/components/styles.css` (plus
  base KaTeX) is side-effect-imported **only** by `SophieChapter.tsx`,
  the React root mounted by `ChapterLayout`. So only reading/practice
  routes pull it.
- `InfoPageShell.astro` imports `@sophie/theme/{fonts,css,math}` —
  **tokens + the math override only**, not `components/styles.css`. It
  resolves the `--sophie-*` variables but has few rules that *apply*
  them.
- `section-landing.astro` renders a **bare React component** with no
  document shell at all → zero stylesheets and an empty `<title>` (B2).
- **There is no global base/element layer.** No stylesheet sets bare
  `body { font-family }`; the sans/serif typography lives only on
  `.sophie-*` classes inside `textbook-layout.css`, which only the
  chapter shell loads. Tokens-without-an-element-layer is why even the
  pages that *do* load `@sophie/theme/css` still render in Times.

CSS delivery was coupled to the chapter React root, and the element
layer was entangled in the chapter shell's scoped classes.

## Decision

**One shared `<SophieHead>` Astro component** owns the document head for
**every** injected route. It emits, in cascade order: `<meta charset>` +
viewport; `<title>` (+ optional description); a base-aware
`<link rel="icon">` (`withBase`, per ADR 0092); the global CSS as
side-effect imports it owns — `@sophie/theme/fonts`, `@sophie/theme/css`
(tokens), **`@sophie/theme/base`** (new element layer),
`@sophie/components/styles.css`, `katex/dist/katex.min.css`,
`@sophie/theme/math`; and `<TextbookHead />` boot scripts (kept in the
real `<head>` per ADR 0033).

**A new `@sophie/theme/base` element layer.** A small, token-driven
stylesheet that styles bare HTML elements — `body` (sans font, body
size, prose line-height, `--sophie-text` color, `--sophie-bg`
background, margin reset), headings (serif family + weight), links
(`--sophie-link`/`--sophie-link-hover`), code (`--sophie-font-mono`),
and a `:focus-visible` baseline (`--sophie-focus-*`). This is the
missing layer between tokens and components. It extends ADR 0005's
three-layer model with an explicit element layer: **tokens
(`theme/css`) → base elements (`theme/base`) → components
(`components/styles.css`)**. It carries no `box-sizing` reset and is not
loaded into Storybook, so component VR baselines are unaffected.

**Source-of-truth inversion.** The five CSS side-effect imports are
**removed from `SophieChapter.tsx`**; CSS now arrives via `<SophieHead>`
on every route. `ChapterLayout`, `InfoPageShell`, and a new shell
wrapping `section-landing` all use `<SophieHead>`. Styling is a
route-shell concern, never coupled to the chapter React root again.
`textbook-layout.css` stays on `TextbookLayout` — it is reading-only
layout CSS, not global.

## Rationale

- **Structural fix over patch.** The minimal patch (add imports to
  `InfoPageShell`, give section-landing a shell) would unblock launch but
  leave CSS delivery coupled per-shell and the element layer still
  missing. Inverting the source of truth defends the whole class: a new
  route gets global CSS by using the shared head, not by remembering to
  copy an import list.
- **Element legibility.** The base layer is the honest home for "what a
  bare `<body>`/`<h2>`/`<a>` looks like" — previously an accidental
  property of the chapter shell, now a named layer every route shares.
- **No double-load.** Each stylesheet is imported exactly once (by
  `<SophieHead>`); reading routes no longer also pull them via
  `SophieChapter`.

## Consequences

- **Positive.** All injected routes are styled; section-landing gets a
  document shell + non-empty `<title>` (B2); the platform half of B8
  (base-aware favicon `<link>`) is delivered incidentally in the shared
  head; CSS delivery is structurally decoupled from React.
- **Cost.** A fourth conceptual CSS layer (base) on top of ADR 0005's
  three; documented here and cross-referenced from 0005. One new
  always-loaded stylesheet (small, token-only rules).
- **Boundary.** `theme/base` is element-level defaults only — component
  styling stays in `@sophie/components` CSS modules (ADR 0004/0005);
  layout grid stays in `textbook-layout.css`.

## References

- [ADR 0005 — Theming three layers](./0005-theming-three-layers.md) —
  tokens → (now) base elements → components; this ADR adds the element
  layer.
- [ADR 0082 — Chapter layout extraction](./0082-chapter-layout-extraction.md)
  — the chapter shell whose head is generalized into `<SophieHead>`.
- [ADR 0090 — Unified build-time math rendering](./0090-unified-build-time-math-rendering.md)
  — the KaTeX CSS the shared head now delivers to all routes.
- [ADR 0092 — Base-path correctness](./0092-base-path-correctness.md) —
  `withBase` for the favicon `<link>`.
- [ADR 0033 — `is:inline` outside the React island](./0033-is-inline-outside-react-island.md)
  — why `<TextbookHead>` boot scripts stay in the real `<head>`.
