# MultiRep — Design Hardening (Phase 1, Reasoning OS Core)

**Date**: 2026-05-17
**Status**: Validated; ready for implementation
**ADRs**: [0043 (MultiRep + Notation Registry + Alignment Audit)](../website/decisions/0043-notation-registry-multirep-alignment-audit.md), amends [0058 (Epistemic Component Contract)](../website/decisions/0058-epistemic-component-contract.md)
**Authors**: Anna (supervisor), Claude (drafter)
**Source plan**: `~/.claude/plans/hi-claude-working-directory-lazy-church.md` (Reasoning OS pedagogical-core session plan)

## Purpose

Harden ADR 0043's `<MultiRep>` design for v1 implementation. ADR 0043
was extensively hardened on 2026-05-14 (dropped `<RepIntuition>`, added
`equivalent_to`/`via` on `<RepEquation>`, two-mode `<RepCode>`, added MR5
+ MR6). This second pass resolves the surface ADR 0043 explicitly
deferred: rendering shape, pedagogy-index entry shape, composition with
ADR 0058's epistemic-role contract, and the smaller operational decisions
(children ordering, smoke fixtures, PR sequencing).

`<MultiRep>` is the first component in Sophie's Reasoning OS pedagogical
core. It binds multiple representations (verbal / equation / figure /
code) of one concept and feeds the Representation Alignment Audit. The
v1 ship-shape decides how the page-level Reasoning OS demonstration
looks for the first time.

## Scope

**In v1:**

- `<MultiRep>` parent with `<RepVerbal>` + `<RepEquation>` + `<RepFigure>`
  children
- Pedagogy-index integration via `transformMultiRep` extractor
- Notation Registry loader + `notation-registry.yaml` schema with
  optional `epistemic_role:` per concept
- Eight audit invariants: NR1–NR4 (Notation Registry) + MR1–MR4 + MR6
  (MultiRep) [MR5 belongs to RepCode and ships when RepCode does]
- `<ChapterMultiReps>` aggregator
- Smoke fixtures: `examples/smoke/pedagogy-contract.yaml` +
  `examples/smoke/notation-registry.yaml`

**Deferred:**

- `<RepCode>` (requires `<CodeCell>` per ADR 0018 to ship first) —
  needs ADR 0043 revision note
- Per-concept page route (`/about-this-course/notation/<concept>`)
- Toggle / tabbed / side-by-side alternative render modes
- Cross-chapter `equivalent_to` resolution (audit-pass flip only at v2)
- Cross-course concept inheritance (ADR 0048 plugin layer)

## Decisions

### D1 — v1 ships three Rep children (deferred RepCode)

`<RepVerbal>` + `<RepEquation>` + `<RepFigure>`. `<RepCode>` deferred
pending `<CodeCell>` per ADR 0018. The smoke chapter (spoiler-alerts)
doesn't currently bind any code representation, so deferring RepCode
unblocks the chapter capstone without compromising the v1 demonstration.

ADR 0043 revision note required to flag the deferral; v1 contract is
explicitly a *subset* of the locked ADR 0043 shape.

### D2 — Render: framed binding card + responsive grid + role pills

Render shape:

- **Framed binding card** with the concept's `verbal_label` (from the
  Notation Registry) inset into the card's top border, left-aligned.
  Anchor id = `mr-<concept-slug>`. The card frame is the load-bearing
  visual signal that "these reps belong together."
- **Responsive CSS Grid inside the card**:
  `grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr))` +
  `grid-auto-flow: row dense`. Side-by-side on wide viewports;
  single-column stack on narrow.
- **Role pill per child** echoing the PR-2 interactive-figure pill
  vocabulary (`[verbal]` / `[equation]` / `[figure]`).
- **Canonical render order**: verbal → equation → figure (regardless of
  source order). Renderer sorts children into a fixed sequence; readers
  develop muscle memory for the binding card's shape.
- **Print mode** uses the stacked variant (avoids `break-inside: avoid`
  complications).
- **Dark mode** via the PR-77 data-theme decorator pattern.

Pedagogical rationale: Ainsworth 2006 (DeFT framework) shows
representation learning works when *translation between representations*
is supported. The grid layout puts reps adjacent so the reader's eye can
flick between them without scrolling — the load-bearing pedagogical
move. The frame + pills + canonical order make the binding structurally
legible at a glance.

### D3 — Epistemic role lives on the Notation Registry concept declaration

**`<MultiRep>` carries no `epistemicRole` prop.** Instead, the Notation
Registry's concept schema gains an optional field:

