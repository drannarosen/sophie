---
date: 2026-05-25T00:00:00.000Z
tags:
  - astro
  - integration
  - virtual-module
  - chapter-layout
  - dry
  - extraction
status: accepted-design
validation:
  status: validated
  last_validated_date: "2026-05-25"
  evidence:
    - kind: test
      ref: packages/astro/src/lib/figures-virtual-module.test.ts
      date: "2026-05-25"
      notes: "Unit coverage for figuresVirtualModule(): resolveId routing, load() output shape, JSON serialization of a fixture registry, and the deliberate no-HMR semantics."
    - kind: review
      ref: docs/website/decisions/0082-chapter-layout-extraction.md
      date: "2026-05-25"
      notes: "PR-C ships ADR-0082 + virtual module + type declaration + integration wiring + ChapterLayout/reading.astro + smoke migration in one branch (3 commits). Code-reviewer subagent pass before push."
    - kind: deployment
      ref: examples/smoke/dist
      date: "2026-05-25"
      notes: "Smoke prod build clean after migration to the injected route + virtual figures module — `/units/spectra-and-composition/reading/index.html` produced via @sophie/astro/routes/reading.astro; 23 GlossaryTerm + 4 KeyEquation islands SSR-bare per ADR 0038 § A2.2."
    - kind: chapter
      ref: /Users/anna/Teaching/astr201/src/content/sections/foundations/units/lecture-02-foundations/reading.mdx
      date: "2026-05-25"
      notes: "Cross-repo verification: astr201 prod build serves /units/lecture-02-foundations/reading via the platform-injected route; Playwright console probe = 0 × React #418 (only favicon 404). Local commit on feat/use-extracted-chapter-layout; lands in lockstep with PR-C."
  notes: "PR-C consolidates ADR text + figures virtual module + shipped ChapterLayout + injected reading route + integration wiring + smoke migration into one branch (with sibling astr201 migration). Contract is locked; future routes (slides, intro/synthesis) extend by adding parallel injectRoute calls per ADR § Consequences."
---

# ADR 0082: Chapter-layout extraction into `@sophie/astro`

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[ADR 0023](0023-vertical-slice-build-order.md) commits Sophie to a
**vertical-slice-first** build order: lean Phase 0, refactor outward
*as patterns emerge*. Refactor triggers — not pre-built abstractions
— gate when shared shapes get extracted into platform packages.

The trigger condition just fired. As of post-PR-B (`main` commit
`1401013`), **two** consumer apps own byte-for-byte-identical copies
of the chapter-render pipeline:

