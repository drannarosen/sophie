# MiniGlossary — Design

**Date**: 2026-05-10
**Status**: Validated; ready for implementation
**Trio**: 3 (component #3 of 3 — closes Trio 3)
**Authors**: Anna (collaborator), Claude (drafter)
**Source plan**: [docs/plans/2026-05-10-phase-1-component-trios.md § Trio 3](2026-05-10-phase-1-component-trios.md)

## Purpose

Owns the "chapter-level term cluster" pattern: a list of vocabulary
terms with one-line definitions, rendered as a semantic
`<dl>`/`<dt>`/`<dd>` definition list with stable hash anchors per
term. Distinct from `<dfn>` inline term definitions in prose (different
genre — contextual, single-term) and from reference lookup tables
("What we measure | What it means" — those are inference tables, not
glossaries).

After this lands, Sophie ships 13 components — one shy of ADR 0023's
14-component v1 target.

## Scope verified (no correction)

Inspecting the smoke chapter showed:

- **1 explicit instance**: `### Mini-Glossary (Orientation Only)` at
  lines 356–375 of
  [examples/smoke/src/content/chapters/spoiler-alerts.mdx](../../examples/smoke/src/content/chapters/spoiler-alerts.mdx)
  — currently a 14-row markdown table.
- **1 in-text reference** at line 380 inside a Checkpoint callout
  ("You've just scanned a glossary of unfamiliar terms…") — prose, not
  a link target.
- **No hidden term-cluster patterns** elsewhere in the chapter. Other
  multi-row tables are measurement→inference lookups (different
  genre). Bolded terms in prose are *intentionally re-contextualized*
  per the chapter's "recognition not retention" pedagogy.

Unlike KeyEquation's 7→2 scope correction, the upstream plan's "1
explicit instance" count is exactly right.

## Decisions

1. **Content, not persistence-bearing**. No `course/chapter` props.
   No `client:load` directive in MDX — flows through Astro's static
   `<Content components={...}>` map alongside Callout, Figure,
   KeyEquation (per ADR 0027).
2. **Structured `terms` array**, not children with `<dl>`/`<dt>`/`<dd>`
   markup. Zod-validates term/definition pairs, makes per-term anchor
   generation trivial, and future-proofs serialization for
   search/index. The MDX cost is one JS expression block — acceptable.
3. **Required `id` prop** for stable outer hash anchor + namespace for
   per-term anchors. Matches the standing convention from KeyEquation.
4. **`title` is a real `<h3>`, not a `<p>`**. Divergence from
   KeyEquation: MiniGlossary is a chapter-structural block (the
   existing markdown `### Mini-Glossary` heading already plays this
   role). Replacing prose markdown table with a component should
   preserve the outline contribution. KeyEquation chose `<p>` to avoid
   polluting an outline where each spoiler is `### Spoiler N` — that
   constraint doesn't apply here.
5. **Optional `lede` prop** for the italic framing paragraph
   ("orientation only..."). Renders inside the same `<section>` so the
   framing prose stays inside the labelled region.
6. **Tier system deferred to Trio 4+**. Smoke usage doesn't use tiers
   — the chapter's pedagogy is explicitly "scan, don't memorize". An
   optional `tier?: 'core' | 'supporting'` field per term can be added
   later without API break.
7. **Auto-slugified per-term anchors** of form
   `${outerId}-term-<slug>`. Outer-id namespacing means two
   `<MiniGlossary>` blocks on a page can't collide. Slug computed by a
   small internal helper with NFKD normalization + dedupe-by-suffix.

## API surface

```ts
export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface MiniGlossaryProps {
  id: string;                    // outer section id (hash anchor + namespace)
  title: string;                 // visible <h3>, also accessible region name
  lede?: string;                 // optional italic framing paragraph
  terms: GlossaryTerm[];         // ≥1 term/definition pair
}
```

**MDX usage** (post-migration):

```mdx
<MiniGlossary
  id="mini-glossary"
  title="Mini-Glossary (Orientation Only)"
  lede="This glossary is here to help you recognize terms when you see them—not to memorize them. Every term below will be reintroduced later, in context, with time to understand it properly. For now, just scan and move on."
  terms={[
    { term: "Photon", definition: 'A "packet" of light; the quantum of electromagnetic radiation.' },
    { term: "Wavelength (λ)", definition: 'The spatial period of a light wave; determines the "type" of light.' },
    // ... 12 more entries
  ]}
/>
```

No `client:load`. Picked up by `makeStaticComponents` in
[packages/astro/src/components.tsx](../../packages/astro/src/components.tsx)
alongside Callout, KeyEquation.

## Internal structure

```tsx
// MiniGlossary.tsx
import { useId } from "react";
import { slugifyTerm } from "./slugifyTerm.ts";
import styles from "./MiniGlossary.module.css.js";
import type { MiniGlossaryProps } from "./MiniGlossary.schema.ts";

export function MiniGlossary({ id, title, lede, terms }: MiniGlossaryProps) {
  const titleId = useId();
  const seen = new Map<string, number>();
  return (
    <section id={id} aria-labelledby={titleId} className={styles.section}>
      <h3 id={titleId} className={styles.title}>{title}</h3>
      {lede !== undefined && <p className={styles.lede}>{lede}</p>}
      <dl className={styles.list}>
        {terms.map(({ term, definition }) => {
          const slug = slugifyTerm(term, seen);
          const termId = `${id}-term-${slug}`;
          return (
            <div key={termId} className={styles.row}>
              <dt id={termId} className={styles.term}>{term}</dt>
              <dd className={styles.definition}>{definition}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
```

**Why a `<div>` wrapper around each `<dt>`/`<dd>` pair**: the CSS
Module uses `display: grid; gap: 0.75rem` on the `<dl>`. CSS Grid
treats each direct child as a grid item, which breaks the visual
coupling of term/definition pairs. The HTML spec allows `<dl>` to
contain `<div>` children that wrap `<dt>`/`<dd>` pairs — semantics are
preserved, layout becomes a one-row-per-pair grid.

**`useId()` vs `props.id` separation** (mirrors KeyEquation):

- `props.id` — outer section's DOM id; author-supplied; the
  hash-anchor target. Also the namespace prefix for per-term ids.
- `useId()` — internal React-generated id; wires the heading to the
  region via `aria-labelledby`. Stable per instance; never collides.

### `slugifyTerm` — co-located helper

```ts
// slugifyTerm.ts
export function slugifyTerm(term: string, seen: Map<string, number>): string {
  const base =
    term
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "term";
  const n = (seen.get(base) ?? 0) + 1;
  seen.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}
```

Handles:

- `"Photon"` → `"photon"`.
- `"Wavelength (λ)"` → `"wavelength"` (λ normalizes via NFKD then is
  stripped as non-alphanumeric; parens collapse to a trailing dash
  which the trim removes).
- `"Dark matter"` → `"dark-matter"`.
- Dedupe: `"Wavelength"` then `"Wavelength (λ)"` →
  `"wavelength"` + `"wavelength-2"`.
- Pathological all-non-ASCII input → `"term"` fallback (still dedupes:
  `"term"`, `"term-2"`, ...).

## Styling — `glossary.scss` subset port

Port source:
`/Users/anna/Teaching/astr101-sp26/assets/theme/glossary.scss` (149
lines). **Subset ported**:

- `.glossary dl` — grid layout, `0.75rem` gap.
- `.glossary dt` — `1.05rem` font, semibold, accent color.
- `.glossary dd` — `1.5rem` left padding, `3px` left border, `1.6`
  line height.
- Section header — bottom border under `<h3>`.
- Dark mode — Sophie's CSS-var system handles automatically (no
  `[data-bs-theme="dark"]` selector needed; the tokens are
  scheme-aware).