```yaml
concepts:
  - id: "orbital-radius"
    verbal_label: "orbital radius"
    canonical_symbol: "r"
    epistemic_role: "observable"   # NEW — optional, ADR 0058 enum
    units: "cm (CGS); AU (display)"
    ...
```

Rationale:

- Epistemic role is a property of the *concept*, not of any single
  chapter's invocation of it. Lifting role to the registry avoids
  per-MultiRep re-declaration.
- **The registry becomes the canonical concept-catalog for ALL Reasoning
  OS components.** Future composites (`<OMIFlow>`, `<UncertaintyLens>`,
  `<AssumptionStack>`) bind to the same registry. The schema becomes the
  long-lived contract for the whole Reasoning OS surface, not just a
  MultiRep-specific artifact.
- AI authoring per ADR 0030 can query "show me every `observable`
  concept introduced in Module 2" trivially.
- Future ADR 0005 epistemic theme-token slot binds to the role on
  whatever component is consuming the concept.

Amends ADR 0043 §Artifact 1 + cross-references ADR 0058 §2 (optional
additive role declaration).

### D4 — Concept-label header inset in card border using `verbal_label`

The card's top border renders the concept's `verbal_label` (not the
slug) as a small inline role-pill-style label, left-aligned. Reader sees
"orbital radius" not "orbital-radius." The border-inset visual idiom
matches Sophie's existing callout-card chrome.

Anchor id = `mr-<concept-slug>` so cross-references can deep-link to
specific bindings.

### D5 — Pedagogy index follows LO precedent; raw refs; audit-time resolution

`transformMultiRep` mirrors `transform-learning-objectives.ts`:

1. Walks the mdast tree for `<MultiRep>` JSX flow elements
2. Walks each MultiRep's children (`<RepVerbal>` / `<RepEquation>` /
   `<RepFigure>`)
3. Serializes children to a JSON-stringified `reps` mdxJsxAttribute on
   the `<MultiRep>` parent
4. Empties `children` (the parent renders from the serialized attribute)

`MultiRepIndexEntry` shape (in `@sophie/core` schema):

```ts
export const SerializedRepSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("verbal"), body: z.string() }),
  z.object({
    kind: z.literal("equation"),
    refKey: z.string(),
    symbol: z.string(),
    equivalent_to: z.string().optional(),
    via: z.string().optional(),
  }),
  z.object({
    kind: z.literal("figure"),
    refName: z.string(),
    symbolLabel: z.string().optional(),
  }),
  // Reserved for v2: z.object({ kind: z.literal("code"), ... }),
]);

export const MultiRepIndexEntrySchema = z.object({
  concept: z.string(),
  id: z.string(),
  chapter: z.string(),
  reps: z.array(SerializedRepSchema),
  layout: z.enum(["grid", "stack"]).optional(),
  display: z.string().optional(),
  // Reserved for v2 — unused at v1:
  bindingNotes: z.string().optional(),
  crossChapterEquivalents: z.array(z.string()).optional(),
  aiAuthoredBy: z.string().optional(),
  lastReviewedDate: z.string().optional(),
});
```

**`z.discriminatedUnion("kind", ...)` not `z.union(...)`** for
exhaustiveness checking on render-path coverage. The runtime switch in
`<MultiRep>` uses `default:` returning `null` + `console.warn` (not
`throw`) — forward-compatible when v2 adds `kind: "code"` and an older
runtime encounters it.

Refs stored *raw* (`refKey`/`refName` as authored); resolution at
audit-time, not extract-time. Keeps extractor cycle-free.

### D6 — `equivalent_to` chapter-scoped at v1 (MR6 INFO)

`<RepEquation equivalent_to="X">` resolution: X must point to a
`<KeyEquation refKey="X">` in the *same chapter's* equation index OR to
another `<RepEquation refKey="X">` in the same MultiRep. Cross-chapter
equivalence is a v2 audit-pass flip — no schema/component change
required.

### D7 — Smoke fixtures ship in PR-γ

`examples/smoke/pedagogy-contract.yaml` opts into the Notation Registry.
`examples/smoke/notation-registry.yaml` declares the concepts the smoke
chapter binds. Both ship in PR-γ (the extractor PR) since that's when
the audit first needs them as test fixtures.

Minimum viable registry for v1 testing: ~3 concepts the smoke fixture
chapter actually binds.

### D8 — PR cadence: α → β → γ → δ → ε

