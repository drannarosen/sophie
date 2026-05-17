# Intervention — Design Hardening (Phase 1, Reasoning OS Core)

**Date**: 2026-05-17
**Status**: Validated; ready for implementation
**ADRs**: [0044 (Misconception Graph + Intervention Library)](../website/decisions/0044-misconception-graph-and-intervention-library.md), composes with [0058 (Epistemic Component Contract)](../website/decisions/0058-epistemic-component-contract.md), forward-binds [0041 (Teaching Move Library)](../website/decisions/0041-teaching-move-library.md)
**Authors**: Anna (supervisor), Claude (drafter)
**Source plan**: `~/.claude/plans/hi-claude-working-directory-lazy-church.md` (Reasoning OS pedagogical-core session plan)

## Purpose

Harden ADR 0044's `<Intervention>` design for v1 implementation. ADR
0044 was hardened on 2026-05-14 (added `depth` prop, MG4 audit, I4
audit, hybrid nesting). This second pass resolves the surface ADR 0044
explicitly deferred: rendering shape for `<Intervention>`, the content
of `intervention-index.ts` (12 canonical interventions), MG4 output
format, MisconceptionGraphPage scope, ADR 0058 role composition, PR
sequencing, and forward-compatibility commitments.

`<Intervention>` is the second component in Sophie's Reasoning OS
pedagogical core. It pairs a cognitive-science-grounded remediation
with a declared misconception. The v1 ship-shape decides how structured
misconception remediation looks on the page — *and* canonizes 12
literature-grounded interventions as the platform's named taxonomy.

## Scope

**In v1:**

- `<Intervention>` component (children-mode nested in misconception
  Aside; standalone with `addresses=` also valid)
- `intervention-index.ts` library with **12 canonical interventions**
  across 4 families
- Pedagogy-index integration via `transformIntervention` extractor
- Audit invariants: MG3 (orphan-pairing) + MG4 (depth coverage) + I1
  (unknown addresses) + I2 (unknown type) + I3 (bridging missing
  limits)
- Smoke fixture chapter with paired misconception + intervention

**Already shipped (no new work):**

- `MisconceptionEntrySchema` with all 4 graph fields
  (`prerequisite_misconceptions`, `related_misconceptions`,
  `concept_refs`, `discipline_scope`) — lives at
  [packages/core/src/schema/pedagogy-index.ts:149-173](../../packages/core/src/schema/pedagogy-index.ts)
- MG1 (cycle detection) + MG2 (chapter-ordering check) audit
  invariants
- Graph extractor for `prerequisite_misconceptions`

**Deferred:**

- I4 audit (cross-ADR move resolution) — turns on when ADR 0041
  `move-index.ts` ships; `move:` field on intervention-index entries is
  the forward-compat seam declared now
- `<MisconceptionGraphPage>` route at
  `/about-this-course/misconception-graph/` — graph data exists in the
  index post-PR-γ; v2 layers the page on top
- Multi-target `<Intervention addresses>` (single target at v1; schema
  accepts `string | string[]` so v2 multi-target is non-breaking)

## Decisions

### D1 — v1 library: all 12 canonical interventions

Ship the full ADR 0044 taxonomy in `intervention-index.ts`:

**Confrontation family** (cognitive dissonance → accommodation):

1. **contrasting-cases** — Bransford & Schwartz 1999. Two cases
   differing only on the key dimension; predict before reveal.
2. **predict-then-reveal** — White & Gunstone 1992 (POE). Reader
   predicts outcome before reading the observation; dissonance engages
   accommodation.
3. **productive-cognitive-conflict** — Posner et al. 1982. Explicitly
   stage a discrepancy between student model and observation.

**Bridging family** (scaffold from existing intuition):

4. **bridging-analogy** — Clement 1993. Analogy intuitive to students
   AND mapping the target concept; declare limits explicitly.
5. **anchoring-intuition** — Clement 1993. Identify a correct existing
   intuition; build the target on top as scaffold.
6. **concrete-to-abstract-scaffold** — Bruner (Enactive-Iconic-Symbolic).
   Concrete experience → iconic representation → symbolic form.

**Restructuring family** (ontological shift):

7. **discrepant-event** — Liem 1987. Demonstration violating student
   expectations motivates restructuring.
8. **conceptual-exchange** — Chi 2008. Walk through abandoning one
   ontological category for another (e.g., heat as substance → process).
9. **worked-example-contrast** — Chi et al. 1989. Worked example where
   the misconception yields a wrong answer; contrast with correct
   application.

**Reinforcement family** (consolidate the correct conception):

10. **refutation-text** — Tippett 2010. State the misconception,
    refute, explain why it's tempting.
11. **spaced-retrieval-with-misconception-probe** — Roediger & Karpicke
    2006 + misconception research. Quiz on the misconception at spaced
    intervals; re-address on re-emergence.