- `:target` outline pulse on the outer section and per-`<dt>` — same
  responsive-feel pattern as KeyEquation, applied at two granularities.

**Deferred** (carry to Trio 4+ or follow-up):

- Tier indicators (`.tier-core`, `.tier-supporting`) — additive field,
  no API break to add later.
- Tier legend block (`.tier-legend`).
- Per-term context line (`.glossary-context`).

**Token mapping**:

| glossary.scss source | Sophie token replacement |
|---|---|
| `$indigo-light` (term color) | `var(--sophie-brand-violet-text)` |
| `rgba($indigo-light, 0.15)` (dd border) | `color-mix(in oklch, var(--sophie-brand-violet) 15%, transparent)` |
| `$text-light` | `var(--sophie-text)` |
| `rgba($text-light, 0.7)` (muted) | `var(--sophie-text-2)` |
| `[data-bs-theme="dark"]` overrides | Not needed — Sophie tokens are scheme-aware |

No hardcoded colors — matches KeyEquation's discipline. Logical
properties (`margin-block`, `padding-inline`, `border-inline-start`)
throughout. Per-component token override hooks (`--color-mg-accent`,
`--space-mg-row-gap`) for future chapter-level overrides without
forking the CSS Module.

## Smoke chapter migration

**File**:
[examples/smoke/src/content/chapters/spoiler-alerts.mdx](../../examples/smoke/src/content/chapters/spoiler-alerts.mdx)