| PR | Subject |
|----|---------|
| α  | Schema: `NotationRegistrySchema`, `MultiRepSchema`, `SerializedRepSchema` discriminated union, `EpistemicRole` enum (ADR 0058). Emit to `@sophie/core` schema barrel. Schema-only tests. |
| β  | Components: `<MultiRep>`, `<RepVerbal>`, `<RepEquation>`, `<RepFigure>` with `serialize` separation per ADR 0004. Stories (light + dark VR baselines via PR-77 decorator). axe-core tests. Vitest schema + render tests. |
| γ  | Remark extractor: `transformMultiRep`. Extend `pedagogy-index-extractor.ts` with `multiReps` collection. Notation Registry loader (`notation-registry-loader.ts`). Smoke fixtures (`pedagogy-contract.yaml` + `notation-registry.yaml`). Integration tests. |
| δ  | Audit invariants in `pedagogy-audit.ts`: NR1–NR4 + MR1–MR4 + MR6. Tests covering each invariant ERROR/WARNING/INFO path. |
| ε  | `<ChapterMultiReps>` aggregator. Renders all `<MultiRep>` bindings declared in a chapter, grouped by concept. |

### D9 — ADR amendments needed

Two ADR revision notes land in Phase 2:

1. **ADR 0043 revision note**: `<RepCode>` deferred from v1 contract to
   a future sprint that ships alongside `<CodeCell>` (ADR 0018). Notes
   that MR3 + MR5 audit invariants are accordingly deferred. v1 contract
   is explicit subset.
2. **ADR 0043 + ADR 0058 cross-reference**: registry
   `concepts[].epistemic_role:` field becomes the role-composition seam
   for all Reasoning OS components. Future composites (A8–A11)
   inherit role from the registry rather than re-declaring per
   component. Updates ADR 0043 §Artifact 1 + cross-refs ADR 0058 §2.

### D10 — Forward-compatibility commitments baked into v1

| # | v1 decision | v2+ evolution path | What v1 must get right |
|---|---|---|---|
| F1 | RepCode deferred | v2 adds `<CodeCell>` ADR + RepCode component + MR3 + MR5 | `SerializedRep` is `discriminatedUnion`; runtime switch uses `default:` + console.warn (not throw) |
| F2 | Canonical render order | v2 may add `order="source" \| "figure-first"` prop | `<MultiRep order>` accepted at v1 (renderer ignores); reserved slot in schema |
| F3 | `equivalent_to` chapter-scoped | v2 audit-pass flip to course-wide | Audit-pass change only; no schema/component change |
| F4 | Registry `epistemic_role:` field | Becomes canonical concept-catalog for all Reasoning OS composites | Field lives in `NotationRegistrySchema`, not `MultiRepSchema` — platform-level not MultiRep-specific |
| F5 | `MultiRepIndexEntry` v1 shape | v2 adds `bindingNotes`, `crossChapterEquivalents`, `aiAuthoredBy`, `lastReviewedDate` | Reserved optional slots in schema at v1 |
| F6 | v1 per-course registry only | v2 plugin layer (ADR 0048) merges cross-course catalogs | Registry loader is a single function; plugin layer wraps loader, not consumer call sites |
| F7 | v1 render mode = grid+responsive only | v2 may add toggle / stack / tabbed modes | `<MultiRep display>` accepted at v1 (renderer ignores); reserved slot |
| F8 | v1 ships `<ChapterMultiReps>` aggregator | v2 may add `/about-this-course/notation/` route + per-concept page | Aggregator + per-concept page both consume same `MultiRepIndexEntry[]`; no schema/extractor change required |

The single most load-bearing forward-compat decision is **F4** — registry
as typed catalog of epistemic surfaces, not MultiRep-specific symbol
metadata.

## Component contract / authoring shape

```mdx
<MultiRep concept="orbital-radius">
  <RepVerbal>
    The distance from the central mass to the orbiting body.
    Imagine an ant walking along the orbit — how far must it
    travel to reach the central mass?
  </RepVerbal>

  <RepEquation refKey="kepler-3rd-law" symbol="r" />

  <RepFigure refName="orbit-geometry" symbolLabel="r" />
</MultiRep>
```

`<RepCode>` deferred at v1. Children order in MDX source is
author-discretion; renderer canonicalizes to verbal → equation → figure.

## Rendering anatomy

```
┌─ orbital radius ────────────────────────────────────────────────┐
│ [verbal]                              [equation]                │
│ The distance from the central         → see Kepler's 3rd law (r)│
│ mass to the orbiting body…                                      │
│                                       [figure]                  │
│                                       → see Fig. orbit-geometry │
└─────────────────────────────────────────────────────────────────┘
                  ↓ collapses on narrow viewports ↓
┌─ orbital radius ──────────────┐
│ [verbal] ...                  │
│ [equation] ...                │
│ [figure] ...                  │
└───────────────────────────────┘
```

