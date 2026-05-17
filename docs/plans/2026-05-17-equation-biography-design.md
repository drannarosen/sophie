# EquationBiography — Design Hardening (Phase 1, Reasoning OS Core)

**Date**: 2026-05-17
**Status**: Validated; ready for implementation
**ADRs**: [0046 (Equation Biography)](../website/decisions/0046-equation-biography.md), composes with [0058 (Epistemic Component Contract)](../website/decisions/0058-epistemic-component-contract.md), forward-binds [0043 (Notation Registry — E8 audit)](../website/decisions/0043-notation-registry-multirep-alignment-audit.md) and [0044 (Misconception Graph — `<CommonMisuse>` cross-ref)](../website/decisions/0044-misconception-graph-and-intervention-library.md)
**Authors**: Anna (supervisor), Claude (drafter)
**Source plan**: `~/.claude/plans/hi-claude-working-directory-lazy-church.md` (Reasoning OS pedagogical-core session plan)

## Purpose

Harden ADR 0046's biography-children design for v1 implementation. ADR
0046's 2026-05-14 hardening was thorough — most decisions are locked
(children-mode authoring shape; all 6 children optional; three rendering
surfaces; 3 E-prefix audit invariants; per-equation opt-in;
structured-for-facts-vs-prose-for-stances principle). This pass resolves
the architecturally interesting open question — composition with ADR
0058's epistemic-role contract — plus operational details (rendering PR
scope, smoke fixture, PR sequencing, forward-compatibility).

EquationBiography is the third component family in Sophie's Reasoning
OS pedagogical core. It makes equations' observational meaning,
assumptions, units, validity domains, and common misuses
first-class structured metadata authored *at* the equation rather than
scattered across prose. The v1 ship-shape decides how role-aware
biography lookup works across the pedagogy-index — unlocking the
"queryable epistemic surface" layer that's the Reasoning OS thesis's
defining claim.

## Scope

**In v1:**

- 6 biography children: `<Observable>`, `<Assumption>` (optional
  `type=`), `<Units>` (required `symbol`+`unit`), `<BreaksWhen>`,
  `<CommonMisuse>` (optional `misconception=` cross-ref)
- Extend `<KeyEquation>` to walk + serialize biography children
- Rendering updates to three existing surfaces: `<EqRef>` hover
  (compact summary), `<ChapterEquations>` (full with `<details>`
  disclosure for misuse), `<CourseEquations>` (full)
- `transformEquationBiography` extractor + pedagogy-index integration
- Audit invariants: E7 (missing-Observable INFO) + E8 (NR symbol
  mismatch WARNING gated on NR opt-in) + E9 (missing-misconception
  cross-ref INFO)
- Smoke fixture: Wien's law with full biography

**Already locked from ADR 0046 2026-05-14 hardening (re-confirmed):**

- Authoring shape: children-mode siblings of math body (over
  prop-extension or wrapper-component)
- All 6 children optional (E7 stays INFO, not WARNING/ERROR)
- Per-equation opt-in (no Pedagogy Contract gate); invariants only
  fire when biography children present
- Structured-for-facts (`<Units>`) vs prose-for-stances (other 5)
- Three rendering surfaces, detail-tuned per context

**Deferred:**

- Per-equation `/equations/<slug>` page (route + reverse-lookups
  +cross-references) — pedagogy-index data exists; v2 layers route on
  top
- Typed `<Assumption type=>` platform catalog — v1 keeps free-form
  slug; v2 may promote to `assumption-index.ts` if patterns recur
- Explicit `concept_ref=` slots on prose biography children — reserved
  optional slot at v1; v2 may add NR linkage
- Sub-equation anchor granularity (`eq-wiens-law/breaks-when`) — v1
  tracks at equation anchor only; v2 may add per ADR 0045

## Decisions

### D1 — Explicit `epistemicRole` const per biography component (ADR 0058 binding, greenfield)

