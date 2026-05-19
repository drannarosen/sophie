# A8 `<OMIFlow>` v1 design (2026-05-19)

**Status.** Brainstormed + locked with Anna 2026-05-19 (Session 10 closeout).
Ready for ADR draft (A8 ADR; numbered next-available) + implementation PR.
Prerequisite: [ADR 0058](../website/decisions/0058-epistemic-component-contract.md)
(eight-role epistemic contract). Sibling-deferred:
[ADR 0059](../website/decisions/0059-linked-representation-state-primitive.md)
linked-rep integration → v2.

## Scope (locked)

**v1 is a pure layout primitive.** Three named slots; each declares its
epistemic role; static display; no parameter-driven cross-slot
recomputation. ADR 0059 linked-rep integration is a deliberate v2
amendment after the interactive-figures workstream lands.

## Authoring shape

```mdx
<OMIFlow id="hr-diagram-flow" concept="stellar-temperature">
  <OMIFlow.Observable title="The Hertzsprung-Russell diagram">
    Plotting luminosity vs surface temperature reveals tight bands —
    the main sequence, giants, white dwarfs.

    <Figure name="hr-diagram-main-sequence" />
  </OMIFlow.Observable>

  <OMIFlow.Model title="Hydrostatic equilibrium + radiative transport">
    A star's structure follows from pressure balancing gravity, energy
    transport via radiation or convection, and a known equation of
    state.

    <KeyEquation refId="hydrostatic-equilibrium" />
  </OMIFlow.Model>

  <OMIFlow.Inference title="Mass → temperature → lifetime">
    The model predicts that more massive stars sit hotter on the main
    sequence and burn through their fuel faster. The HR diagram is the
    empirical signature.
  </OMIFlow.Inference>
</OMIFlow>
```

## Decisions (locked through this brainstorm)

| # | Decision | Locked value | Rationale |
|---|---|---|---|
| 1 | Scope | Pure layout (v1); linked-rep deferred | Smaller surface; (a) is composable with (b) for free |
| 2 | Visual | Flat 3-panel grid + subtle chevrons between (`>` desktop, `↓` mobile) | Earns the "Flow" in the name without SVG-arrow complexity |
| 3 | Slot requirements | Strict: all 3 required, exactly one of each | Cleanest invariant; audit gate trivially satisfied; Zod literal tuple shape |
| 4 | Source order | Liberal in source, strict in render: any source order accepted; renderer always emits O → M → I; audit WARN (OF-1) on out-of-order source | Be liberal in what you accept, strict in what you produce |
| 5 | Per-slot heading | Each slot's title bar shows the role label as a small caps prefix ("Observable", "Model", "Inference"); optional author `title=` appends after a separator ("Observable: H-alpha line") | Makes role binding visible at a glance without requiring author work |
| 6 | Concept binding | Optional `concept=` prop on root `<OMIFlow>`; binds to Notation Registry; v1 has no audit invariant on it | Forward-compatible with MultiRep ↔ OMIFlow cross-links without locking semantics today |
| 7 | Nested content | Each slot accepts arbitrary MDX (prose, Sophie components, math). No restrictions in v1 | YAGNI on preemptive restrictions; add invariants if pattern abuse surfaces |
| 8 | Compact / variant | None; single shape, single layout | YAGNI; ship the canonical first |
| 9 | Pedagogy-index shape | ONE `OMIFlowEntry` per callsite with `{ chapter, anchor, concept?, observable: { title?, body }, model: { title?, body }, inference: { title?, body } }`. Pre-rendered HTML per slot lives on the parent entry, not as separate children | Single entry per callsite keeps the index lean; cross-cutting audit can introspect slots |
| 10 | Anchor convention | `omi-${counter}` (auto) → `omi-${slug(concept)}` (if `concept=`) → explicit `id=` always wins | Mirrors the `dd-` (deep-dive) precedence from PR-B; intra-chapter D1-style collision throw |
| 11 | Role binding source | Hardcoded by slot component name. `<OMIFlow.Observable>` is ALWAYS `role=observable`; not author-overridable | The contract IS the slot binding; overriding would defeat the eight-role taxonomy gate |
| 12 | a11y shape | Outer: `<div class="omi-flow" role="group" aria-labelledby={slug-of-concept-or-counter}>`. Per slot: `<section aria-labelledby={slot-title-id}>`. Each slot's title span carries the id | axe-clean; landmark semantics for screen readers |
| 13 | Print mode | 3 panels stack vertically with chevrons becoming `↓` (same as mobile); CSS `@media print` | Reuse the mobile-stack layout |
| 14 | First migration target | **Smoke chapter** first (new fixture or appended to spoiler-alerts); ASTR 201 Module 3 follows as a separate content PR | Platform validation in the smoke target keeps real-chapter authoring decoupled from platform-side debug; Anna's chapter time stays focused on pedagogy decisions |

## Implementation surface

### Package layout

