---
date: 2026-05-25T00:00:00.000Z
tags:
  - components
  - authoring
  - ai-authoring
  - hydration
  - ssr
  - skeleton
  - structural-defense
status: accepted-design
validation:
  status: validated
  last_validated_date: "2026-05-25"
  evidence:
    - kind: manual
      ref: packages/components/src/_template/README.md
      date: "2026-05-25"
      notes: "Authoring-affordance prose: the five-step `cp -r _template components/<Name>` workflow, the import-depth fixup callout, references to ADR 0038 § A2.2 + § A2.6, and pointers to the canonical `GlossaryTerm` + `KeyEquation` reference consumers. This README is the document an AI or human author reads BEFORE writing a new store-backed component."
    - kind: manual
      ref: packages/components/src/_template/Template.tsx
      date: "2026-05-25"
      notes: "The skeleton component itself: `useHydrated()` hook called unconditionally at top of render; `if (!hydrated) return <>{children}</>;` gate; miss-path bare fallback with dev-only authoring warning; post-mount placeholder anchor carrying `data-react-hydrated='true'` (the e2e signal). Cites ADR 0038 § A2.2 + § A2.6 inline."
    - kind: test
      ref: packages/components/src/_template/Template.test.tsx
      date: "2026-05-25"
      notes: "Two gate tests run as a vitest meta-test in the unit suite: (1) `renderToString(...)` SSR snapshot asserts bare children (no `<a>`, no `data-radix`); (2) `render(...) + waitFor` post-mount asserts the trigger anchor with `data-react-hydrated='true'`. A regression on the gate breaks this file FIRST, before propagating to component copy-pastes."
    - kind: deployment
      ref: https://github.com/drannarosen/sophie/pull/177
      date: "2026-05-25"
      notes: "PR #177 shipped the `_template/` skeleton + the existing-component audits that motivated it. Verified at build time via the explicit-entry-map in `packages/components/tsup.config.ts` (no glob; `_template/` is structurally excluded from `dist/`)."
  notes: |
    Shipped in PR #177 as the authoring-affordance layer of the
    React #418 hydration-class defense family. Pairs with ADR 0038
    Amendment 2 (runtime `useHydrated` gate) + ADR 0083 (build-time
    CL1 invariant) + ADR 0084 (CI-runtime packed-smoke gate). The
    four ADRs collectively close the regression class: runtime
    structural defense, build-time static analysis, CI-runtime
    consumer-shape coverage, and authoring affordance.
---

