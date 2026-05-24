# Chrome primitives + post-W4c cleanup design (2026-05-24)

**Status:** locked-design (per brainstorm 2026-05-24); ready for execution.

**Supersedes:** `docs/plans/2026-05-10-collapsible-card-design.md` (the
single-item disclosure block is reframed as `<Dropdown label="X">` —
the n=1 case of the new multi-item `<Dropdown>` primitive).

**Sequenced after:** post-W4c audit
(`docs/reviews/2026-05-24-post-w4c-audit.md`).

**Pre-cursor for:** Phase C — ASTR 201 migration architecture
brainstorm; Phase D — official Sophie authoring docs.

---

## Context

Wedge B-followup W4c shipped 2026-05-23 (PR #163). The post-W4c audit
catalogued ~13 actionable findings spanning doctrine codification, R7
silent-skip violations, structural DRY candidates, a 21-spec a11y
sweep, and MyST documentation hygiene. Anna's direction (2026-05-24):
clean up the codebase comprehensively before migrating the full ASTR
201 site — "perfect and complete and trustworthy" first.

A side-channel question surfaced a real gap: Sophie has no general-
purpose chrome primitives equivalent to MyST's `:::{card}`, `:::{grid}`,
`:::{tab-set}`, or `:::{dropdown}` directives. Authors migrating
Quarto/MyST content currently have no Sophie analogue for tabbed code
samples, comparison grids, or multi-item disclosures. This is a
platform-shape gap the ASTR 201 migration would hit immediately.

Phase B addresses both fronts: ship 5 sequential PRs that close all
audit findings AND introduce 4 new chrome primitives, in that order.

---

## Locked decisions (brainstorm 2026-05-24)

| # | Decision | Rationale |
|---|---|---|
| 1 | **Phase B scope: full structural cleanup + 4 new primitives** | "Perfect and complete and trustworthy" before migration starts. Audit findings + cards/grids/tabs/dropdowns all land before Phase C. |
| 2 | **Primitives design philosophy: Sophie-native opinionated** | Component contract per ADR 0004 (`serialize` + axe + role-tagging via ADR 0058). Borrow MyST/Quarto naming where neutral; deviate where Sophie's pedagogy demands. |
| 3 | **Scope: all 4 primitives** (`<Card>`, `<Grid>`, `<Tabs>`, `<Dropdown>`) | Quarto tabsets are common in code-heavy chapters; migration would hit the Tabs gap immediately. Dropdown subsumes `<CollapsibleCard>` (single-item is n=1 case). |
| 4 | **Pedagogy framing: strict chrome** | No `epistemicRole` props on the 4 primitives. Pedagogy concerns expressed via existing pedagogy components nested *inside* (`<Card><KeyInsight>...</KeyInsight></Card>`). One way to express each pedagogy concept. |
| 5 | **Package boundary: all 4 in `@sophie/components`** (React) | Mirrors `<CollapsibleCard>`/`<Aside>`/`<Callout>` precedent. Radix-backed for interactive primitives per ADR 0019. Same import path for authors across all 4. |
| 6 | **API shape: slots compound** | Matches Sophie's standing pattern (`<OMIFlow>` + slots, `<SkillReview>` + `.Card`, `<MultiRep>` + `<Rep*>`). Reads as prose in MDX. Underneath, Radix handles a11y; the slot wrapper auto-derives `value` IDs. |
| 7 | **Build order: audit fixes → primitives; 5 sequential PRs** | Clean foundation before new surface lands. Each PR independently reviewable. Doctrine PR first → all subsequent PRs apply R10 from day 1. |

---

## Architecture

All 4 primitives live in `packages/components/src/components/{Card,Grid,Tabs,Dropdown}/`. Per-directory contents follow Sophie's existing per-component-directory layout (precedent: `Predict/`, `OMIFlow/`, `Callout/`, `CollapsibleCard/`):

| File | Purpose |
|------|---------|
| `<Name>.tsx` | React component. Card/Grid render SSR-only. Tabs/Dropdown hydrate via `client:load` on the Astro consumer side (per ADR 0027 prop-threading). |
| `<Name>.schema.ts` | Zod prop schema (`<Name>PropsSchema` exported per ADR 0003). |
| `<Name>.contract.ts` | `serialize()` returning `null` (strict chrome adds no `PedagogyIndex` entries). Per-ADR-0004 contract surface. |
| `<Name>.module.css` | CSS Modules + token bindings (per ADR 0005 — TS tokens → CSS vars). |
| `<Name>.stories.tsx` | 4–6 Storybook stories per primitive: default + variants + edge cases. |
| `<Name>.axe.test.tsx` | axe-core + jest-axe + RTL matcher tests (per ADR 0004 mandate; jsdom env, not container-axe — these are React not Astro). |
| `<Name>.test.tsx` | Component behavior tests (RTL-driven). |
| `index.ts` | Barrel exports. |

### Dependencies added

- `@radix-ui/react-tabs` (Tabs primitive)
- `@radix-ui/react-accordion` (Dropdown primitive)

Both join the existing `@radix-ui/*` family per ADR 0019. Card and Grid add no runtime dependencies (pure HTML/CSS + React JSX).

### Export surface

Added to `@sophie/components/src/index.ts`:

```ts
export { Card } from "./components/Card";
export { Grid } from "./components/Grid";
export { Tabs, Tab } from "./components/Tabs";
export { Dropdown } from "./components/Dropdown"; // compound also exports Dropdown.Item
```

`CollapsibleCard` exports are removed in the same PR (PR 5) — hard rename per `feedback_no_backcompat_prelaunch`.

---

## Per-primitive API

### `<Card>` — static, header / body / optional footer

```tsx
<Card title="Photons are quantized">
  Each photon carries energy E = hν...
</Card>

<Card>
  <Card.Header>Custom header JSX</Card.Header>
  body content
  <Card.Footer>optional footer JSX</Card.Footer>
</Card>
```

| Prop | Type | Notes |
|------|------|-------|
| `title?` | `string` | Shorthand for `<Card.Header>{title}</Card.Header>` |
| `id?` | `string` | Used to derive `aria-labelledby` target |
| `className?` | `string` | Author-supplied class augmentation |

**Slots:** `Card.Header`, `Card.Footer`. Renders `<section>` with `aria-labelledby` when `title` OR `<Card.Header>` is present (R10 landmark doctrine).

### `<Grid>` — pure layout

```tsx
<Grid cols={3} responsive>
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</Grid>
```

| Prop | Type | Notes |
|------|------|-------|
| `cols` | `1 \| 2 \| 3 \| 4` | Column count at full width |
| `responsive?` | `boolean` | Defaults `true`; collapses to 1-col at prose-width breakpoint (~640px) |
| `gap?` | `"sm" \| "md" \| "lg"` | Defaults `"md"`; maps to `--sophie-spacing-*` tokens |

Renders `<div role="list">` with each direct child auto-wrapped in `<div role="listitem">` for axe-clean grouping. Empty state renders a plain `<div>` (no `list` semantics).

### `<Tabs>` — interactive, Radix-backed

```tsx
<Tabs>
  <Tab label="Python">{`code...`}</Tab>
  <Tab label="R">{`code...`}</Tab>
  <Tab label="Julia">{`code...`}</Tab>
</Tabs>
```

| Component | Prop | Type | Notes |
|---|---|---|---|
| `<Tabs>` | `defaultLabel?` | `string` | Auto-selects first `<Tab>` if omitted |
| `<Tab>` | `label` | `string` | Required; used as trigger text + derived `value` |
| `<Tab>` | `id?` | `string` | Stable identifier for analytics / persistence |

Wrapper auto-derives Radix `value` from `slugify(label)`, auto-pairs each `<Tab>` with its trigger. Keyboard navigation (Arrow Left/Right, Home/End) + ARIA tablist/tab/tabpanel inherit from Radix Tabs. Renders `<section aria-labelledby>` per R10.

### `<Dropdown>` — interactive, Radix-Accordion-backed

```tsx
{/* single-item — CollapsibleCard replacement */}
<Dropdown label="Deep dive: the quantum interpretation">
  body content
</Dropdown>

{/* multi-item — accordion */}
<Dropdown>
  <Dropdown.Item label="Question 1">answer 1</Dropdown.Item>
  <Dropdown.Item label="Question 2">answer 2</Dropdown.Item>
</Dropdown>

{/* with controlled-open + IDB persistence */}
<Dropdown persistAs="exam-tips" defaultOpen={["Q1"]}>
  ...
</Dropdown>
```

| Component | Prop | Type | Notes |
|---|---|---|---|
| `<Dropdown>` | `label?` | `string` | Shorthand for single-item form (n=1 case) |
| `<Dropdown>` | `persistAs?` | `string` | IDB key for open-state persistence (per ADR 0004/0007 `useInteractive`) |
| `<Dropdown>` | `defaultOpen?` | `string[]` | Item labels to render open by default |
| `<Dropdown>` | `allowMultiple?` | `boolean` | Defaults `false` (accordion-style mutex) |
| `<Dropdown.Item>` | `label` | `string` | Required; trigger text + derived `value` |
| `<Dropdown.Item>` | `id?` | `string` | Stable identifier |

Single-item form (`<Dropdown label="X">`) is the n=1 case of the multi-item accordion. CollapsibleCard's existing `useInteractive` integration ports over directly; consumers using the persistAs pattern continue working with no API change beyond the rename.

---

## Visual + theming

Per `feedback_aesthetic_unlocked_prelaunch` — leading with strong opinions, not safest defaults.

### Shared visual grammar

| Surface | Token |
|---|---|
| Border radius | `var(--sophie-radius-sm)` (existing; matches CollapsibleCard + Aside + Callout) |
| Surface color | `var(--sophie-surface-1)` (light) / `var(--sophie-surface-elevated)` (dark) |
| Borders | 1px solid `var(--sophie-border-subtle)` |
| Box-shadow | None on Card/Grid (visual quiet); `var(--sophie-shadow-card)` on Tabs/Dropdown active-state only |
| Heading font | `var(--sophie-font-heading)` at h4-equivalent size |
| Body font | Inherited prose font |

### Per-primitive opinions

- **`<Card>`** — clean rectangular tile. Header bottom-border separator (heavier than border-subtle); body standard prose flow + `var(--sophie-spacing-md)` padding all around; footer top-border separator with muted text. **No icons, no left-stripe accents** (those belong to `<Callout>`). Card stays neutral.
- **`<Grid>`** — pure layout chrome. Gap `var(--sophie-spacing-md)` (or per `gap` prop). Mobile collapses to 1-col at prose-width breakpoint (~640px). No visible affordance — cells are what's seen.
- **`<Tabs>`** — trigger bar above panel. Active tab: underline accent `var(--sophie-accent-primary)` (matches sidebar active state); inactive: muted text + transparent underline (zero layout shift on switch). Panel: bordered box matching Card.
- **`<Dropdown>`** — accordion-style. Trigger row: full-width `<button>` with chevron-right→down transition (Lucide `ChevronRight` rotating 90° on open per ADR 0039). Open panel: subtle background-tint `var(--sophie-surface-2)` so open vs closed is visually obvious. Inherits CollapsibleCard's existing chevron animation + focus ring.

### Theming integration

All 4 primitives consume Sophie's existing TS token → CSS var pipeline (ADR 0005). **No new tokens added in Phase B** — we use what's already there. If a primitive needs a token that doesn't exist, that's a token-additions discussion separate from this PR.

---

## Audit + test + contract surface

### Component contract (per ADR 0004)

Each primitive ships `serialize()` returning `null` — strict chrome means **zero `PedagogyIndex` entries from these primitives.** Their JSX *children* still index (the AST walk visits everything), but the wrapper itself adds no entry-kind. "Chrome stays chrome" encoded structurally: a `<Card>` has no way to add a pedagogy entry.

### Per-primitive axe scenarios

Each primitive's `*.axe.test.tsx` covers branches with `expect(results).toHaveNoViolations()`:

- **`<Card>`** — with `title`, with `Card.Header` slot, bare body, with `Card.Footer`. R10 verification: `<section>` carries `aria-labelledby` when header/title present, omitted when neither.
- **`<Grid>`** — 1/2/3/4-col variants, 0 children (empty state), responsive collapse at narrow widths.
- **`<Tabs>`** — 2 tabs default, `defaultLabel` selecting non-first, keyboard nav (Arrow/Home/End — Radix handles, we verify), zero violations on both active + inactive panels, `aria-selected` correctness.
- **`<Dropdown>`** — single-item form, multi-item with 2+ `<Dropdown.Item>`, closed + open states (axe-clean both), `persistAs` IDB round-trip (mocked), `allowMultiple` mutex vs multi-open.

### Storybook + RTL behavior tests

Each primitive ships `*.stories.tsx` (4-6 stories) + `*.test.tsx` (RTL: click toggles, keyboard, props validation). Tabs/Dropdown get focus-trap + escape-close tests.

### What this design does NOT add

- **No new pedagogy-index entry kinds.**
- **No new audit invariants.** Existing invariants walk children (so `<KeyEquation>` inside a `<Tab>` still indexes), but no `Card-X` or `Tabs-X` invariants ship.
- **No new MDX plugins.** Plain React components via MDX's standard JSX-in-prose mechanism.

---

## Build order — 5 sequential PRs

Each PR uses an isolated worktree (`.worktrees/<slug>/`) per `superpowers:using-git-worktrees`. Squash-merge per ADR 0055. Full gate sweep before R+CR + PR open. Per-task biome before every commit.

### PR 1 — Doctrine codification (XS, ~1 hour)

**Branch:** `chore/r10-r7-doctrine`. **Scope:** B1 + B2 + B-Doctrine.

- `AGENTS.md` — add R10 (landmark choice) + R7-extension (`=== undefined` / `=== null` shapes) verbatim from W4c pilot report lines 503-539
- `~/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_review_rules_r6_r9.md` — mirror R10 + R7-extension
- No code touched. ~30 LOC diff total.

### PR 2 — R7 violations (S, ~1 hour)

**Branch:** `fix/r7-silent-skip-dispositions`. **Scope:** B-3R7.

- `extractors/omi-flow.ts:75` — add `findings.push` for unknown OMIFlow slot child kind (it IS an authoring error worth surfacing; not just "silently skip")
- `extractors/inline-refs.ts:60, :63` — paired-invariant comments explaining defensive guards
- 2–3 new test cases verifying `omi-flow.ts` finding fires on malformed callsite
- Verification: full gate sweep + new test passing.

### PR 3 — Hygiene sweep (S–M, ~2 hours)

**Branch:** `chore/post-w4c-hygiene`. **Scope:** B3 + A6-X1 + B11 + B12 + B13 + 16 MyST warnings cleanup.

- `logarithms.mdx:13` — `stefan-boltzmann-luminosity` → `stefan-boltzmann`
- `examples/smoke/src/content.config.ts` — `z` import path migration (Astro 5 deprecation)
- `0079:427` cross-ref — rename anchor in 0053 OR adjust 0079's slug
- `misconception-graph-schema.md:303` — fix `artifact-4-six-new-audit-invariants` cross-ref (likely `artifact-3-three-new-audit-invariants` per A3 count correction)
- `aas-epd-mini.md` + `sdsu-internal.md` — add explicit anchor IDs for the 5 missing cross-ref targets
- 5 implicit-heading refs — add explicit heading anchors per MyST best-practice
- 4 citation-not-found — fix bib/myst refs
- `index-generator.ts` — emit explicit heading anchors + citation-linked package names in generated `validation.md` (A5-X1 fix)
- A1 audit gate-doctrine: extend grep to catch `⚠` emoji (script + AGENTS.md mention)
- Verification: `mystmd build --html` exit 0 with **0 warnings**.

### PR 4 — DRY + a11y (M, ~4 hours)

**Branch:** `refactor/dry-and-axe-sweep`. **Scope:** B4 + B5 + B6 + B7.

- **B5 M1** — extract `<CourseOMIRollup role="observable|model|inference">` factory in `packages/astro/src/components/_shared/`; rewrite Course{Observables,Models,Inferences} as 3-line thin wrappers
- **B6 M2** — extract `checkSlugUnique<T>` helper in `packages/astro/src/lib/pedagogy-audit/invariants/_shared/`; rewrite both `KI-slug-unique` + `Misconception-slug-unique` to call it (K1 stays in `key-insights.ts`, slug-unique extracted out)
- **B7 M5** — `AuditFinding` canonical declaration: delete the `interface` in `@sophie/components/contract/types.ts`; `import type { AuditFinding } from "@sophie/core"` everywhere (codemod across 15 referencing files)
- **B4** — 21 e2e specs: add `.withTags("wcag21aa","best-practice")` to every `AxeBuilder` call site
- Verification: existing tests stay green; e2e adds rule coverage but still produces 159p/5s/0f.

### PR 5 — Chrome primitives (L, ~12-16 hours)

**Branch:** `feat/chrome-primitives-card-grid-tabs-dropdown`. **Scope:** 4 new primitives + CollapsibleCard hard-rename.

- 4 new component directories (~32 new files: 8 per primitive)
- Hard-rename `<CollapsibleCard>` → `<Dropdown>`: directory rename + ~24 referencing-file updates (docs narrative, e2e, schema cross-refs)
- New Radix deps in `packages/components/package.json`
- Smoke fixture demo: `examples/smoke/src/content/sections/foundations/units/chrome-primitives-demo/reading.mdx` exercising all 4 primitives (also acts as Phase D capabilities-tour ground truth)
- `chapter-components.md` reference doc updated (same PR per `feedback_docs_no_drift`)
- Verification: full gates + Storybook stories visible + axe-clean across all variants

---

## Out of scope / deferred

| Item | Reason | Disposition |
|------|--------|-------------|
| Per-card Spec routes per ADR 0079 | Wedge D scope | Defer to Wedge D |
| FSRS scheduler implementation | Wedge D scope | Defer to Wedge D (ADR 0069 already landed) |
| Carry-forward #1 (PRA-1/PRA-2 grain asymmetry structural fix) | ADR amendment territory | Defer; revisit with ADR 0053 amendment |
| Carry-forward #3 (Container API setup hardening) | Upstream Vite work | Defer; upstream-dependent |
| Carry-forward #5 (Figure registry getStaticPaths timing) | Architectural refactor | Defer; not blocking Phase C |
| Carry-forward #6 (YAML→JSX scan leak in MDX parser) | Architectural; parser boundary | Defer; not blocking Phase C |
| MyST `:::{card}`/`:::{grid}` directive shims in docs/website | Two-surface tension (MyST docs vs Sophie chapters) | Accept dual surface — docs site uses MyST directives, chapters use Sophie components. Different audiences. |
| Spec route `lookupByRefKey<TKind>` consolidation (Surprise #7 follow-on) | DRY-threshold met by 9 callsites but blends with carry-forward #5 | Defer; bundle with Wedge D Spec-route work |

---

## Verification gates per PR

Standard full-gate sweep before R+CR:

```bash
pnpm install --frozen-lockfile
pnpm exec biome check 2>&1 | tee /tmp/biome.log; grep -cE "(error|warning)" /tmp/biome.log  # expect 0
pnpm turbo run typecheck --force                         # expect 11/11
pnpm turbo run test --filter='@sophie/*' --force         # expect 4/4 + new test counts
pnpm --filter smoke build                                # expect 129+ pages
cd docs/website && npx mystmd build --html 2>&1 | grep -ciE "(^|[^a-z])(error|warning|⚠)"  # expect 0 (PR 3 onward)
cd /Users/anna/Teaching/sophie
pkill -f "astro preview" 2>/dev/null; sleep 1
pnpm exec playwright test                                # expect ≥159p / ≤5s / 0f
```

Per-PR additional checks:

- **PR 1** — manually verify R10 + R7-extension language matches W4c pilot report lines 503-539 verbatim
- **PR 2** — verify new omi-flow malformed-callsite test fires the finding (run isolated test)
- **PR 3** — `mystmd build` exit 0 with grep `⚠` count = 0
- **PR 4** — 21 e2e specs each show ≥1 `.withTags(` call; turbo unit tests green; codemod summary in PR description
- **PR 5** — Storybook stories visible at `pnpm --filter @sophie/components storybook`; all 4 primitives' axe tests pass; CollapsibleCard imports return zero in repo grep post-rename

---

## Open questions for execution

Surfaced during brainstorm but answered "TBD at execution time" rather than blocking the design:

1. **Tabs `value` collision policy** — if two `<Tab>`s have labels that `slugify` to the same value (e.g., "Plot" + "plot"), should the wrapper throw at render time, emit a console warning, or auto-disambiguate with index suffix? Recommended at execution: throw + axe-test verifies. Simpler than fallbacks; authors get loud feedback.

2. **Dropdown `persistAs` namespace** — should the IDB key be auto-namespaced by chapter URL (matching `<CollapsibleCard>` current behavior) or globally addressable? Recommended at execution: match CollapsibleCard's existing behavior unchanged for migration parity.

3. **Card `Card.Header` vs `title` precedence** — if both `title` prop AND `<Card.Header>` slot are supplied, which wins? Recommended at execution: slot wins; `title` is shorthand-only and ignored when slot present. Document explicitly.

4. **Grid responsive breakpoints** — does Grid expose breakpoint customization (`cols={{ md: 2, lg: 3 }}`) or stay simple (`cols={3} responsive`)? Recommended at execution: stay simple (W2 minimum-code discipline); add per-breakpoint API only when a real callsite needs it.

These don't block design approval; the answers can land in PR 5.

---

**End of design.** Awaiting Anna's commit confirmation. Once committed,
PR 1 (Doctrine) is the first execution step — it can land same-day.