Replace lines 356–375 (the `### Mini-Glossary (Orientation Only)`
heading + italic intro paragraph + 14-row markdown table) with one
`<MiniGlossary>` invocation:

- `id="mini-glossary"`.
- `title="Mini-Glossary (Orientation Only)"`.
- `lede=` (the existing intro prose verbatim).
- `terms={[ ...14 entries verbatim... ]}`.

Line 380 (the Checkpoint callout reference) stays prose for now. A
follow-up can turn it into a hash link (`[a
glossary](#mini-glossary)`); that's a chapter-content change, not a
component change.

**Component-map wiring**: add `MiniGlossary` to `makeStaticComponents`
in
[packages/astro/src/components.tsx](../../packages/astro/src/components.tsx)
as a direct pass-through (no wrapper function needed — no registry
prop, no dispatch).

**Imports**: add `MiniGlossary` to the chapter's existing `import
{...} from "@sophie/components"` statement (if the smoke chapter
imports components individually) or none if the components flow purely
through the Astro components map.

## Exports

[packages/components/src/index.ts](../../packages/components/src/index.ts):
add `MiniGlossary` + `MiniGlossaryProps` + `GlossaryTerm` +
`MiniGlossaryPropsSchema` + `GlossaryTermSchema` +
`miniGlossaryContract`, alphabetically between `LearningObjectives`
and `Predict`.

## Testing scope

**Unit tests** ([MiniGlossary.test.tsx]):

1. Renders title as visible `<h3>` text + region via `aria-labelledby`.
2. Outer DOM id matches the `id` prop (hash-anchor support).
3. Each term renders as `<dt>` + `<dd>` pair inside a `<dl>`, in the
   order provided.
4. Each `<dt>` has a unique id of form `${id}-term-<slug>`.
5. Optional `lede` renders when provided; section omits the paragraph
   when not.
6. Two `<MiniGlossary>` instances on a page have non-colliding term
   ids (the namespace prefix differs).
7. Schema rejects empty `terms` array; rejects empty term or
   definition strings.
8. Axe-core: zero violations.

**Unit tests** ([slugifyTerm.test.ts]):

1. `"Photon"` → `"photon"`.
2. `"Wavelength (λ)"` → `"wavelength"` (non-ASCII normalized + stripped).
3. `"Dark matter"` → `"dark-matter"`.
4. Dedupe collision: `"Wavelength"`, `"Wavelength (λ)"` →
   `"wavelength"`, `"wavelength-2"`.
5. Pathological all-non-ASCII input → `"term"` fallback.
6. Multiple pathological inputs dedupe as `"term"`, `"term-2"`.

**E2E test**
([examples/smoke/e2e/mini-glossary.spec.ts](../../examples/smoke/e2e/mini-glossary.spec.ts)):

1. MiniGlossary renders on `/chapters/spoiler-alerts` with title +
   lede visible + ≥14 `<dt>`/`<dd>` pairs.
2. Hash navigation: visiting `#mini-glossary` scrolls the section
   into view.