12. **self-explanation-against-misconception** — Chi et al. 1989.
    Student explains to themselves why the correct answer is correct
    AND why the misconception was tempting.

Each `intervention-index.ts` entry includes: `name`, `family`,
`description`, `citation` (string at v1; structured fields reserved —
see D11), `addresses_families` (which misconception families it
typically targets), `move` (binding to ADR 0041 — reserved for I4 audit).

### D2 — I4 audit deferred to v2; `move:` field declared as seam

`intervention-index.ts` entries declare a `move:` field per ADR 0041's
2026-05-14 hardening, but the I4 audit invariant (verifying the move
resolves to a real entry in `move-index.ts`) doesn't fire at v1 because
`move-index.ts` is out of scope for this sprint (it's ADR 0041 work).

Forward-compat seam: when `move-index.ts` ships, I4 audit turns on
without any schema or component change. Pattern mirrors MultiRep's
registry-as-canonical-catalog decision (D3 over there).

### D3 — MG4 (depth coverage summary) ships at v1

The `depth: light | substantial` prop on `<Intervention>` already exists
in ADR 0044's 2026-05-14 hardening. MG4 aggregates per-chapter and
per-course coverage and emits during `pnpm sophie audit --summary` as:

```
MG4 — Intervention depth coverage:
  10 misconceptions total
   7 have ≥1 substantial intervention (70%)
   3 have only light interventions (30%)
   0 have no interventions (0%)  ← would fire MG3 separately
```

INFO-level; doesn't gate CI. Console-table emit; no JSON file artifact
at v1 (CI dashboards are a v2 concern).

### D4 — Render: distinct sub-card inside misconception Aside

`<Intervention>` rendered as a distinct sub-card nested inside the
parent misconception Aside. Visual hierarchy: misconception Aside (the
warning callout) → intervention sub-card (the resolution).

Sub-card anatomy:

```
┌─ ⚠ Misconception: universe-with-a-center ─────────────┐
│ Many students model the universe as expanding from a  │
│ single center point — like a firework or explosion…   │
│                                                       │
│ ┌─ [contrasting-cases] · Bransford & Schwartz 1999 ─┐ │
│ │ Predict what you'd observe if the universe had a  │ │
│ │ center, then compare to the actual observation:   │ │
│ │ isotropic Hubble flow from every vantage point.   │ │
│ └────────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─ [bridging-analogy] · Clement 1993 ────────────────┐ │
│ │ Bread baking with raisins: from any raisin's…      │ │
│ │                                                    │ │
│ │ Limits: bread has an outside; the universe doesn't.│ │
│ └────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

Sub-card elements:

- **Type-pill header** (e.g., `[contrasting-cases]`) using the same
  pill vocabulary as MultiRep's rep pills
- **Citation chip** (clickable → intervention-library reference page in
  MyST docs)
- **Body prose** in normal type
- **Optional `limits` sub-section** rendered as a final labeled section
  ("Limits: …" italicized/muted) — surfaces Clement-1993-style
  explicit-limits authoring that I3 INFO nudges
- **No depth indicator** — `depth` is audit-only metadata for instructors
  via MG4's summary; readers see intervention content

When `type="custom"`: name renders as type-pill text with a small
"custom" annotation chip and no citation chip.

Pedagogical rationale: hiding the intervention behind interaction
(disclosure, tabs, hover) destroys the pairing-visibility that's the
load-bearing claim of structured misconception remediation. The
sub-card is the resolution to the misconception; visual hierarchy makes
the pairing structurally legible.

### D5 — Standalone interventions render with `↗ Addresses:` header

When `<Intervention addresses="<misc-slug>">` lives outside a
misconception Aside (course-level interventions per ADR 0044), the
sub-card renders with a leading cross-reference header:

```
┌─ ↗ Addresses: universe with a center ──────────────────┐
│ ┌─ [refutation-text] · Tippett 2010 ────────────────┐  │
│ │ The universe has no center. Students often…       │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

The header surfaces the misconception's `label` (verbal handle, not
slug) so the reader gets the pairing context that nesting normally
provides.

### D6 — `<Intervention>` carries no `epistemicRole` (deliberate non-decision)

ADR 0058's 8-role taxonomy doesn't include a "remediation" or
"intervention" role. The misconception `<Intervention>` pairs with
already carries role `misconception` (per ADR 0058 §3 implicit lookup
table for `<Aside kind="misconception">` and `<Callout
variant="misconception">`).

Deliberate non-decision documented in this doc so future contributors
don't try to fit Intervention into the existing 8 roles when none fits.
Future ADR can extend the taxonomy with a 9th `intervention` or
`remediation` role if needed; no breaking change required either way.

### D7 — PR cadence: β → γ → δ (no α, no ε)