- `packages/components/src/components/OMIFlow/` (new folder, sibling to MultiRep/KeyEquation)
  - `OMIFlow.tsx` (root + 3 slot components as static properties)
  - `OMIFlow.schema.ts` (Zod props + slot child-element narrowing)
  - `OMIFlow.module.css`
  - `OMIFlow.stories.tsx` (5 stories: minimal, concept-bound, deep-content, dark-mode, axe-coverage)
  - `OMIFlow.test.tsx` (render shape, slot-detection, axe)
  - `OMIFlow.contract.ts`
  - `index.ts`
- `packages/core/src/schema/pedagogy-index-entries/omi-flow.ts` — new `OMIFlowEntrySchema`
- `packages/astro/src/lib/pedagogy-index/extractors/omi-flow.ts` — `extractOMIFlows` walker
- `packages/astro/src/lib/pedagogy-audit/invariants/omi-flow.ts` — 2 invariants:
  - **OF-1** (WARN): slots out of source order
  - **OF-2** (ERROR): chapter declares `framing: 'OMI'` but no `<OMIFlow>` rendered

### Pedagogy-index integration

Schema: extend `PedagogyIndexSchema.omiFlows: readonly OMIFlowEntry[]` with `.default([])` for forward-compat (mirrors `deepDives` pattern from PR-B).

Extractor wired into orchestrator alongside `extractDeepDives` /
`extractMisconceptions`. Accumulator adds `omiFlows: Map` slot + `addOMIFlows` method with D2-style cross-chapter collision check on explicit-id-derived anchors.

### Audit invariants

**OF-1** (per-OMIFlow, WARN): if the source order of slot children differs from O → M → I, emit warning with `chapter`, `anchor`, and the as-authored order. Authors who reorder are usually mid-edit; warning surfaces the discrepancy without blocking.

**OF-2** (per-OMI-chapter, ERROR): chapter frontmatter `framing: 'OMI'` requires ≥ 1 `<OMIFlow>` callsite. This is the chapter-level conformance gate ADR 0058 §"audit invariant deferred to a later ADR" anticipated. Trivially satisfied by authoring discipline.

### e2e (smoke chapter)

Per-OMIFlow existence loop in `proving-chapter.spec.ts` (mirrors deep-dive pattern from PR-B): for every entry in `index.omiFlows.filter(o => o.chapter === slug)`, assert DOM has `#${o.anchor}` with three slots.

## ADR shell

Future PR-A creates `docs/website/decisions/0063-omiflow-composite.md`:

- **Context**: ADR 0058 §"audit invariant deferred to a later ADR" promised A8 graduation would carry the OMI-chapter conformance gate. This delivers it. References ADRs 0030 (compound-component primitives), 0038 (pedagogy-index pattern), 0043 (notation registry concept binding).
- **Decision**: Lock the 14 decisions above. Slot-name-binds-role contract is the headline.
- **Rationale**: Why pure-layout v1 (composable with linked-rep follow-up); why strict slot shape (cleanest invariant); why chevrons (visual flow without SVG cost); why one entry per callsite (lean index).
- **Consequences**: ADR 0058's deferred audit invariant graduates as OF-2. MultiRep ↔ OMIFlow cross-link surface opens via the optional `concept=` binding. ASTR 201 Module 3 chapter unlocks once smoke migration validates.
- **Triggers**: implementation PR sequence below.

## Implementation PR sequence

Three PRs, in order, each ship-ready independently:

1. **PR-A** (schema + extractor + accumulator + audit invariants + ADR). ~1 day. RED→GREEN per superpowers:test-driven-development. No component yet; the extractor walks the future `<OMIFlow>` JSX and emits OMIFlowEntry but the renderer doesn't exist.

2. **PR-B** (component + stories + axe + VR baselines + smoke fixture). ~1.5 days. Implements `<OMIFlow>` and `<OMIFlow.{Observable,Model,Inference}>`. Adds a new smoke target chapter or appends an OMIFlow callsite to `spoiler-alerts.mdx`. Validates the OF-1 audit invariant fires correctly on a deliberately-misordered fixture.

3. **PR-C** (e2e + audit-baseline.md + the OF-2 chapter-level invariant + docs sweep). ~0.5 day. The OF-2 invariant lands separately so its trigger (`framing: 'OMI'`) can be tested against the smoke chapter's actual frontmatter without conflating PR-B's component-side work.

Total ~3 days. Matches the accepted.md "~3-5 days" estimate at the low end (because v1 is pure layout, not linked-rep).

## Verification

Per superpowers:verification-before-completion: before any PR claims green, run the full gate stack (biome / typecheck / vitest 1610+ / e2e / smoke audit / lint:loc/links/status / lockfile). Smoke audit baseline updates: expect +1 ERROR for the OF-2 violation on the smoke chapter (currently no `framing: 'OMI'` chapter exists, so OF-2 doesn't fire — but if PR-B's smoke fixture sets `framing: 'OMI'` to exercise the audit, OF-2 must be satisfied by the new `<OMIFlow>` callsite).
