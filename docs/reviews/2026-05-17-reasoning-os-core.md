# Sophie Reasoning OS core audit — three pedagogical-core families landed

**Date**: 2026-05-17
**Trigger**: Three component families (MultiRep #82–#87, Intervention #88–#90, EquationBiography #91–#94) merged across three sessions. PR-7 chapter capstone is the next deliverable and is **deliberately gated by this audit** so Anna has a clean before/after measurement window before the demonstration chapter migrates.
**Scope**: Architecture coherence across the three families, schema / extractor / audit consistency, `REVISIT WHEN` placeholders, test gaps, technical debt, ADR-revision back-fills, prioritized pre-PR-7 backlog.
**Methodology**: Fresh `pnpm exec vitest` runs across `@sophie/core` / `@sophie/components` / `@sophie/astro` (after rebuilding `@sophie/core` + `@sophie/components` to refresh `.d.ts`); fresh `pnpm exec biome check`; per-file read of the three families' schemas, components, extractors, audit invariants, and CSS modules; cross-reference against the three design hardening docs (`docs/plans/2026-05-17-*.md`) and ADRs 0038/0042/0043/0044/0046/0058. Skill scaffolding mirrors [`2026-05-16-workstream-3-completion-audit.md`](2026-05-16-workstream-3-completion-audit.md) for grade-composition continuity.
**Verdict**: **A− (91/100)** — strong architecture, clean conventions, full test coverage of the new invariants, but two material gaps surface that should land before PR-7 closes: (1) the `pedagogy-audit.ts` header docstring still says NR1/NR3/NR4 and the EquationBiography invariants are *deferred* even though PR-δ shipped them, and (2) the `MultiRep` + `Intervention` schemas don't use `.strict()` — only `EquationBiography` does, breaking the architectural symmetry the design docs imply. Pre-launch posture is GREEN but a one-PR cleanup sweep (Section 7's P1 bucket) brings the grade back to A or A+ before the capstone.

---

## Section 1: What shipped across the three families

**13 PRs over three sessions**, all squash-merged to `origin/main`, all CI-green. The three families share the same architectural recipe — schema in `@sophie/core` → component in `@sophie/components` → extractor + audit invariants in `@sophie/astro` — and were sequenced α (schema) → β (component) → γ (extractor + smoke fixture) → δ (audit invariants).

| Family | PRs | Schema source | Component count | Audit invariants shipped |
|---|---|---|---|---|
| MultiRep | #82 / #83 / #84 / #85 / #86 / #87 | [`packages/core/src/schema/multirep.ts`](../../packages/core/src/schema/multirep.ts), [`notation-registry.ts`](../../packages/core/src/schema/notation-registry.ts) | 4 (MultiRep + 3 Rep children) | MR1 ERROR, MR2 WARNING, MR4 INFO, MR6 INFO, NR2 INFO |
| Intervention | #88 / #89 / #90 | [`packages/core/src/schema/intervention.ts`](../../packages/core/src/schema/intervention.ts) | 1 (Intervention) + 12-entry library | MG3 WARNING, MG4 INFO, I1 WARNING, I2 ERROR, I3 INFO |
| EquationBiography | #91 / #92 / #93 / #94 | [`packages/core/src/schema/equation-biography.ts`](../../packages/core/src/schema/equation-biography.ts), [`epistemic-role.ts`](../../packages/core/src/schema/epistemic-role.ts) | 5 (Observable / Assumption / Units / BreaksWhen / CommonMisuse) | E7 INFO, E8 WARNING, E9 INFO, NR1 WARNING, NR3 ERROR, NR4 WARNING + NR2 reference-aggregation modification |

**Test deltas** (fresh `vitest run` against `origin/main`):

| Package | Test files | Test cases | Status |
|---|---:|---:|---|
| `@sophie/core` | 12 | 233 | green |
| `@sophie/components` | 66 | 529 | green |
| `@sophie/astro` | 38 | 625 | green |
| **Totals** | **116** | **1387** | **100%** |

**Lint posture**: `pnpm exec biome check` finishes with **0 errors / 0 warnings / 7 infos**. The 7 infos are all pre-existing `useLiteralKeys` nudges in [`packages/components/src/interactive/ParameterCursor.test.tsx`](../../packages/components/src/interactive/ParameterCursor.test.tsx) on bracket-notation parameter-id accesses (`store.parameters["T"]` could be `store.parameters.T`) — unrelated to this sprint and explicitly called out in the audit prompt.