No PR-α because the schema (Aside graph fields) already ships. No PR-ε
because no aggregator at v1 — misconception pairings render inline in
chapter context, and `<MisconceptionGraphPage>` is deferred to v2.

| PR | Subject |
|----|---------|
| β  | `<Intervention>` component + `intervention-index.ts` (12 entries) + `getInterventionLibrary()` loader + tests + Storybook stories. axe-core tests. |
| γ  | `transformIntervention` extractor + extend `pedagogy-index-extractor.ts` to aggregate interventions per chapter + smoke fixture chapter with paired misconception + intervention. |
| δ  | Audit invariants in `pedagogy-audit.ts`: MG3 + MG4 + I1 + I2 + I3. Tests per invariant. |

### D8 — MisconceptionGraphPage deferred to v2

ADR 0044 lists `<MisconceptionGraphPage>` at
`/about-this-course/misconception-graph/` as a future-PR deliverable.
Graph viz is non-trivial design (React Flow? D3? mermaid? static SVG?)
and not on the chapter-capstone critical path.

v2 layers the page on top of the v1 pedagogy-index entries; no schema
or extractor change required. The data exists post-PR-γ; only the route
+ viz component are new.

### D9 — ADR 0044 revision notes needed

Two ADR revision notes land in Phase 2:

1. **MisconceptionGraphPage deferral**: v1 ships pedagogy-index data
   only; route + viz deferred to v2 because graph viz is its own design
   problem and chapter capstone doesn't depend on it.
2. **I4 audit deferral**: `move:` field declared per intervention-index
   entry as forward-compat seam; I4 turns on when ADR 0041
   `move-index.ts` ships. No schema change at v2 audit-flip.

### D10 — Forward-compatibility commitments baked into v1

| # | v1 decision | v2+ evolution path | What v1 must get right |
|---|---|---|---|
| F1 | I4 audit deferred | v2 audit fires when `move-index.ts` ships | `move:` field declared per entry from v1; turning audit on is a one-function add |
| F2 | `<Intervention addresses>` single target at v1 | v2 may want multi-target (`addresses={["misc-1", "misc-2"]}`) | **Accept `string \| string[]` from v1** (Zod union; runtime normalize to array). Non-breaking. |
| F3 | `intervention-index.ts` ships as TypeScript map | v2 may want cross-course inheritance (ADR 0048 plugin layer) | Library read via `getInterventionLibrary()` loader, not direct imports — plugin layer wraps loader without touching consumer call sites |
| F4 | Citations as plain strings | v2 may want DOI + bibtex structured refs | Reserve `citation_doi?: string` + `citation_bibtex?: string` optional fields per entry at v1 (unused) |
| F5 | `template_body` not used at v1 | v2 may use library entries as authoring scaffolds | Reserve `template_body?: string` per entry at v1 (unused) |
| F6 | MisconceptionGraphPage deferred | v2 ships the route + viz | All v2 page data lives in PedagogyIndex post-PR-γ; v2 is a new route + viz, zero schema change |
| F7 | No `epistemicRole` on `<Intervention>` | Future ADR may extend ADR 0058 with a 9th role | Documented as deliberate non-decision; future ADR can amend + retrofit non-breakingly |

The single most load-bearing forward-compat decision is **F2** — the only
one requiring a real v1 schema move (Zod union from day one rather than
a string-only). Cheap, but prevents a breaking change later.

## Component contract / authoring shape

Nested in misconception Aside (default):

```mdx
<Aside
  kind="misconception"
  name="universe-with-a-center"
  short="The universe has a center point from which it expanded"
  related_misconceptions={["redshift-as-ordinary-doppler"]}
  concept_refs={["redshift", "hubble-parameter"]}
>
  Many students model the universe as expanding from a single center
  point — like a firework or explosion happening in a pre-existing
  space.

  <Intervention type="contrasting-cases" addresses="this">
    Predict what you'd observe if the universe had a center, then
    compare to the actual observation: isotropic Hubble flow from
    every vantage point.
  </Intervention>

  <Intervention type="bridging-analogy" addresses="this" limits="Bread has an outside; the universe doesn't.">
    Bread baking with raisins: from any raisin's perspective, every
    other raisin recedes — no raisin is "the center."
  </Intervention>
</Aside>
```

Standalone (course-level intervention):

```mdx
<Intervention
  type="refutation-text"
  addresses="universe-with-a-center"
>
  Despite the everyday intuition that any expansion needs a center
  point, the universe's expansion is fundamentally different…
</Intervention>
```

Custom intervention (course-specific, no canonical name):

```mdx
<Intervention type="custom" name="scale-comparison" addresses="this">
  Compare the scale of a typical galaxy (10^21 m) to the average
  inter-galaxy distance (10^23 m)…
</Intervention>
```