3. Per-term anchor: visiting `#mini-glossary-term-photon` scrolls that
   `<dt>` into view; `:target` outline applied.
4. Axe-core: zero structural violations on the chapter (with
   `disableRules(["color-contrast"])` per Sophie's standing posture).

**Storybook stories**
([MiniGlossary.stories.tsx](../../packages/components/src/components/MiniGlossary/MiniGlossary.stories.tsx)):

1. **SmokeLike** — 14 terms + lede (mirrors smoke chapter).
2. **ShortForm** — 3 terms, no lede.
3. **SingleTerm** — degenerate-but-valid case (just 1 term).
4. **WithEmphasizedDefinitions** — definitions including inline
   `<em>`/`<strong>`/Greek letters (exercises the prose-in-`<dd>`
   styling).
5. **TwoOnOnePage** — two `<MiniGlossary>` blocks rendered together
   to visually confirm anchor namespace isolation.

Per ADR 0028: test-runner runs axe-only on the 5 stories. No
persistence, no namespacing pattern needed.

**Expected test counts after this PR**:

- Unit: 104 → ~118 (8 MiniGlossary + 6 slugifyTerm).
- E2E: 19 → 20.
- Storybook: 40 → 45.

## Out of scope (intentionally deferred)

- **Tier indicators** (core / supporting from glossary.scss) — additive
  optional field per term; defer to Trio 4+ or first chapter that
  needs them.
- **Per-term context line** (`.glossary-context` italic explanation) —
  defer with the same rationale.
- **`<dfn>`-style inline term definitions in prose** — different
  genre; not a glossary cluster.
- **Cross-reference linking in chapter prose** (`[a
  glossary](#mini-glossary)` in the Checkpoint callout) — content-side
  change, separate PR.
- **Search/filter UI** — Sophie v1 is "scan, don't memorize"; defer
  indefinitely.
- **Multi-render-mode support** (slide, print) — read-mode only for v1
  per ADR 0015.

## Verification

Per `superpowers:verification-before-completion`, the PR is green when:

- `pnpm exec turbo run typecheck test:unit build` clean.
- `pnpm test:e2e` includes the new spec; 20 specs total all pass.
- `pnpm test:storybook` against the static build — 45 stories
  axe-clean.
- `pnpm biome check` + `pnpm biome format --write` clean.
- All 6 required CI checks green on first push.

## References

- [ADR 0001](../website/decisions/0001-platform-not-monorepo.md) — framework-pure React components.
- [ADR 0003](../website/decisions/0003-zod-as-source-of-truth.md) — Zod schema mirrors props.
- [ADR 0004](../website/decisions/0004-component-contract.md) — contract pattern; axe-core mandatory.
- [ADR 0005](../website/decisions/0005-theming-three-layers.md) — design tokens + CSS Modules.
- [ADR 0023](../website/decisions/0023-vertical-slice-first.md) — 14-component v1 target.
- [ADR 0027](../website/decisions/0027-mdx-render-boundary-prop-threading.md) — content components flow through static map.
- [ADR 0028](../website/decisions/0028-storybook-setup.md) — test-runner axe-only.
- [docs/plans/2026-05-10-phase-1-component-trios.md](2026-05-10-phase-1-component-trios.md) — Trio 3 overall.
- [docs/plans/2026-05-10-key-equation-design.md](2026-05-10-key-equation-design.md) — Trio 3 #2 (immediate-prior pattern reference).