| File                                         | LOC | Consumers                                                                                                              |
| -------------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/layouts/ChapterLayout.astro`            | 208 | `examples/smoke/`, `/Users/anna/Teaching/astr201/` (file:-packed, post-2026-05-25 hydration-fix re-pack)                |
| `src/pages/units/[unit]/reading.astro`       | 44  | `examples/smoke/`, `/Users/anna/Teaching/astr201/`                                                                     |

That is ~252 lines per consumer of the same assembly: load the unit
content collection, render `<Content />` inside a `<TextbookLayout>`,
wire the figures registry, wire `getStaticPaths` over the units
collection. Every new course consumer pays the same ~252-line tax.

The cost of duplication is not hypothetical. [PR #172](https://github.com/drannarosen/sophie/pull/172)
([ADR 0038 Amendment 2](0038-pedagogy-index-pattern.md#amendment-2-2026-05-25-hydration-gate-convention))
fixed a class of React #418 hydration mismatches caused by store-
gated components SSR-rendering through this pipeline. The fix
landed in the platform; the **astr201 consumer** required a separate
`pnpm pack` + dependency-update step to receive it, because the
hydration-vector code path runs through code that lives in the
consumer repo (`reading.astro` → `ChapterLayout.astro` → `<Content />`).
Each consumer that owns its own copy of this assembly is one more
consumer that must independently pull platform updates that touch
the chapter-render shape.

The duplication is also a documentation smell.
[`docs/website/reference/chapter-components.md`](../reference/chapter-components.md)
documents the chapter-component contract; the assembly that makes
the contract render correctly should live with the components, not
in each consumer's `src/`.

**Refactor-outward trigger condition (per ADR 0023):** the *second*
consumer of an unowned shape is the signal. astr201 is that second
consumer.

## Decision

**Option A — `@sophie/astro` ships `ChapterLayout.astro` and injects
the `/units/[unit]/reading` route.** Concretely:

1. **Layout file**: `packages/astro/src/components/ChapterLayout.astro`
   becomes the canonical layout. It wraps `<TextbookLayout>`, loads
   the unit's pedagogy nav, and renders the MDX `<Content />`.
2. **Route file**: `packages/astro/src/routes/reading.astro` becomes
   the canonical route. It calls `getStaticPaths()` over the
   `units` content collection and renders into the shipped
   `ChapterLayout`.
3. **Integration wiring**: `defineSophieIntegration` calls
   `injectRoute({ pattern: "/units/[unit]/reading", entrypoint:
   "@sophie/astro/routes/reading.astro" })` so consumer apps get
   the route for free.
4. **Consumer-supplied figures registry**: the figures registry
   (a `Record<string, FigureRegistryEntry>` per
   [ADR 0038 PR-C3 Decision #3](0038-pedagogy-index-pattern.md))
   is owned by the consumer (`src/content/figures.ts`) and passed
   to the integration as a literal:

   ```ts
   // consumer astro.config.ts
   import { defineSophieIntegration } from "@sophie/astro";
   import { figures } from "./src/content/figures.ts";

   export default defineConfig({
     integrations: [defineSophieIntegration({ figures })],
   });
   ```

5. **Virtual module bridge**: `figuresVirtualModule(figures)` is a
   Vite plugin that exposes the consumer-supplied registry as
   `virtual:sophie/figures`. The shipped layout imports it:

   ```astro
   // packages/astro/src/components/ChapterLayout.astro
   ---
   import { figures } from "virtual:sophie/figures";
   ---
   ```

   This is the only mechanism by which the shipped layout obtains
   the consumer's figures data.

The consumer-side configuration goes from **~252 LOC of duplicated
assembly** to **1 line** (`defineSophieIntegration({ figures })`).

## Rationale

Four reasons make Option A the long-term-correct shape, not a
patch.

1. **Direct prior art exists in the same package.**
   `pedagogyIndexVirtualModule()`
   (`packages/astro/src/lib/pedagogy-index-virtual-module.ts`)
   already implements the
   resolveId/load/handleHotUpdate Vite-plugin shape for
   `virtual:sophie/pedagogy-index`. The figures virtual module is
   the same pattern with one structural difference: figures arrive
   as an argument to the factory (consumer-supplied literal)
   instead of being read from a module-level accumulator
   (extractor-populated). The proven pattern + the proven
   `@sophie/astro` integration entry point + the proven
   `injectRoute` hook compose into one extraction.

2. **`injectRoute` + virtual-module-for-options is idiomatic in
   the Astro integration ecosystem.** Starlight (Astro's reference
   integration) uses exactly this pattern for theme + sidebar
   configuration: ship the routes and layouts; expose consumer
   options through a virtual module. `astro-integration-kit`'s
   `addVirtualImports` helper canonicalizes the pattern. Sophie's
   `pedagogyIndexVirtualModule()` is the in-tree precedent.

3. **Maximum DRY across the whole consumer pipeline.** Every future
   Sophie course (ASTR 101, COMP 521, hypothetical external
   adopters) pays a 1-line config cost instead of 252 lines of
   maintained duplicate code. Cross-consumer platform updates land
   via dependency bump alone — no per-consumer copy-paste of the
   layout or route shape.

4. **Future-route extensibility is `injectRoute × N`.** The
   chapter-pipeline includes more routes than just `reading.astro`:
   slides (`/units/[unit]/slides`), per-section intro and synthesis
   pages, the chapter-index pages, etc. Each is a future
   `injectRoute({ pattern, entrypoint })` call on the same
   integration. The shape we lock here is the shape every future
   route inherits.

## Alternatives considered

### Option B — ship `ChapterLayout` + a `getReadingStaticPaths` helper; consumer keeps a ~4-line route shim

Ship the layout from the platform; provide a `getReadingStaticPaths()`
helper from `@sophie/astro`; each consumer still owns a tiny
`reading.astro` that calls the helper and renders the layout.

**Rejected.** Each future route (slides, intro, synthesis,
chapter-index) requires another shim file in every consumer.
A tiny shim is still a shim; the maintenance surface grows
linearly with both consumers and routes. Option A pays the
integration-complexity cost once and gets every future route for
free; Option B pushes route-shape decisions back onto consumers
indefinitely.

### Option C — ship `ChapterLayout` only; consumer writes a ~12-line route

Ship the layout; consumers continue to write their own
`reading.astro`, importing the platform layout.

**Rejected.** Every new course re-writes the same boilerplate
(`getStaticPaths()` over units, `<Content />` render into platform
layout). The boilerplate is small but identical, which is the
worst-of-both-worlds case for DRY — small enough to feel
copy-paste-okay, large enough to drift across consumers, and
identical enough across consumers to be obviously
extractable. The refactor-outward trigger fires precisely on this
shape.

## Consequences

### Positive

- **~252 LOC → 1 LOC per consumer** for the chapter-render
  assembly. astr201 deletes its `reading.astro` +
  `ChapterLayout.astro`; future courses never write them.
- **Canonical assembly + route owned by the platform.** Bugs in
  the chapter-render pipeline (e.g. the PR #172 hydration vector)
  get fixed once in `@sophie/astro`; consumers pick them up via
  dependency bump. No per-consumer copy-paste of platform fixes.
- **Future-route extensibility is `injectRoute × N`.** Slides,
  section intro, section synthesis, chapter-index — every new
  Sophie-managed route is an additive `injectRoute` call on the
  same integration; consumers get the new routes for free.
- **Chapter-component reference doc gets a co-located implementation.**
  `docs/website/reference/chapter-components.md` documents the
  contract; the shipped layout lives next to the components that
  satisfy it.

### Negative / risks

Three known risks, each with a planned mitigation.

1. **Astro #3809 — dev-mode route shadowing.** A consumer's
   `src/pages/units/[unit]/reading.astro` would silently shadow
   the injected route in `astro dev` (build resolves to the
   consumer's file because user routes win over injected routes
   in Astro's resolver order). This is the most common
   "why isn't my Sophie route showing up" failure mode for new
   consumers.
   **Mitigation**: a build-time `fs.exists` check inside
   `defineSophieIntegration` warns when a shadowing file is
   present at the patterns `@sophie/astro` injects. Added in a
   subsequent commit in this PR series (Task C9).

2. **Astro #6326 — `injectRoute` rejects `virtual:` entrypoints.**
   Astro's `injectRoute` API expects a real file path (or a
   package-resolvable specifier) as `entrypoint`; it rejects
   `virtual:` URLs at the entrypoint position. This forecloses
   any design where the route file itself is generated entirely
   from a virtual module.
   **Mitigation (already in design)**: the route file is a real
   file at `packages/astro/src/routes/reading.astro` that
   *imports from* `virtual:sophie/figures`. Only the figures
   *data* is virtual; the route entrypoint is a normal file.

3. **No HMR for figures changes (deliberate trade-off).** The
   consumer's figures registry is a literal supplied at
   `astro.config.ts`-parse time. Vite parses the config once per
   dev session; changes to `src/content/figures.ts` require a
   dev-server restart to take effect.
   **Mitigation**: documented here so future-Anna doesn't expect
   HMR. The figures registry changes rarely (new figures are
   typically added in batches alongside new chapter content), so
   the dev-server-restart cost is acceptable. If figures-HMR
   becomes load-bearing later, the path forward is to make
   figures a content collection (like units) and read them via
   `getCollection` inside the layout instead of through the
   virtual module — strictly more complex, deferred until the
   pain justifies it.

## Validation

This ADR is validated by four artifacts, listed in the frontmatter
`validation.evidence` block:

1. **Unit tests for `figuresVirtualModule()`** lock the
   resolveId/load contract and the JSON-serialization shape of
   the emitted source.
2. **Smoke prod build** (`pnpm --filter smoke build`) clean after
   the migration commit lands; verifies SSR + hydration + figures
   resolve through the virtual module.
3. **astr201 cross-repo migration** verifies the shipped route +
   integration wiring serves a real second consumer; expected
   outcome is 0 × React #418 (Amendment-2 baseline) and
   `reading.astro` + `ChapterLayout.astro` deleted from the
   consumer repo.
4. **Future `examples/packed-smoke/`** (planned PR-D1) gates this
   shape against regression by exercising the
   pack-and-install path the way astr201 consumes the integration.

## Revisions

### R-0080-A2 — Course-info route-injection + 2nd virtual-module extension (2026-05-26)

The course-info projection sprint
([PR #199](https://github.com/drannarosen/sophie/pull/199), commit
`4e0730e`) extends this ADR's route-injection precedent to
spec-driven plural routes. `defineSophieIntegration` now injects up
to seven additional routes at `astro:config:setup`:

- `/` (course landing — dispatcher to one of three built-in layouts
  or `"custom"` integration-override)
- `/sections/[section]/` (section landing)
- one `/<slug>/` per declared `info_pages` entry (five ship today:
  `/syllabus/`, `/schedule/`, `/instructor/`, `/policies/`,
  `/accommodations/`)

Each is spec-driven and dispatcher-based, mirroring the
`/units/[unit]/reading` precedent. `virtual:sophie/course-spec` is
the **second instance** of this ADR's virtual-module pattern (first:
`virtual:sophie/figures`) — the deferred ScheduleSchema sprint is the
predicted third. Always-register shape: factory accepts `CourseSpec |
null` and returns the plugin unconditionally; integration null-guards
route injection separately. Dispatcher routes consume the export via
AGENTS.md R12 (type-narrowing throw at frontmatter top).

See [ADR 0080 Amendment 2](./0080-course-spec-format-v0-1.md#amendment-2-assessment-grade-weights-clean-break-course-info-projection-2026-05-26)
for the projection-pattern decision trail.

### R-practice-route — Second injected route + N-tab unit-view link-bar (2026-05-27)

Second injected route shipped per
[ADR 0073 Amendment 1](./0073-unified-assessment-schema.md#amendments):
`/units/[unit]/practice` mirrors the reading route's
`getStaticPaths` shape (filter artifacts by `endsWith("/practice")`;
exclude draft units per [ADR 0051](./0051-draft-content-shipping.md))
and renders `practice.mdx` through the same `makeStaticComponents`
factory. PR 3 of the
[formative-assessment plan](../../plans/2026-05-27-formative-assessment-implementation.md)
is the implementing change.

Three additions to the layout chrome:

- **`<UnitViewLinkBar>`** — N-tab affordance (Reading | Slides |
  Practice) at the top of `<ChapterLayout>`, conditional on
  artifact presence per unit. Slides not yet implemented; the bar
  is N-tab-ready from day one so slides slot in zero-cost when
  their ADR ships. Link-shaped (tab-styled anchors, not stateful
  Radix Tabs) so each view is a bookmarkable static page. Active
  view carries `aria-current="page"`. CSS class
  `.sophie-unit-view-link-bar` (BEM).
- **Trailing CTA** — "→ Practice this lecture" card at the
  bottom of `reading.astro` when the unit has a practice
  artifact. The pedagogical exit-ramp from the reading view to
  the practice view. CSS class `.sophie-reading-end-cta`.
- **`getAvailableUnitViews` helper** at
  `packages/astro/src/lib/unit-views.ts` — pure function
  (artifacts × draftUnitIds × unit) → ordered `UnitViewKind[]`.
  Used by `<ChapterLayout>` to compute the link-bar's available
  views. Built as an internal tsup entry; not exposed in
  `package.json` exports (consumed only by the copied-verbatim
  `ChapterLayout.astro` in `dist/components/`).

Three deletions to the integration:

- `packages/astro/src/lib/integration/practice-mdx-warning.ts`
  (the #189 warn-and-defer emitter).
- The `warnOnUnroutedPracticeMdx(...)` call + import in
  `integration.ts`.
- The companion test file
  (`practice-mdx-warning.test.ts`).

Issue [#189](https://github.com/drannarosen/sophie/issues/189)
closes with this PR.

One new export from `@sophie/astro`:

- `./routes/practice.astro` — the route entrypoint, mirroring
  the existing `./routes/reading.astro` export shape.
  Auto-injected by `defineSophieIntegration` at
  `astro:config:setup` (consumer repos do nothing).

## References

- [ADR 0023](0023-vertical-slice-build-order.md) — vertical-slice-
  first; refactor outward as patterns emerge.
- [ADR 0038](0038-pedagogy-index-pattern.md) — pedagogy-index
  pattern + Amendment 2 (`useHydrated` SSR-gate convention).
  Direct in-tree prior art for the virtual-module Vite plugin.
- [ADR 0058](0058-epistemic-component-contract.md) — eight-role
  taxonomy; the chapter-component reference doc this extraction
  serves.
- [PR #172](https://github.com/drannarosen/sophie/pull/172) — the
  Amendment-2 hydration fix that motivated extracting the assembly
  to the platform.
- `packages/astro/src/lib/pedagogy-index-virtual-module.ts` — direct
  in-tree prior art for `figuresVirtualModule()`.
- Starlight (Astro reference integration) — `injectRoute` +
  virtual-module-for-options pattern.
- [`astro-integration-kit` `addVirtualImports`](https://astro-integration-kit.netlify.app/) —
  community canonicalization of the same pattern.