## Pedagogy index entry shape

```ts
export const InterventionEntrySchema = z.object({
  type: z.string(),                      // canonical name OR "custom"
  name: z.string().optional(),           // required when type === "custom"
  addresses: z.union([
    z.string(),
    z.array(z.string()),
  ]),                                    // single or multi-target
  body: z.string(),                      // serialized prose
  limits: z.string().optional(),         // Clement 1993 explicit limits
  depth: z.enum(["light", "substantial"]).default("light"),
  chapter: z.string(),
  // Anchor (auto from type+addresses+index in chapter)
  anchor: z.string(),
});

export const InterventionLibraryEntrySchema = z.object({
  name: z.string(),
  family: z.enum(["confrontation", "bridging", "restructuring", "reinforcement"]),
  description: z.string(),
  citation: z.string(),
  addresses_families: z.array(z.string()),
  move: z.string(),                      // ADR 0041 binding (I4 future)
  // Reserved for v2:
  citation_doi: z.string().optional(),
  citation_bibtex: z.string().optional(),
  template_body: z.string().optional(),
});
```

## Audit invariants (Phase 3 PR-δ)

| ID | Severity | Check |
|---|---|---|
| MG3 | WARNING | Misconception declared but no `<Intervention>` paired with it across the course |
| MG4 | INFO    | Course-level depth-coverage summary (substantial vs light vs none) |
| I1  | WARNING | `<Intervention addresses="…">` references no known misconception (or `"this"` outside an enclosing misconception parent) |
| I2  | ERROR   | `<Intervention type="…">` not in `intervention-index.ts` (and `type !== "custom"`) |
| I3  | INFO    | `<Intervention type="bridging-analogy">` lacks `limits` (Clement 1993 nudge) |
| I4  | _(deferred until move-index.ts ships)_ | _(WARNING — every canonical intervention's `move:` resolves to real move in `move-index.ts`)_ |

MG1 + MG2 already ship.

## Files affected (Phase 3 implementation preview)

| Path | Change | PR |
|------|--------|----|
| `packages/components/src/components/Intervention/` | New component dir matching `KeyEquation/` layout | β |
| `packages/components/src/intervention/intervention-index.ts` | New: 12 canonical entries + `getInterventionLibrary()` loader | β |
| `packages/core/src/schema/intervention.ts` | New: `InterventionEntrySchema` + `InterventionLibraryEntrySchema` | β |
| `packages/astro/src/lib/transform-intervention.ts` | New: mirrors `transform-learning-objectives.ts` | γ |
| `packages/astro/src/lib/pedagogy-index-extractor.ts` | Extend: aggregate `interventions` per chapter | γ |
| `packages/astro/src/lib/pedagogy-audit.ts` | Extend: add MG3 + MG4 + I1 + I2 + I3 | δ |
| `examples/smoke/src/content/chapters/.../misconception-fixture.mdx` | New smoke fixture chapter with paired misconception + intervention | γ |

## Verification

Per Sophie's per-PR cadence:

```bash
pnpm exec biome check <path> && echo CLEAN
pnpm exec turbo run typecheck --output-logs=errors-only
pnpm --filter @sophie/components exec vitest run <pattern>
pnpm --filter @sophie/components test:storybook   # Mac-local, SKIP_VR=1
pnpm install --frozen-lockfile && echo LOCKFILE_OK   # if package.json touched
```

End-of-family verification (after PR-δ):

- Smoke fixture chapter renders nested misconception + intervention
  sub-cards correctly via Playwright MCP (light + dark + print)
- All 5 v1 audit invariants exercised by tests
- `sophie audit --summary` emits MG4 depth-coverage table
- All 12 canonical interventions enumerable from
  `getInterventionLibrary()`
- Custom intervention (`type="custom"`) renders without citation chip

## References

- [ADR 0044 — Misconception Graph + Intervention Library](../website/decisions/0044-misconception-graph-and-intervention-library.md)
- [ADR 0041 — Teaching Move Library](../website/decisions/0041-teaching-move-library.md) (I4 audit forward-binds here)
- [ADR 0058 — Epistemic Component Contract](../website/decisions/0058-epistemic-component-contract.md)
- [ADR 0038 — Pedagogy-index pattern](../website/decisions/0038-pedagogy-index-pattern.md)
- [ADR 0004 — Component contract revisions](../website/decisions/0004-component-contract-revisions.md)
- [Misconception graph schema reference](../website/reference/misconception-graph-schema.md)
- [Intervention library reference](../website/reference/intervention-library.md)
- Cognitive-science literature: Bransford & Schwartz 1999; White &
  Gunstone 1992; Posner et al. 1982; Clement 1993; Liem 1987; Chi 2008;
  Chi et al. 1989; Tippett 2010; Roediger & Karpicke 2006; Bruner.