Each biography child declares a fixed role value in its component
definition (NOT an author-set prop). PedagogyIndex entries carry the
role explicitly. Authors don't see or manipulate the role; the
schema/extractor surfaces it for consumers.

Role mapping per ADR 0058's 8-role taxonomy:

| Component | epistemicRole |
|---|---|
| `<Observable>` | `"observable"` |
| `<Assumption>` | `"assumption"` |
| `<BreaksWhen>` | `"approximation"` (validity-domain marker) |
| `<CommonMisuse>` | (no own role — cross-refs to misconception graph; the linked end carries `"misconception"`) |
| `<Units>` | **(no role)** — descriptive metadata, not epistemic content per ADR 0058 §"components that don't fit any role are likely chrome" |
| `<KeyEquation>` math body | `"model"` (per ADR 0058 §3 lookup table) |

Rationale:

- **Greenfield**: no retrofit cost. The biography children don't ship
  yet. Declaring `epistemicRole` at the component-definition level is
  one extra const per component.
- **Code-grounds the ADR 0058 §3 lookup table**: instead of a
  documentation-only mapping, the component is the source of truth.
  Reduces drift risk between docs and code.
- **Unlocks the queryable epistemic surface**: consumers
  (audit, AI authoring, theme tokens) read a uniform field from the
  pedagogy index. Trivial queries become "show me every `assumption`
  declared in Module 4" or "every `approximation` (BreaksWhen) across
  the course."
- **Pairs with MultiRep's registry-as-catalog decision**: registry
  carries concept-level role; components carry component-level role.
  Together they complete the Reasoning OS role-binding surface.

Amends ADR 0046 with the explicit-binding decision; cross-references
ADR 0058 §2 (optional additive role declaration — the v1 ship of
biography children is the first greenfield surface to take it explicit).

### D2 — Rendering updates bundled into PR-β

The 6 biography components have no own UI — they serialize children
into KeyEquation's schema. The user-visible payoff is the rendering
updates to three existing components:

- **`<EqRef>` hover preview** (compact summary line): "2 assumptions ·
  1 misuse · valid in thermal equilibrium". Count of `<Assumption>` +
  count of `<CommonMisuse>` + first `<Assumption type=>` slug.
- **`<ChapterEquations>`** (full biography sections): Observable,
  Assumptions (typed slugs first if present), Units inline, BreaksWhen,
  Common Misuses collapsed behind `<details>` disclosure (typically the
  bulkiest field).
- **`<CourseEquations>`** at `/equations` (same full render as
  ChapterEquations).

Bundled into PR-β rather than split because the biography components
have no own render — splitting would ship data with no consumer.

### D3 — Smoke fixture = Wien's law

Per ADR 0046's "Suggested authoring order for ASTR 201 Module 1:
Wien's law first (most fully-formed biography case)."

Wien's law exercises every biography child:

- 2 assumptions (`thermal-equilibrium` + `blackbody`)
- 1 BreaksWhen (non-thermal emission, masers, etc.)
- 1 CommonMisuse (applying to absorption-line spectra)
- 2 Units (`T` in K, `λ_peak` in cm)

