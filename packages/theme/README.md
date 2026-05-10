# @sophie/theme

Sophie's design tokens. TS-canonical role tree + light/dark CSS
variables + Tailwind v4 `@theme` emit, per
[ADR 0005](../../docs/website/decisions/0005-theming-three-layers.md)
and the upcoming ADR 0026 (Tailwind v4 CSS-first).

## Aesthetic

**Muted spectral minimalism.** Two ink/paper anchors anchor a
mirrored light/dark surface; three muted brand accents (teal, dusty
rose, slate violet) sit on top; three status roles (success, warning,
danger) are independent. Derivations live in CSS via
`color-mix(in oklch, …)` so dark/light parity is algorithmic, not
hand-tuned. Direction validated against the proven palette in
[Cosmic Playground](https://github.com/astrobytes-edu/cosmic-playground).

## Public surface

| Subpath | What it exports |
| --- | --- |
| `@sophie/theme` | `tokens` — role-keyed token tree (TS) |
| `@sophie/theme/css` | `dist/theme.css` (light + dark CSS variables) |
| `@sophie/theme/tailwind` | `dist/tailwind.css` (Tailwind v4 `@theme` block) |

```ts
import { tokens } from "@sophie/theme";

const bg = tokens.color.bg;                 // "var(--sophie-bg)"
const tealText = tokens.color.brand.teal.text;  // "var(--sophie-brand-teal-text)"
```

```css
/* Anywhere in app code */
@import "@sophie/theme/css";

body {
  background: var(--sophie-bg);
  color: var(--sophie-text);
}
```

## Default mode

Light by default. Dark via either:

1. `prefers-color-scheme: dark` on the OS / browser, **or**
2. Explicit `<html data-theme="dark">` (toggle UI is Phase 2).

## Phase 0 token surface (~69 emitted CSS variables)

- **Surfaces** — `bg`, `surface-1/2/3` (4 roles × 2 modes)
- **Text** — `text`, `text-2`, `text-muted`, `text-faint` (4 × 2)
- **Borders** — `border`, `border-subtle` (2 × 2)
- **Brand fills** — `brand-{teal,rose,violet}` (3, mode-invariant)
- **Brand text** — `brand-{teal,rose,violet}-text` (3, AA-safe on paper)
- **Status** — `status-{success,warning,danger}` (3)
- **Aliases** — `accent`, `link`, `link-hover` (3 × 2)
- **Typography** — `font-{sans,serif,mono}`; `text-{xs,sm,base,md,lg,xl,2xl,3xl,4xl}`; `leading-{tight,prose}`; `weight-{normal,medium,semibold,bold}` (18 total)
- **Spacing** — `space-0` through `space-10` at 4 px base (9)
- **Radii** — `radius-{sm,md,lg}` (3)
- **Layout** — `prose-max-width`, `content-padding-inline` (2)
- **Focus** — `focus-width`, `focus-color` (2)

Hand-tuned hex values: ~9 (two anchors + three brand fills + three
brand-text variants + three status). The remaining ~60 vars are derived
in CSS via `color-mix`.

## Build

```bash
pnpm --filter @sophie/theme build
```

Outputs:

- `dist/tokens.js` + `dist/tokens.d.ts` — TS token tree
- `dist/theme.css` — `:root { … }` (light) + `[data-theme="dark"] { … }` + `@media (prefers-color-scheme: dark) :root:not([data-theme]) { … }`
- `dist/tailwind.css` — `@import "./theme.css"` followed by a Tailwind v4 `@theme` block

The build also runs a WCAG-AA contrast check against `paper` for each
`brand-*-text` value. Build fails if any value drops below 4.5:1.

## Deferred to later phases

- Sub-brand anchor overrides (Sophie Astro / Sophie Compute) — Phase 1+
- `prefers-reduced-motion` token group — Phase 2
- High-contrast palette + print-mode tokens — Phase 4
- Dark-mode toggle UI component — Phase 2 (tokens already support both)
- Per-component CSS-Module token aliases — Phase 1 (when remaining 14 components land)
- Font self-hosting (Source Sans 3, Source Serif 4) — Phase 1
- SCSS port from `astr101-sp26` / `astr201-sp26` / `comp536-sp26` — Phase 1