# ADR 0085: `_template/` skeleton convention for new store-backed components

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[ADR 0038 Amendment 2](0038-pedagogy-index-pattern.md) (PR #172) locked
the `useHydrated`-at-top-of-render convention for the five store-backed
components (`GlossaryTerm`, `EquationRef`, `FigureRef`, `ChapterRef`,
`KeyEquation`). § A2.2 spells out the gate; § A2.6 spells out the
companion `client:*` directive requirement.
[ADR 0083](0083-cl1-client-directive-invariant.md) (PR #174) added the
CL1 build-time invariant that catches missing `client:*` directives.
[ADR 0084](0084-packed-smoke-ci-gate.md) (PR #176) added the
packed-smoke CI gate that catches packed-shape regressions in the
consumer shape pnpm workspace resolution cannot exercise by
construction.

Three structural defenses, all reactive: they catch what a careless
author shipped. None of them tell an author *how* to write a new
store-backed component correctly the first time. Two specific
authoring taxes follow from that gap.

1. **Recall tax.** A new store-backed component needs the
   `useHydrated`-gate convention + the unconditional-hook-call shape
   + the SSR-bare-children fallback + the miss-path dev warning + the
   `data-react-hydrated="true"` post-mount signal. An AI author (per
   [ADR 0030](0030-audience-and-ai-author-model.md) +
   [ADR 0061](0061-ai-optimized-codebase-design.md)) writing the
   sixth such component from scratch must reconstruct that shape from
   ADR 0038's prose. The reconstruction is reliable enough that the
   first five components got the shape right, but each new component
   re-pays the same cognitive cost.

2. **Copy-paste pollution.** The natural alternative to recall is
   "copy from an existing component" — start from `GlossaryTerm` or
   `KeyEquation`, then customize. This works structurally but drags
   in irrelevant store specifics: `GlossaryTerm`'s
   `definitions-store.ts` reaches into the pedagogy-index virtual
   module; `KeyEquation` wires KaTeX. Both are real dependencies of
   their respective components, not of the gate convention. New
   components either inherit the pollution (then strip it back) or
   start clean and re-derive the convention (back to recall tax).

The gap is an authoring affordance, not a structural defense. The
fix is a skeleton — a minimal directory whose only job is to encode
the convention with zero domain coupling.

## Decision

**`packages/components/src/_template/` is the canonical
copy-then-customize skeleton for new store-backed components. The
prescribed authoring workflow is `cp -r _template
components/<ComponentName>` followed by rename + store replacement.**

Four structural pieces:

1. **The directory layout** is a minimal mirror of a real component
   directory:

   - `Template.tsx` — the skeleton component. `useHydrated()` called
     unconditionally at the top of render; `if (!hydrated) return
     <>{children}</>;` immediately after; miss-path bare fallback
     with a dev-only `console.warn` for authoring-drift visibility;
     post-mount placeholder anchor carrying
     `data-react-hydrated='true'`. Cites ADR 0038 § A2.2 + § A2.6
     inline in the file-level JSDoc.
   - `template-store.ts` — a placeholder store-lookup stub. Exists
     only so `Template.tsx`'s `import { lookupX }` resolves and the
     test file's `vi.mock(...)` has a real module to intercept. Real
     consumers replace this file with their actual store (e.g.
     `GlossaryTerm/definitions-store.ts`).
   - `Template.test.tsx` — the two gate tests. Vitest auto-hoists
     `vi.mock("./template-store.ts", ...)` above the
     `import { Template }`, so the lookup returns a fixture entry
     deterministically. Test 1 asserts the SSR snapshot is bare
     children (no `<a>`, no `data-radix`). Test 2 asserts the
     post-mount tree includes the trigger anchor with
     `data-react-hydrated='true'`.
   - `README.md` — the five-step authoring workflow + the
     import-depth fixup callout + pointers to the canonical
     reference consumers (`GlossaryTerm`, `KeyEquation`).

2. **The two gate tests are the floor, not the ceiling.** Every
   store-backed component keeps both assertions and adds component-
   specific coverage (popover open, keyboard activation, miss-
   fallback shape, KaTeX render, etc.). The skeleton ships passing
   tests so the meta-test runs green in CI on every PR.

3. **`_template/` is excluded from `dist/` by construction.**
   `packages/components/tsup.config.ts` uses an explicit entry map
   (`entry: { index, "contract/index", "runtime/index",
   "internal/store-hydration" }`) rather than a glob. There is no
   pattern under which `_template/Template.tsx` is selected as a
   tsup entry, so it never appears in the published package. No
   `.dts` declaration, no `.js` bundle, no entry in the `exports`
   map — the skeleton is internal-only by file-layout convention,
   not by an opt-out filter.

4. **The meta-test runs in the standard unit suite.** No special
   harness, no separate workflow step. `Template.test.tsx` is picked
   up by `pnpm --filter @sophie/components test:unit` like any other
   test file in the package. A regression on the gate convention
   breaks the template's own tests *first*, before a real component
   copy inherits the drift.

The authoring workflow consequently goes from "remember ADR 0038
Amendment 2 in detail + decide what to reuse vs. strip from an
existing component" to "`cp -r _template components/<Name>` +
rename + replace store + write the RED test." The convention is
the file shape.

## Rationale

Four reasons make `_template/` the long-term-correct authoring shape
rather than a docs-only convention.

1. **Affordance beats discipline.** ADR 0038 § A2.2 + § A2.6 are
   prose; the skeleton is code. An author who copies the skeleton
   inherits the convention by construction rather than by reading.
   Per AGENTS.md's "structural fixes over targeted patches" principle,
   the file-layout convention forecloses the *class* of authoring
   error (gate convention forgotten / miscopied / partially recalled),
   not just one observed instance.

2. **AI-author-optimized per ADR 0061.** Sophie's codebase is designed
   for AI primary authoring; ADR 0061's six rules govern file shape,
   LOC budgets, sibling templates, and atomic docs. The `_template/`
   directory is a literal sibling template (Rule 6) co-located with
   the components it seeds. An AI author told "add a sixth store-
   backed component" has a copy target, not a reconstruction target.
   The skeleton is the structural pair to ADR 0083 — CL1 fires the
   ERROR if convention slips at the callsite; `_template/` prevents
   convention from slipping at the component-source layer.

3. **Defense-in-depth completeness.** The four-layer hydration family
   covers the React #418 regression class at every layer where the
   class can be defended:

   | Layer                     | ADR  | Defense                                                                                  |
   | ------------------------- | ---- | ---------------------------------------------------------------------------------------- |
   | Runtime (component)       | 0038 | `useHydrated`-at-top gate ensures SSR + first client render emit identical bare children |
   | Build-time (static)       | 0083 | CL1 ERROR-level finding when callsites omit `client:*`                                   |
   | CI-runtime (packed shape) | 0084 | Playwright probe asserts 0 × #418 on a packed-tarball consumer outside the workspace     |
   | Authoring affordance      | 0085 | `_template/` skeleton encodes the convention as a copy target                            |

   Without the authoring layer, a new sixth store-backed component
   shipped without the gate still slips past 0038 (the prose lives
   in an ADR, not in code), past 0083 (CL1 catches *missing*
   `client:*` directives, but a component that hydrates without the
   gate still emits #418 in the packed shape), and only fails at
   0084's CI gate after the author has already written and shipped
   the broken component. `_template/` moves the catch to *before*
   the first commit.

4. **Bounded cost; the convention is the file shape.** The skeleton
   is four files totaling under 200 LOC. The two gate tests run as
   part of the existing unit suite (no separate CI step). The tsup
   exclusion is structural (explicit entry map, no opt-out flag).
   The only ongoing maintenance is keeping the skeleton in lockstep
   with the gate convention itself — and if the convention ever
   changes, the skeleton is the first file to update, and its tests
   are the first signal that the change is correct.

## Alternatives considered

### Option B — docs-only convention (no code skeleton)

Keep ADR 0038 § A2.2 as the canonical reference; add a "checklist
for new store-backed components" section to
`docs/website/reference/chapter-components.md`. No skeleton
directory; authors read the checklist and write from scratch.

**Rejected.** Docs-only conventions degrade under the load of AI
authoring at scale (per ADR 0030 + ADR 0061). The checklist is the
recall path the skeleton replaces; preserving it as the *only* path
preserves the recall tax. The `_template/` approach is strictly
additive — the checklist content lives in the skeleton's
`README.md`, co-located with the file shape it documents, where an
author reading the convention is already looking at the code that
encodes it.

### Option C — code-generator (e.g. `pnpm sophie new-component <Name>`)

Ship a generator script that prompts for the component name and
emits the four skeleton files customized in place.

**Rejected.** The generator adds a tool surface (CLI command,
prompt handling, file-template runtime) for an operation that
`cp -r` already performs identically. Per W2 in AGENTS.md, the
minimum code that solves the problem is the skeleton directory and
the documented `cp -r` command. The generator would also need its
own test surface and would drift from the skeleton over time. If
generator ergonomics ever justify the cost, the upgrade path is
to drive the generator off the same skeleton files — the skeleton
is the source of truth either way.

### Option D — extract `useHydrated` + gate convention into a higher-order component / render-prop wrapper

Encode the gate convention as a `withHydrationGate(Component)` HOC
so authors call the wrapper instead of remembering the convention.

**Rejected.** The gate convention is structurally tied to *what
the component renders pre-mount vs. post-mount*; that branching
lives in the component body itself. A wrapper would either (a)
take both render functions as props (which is more boilerplate
than the gate it replaces) or (b) hide the branch entirely (which
buries the hydration semantics behind an abstraction that future
readers must unpack to understand the SSR shape). The skeleton
keeps the convention legible inside the component — exactly where
ADR 0038 § A2.2 says it belongs.

## Consequences

### Positive

- **Authoring tax → near-zero for new store-backed components.**
  `cp -r _template components/<Name>` + rename + replace store is
  the entire convention. An AI or human author who has never read
  ADR 0038 still produces a gate-correct component by following the
  skeleton.
- **Meta-tests catch template-shape drift before propagation.**
  `Template.test.tsx`'s two gate assertions break first if the
  skeleton's convention slips. A broken skeleton fails the unit
  suite *before* a copy-paste consumer inherits the drift, so the
  blast radius of a regression is one file rather than every new
  component shipped against that snapshot.
- **Skeleton excluded from `dist/` by construction.** The explicit
  entry map in `tsup.config.ts` means `_template/` carries zero
  publish-side cost. Consumers never see it; their bundlers never
  resolve it; their type-checkers never load it.
- **Four-layer defense family closes the React #418 class.**
  Combined with ADR 0038 Amendment 2 (runtime), ADR 0083
  (build-time), and ADR 0084 (CI-runtime), the authoring layer
  completes the defense-in-depth shape against the hydration
  regression class.

### Negative / risks

Two known risks, each with a planned mitigation.

1. **Template-shape drift if the gate convention changes.** A future
   ADR amendment that changes the gate (e.g. moves the
   `useHydrated` call site, adds a second hook, changes the
   `data-react-hydrated` signal) must update the skeleton in the
   same PR or the convention diverges from the docs. **Mitigation**:
   the two meta-tests in `Template.test.tsx` are the signal — any
   gate change that doesn't update the skeleton breaks the unit
   suite on the next PR. The skeleton is therefore self-detecting
   as drift bait.

2. **False positives in audits that grep for a `Template` symbol.**
   A naïve audit script grepping for `Template` across
   `packages/components/src/` would hit the skeleton. **Mitigation**:
   convention is to name real components `<DomainName>` (e.g.
   `GlossaryTerm`, `KeyEquation`, `FigureRef`), never `Template`.
   The directory naming convention (`_template/` with a leading
   underscore) signals "skeleton, not a real component" to humans;
   audit scripts that need to skip it can scope their patterns to
   `src/components/**` instead of `src/**`.

### What this catches

- **Missing `useHydrated` gate** at the top of render — the SSR
  snapshot test fails immediately.
- **Wrong gate position** (e.g. `useHydrated` called after a
  conditional return) — the rule-of-hooks runtime error surfaces in
  the test render.
- **Missing post-mount `data-react-hydrated="true"` attribute** —
  the second gate test fails on the `toHaveAttribute` assertion.
- **Missing companion `client:*` directive at callsites** — caught
  by ADR 0083's CL1 invariant at consumer build time (the skeleton
  documents `client:load` requirement in its README + Template.tsx
  JSDoc, but enforcement is at the audit layer, not the component
  layer).

### What this does NOT catch

- **Business-logic correctness post-hydration.** The skeleton
  exercises only the gate. Component-specific behavior (popover
  open semantics, keyboard accessibility, KaTeX render correctness,
  cross-reference resolution) is delegated to per-component tests
  added on top of the two gate-test floor. The skeleton's job is
  the gate; per-component tests are the rest.
- **Wrong store shape.** `template-store.ts` is a placeholder; the
  authoring workflow expects it to be replaced. A component that
  copies the skeleton but keeps the placeholder store will fail at
  consumer runtime (the lookup always returns `undefined`), which
  is loud and immediate.

## Validation

The skeleton is validated by four artifacts, listed in the
frontmatter `validation.evidence` block:

1. **The skeleton README** (`packages/components/src/_template/README.md`)
   documents the five-step authoring workflow + the import-depth
   fixup callout + pointers to the canonical reference consumers.
   This is the document the author reads before writing a new
   store-backed component.
2. **The skeleton component** (`packages/components/src/_template/Template.tsx`)
   encodes the gate convention as code: `useHydrated()` at top of
   render, bare-children early return, miss-path dev warning,
   post-mount placeholder anchor with the `data-react-hydrated`
   signal. The JSDoc cites ADR 0038 § A2.2 + § A2.6 inline.
3. **The skeleton tests** (`packages/components/src/_template/Template.test.tsx`)
   run as a meta-test in the unit suite. Two assertions: the SSR
   snapshot is bare children; the post-mount tree includes the
   trigger anchor. Test failures are the canary for gate-convention
   drift.
4. **PR #177** ([the squash-merge](https://github.com/drannarosen/sophie/pull/177))
   shipped the skeleton + the existing-component audits that
   motivated it. The explicit entry map in
   `packages/components/tsup.config.ts` was already in place;
   `_template/` is excluded from `dist/` by structural construction
   rather than by an opt-out filter added for this PR.

## References

- [ADR 0038](0038-pedagogy-index-pattern.md) — pedagogy-index pattern;
  Amendment 2 § A2.2 (runtime `useHydrated` gate) is the structural
  convention this skeleton encodes; § A2.6 (`client:load` mandatory)
  is the companion the skeleton's README documents.
- [ADR 0083](0083-cl1-client-directive-invariant.md) — CL1 build-time
  invariant; the structural pair to this skeleton (CL1 catches
  callsite-level slips; `_template/` prevents component-source slips).
- [ADR 0084](0084-packed-smoke-ci-gate.md) — packed-smoke CI gate;
  the CI-runtime sibling that catches whatever the authoring,
  build-time, and runtime layers miss.
- [ADR 0061](0061-ai-optimized-codebase-design.md) — AI-optimized
  codebase design; Rule 6 (sibling templates co-located with the
  files they seed) is the direct rationale for the `_template/`
  shape.
- [PR #177](https://github.com/drannarosen/sophie/pull/177) — the
  squash-merge that shipped the `_template/` skeleton.
- `packages/components/src/_template/README.md` — authoring workflow
  prose.
- `packages/components/src/_template/Template.tsx` — skeleton
  component encoding the gate convention.
- `packages/components/src/_template/Template.test.tsx` — two
  meta-tests that guard the skeleton against gate-convention drift.
- `packages/components/tsup.config.ts` — explicit entry map that
  excludes `_template/` from `dist/` by construction.