Inverse-square law (the spoiler-alerts chapter's main equation) gets
its biography in Phase 4 (PR-7 chapter capstone), separating the
EquationBiography sprint's smoke fixture from the chapter-capstone
deliverable.

### D4 — PR cadence: α → β → γ → δ (no ε)

| PR | Subject |
|----|---------|
| α  | Schema: `equation-biography.ts` with 6 sub-schemas + aggregate `BiographySchema`. Extend `KeyEquationSchema` with optional `biography: BiographySchema` field. Emit to `@sophie/core` schema barrel. Schema-only tests. |
| β  | 6 biography components (each with hardcoded `epistemicRole` const where applicable). Extend `<KeyEquation>` to walk + serialize biography children. Rendering updates to `<EqRef>` hover + `<ChapterEquations>` + `<CourseEquations>`. Storybook stories (light + dark VR baselines). axe-core tests. Vitest schema + render tests. |
| γ  | `transformEquationBiography` extractor. Extend `pedagogy-index-extractor.ts` to populate `biography` per equation entry. Wien's law smoke fixture chapter. Integration tests. |
| δ  | Audit invariants in `pedagogy-audit.ts`: E7 + E8 + E9. Tests per invariant. |

No PR-ε — rendering happens in existing surfaces, no aggregator needed.

### D5 — ADR 0046 revision note needed

One ADR revision note lands in Phase 2:

**ADR 0046 revision note**:

1. Explicit `epistemicRole` const per biography component (new ADR
   0058 binding decision; D1 above) — first greenfield surface to take
   the explicit-role-declaration path
2. Re-document per-equation `/equations/<slug>` page deferral
   (already in ADR text; re-state for hardening clarity)
3. Re-document E7-stays-INFO (incremental authoring supported;
   re-state for hardening clarity)

### D6 — Forward-compatibility commitments baked into v1

| # | v1 decision | v2+ evolution path | What v1 must get right |
|---|---|---|---|
| F1 | `<Assumption type>` accepts free-form slug | v2 may promote to `assumption-index.ts` catalog | `type` is `z.string().optional()` at v1; v2 catalog overlays as `z.enum([...]).or(z.string())` for back-compat |
| F2 | Per-equation `/equations/<slug>` page deferred | v2 ships dedicated page with reverse-lookups | All v2 page data lives in `PedagogyIndex.equations[i].biography`; no schema/extractor change required |
| F3 | Biography children are prose-only (except `<Units>`) | v2 may add `concept_ref?` slots on prose children for explicit NR linkage | Reserve `concept_ref?: string[]` optional slot in schema at v1 (unused); v2 fills + adds audit binding |
| F4 | Anchor granularity = equation-level (`eq-wiens-law`) | v2 may add sub-equation anchors per ADR 0045 (`eq-wiens-law/breaks-when`) | v1 sub-equation slugs derivable from child position + type; future ADR can lift to first-class without schema break |
| F5 | `epistemicRole` const per biography component | v2+ consumers query `PedagogyIndex.equations[i].biography[j].epistemicRole` directly | v1 PedagogyIndex schema must include the field on every biography entry — non-optional, value supplied by extractor from component const |
| F6 | Citations on `<CommonMisuse>` are slug refs only | v2 may want structured citations (DOI + bibtex) parallel to intervention-index | Reserve optional `citation_doi?` + `citation_bibtex?` slots at v1 |
| F7 | E8 is the only correctness gate at v1 | v2 may add E10 (assumption-collision) + E11 (CommonMisuse cross-ref to existing misconception entry — currently INFO E9 nudge) | Audit-pass extensible; new invariants added without schema change |

The most load-bearing forward-compat decision is **F5** — `epistemicRole`
is a required field on every biography pedagogy-index entry, value
supplied by extractor from component const. This is what makes v2's
uniform query layer trivial (a one-liner across the whole course).
Greenfield is the right time to make it required; retrofitting later
would mean editing every shipped component schema.

## Component contract / authoring shape

```mdx
<KeyEquation id="wiens-law" title="Wien's Law">
  $$\lambda_{peak} = b \, T^{-1}$$

  <Observable>
    Peak wavelength of thermal emission as a function of temperature.
  </Observable>

  <Assumption type="thermal-equilibrium">
    Source is in local thermodynamic equilibrium so the Planck
    distribution applies.
  </Assumption>

  <Assumption type="blackbody">
    Source emits as an ideal blackbody (no spectral lines, no
    continuum absorption shaping the peak).
  </Assumption>

  <Units symbol="T" unit="K" />
  <Units symbol="\lambda_{peak}" unit="cm" />

  <BreaksWhen>
    Non-thermal emission (synchrotron, masers, line emission);
    optically-thin sources without thermal coupling.
  </BreaksWhen>

  <CommonMisuse misconception="wiens-law-absorption-spectra">
    Applying Wien's law to identify the temperature of an
    absorption-line spectrum. The peak position depends on the
    continuum, not the absorption features.
  </CommonMisuse>
</KeyEquation>
```

Authoring rules:

- Math body comes first (the equation itself)
- Biography children in any order; `<KeyEquation>` walker handles
  serialization
- Repeating `<Assumption>` + `<Units>` encouraged (most equations have
  multiple)
- All 6 children optional — incremental authoring supported

## Pedagogy index entry shape

```ts
export const ObservableEntrySchema = z.object({
  body: z.string(),
  epistemicRole: z.literal("observable"),
});

export const AssumptionEntrySchema = z.object({
  body: z.string(),
  type: z.string().optional(),
  epistemicRole: z.literal("assumption"),
  concept_ref: z.array(z.string()).optional(),  // v2-reserved
});

export const UnitsEntrySchema = z.object({
  symbol: z.string(),
  unit: z.string(),
  // No epistemicRole — descriptive metadata
});

export const BreaksWhenEntrySchema = z.object({
  body: z.string(),
  epistemicRole: z.literal("approximation"),
  concept_ref: z.array(z.string()).optional(),  // v2-reserved
});

export const CommonMisuseEntrySchema = z.object({
  body: z.string(),
  misconception: z.string().optional(),
  citation_doi: z.string().optional(),          // v2-reserved
  citation_bibtex: z.string().optional(),       // v2-reserved
});

export const BiographySchema = z.object({
  observable: ObservableEntrySchema.optional(),
  assumptions: z.array(AssumptionEntrySchema).default([]),
  units: z.array(UnitsEntrySchema).default([]),
  breaks_when: BreaksWhenEntrySchema.optional(),
  common_misuses: z.array(CommonMisuseEntrySchema).default([]),
});

// Extend existing KeyEquationSchema:
export const KeyEquationSchema = /* existing fields */ .extend({
  biography: BiographySchema.optional(),
});
```

`<Observable>` and `<BreaksWhen>` modeled as optional singletons
(authoring guidance: typically one each). `<Assumption>`, `<Units>`,
`<CommonMisuse>` modeled as arrays (typically multiple).

## Rendering surfaces

### Surface 1: `<EqRef>` hover (compact summary)

```
┌─────────────────────────────────────────┐
│ Wien's Law         $$λ_peak = b T⁻¹$$   │
│ 2 assumptions · 1 misuse                │
│ valid in: thermal equilibrium           │
└─────────────────────────────────────────┘
```

- Count of `<Assumption>` + count of `<CommonMisuse>`
- First `<Assumption type=>` slug rendered as "valid in: …" (omitted
  if no `type=` slot filled)
- No full biography bodies (those belong to chapter-end / course routes)

### Surface 2: `<ChapterEquations>` (full biography)

```
## Wien's Law
$$\lambda_{peak} = b T^{-1}$$

**Observable:** Peak wavelength of thermal emission…

**Assumptions:**
- thermal-equilibrium — Source is in local thermodynamic…
- blackbody — Source emits as an ideal blackbody…

**Units:** T [K], λ_peak [cm]

**Breaks when:** Non-thermal emission (synchrotron, masers, …).

▸ Common misuses (1)   [collapsed]
```

- Full biography fields in source order
- Typed `<Assumption type=>` slugs surface first as labels; body as
  description
- Units rendered inline as comma-separated `symbol [unit]` pairs
- `<CommonMisuse>` list collapsed behind `<details>` disclosure
  (bulkiest field; progressive disclosure during review)

### Surface 3: `<CourseEquations>` at `/equations`

Same render as `<ChapterEquations>`, applied across every chapter's
equations on the course-wide route. Each equation block links back to
its source chapter via existing `<ChapterRef>` infrastructure.

## Audit invariants (Phase 3 PR-δ)

All three only fire when biography children are present (preserves
ADR 0046's "universal with per-equation opt-in" property).

| ID | Severity | Check |
|---|---|---|
| E7 | INFO    | `<KeyEquation>` has at least one biography child but lacks `<Observable>`. Chapter-author nudge toward complete biographies. |
| E8 | WARNING | `<Units symbol="X">` doesn't match any `canonical_symbol` or `alias` in the Notation Registry for the concept owning this equation. **Fires only when NR is opted-in** via `pedagogy-contract.yaml.math_and_units_standards.notation_registry`. Correctness gate. |
| E9 | INFO    | `<CommonMisuse>` lacks a `misconception="<slug>"` cross-ref to the A5 misconception graph. Soft suggestion toward curriculum coherence. |

## Files affected (Phase 3 implementation preview)

| Path | Change | PR |
|------|--------|----|
| `packages/core/src/schema/equation-biography.ts` | New: 6 sub-schemas + aggregate `BiographySchema` | α |
| `packages/core/src/schema/key-equation.ts` | Extend: add optional `biography: BiographySchema` field | α |
| `packages/components/src/components/Observable/` | New: `epistemicRole: "observable"` const | β |
| `packages/components/src/components/Assumption/` | New: `epistemicRole: "assumption"` const | β |
| `packages/components/src/components/Units/` | New: no epistemicRole | β |
| `packages/components/src/components/BreaksWhen/` | New: `epistemicRole: "approximation"` const | β |
| `packages/components/src/components/CommonMisuse/` | New: with misconception-graph cross-ref | β |
| `packages/components/src/components/KeyEquation/KeyEquation.tsx` | Extend: walk + serialize biography children | β |
| `packages/components/src/components/EqRef/EqRef.tsx` | Extend: hover compact biography summary | β |
| `packages/astro/src/components/ChapterEquations.astro` | Extend: full biography render + `<details>` for CommonMisuse | β |
| `packages/astro/src/components/CourseEquations.astro` | Extend: same biography render as ChapterEquations | β |
| `packages/astro/src/lib/transform-equation-biography.ts` | New: mirrors `transform-learning-objectives.ts` | γ |
| `packages/astro/src/lib/pedagogy-index-extractor.ts` | Extend: equations collection populates biography | γ |
| `packages/astro/src/lib/pedagogy-audit.ts` | Extend: add E7 + E8 + E9 | δ |
| `examples/smoke/src/content/chapters/.../wiens-law-fixture.mdx` | New smoke fixture chapter with Wien's law biography | γ |

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

- Wien's law smoke fixture renders correctly at all three surfaces
  (EqRef hover, ChapterEquations, CourseEquations) — light + dark +
  print — via Playwright MCP
- `<details>` disclosure for CommonMisuse list works keyboard-only
  (axe-core)
- All 3 v1 audit invariants exercised by tests
- E8 fires correctly when NR is opted-in (smoke fixture's
  `pedagogy-contract.yaml` enables NR)
- E8 silent when NR is not opted-in
- PedagogyIndex entry for Wien's law carries `epistemicRole` on every
  biography sub-entry (uniform-query layer demonstrable)

## References

- [ADR 0046 — Equation Biography](../website/decisions/0046-equation-biography.md)
- [ADR 0058 — Epistemic Component Contract](../website/decisions/0058-epistemic-component-contract.md)
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](../website/decisions/0043-notation-registry-multirep-alignment-audit.md) (E8 forward-binds here)
- [ADR 0044 — Misconception Graph + Intervention Library](../website/decisions/0044-misconception-graph-and-intervention-library.md) (`<CommonMisuse misconception=>` cross-ref)
- [ADR 0045 — Pedagogical Diff + Curriculum CI](../website/decisions/0045-pedagogical-diff-curriculum-ci.md) (anchor granularity F4)
- [ADR 0038 — Pedagogy-index pattern](../website/decisions/0038-pedagogy-index-pattern.md)
- [ADR 0004 — Component contract revisions](../website/decisions/0004-component-contract-revisions.md)
- [Equation Biography schema reference](../website/reference/equation-biography-schema.md)