## Audit invariants (Phase 3 PR-δ)

From ADR 0043 §Artifact 3 plus the 2026-05-14 hardening. MR5 deferred
with RepCode.

| ID | Severity | Check |
|---|---|---|
| NR1 | WARNING | `<KeyEquation>` declares symbols not in `notation-registry.yaml` |
| NR2 | INFO    | Registry declares a concept no chapter references |
| NR3 | ERROR   | Same symbol bound to different `concept.id`s across registry |
| NR4 | WARNING | Symbol declared with explicit units; `<KeyEquation>` uses it without unit context |
| MR1 | ERROR   | `<MultiRep>` references a `concept` not in registry |
| MR2 | WARNING | `<RepEquation symbol>` doesn't match concept's `canonical_symbol` or alias |
| MR3 | WARNING | _(deferred with RepCode)_ |
| MR4 | INFO    | `<RepFigure>` referenced figure's alt text doesn't mention `verbal_label` or `canonical_symbol` |
| MR5 | ERROR   | _(deferred with RepCode)_ |
| MR6 | INFO    | `<RepEquation equivalent_to="X">` X doesn't resolve in chapter |

Total v1: 8 invariants (NR1–NR4 + MR1, MR2, MR4, MR6). MR3 + MR5 ship
with the RepCode follow-on sprint.

## Files affected (Phase 3 implementation preview)

| Path | Change | PR |
|------|--------|----|
| `packages/core/src/schema/epistemic-role.ts` | New: `EpistemicRole` Zod enum per ADR 0058 | α |
| `packages/core/src/schema/notation-registry.ts` | New: `NotationRegistrySchema`, `ConceptSchema` with `epistemic_role` | α |
| `packages/core/src/schema/multirep.ts` | New: `MultiRepSchema`, `SerializedRepSchema` discriminated union | α |
| `packages/components/src/components/MultiRep/` | New component dir matching `KeyEquation/` layout | β |
| `packages/components/src/components/RepVerbal/` | New | β |
| `packages/components/src/components/RepEquation/` | New | β |
| `packages/components/src/components/RepFigure/` | New | β |
| `packages/astro/src/lib/transform-multirep.ts` | New: mirrors `transform-learning-objectives.ts` | γ |
| `packages/astro/src/lib/pedagogy-index-extractor.ts` | Extend: add `multiReps` collection | γ |
| `packages/astro/src/lib/notation-registry-loader.ts` | New: loader function | γ |
| `packages/astro/src/lib/pedagogy-audit.ts` | Extend: add NR1–NR4 + MR1, MR2, MR4, MR6 | δ |
| `examples/smoke/pedagogy-contract.yaml` | New: opt-in fixture | γ |
| `examples/smoke/notation-registry.yaml` | New: minimal registry for smoke chapter | γ |
| `packages/components/src/components/ChapterMultiReps/` | New: aggregator | ε |

## Verification

Per Sophie's per-PR cadence:

```bash
pnpm exec biome check <path> && echo CLEAN
pnpm exec turbo run typecheck --output-logs=errors-only
pnpm --filter @sophie/components exec vitest run <pattern>
pnpm --filter @sophie/components test:storybook   # Mac-local, SKIP_VR=1
pnpm install --frozen-lockfile && echo LOCKFILE_OK   # if package.json touched
```

End-of-family verification (after PR-ε):

- Smoke fixture chapter renders MultiRep cards correctly (grid wide,
  stack narrow, stack print) via Playwright MCP
- All 8 v1 audit invariants exercised by tests
- Dark + light VR baselines stable across the new component surface
- ChapterMultiReps aggregator surfaces all bindings from the smoke
  fixture chapter

## References

- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](../website/decisions/0043-notation-registry-multirep-alignment-audit.md)
- [ADR 0058 — Epistemic Component Contract](../website/decisions/0058-epistemic-component-contract.md)
- [ADR 0038 — Pedagogy-index pattern](../website/decisions/0038-pedagogy-index-pattern.md)
- [ADR 0004 — Component contract revisions](../website/decisions/0004-component-contract-revisions.md)
- [Notation Registry schema reference](../website/reference/notation-registry-schema.md)
- [MultiRep component reference](../website/reference/multirep-component.md)
- Ainsworth, S. (2006). DeFT: A conceptual framework for considering
  learning with multiple representations. *Learning and Instruction*,
  16(3), 183–198.