**Smoke fixture growth**: [`examples/smoke/src/content/chapters/01-foundations/wiens-law-fixture.mdx`](../../examples/smoke/src/content/chapters/01-foundations/wiens-law-fixture.mdx) exercises the full EquationBiography pipeline end-to-end (Wien's law with all 5 biography children populated + the `symbols` prop) — the most fully-realized seed-content equation in the platform.

---

## Section 2: Architecture coherence across the three families

The three families share enough recipe that they should be a referenceable pattern for the fourth (whatever it is — `OMIFlow`? `AssumptionStack`? `UncertaintyLens`?). They mostly are; six dimensions of consistency are worth grading explicitly.

### 2.1 Schema discipline (`.strict()` posture)

Mixed. The EquationBiography schemas (`ObservableEntrySchema`, `AssumptionEntrySchema`, `UnitsEntrySchema`, `BreaksWhenEntrySchema`, `CommonMisuseEntrySchema`, `BiographySchema`) all chain `.strict()` ([equation-biography.ts:45, :65, :76, :87, :106, :130](../../packages/core/src/schema/equation-biography.ts)) with a docstring justification at the top of the file:

> Every schema is `.strict()` — unknown keys fail parse rather than being silently stripped. This enforces the "Units / CommonMisuse carry NO epistemicRole" property structurally (ADR 0058 §"chrome") rather than only descriptively, and catches extractor-side typos (e.g., singular `assumption` for plural `assumptions`).

By contrast, [`multirep.ts`](../../packages/core/src/schema/multirep.ts) and [`intervention.ts`](../../packages/core/src/schema/intervention.ts) use bare `z.object({...})` (no `.strict()`) for every artifact. `grep '.strict()' packages/core/src/schema/{multirep,intervention,equation-biography}.ts` returns zero hits for the first two and seven for the third.

**This is a real inconsistency, not a deliberate distinction.** The rationale `equation-biography.ts` quotes — catching singular-vs-plural typos and unknown keys — applies equally to `MultiRepIndexEntry` (where the v2-reserved `bindingNotes` / `crossChapterEquivalents` / `aiAuthoredBy` / `lastReviewedDate` slots are open invitations for typo drift) and to `InterventionEntry` (where the `superRefine`-enforced `name` field would benefit from a strict guard against `nam: "..."` typos at extract time). Land before PR-7 — see Section 7 P1-1.

### 2.2 The `addresses="this"` resolution pattern

`<Intervention>` uses a contextually-resolved attribute — `addresses="this"` rewrites to the enclosing `<Aside kind="misconception" name="X">`'s slugified `name` during extraction. The mechanism lives in [`extractInterventions`](../../packages/astro/src/lib/pedagogy-index-extractor.ts) at lines 1417–1577: a manual `visitNode` recursion (rather than `unist-util-visit`) that threads `enclosingMisconception` through the call stack and uses `slugify(miscName)` for the rewrite. Lines 1450–1461 carry a thoughtful inline comment explaining the slugify-alignment fix that PR-δ added (which closed the PR-γ→PR-δ coupling gap where authors writing `name="Universe With A Center"` produced misconception anchors of `universe-with-a-center` but `addresses="this"` resolutions of `Universe With A Center`).

This pattern is well-implemented. The one place it leaks is when `"this"` survives extraction (no enclosing misconception): line 1512 leaves it verbatim and the audit's I1 invariant ([pedagogy-audit.ts:975](../../packages/astro/src/lib/pedagogy-audit.ts)) fires the WARNING. The defense-in-depth `insideIntervention` guard (lines 1464–1476) catches nested-intervention misuse upfront.

**Generalization candidate for future components**: any future `<RoleAttribute someRef="this">` pattern (e.g., `<UncertaintyLens forEquation="this">` inside `<KeyEquation>`) can lift this same recursion shape. Not worth extracting now (DRY rule says wait for the second caller), but flag it as a precedent in the design corpus.

### 2.3 Accumulator-setX vs module-cache-direct-call distinction

The MultiRep PR-ε sprint taught a real architectural distinction: registry data flows through two surfaces, and they should not be conflated.

- **`indexAccumulator.setFigureRegistry` / `setNotationRegistry` / `setChapters` / `setModules`** — consumer-supplied collections pushed into the accumulator at SSR-frontmatter time. Last-write-wins; consumer-global; **not touched by `clearChapter`**. The audit reads through `index.figureRegistry`, etc.
- **Module-cache direct call** — used by the older `getInterventionByName` helper (imported directly from `@sophie/components/intervention/intervention-index.ts` into `pedagogy-audit.ts:3` and called at audit-time without going through the accumulator). The intervention catalog is genuinely *static* (12 entries hardcoded), so this is fine — but the pattern is structurally different from the registry-loader path, and PR-ε's clean separation should be the canonical pattern for any *consumer-overridable* catalog. Intervention catalog is currently platform-locked; if the ADR 0048 plugin layer ever lets a consumer course override interventions, the import should be replaced by an `index.interventionLibrary` accumulator slot to preserve the SSR-merge boundary.

The intervention catalog uses an explicit `getInterventionLibrary()` loader function ([intervention-index.ts:184](../../packages/components/src/intervention/intervention-index.ts)) precisely so that ADR 0048 has a seam to wrap. Good forward thinking.

### 2.4 ADR-0058 epistemic-role declaration pattern (component-side const + schema-side `z.literal`)

The three role-bearing biography components (`<Observable>`, `<Assumption>`, `<BreaksWhen>`) implement this pattern cleanly:

1. **Component-side const** — [`Observable.schema.ts:41`](../../packages/components/src/components/Observable/Observable.schema.ts):
   ```ts
   export const OBSERVABLE_EPISTEMIC_ROLE =
     "observable" as const satisfies EpistemicRole;
   ```
   The `as const satisfies EpistemicRole` shape gives a narrow literal type AND a compile-time guarantee that the literal is a member of the canonical 8-role taxonomy.

2. **Schema-side `z.literal` via `EpistemicRoleSchema.extract([...])`** — [`equation-biography.ts:43`](../../packages/core/src/schema/equation-biography.ts):
   ```ts
   epistemicRole: EpistemicRoleSchema.extract(["observable"]),
   ```
   Grounds the role at parse-time in the same 8-role enum. A typo like `"observabel"` fails type-check AND parse-time.

3. **Runtime surface** — [`Observable.tsx:27`](../../packages/components/src/components/Observable/Observable.tsx):
   ```tsx
   data-epistemic-role={OBSERVABLE_EPISTEMIC_ROLE}
   ```
   The DOM data-attribute is consumed by Playwright/axe selectors and (in v2) by role-aware theme tokens.

This is the *cleanest* pattern in the codebase for greenfield component-role declaration. ADR 0058 §2 pattern 3 specified it; EquationBiography PR-α/PR-β proved it works end-to-end. **Worth a §R revision note on ADR 0058** to record the first-greenfield-application precedent — see Section 5.

The non-role-bearing components (`<Units>`, `<CommonMisuse>`) deliberately omit the const and don't declare `epistemicRole` on their schema, which matches ADR 0058 §"chrome" — Units is descriptive metadata, CommonMisuse inherits the misconception's role via cross-ref. The schemas document this absence with paragraph-long comments ([`Units.module.css:7-9`](../../packages/components/src/components/Units/Units.module.css), [`equation-biography.ts:15-18`](../../packages/core/src/schema/equation-biography.ts)) so a future contributor doesn't retrofit a role here.

### 2.5 Render/audit split

Cleanly observed across all three families: **the extractor produces the index entry; the audit consumes the populated entry; the runtime renders children directly**. The clearest example is `buildBiographyFromKeyEquationChildren` at [pedagogy-index-extractor.ts:445](../../packages/astro/src/lib/pedagogy-index-extractor.ts), whose docstring (lines 437–444) explicitly names the contract:

> Contract scope (render/audit split): this helper owns *extraction* — produces the `Biography` index entry from JSX children. The audit (E7/E8/E9 in PR-δ) consumes that populated entry. If v2 grows a biography-allowlist invariant (e.g., "warn on unknown JSX children of `<KeyEquation>`"), it lives in `pedagogy-audit.ts`, not here — the extractor must stay structurally permissive so authors can freely embed prose + cross-references inside KeyEquation bodies.

The same posture holds for `extractInterventions` / `extractMultiReps`: the extractor enforces *shape* errors at the JSX-walking layer (missing attrs, empty bodies, nested-intervention misuse), and the audit enforces *resolution* errors at the cross-collection layer (unknown misconception slug, registry mismatch). Authors get fast feedback on local mistakes from the extractor throws; whole-corpus invariants only fire when all chapters have been parsed.

### 2.6 Permissive vs strict walker shape

Two child-walking helpers, two postures:

- **`buildRepsFromMultiRepChildren`** ([extractor:1136](../../packages/astro/src/lib/pedagogy-index-extractor.ts)) — **strict**: any non-`<RepVerbal>` / non-`<RepEquation>` / non-`<RepFigure>` JSX child throws. `<MultiRep>` is a closed compound primitive that should contain only registered rep children.
- **`buildBiographyFromKeyEquationChildren`** ([extractor:445](../../packages/astro/src/lib/pedagogy-index-extractor.ts)) — **permissive**: silently skips non-biography children. `<KeyEquation>` legitimately contains framing prose, the canonical `$$...$$` math block, `<EqRef>`, `<GlossaryTerm>`, etc. alongside the optional biography children.

**Both postures are right for their context.** The contrast is documented at biography-extractor lines 419–423 with an explicit "unlike `buildRepsFromMultiRepChildren` which is strict (MultiRep forbids non-Rep children)" comment. That's the architectural call-out a fourth-family contributor needs.

### 2.7 Cross-family composition end-to-end

The audit prompt asks the right question: what happens when a `<MultiRep>` references a `<KeyEquation>` referenced from a misconception `<Aside>` paired with an `<Intervention>`? I traced the data flow:

1. **`<KeyEquation id="wiens-law" symbols={["T", "\\lambda_{peak}"]}>`** in some chapter → `extractEquations` produces an `EquationEntry { slug: "wiens-law", symbols, biography }` ([extractor:567–628](../../packages/astro/src/lib/pedagogy-index-extractor.ts)).
2. **`<MultiRep concept="peak-wavelength"><RepEquation refKey="wiens-law" symbol="\\lambda_{peak}" /></MultiRep>`** → `extractMultiReps` produces a `MultiRepIndexEntry { concept: "peak-wavelength", reps: [{ kind: "equation", refKey: "wiens-law", symbol: "..." }] }` ([extractor:1233–1289](../../packages/astro/src/lib/pedagogy-index-extractor.ts)). MR1 ERROR fires at audit if `peak-wavelength` isn't registered; MR2 WARNING fires if the symbol doesn't match the registry's canonical_symbol; NR2 INFO is *suppressed* now (PR-δ NR2 modification) because the `KeyEquation.symbols` also signals reference.
3. **`<Aside kind="misconception" name="wiens-law-absorption-spectra"><Intervention type="contrasting-cases" addresses="this">...</Intervention></Aside>`** → `extractMisconceptions` produces a `MisconceptionEntry { anchor: "wiens-law-absorption-spectra" }` ([extractor:781–892](../../packages/astro/src/lib/pedagogy-index-extractor.ts)); `extractInterventions` rewrites `addresses="this"` to `["wiens-law-absorption-spectra"]` ([extractor:1442–1461](../../packages/astro/src/lib/pedagogy-index-extractor.ts)).
4. **`<KeyEquation>...<CommonMisuse misconception="wiens-law-absorption-spectra">...</CommonMisuse></KeyEquation>`** → biography carries the cross-ref; E9 INFO is *suppressed* (the slot is populated).
5. **Audit pass** — MG3 WARNING does *not* fire (the misconception has an intervention); I1 WARNING does *not* fire (`"this"` resolved successfully); the biography's CommonMisuse cross-ref is now structurally a graph edge between the equation entry and the misconception entry, even though no audit invariant *reads* the edge yet at v1.

**The data flow works end-to-end.** The one gap: there's no audit invariant that closes the loop on the misconception-to-misuse cross-ref (i.e., "fire WARNING when `<CommonMisuse misconception="X">` references a misconception slug that doesn't exist course-wide"). The fixture in `wiens-law-fixture.mdx` line 74 references `wiens-law-absorption-spectra` but that misconception is *not declared anywhere in the smoke content*. The audit would silently accept this today. That's a real but small gap — file as P3 (Section 7).

### 2.8 Abstractions worth extracting now (DRY rule — ≥2 callers)

**CSS DRY across the 4 Tier-3 biography stylesheets** — the highest-priority extraction candidate. `Observable.module.css`, `Assumption.module.css`, `BreaksWhen.module.css`, `CommonMisuse.module.css` are **structurally identical** for the root `.observable` / `.assumption` / `.breaksWhen` / `.commonMisuse` rule (same margin, surface, border, radius, color, font, font-size, line-height, overflow) and for the `.label` rule (same flex, gap, padding, border-bottom, color, font-mono, font-size, font-weight, letter-spacing, text-transform). The four differ ONLY in:

- The `.label` background's `color-mix()` accent — Observable + Assumption use `--sophie-brand-violet 6%`; BreaksWhen uses `--sophie-status-warning 8%`; CommonMisuse uses `--sophie-status-danger 8%`.
- Two of them carry small extras (`.separator` + `.typeSlug` for Assumption; `.separator` + `.misconceptionSlug` for CommonMisuse).

PR-β reviewer N1 flagged this. **Extract a `tier3-biography.module.css` (or token-driven mixin) before PR-7** so the chapter capstone doesn't bake the duplication deeper. The pattern: one shared rule for the card body + label structure, plus a `--biography-label-accent` CSS variable each component sets at the root (`.observable { --biography-label-accent: var(--sophie-brand-violet); }`). The 4-component CSS surface area drops by roughly 60%. Section 7 P1-2.

**Attribute-reading helpers** — moderate priority. The extractor's `readAsideAttributes` / `readKeyEquationAttributes` / `readFigureAttributes` / `readObjectiveAttributes` / `readCalloutAttributes` / `readInterventionAddressesAttr` are all variations on the same pattern: walk `node.attributes`, switch on `attr.name`, coerce to string/array/boolean. The shared bedrock is the *already-extracted* `readStringAttr` ([extractor:266](../../packages/astro/src/lib/pedagogy-index-extractor.ts)) and `readStringListAttr` ([extractor:118](../../packages/astro/src/lib/pedagogy-index-extractor.ts)) helpers; each component-specific reader assembles them into a typed shape. The current shape is fine — extracting a generic `readAttributes<T>` factory would force every consumer to declare a Zod schema for the attr shape, which is more ceremony than the per-component readers carry today. **YAGNI: skip.** If a sixth attribute-reader lands (say, for `<OMIFlow>` PR), revisit.

**Child-walker pattern factory** — low priority. `buildRepsFromMultiRepChildren` (strict) and `buildBiographyFromKeyEquationChildren` (permissive) share the JSX-DFS shape but diverge on the per-child-name dispatch. They're 80 lines each; consolidating into a factory `walkJsxChildren<T>(parent, { handlers: { RepVerbal: ..., RepEquation: ... } })` would save ~30 lines net but lose readability — each handler today is a self-contained block with its own throw-on-empty / throw-on-missing-attr logic. **YAGNI: skip.** Revisit if a third child-walker lands (e.g., `buildSymbolsFromKeyEquationChildren` for the deferred `<Symbols>` mode).

---

## Section 3: REVISIT-WHEN placeholder audit

Walk every deferred / v2-reserved / first-draft slot and decide ready-now / wait / file-for-later.

### 3.1 `intervention-index.ts` — `addresses_families` slugs + `move:` slugs

[`intervention-index.ts:28-54`](../../packages/components/src/intervention/intervention-index.ts) carries a paragraph-long "REVISIT WHEN — first-draft placeholder fields" docstring naming both:

- **`addresses_families`** — free-form misconception-family slugs (`substance-mistaken-for-process`, `everyday-physics-extrapolation`, etc.) seeded as authoring hints. No platform catalog enforces them at v1.
  - **Decision**: WAIT. Anna's directive on 2026-05-17 was to keep these as thoughtful first-draft placeholders until a real misconception-family catalog gets ADR-locked. PR-7 doesn't depend on tightening these; tightening them prematurely risks lock-in on the wrong taxonomy. **No action before PR-7.**

- **`move:`** — placeholder for ADR 0041's future `move-index.ts`. The I4 audit invariant that verifies every `move:` value resolves to a real entry is explicitly deferred.
  - **Decision**: WAIT. Same posture. The forward-compat seam is declared; turning on I4 is a one-function-add change when `move-index.ts` ships. **No action before PR-7.**

### 3.2 `equation-biography.ts` — `concept_ref` + `citation_doi` + `citation_bibtex` v2-reserved slots

[`equation-biography.ts`](../../packages/core/src/schema/equation-biography.ts) declares optional `concept_ref` on `AssumptionEntrySchema` (line 63) + `BreaksWhenEntrySchema` (line 85), and optional `citation_doi` / `citation_bibtex` on `CommonMisuseEntrySchema` (lines 102–104).

- **Decision**: WAIT. Anna confirmed first-draft placeholders during Session 2; extractor never populates them at v1. Tightening would require an `assumption-index.ts` catalog (per ADR 0046 §R5) which is its own ADR conversation. **No action before PR-7.**

### 3.3 `intervention.ts` — `citation_doi` / `citation_bibtex` / `template_body`

[`intervention.ts:134-139`](../../packages/core/src/schema/intervention.ts) reserves three v2 slots on `InterventionLibraryEntrySchema`. Pure forward-compat seams; no consumer at v1.

- **Decision**: WAIT. **No action before PR-7.**

### 3.4 `multirep.ts` — `bindingNotes` / `crossChapterEquivalents` / `aiAuthoredBy` / `lastReviewedDate`

[`multirep.ts:109-112`](../../packages/core/src/schema/multirep.ts) reserves four v2 slots on `MultiRepIndexEntrySchema`. AI-authoring ledger (ADR 0042) + cross-chapter equivalent tracking (ADR 0043 future MR6 cross-chapter extension) + authoring-provenance fields.

- **Decision**: WAIT. **No action before PR-7.** But — if `.strict()` lands across schemas (Section 7 P1-1), these slots become structurally meaningful (anything unknown fails parse), so they're no longer just documentation. Re-read this list when applying the strict sweep to make sure each slot is intentional, not vestigial.

### 3.5 Audit-side deferrals

[`pedagogy-audit.ts:110-127`](../../packages/astro/src/lib/pedagogy-audit.ts) documents 7 audit invariants that are not implemented in v1: E1, E6, F3, F5, M1, M2 (extractor-throws-first), M3 (orphan-misconception heuristic, deferred until a usable signal exists), I4 (`move-index.ts` prerequisite), NR1/NR3/NR4 (**stale — actually shipped in PR-δ**, see Section 4), MR3/MR5 (RepCode prerequisite).

- **Decision**: The NR1/NR3/NR4 lines need to be **deleted from the docstring** — see Section 4 (technical debt) and Section 5 (ADR back-fill). The other six deferrals are valid; no action.

### 3.6 In-component TODOs

- [`Intervention.tsx:38`](../../packages/components/src/components/Intervention/Intervention.tsx) — "v2 may resolve to the misconception's verbal label via a misconception store — TODO once that store exists alongside an inline `<MisconceptionRef>`". One-sentence forward-looking note; no issue link. **CLAUDE.md violation** ("no `TODO` without an issue link"). File as P2 — see Section 7.

---

## Section 4: Test coverage gaps

The headline numbers are strong: **1387 passing test cases across the three packages**, including the PR-δ-shipped `pedagogy-audit.biography.test.ts` (725 lines) and the earlier `pedagogy-audit.intervention.test.ts` (366 lines) + `pedagogy-audit.multirep.test.ts` (588 lines). Cross-cutting gaps:

### 4.1 Cross-family composition fixture

No unit test exercises the full chain `<KeyEquation symbols=[…] biography> → <MultiRep concept refKey> → <Aside misconception> ← <Intervention addresses="this">` against a single populated index snapshot. The Wien's law smoke fixture comes closest but only covers EquationBiography + the `symbols` prop; it doesn't pair a misconception with an intervention or thread a MultiRep through. **Worth adding** as a single composite `composition.test.ts` (or as a section inside an existing test file) before PR-7 so the demo chapter has a worked precedent to mirror. P2 — see Section 7.

### 4.2 EqRef hover + Chapter/Course aggregator render integration

Section 2.7 traced the data flow at the index layer. The *render* layer (popover-open path: keyboard focus → biography summary appears → roving focus inside summary → escape closes) is covered by unit tests on the extracted `BiographySummary` helper but NOT by a full e2e popover-open path. The PR-β reviewer N4 carry-forward (the "first-typed" why-comment on EqRef biography summary) is unresolved in the absence of an e2e fixture that exercises the rendered popover. **P2** — write the Playwright e2e *before* PR-7 ships the chapter that consumes this rendering surface, so the chapter migration validates the wire-up rather than discovering it broken.

### 4.3 Wien's law smoke fixture against a *bad* registry/equation combo

The current `wiens-law-fixture.mdx` exercises the *positive* path: `symbols={["T", "\\lambda_{peak}", "b"]}` lines up with the equation, and the biography is well-formed. There's no smoke fixture that intentionally fails NR1 (declares a `symbols` entry not in the registry), NR3 (puts the same symbol on two registry concepts), or NR4 (declares a symbol-with-units but omits the `<Units>` biography child). The PR-δ unit tests cover each invariant in isolation, but a *fixture-driven* failure case is a stronger contract — it exercises the full `extractEquations → audit` pipeline, not just the audit function with hand-crafted index entries.

**Decision**: file as P3. The unit-test coverage is real; a fixture-driven check is belt-and-suspenders but not strictly required for PR-7. Worth adding if a future chapter ships and an NR-prefix bug slips through.

### 4.4 The `pagefind-postbuild` flake

Pre-existing, called out in the audit prompt. Not changed by this sprint; not blocking PR-7 directly (PR-7 is about chapter content, not search infra). **P3** — keep it on the backlog but don't gate PR-7 on it. If the chapter capstone's content surfaces more search-indexed material and the flake bites the CI green-rate, escalate.

### 4.5 NR3-collision-promotes-both pattern

PR-δ reviewer test gap 6a flagged this and the PR addressed it: when the registry has a symbol collision (NR3 fires), the NR2 reference-aggregation still promotes *both* concept ids out of orphan status from a single `KeyEquation.symbols` entry, rather than suppressing the legitimate reference. See [pedagogy-audit.ts:821-826](../../packages/astro/src/lib/pedagogy-audit.ts) in the origin/main shape:

```ts
for (const concept of concepts) {
  referencedConceptIds.add(concept.id);
}
```

The behavior is correct (NR3 surfaces the collision as an ERROR separately; NR2 doesn't pile on by also marking both concepts as orphans). **Worth a one-line architectural note in `pedagogy-audit.ts`** explaining the deliberate-over-conservative choice, so a future reader doesn't "fix" it to suppress promotion on collision. Already exists at line 815 ("(NR3 surfaces multi-concept collisions separately; here we accept any matching concept so a registry-author bug doesn't suppress legitimate references.)") — **gap closed**. No action.

---

## Section 5: Technical debt

### 5.1 Stale `pedagogy-audit.ts` header docstring (**critical**)

The single biggest housekeeping miss this sprint. [`pedagogy-audit.ts:110-127`](../../packages/astro/src/lib/pedagogy-audit.ts) still reads (on origin/main):

```
 * Not implemented in v1 (extractor-level defense-in-depth is sufficient
 * or the upstream component doesn't exist yet — see TODO markers):
 *   E1, E6, F3, F5, M1, M2 — extractor throws first; audit-level
 *                            parallel check deferred.
 *   M3 — orphan misconception heuristic; deferred until we have a
 *        usable signal beyond "no source-of-truth title".
 *   I4 — ...
 *   NR1, NR3, NR4 — require per-equation `symbols` metadata on
 *                   `EquationEntrySchema` (deferred to PR-δ' per the
 *                   2026-05-17 scope decision; KeyEquation doesn't yet
 *                   carry the `symbols` field). The audit's NR2 + MR-prefix
 *                   invariants ship in PR-δ against already-extracted data.
 *   MR3, MR5 — RepCode deferred per ADR 0043 §R1 (pending CodeCell, ADR 0018).
```

The NR1/NR3/NR4 paragraph is **factually wrong**: PR-δ #94 shipped all three invariants (lines 949–1048 of the same file). E7/E8/E9 are also missing from the "implemented" inventory at the top of the file (lines 35–104) — only E7 was even named in the original docstring; E8 + E9 are entirely absent. The header docstring is the most-read part of the audit file and the most-likely-cited reference; ship a one-PR fix.

**Action**: Delete the NR1/NR3/NR4 paragraph from the "Not implemented" block; add E7 / E8 / E9 / NR1 / NR3 / NR4 entries to the implemented inventory block at the top with the same severity + scope shape as the existing rows. Section 7 P1-3.

### 5.2 Stale ADR 0043 §R5 revision note

[`docs/website/decisions/0043-notation-registry-multirep-alignment-audit.md`](../website/decisions/0043-notation-registry-multirep-alignment-audit.md) lines 804–860 carry the "R5 — NR1 / NR3 / NR4 deferred from PR-δ to PR-δ'" section. The deferral closed: PR-δ shipped them. The §R5 section needs a "**Update 2026-05-17**: this deferral closed in PR-δ (#94); NR1 WARNING, NR3 ERROR, NR4 WARNING all ship; the `symbols: string[]` prop was added to `KeyEquation` and the `EquationEntrySchema` simultaneously." Section 5 / 7 P1-4.

### 5.3 Pre-existing `ChapterEquations.astro` TODO without issue link

[`packages/astro/src/components/ChapterEquations.astro:42-46`](../../packages/astro/src/components/ChapterEquations.astro) carries:

```
TODO (PR-C4 or later): expose `headingLevel?: 2 | 3 | 4` prop to allow
nested-section usage. Current behavior hardcodes <h2>; promote to
variable-level when a real consumer needs it. Forward-looking note,
no API change here.
```

Pre-existing (predates this sprint). CLAUDE.md says "no `TODO` without an issue link". Five sibling components carry the *identical* TODO (`ChapterFigures.astro:67`, `ChapterKeyInsights.astro:38`, `ChapterMisconceptions.astro:47`, `ChapterGlossary.astro:41`). PR-β reviewer N6 flagged the ChapterEquations one. **Either**:

- (a) File one GitHub issue covering all five and replace each TODO body with `// TODO(#NNN): expose headingLevel prop` (~ 5-line PR), OR
- (b) Resolve all five by exposing `headingLevel?: 2 | 3 | 4` now (small additive prop, no breaking change), since PR-7's chapter capstone may want nested-section usage on at least one of these aggregators.

Recommend (a) — it's faster and PR-7 doesn't depend on the new prop. P2 — Section 7.

### 5.4 Naming inconsistency: camelCase vs snake_case

PR-α reviewer flagged this. The schemas mix:

- **camelCase**: `epistemicRole`, `crossChapterEquivalents`, `aiAuthoredBy`, `lastReviewedDate`, `bindingNotes` (MultiRep), `equivalent_to` (RepEquation — actually snake), `refKey` / `refName` / `symbolLabel` (Rep variants).
- **snake_case**: `concept_ref`, `breaks_when`, `common_misuses`, `addresses_families`, `verbal_label`, `canonical_symbol`, `code_alias`, `common_confusions`, `introduced_in`, `related_concepts`, `epistemic_role` (NotationRegistry), `prerequisite_misconceptions`, `related_misconceptions`, `concept_refs`, `discipline_scope`, `citation_doi`, `citation_bibtex`, `template_body`.

The pattern as I read it: **camelCase for runtime / component prop shapes; snake_case for pedagogy-contract / YAML-mirrored / cross-tool-interchange shapes** (Notation Registry YAML, misconception graph fields, biography sub-entries that mirror author-facing keys). That's a defensible convention — YAML idiom is snake; React/TS idiom is camel. The mixed cases (`equivalent_to` on a TS prop; `epistemicRole` on a YAML-mirrored schema) are the actual drift.

**Decision**: Defer. The mix is internally rationalizable, no public-API consumer is paying for the inconsistency yet, and a rename sweep is risky for *zero* user-facing payoff. File as P4 — revisit when the pedagogy-contract YAML spec gets the formal §spec-naming-convention treatment it'll need anyway.

### 5.5 The single-line `$$...$$` → inlineMath gotcha

PR-γ surfaced this: `remark-math` parses `$$x$$` on a single line as `inlineMath` (not `math`), so the biography extractor's `extractFirstTex` (which walks for the `math` node type, [extractor:382](../../packages/astro/src/lib/pedagogy-index-extractor.ts)) returned `null` and the E6-style categorization error fired. The fix in the smoke fixture was to put the `$$...$$` on its own block (lines 40–42 of `wiens-law-fixture.mdx`). The extractor's behavior is correct (display math only counts as canonical equation TeX); the author-facing pitfall is real.

**Decision**: Document at the chapter-author-facing reference layer rather than adding extractor logic. The error message at [extractor:602-606](../../packages/astro/src/lib/pedagogy-index-extractor.ts) ("contains no `$$...$$` math block") could be tightened to mention the inline-vs-display distinction explicitly: "(note: `$$x$$` on a single line is parsed as inline math; the canonical block must be `$$\nx\n$$`)". Two-line message-text change, no logic change. P2 — Section 7.

### 5.6 Type-coercion smells

`grep 'as any\|as never\|as unknown as'` across the three families' source returns **zero** hits in components and two hits in the extractor:

- [`pedagogy-index-extractor.ts:309`](../../packages/astro/src/lib/pedagogy-index-extractor.ts) — `children: children as never`
- [`pedagogy-index-extractor.ts:381`](../../packages/astro/src/lib/pedagogy-index-extractor.ts) — `const synthetic = { type: "root" as const, children: children as never }`

Both are deliberate Zod/mdast type-narrowing escapes when constructing synthetic mdast trees from `unknown[]` children arrays. Acceptable; the `as never` choice (vs `as unknown[]`) is the most narrowing escape available. No action.

### 5.7 Hardcoded magic numbers

None worth flagging. The intervention library is hardcoded-12 (loader function comment at [intervention-index.ts:195-198](../../packages/components/src/intervention/intervention-index.ts) explicitly says "If the catalog grows past ~50 entries, back this with a Map built once at module load; at 12 entries the linear scan is faster than a Map allocation" — that's the right level of forward thinking).

---

## Section 6: ADR-revision notes needed

Back-fill the design decisions from Sessions 2/3 into the ADRs so the canonical decision trail stays current.

### 6.1 ADR 0043 §R5 — mark NR1/NR3/NR4 deferral closed

Per Section 5.2 above. The §R5 section text should grow a 2026-05-17 update paragraph naming PR #94 and the symbol-prop shape that landed.

### 6.2 ADR 0044 — misconception anchor `name`-precedence + slugify-alignment pattern

The Intervention PR-δ session surfaced and fixed the cross-cutting bug: misconception Aside anchors now derive from `id > slug(name) > slug(title) > misc-${counter}` ([extractor:843-844](../../packages/astro/src/lib/pedagogy-index-extractor.ts)) and Intervention `addresses="this"` rewrites use `slugify(miscName)` ([extractor:1460](../../packages/astro/src/lib/pedagogy-index-extractor.ts)) so the two sides agree on what "this" resolves to. The bug + fix is documented in inline comments but not in ADR 0044's revision log. Worth a §R6 note: "**R6 — Anchor precedence + slugify alignment (2026-05-17)**: misconception anchors derive from `id > slug(name) > slug(title) > misc-${counter}`; Intervention `addresses="this"` resolves to `slugify(enclosingMisconception.name)` so both sides land on the same anchor."

### 6.3 ADR 0046 — full implementation revision

ADR 0046 was hardened on 2026-05-14 with the design recipe; it now needs a "**Phase 1 complete (2026-05-17)**" status update and a §R note recording:

- The four-PR cadence (α schema → β components + render → γ extractor + smoke → δ audit).
- The `EpistemicRoleSchema.extract([...])` compile-time grounding pattern (Section 2.4 above) as the canonical role-declaration shape.
- The render/audit split observed across all biography work (Section 2.5).
- The deferred-to-next-pass items (per-equation page route + `assumption-index.ts` catalog).

### 6.4 ADR 0058 — first greenfield application

ADR 0058's §2 pattern 3 (component-side role const + schema-side literal) found its first greenfield application in the biography children. Worth a §R note recording: "**R-greenfield (2026-05-17)**: pattern 3 first applied at scale by the EquationBiography children (Observable / Assumption / BreaksWhen). The `as const satisfies EpistemicRole` + `EpistemicRoleSchema.extract([...])` pair gives compile-time grounding without runtime overhead; this is the canonical shape for any future role-bearing greenfield component."

---

## Section 7: Pre-PR-7 backlog

**P1 — MUST land before PR-7 closes** (small fixes that prevent the chapter capstone from baking-in drift):

- **P1-1**: Apply `.strict()` to every `MultiRep*Schema` + `Intervention*Schema` in `@sophie/core` and add the same JSDoc justification block that `equation-biography.ts` carries. Estimated: 1 PR, ~30 lines of changes, no test changes needed (the existing tests already pass valid shapes; the v2-reserved slots are explicitly named so no test exercises an unknown key).
- **P1-2**: Extract `tier3-biography.module.css` (or token-driven shared rule set) to DRY the 4 Tier-3 biography stylesheets. Drop the duplication from `Observable.module.css` + `Assumption.module.css` + `BreaksWhen.module.css` + `CommonMisuse.module.css`; keep the per-component accent override and any per-component extras (`.separator` / `.typeSlug` / `.misconceptionSlug`) at the per-component level. PR-β reviewer N1 carry-forward. Estimated: 1 PR, net ~120-line CSS reduction; visual regression baselines should re-snapshot but the rendered output is identical.
- **P1-3**: Fix the stale `pedagogy-audit.ts` header docstring (Section 5.1). Delete the NR1/NR3/NR4 "deferred" paragraph; add E7 / E8 / E9 / NR1 / NR3 / NR4 entries to the implemented inventory block. Estimated: < 30-line diff, no test changes.
- **P1-4**: Back-fill ADR 0043 §R5 closure note + add ADR 0044 §R6 + add ADR 0046 §R Phase-1-complete + add ADR 0058 §R-greenfield (Section 6). Estimated: 1 docs PR, 4 ADR files touched, no code changes.

**P2 — Should land soon after PR-7 starts** (worth tracking; small but not blocking):

- **P2-1**: Add cross-family composition fixture (Section 4.1) — single composite test exercising `<KeyEquation> ↔ <MultiRep> ↔ <Aside misconception> ↔ <Intervention>` chain against a populated index snapshot. PR-7's chapter content makes this easier to write (real fixture content to mirror); land in parallel.
- **P2-2**: Write Playwright e2e for the EqRef biography-summary popover-open path (Section 4.2). Worth doing before the chapter capstone hits production so the rendering surface is validated end-to-end.
- **P2-3**: File one GitHub issue covering the 5 sibling `Chapter*.astro` `TODO (PR-C4 or later): headingLevel` notes (Section 5.3); replace each TODO body with the issue link.
- **P2-4**: Resolve `Intervention.tsx:38` TODO without issue link — either file an issue and link it, or remove the comment in favor of an ADR 0044 §R note.
- **P2-5**: Tighten the `extractFirstTex` error message at [extractor:602-606](../../packages/astro/src/lib/pedagogy-index-extractor.ts) to mention the single-line `$$...$$` inline-vs-display gotcha (Section 5.5).

**P3 — Nice to have / opportunistic**:

- **P3-1**: Add a fixture-driven failing-case smoke test for NR1 / NR3 / NR4 (Section 4.3). Belt-and-suspenders on the unit-test coverage.
- **P3-2**: Audit-invariant gap: `<CommonMisuse misconception="X">` references a misconception slug not declared anywhere course-wide (Section 2.7). Currently silently accepted. The wiens-law-fixture exhibits this (`misconception="wiens-law-absorption-spectra"` is referenced but the misconception itself isn't declared). Worth its own invariant code (E10?) gated on the misconception graph being populated.
- **P3-3**: Pre-existing `pagefind-postbuild` flake (Section 4.4). Doesn't gate PR-7.
- **P3-4**: Resolve the 7 pre-existing `useLiteralKeys` infos in `ParameterCursor.test.tsx`. Mechanical bracket-notation → dot-notation sweep.

**P4 — Strategic / long-term** (not in this sprint's scope):

- **P4-1**: Reconcile the camelCase vs snake_case naming patterns (Section 5.4). Pair with a formal pedagogy-contract YAML §spec-naming-convention conversation.
- **P4-2**: When `move-index.ts` ships (ADR 0041), turn on the I4 audit invariant (one-function-add change against the already-declared `move:` field on every intervention catalog entry).
- **P4-3**: When `<CodeCell>` ships (ADR 0018), turn on `<RepCode>` + the MR3 / MR5 audit invariants. Schema already declares the discriminated-union seam ([multirep.ts:58-62](../../packages/core/src/schema/multirep.ts)).
- **P4-4**: Lift `<MisconceptionRef>` inline-ref component + misconception store (Section 3.6 TODO). Unblocks `Intervention.tsx:38` resolved rendering of `addresses="..."` targets as misconception verbal labels rather than raw slugs.

---

## Section 8: TL;DR

Three pedagogical-core families landed cleanly across three sessions: 13 PRs, 1387 passing test cases (+ 6 new audit invariants in PR-δ alone), zero biome warnings, zero type-safety escape hatches in any component, full ADR 0058 epistemic-role binding across the role-bearing biography children. The architecture is *consistent in seven of eight dimensions* I graded — the `addresses="this"` resolution, the role-declaration pattern, the render/audit split, the permissive-vs-strict walker distinction, the cross-family data-flow composition, the accumulator-vs-module-cache split, and the audit's gated-on-opt-in registry pattern all hold up under scrutiny. The eighth dimension (schema `.strict()` discipline) only applies to one of the three families. The two material housekeeping misses — stale `pedagogy-audit.ts` header docstring claiming NR1/NR3/NR4 are deferred when PR-δ shipped them, and the stale ADR 0043 §R5 deferral note — are paper-cuts that get one cleanup PR before PR-7 closes. CSS DRY across the 4 Tier-3 biography stylesheets is worth landing in the same PR; the structural duplication will get harder to extract once the chapter capstone is consuming real biography content. Grade: **A− (91/100)**, climbs to **A or A+** with P1's four-item cleanup sweep. Pre-PR-7 posture: GREEN; the audit's gate role is satisfied. Anna decides whether the four P1 fixes land as a single audit-cleanup PR before PR-7, or get folded into PR-7's opening commits.

---

## References

- [2026-05-16 Workstream 3 completion audit](2026-05-16-workstream-3-completion-audit.md) — prior audit; grading rubric continuity.
- [2026-05-16 state-of-the-platform audit](2026-05-16-state-of-the-platform-audit.md) — broader context.
- [MultiRep design hardening (2026-05-17)](../plans/2026-05-17-multirep-design.md) — Family 1 design source.
- [Intervention design hardening (2026-05-17)](../plans/2026-05-17-intervention-design.md) — Family 2 design source.
- [EquationBiography design hardening (2026-05-17)](../plans/2026-05-17-equation-biography-design.md) — Family 3 design source.
- [ADR 0038 — pedagogy-index pattern](../website/decisions/0038-pedagogy-index-pattern.md) — the index-extractor recipe all three families plug into.
- [ADR 0043 — Notation Registry + MultiRep](../website/decisions/0043-notation-registry-multirep-alignment-audit.md) — §R5 needs closure note.
- [ADR 0044 — Misconception Graph + Intervention Library](../website/decisions/0044-misconception-graph-and-intervention-library.md) — needs §R6 anchor-precedence note.
- [ADR 0046 — Equation Biography](../website/decisions/0046-equation-biography.md) — needs Phase 1 complete status update.
- [ADR 0058 — Epistemic Component Contract](../website/decisions/0058-epistemic-component-contract.md) — needs §R-greenfield first-application note.
