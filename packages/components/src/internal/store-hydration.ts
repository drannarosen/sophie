/**
 * Internal store-hydration entry point — re-exports the setter
 * functions @sophie/astro's `<TextbookLayout>` uses to push consumer-
 * supplied collections (equations / glossary definitions / figure
 * registry / figure usages / objectives / sections / units / artifacts)
 * into the component-side stores at render time. W2/D3 deleted
 * `__setChapters` + `__setModules` (the chapters/modules collections
 * graduated to sections/units + the artifacts collection).
 *
 * **Not part of the public authoring API.** These setters were
 * previously exported from the root `@sophie/components` barrel with
 * an `__` prefix as an underscore-convention "internal-use" signal.
 * Per ADR 0001 (framework purity / package boundary) + ADR 0061
 * Rule 4 (filename-as-discovery-key) and the 2026-05-19 architecture
 * audit P2 #3, the contract-vs-signal gap is closed by giving these
 * setters their own subpath export. Consumer apps should never call
 * them directly — TextbookLayout owns the SSR-merge handoff.
 *
 * Path: `@sophie/components/internal/store-hydration`.
 *
 * The `__` prefix on each symbol stays (a) for grep-locatability so
 * the TextbookLayout callsites remain visually distinct from
 * regular component imports and (b) so any future accidental import
 * from elsewhere is one extra warning sign that something's off-path.
 */
export { __setEquationCitations } from "../components/EquationRef/equation-citations-store.ts";
export { __setEquations } from "../components/EquationRef/equations-store.ts";
export { __setFigureRegistry } from "../components/FigureRef/figure-registry-store.ts";
export { __setFigureUsages } from "../components/FigureRef/figure-usages-store.ts";
export { __setGlossaryDefinitions } from "../components/GlossaryTerm/definitions-store.ts";
export { __setObjectives } from "../components/Objective/objectives-store.ts";
// Wedge B-followup (W2/D1) — Artifact consumer-supplied collection per
// ADR 0067 (Path A). Surfaced for `<ChapterRef chapter="…">` reading-
// artifact lookup, post-W2 audit invariants, and future `<LectureRef>`
// / `<ArtifactRef>` consumers. ArtifactEntry is a discriminated union
// over scope (unit | section).
export { __setArtifacts } from "../runtime/artifacts-store.ts";
// Wedge B-followup (W1) — Section + Unit consumer-supplied collections
// per ADR 0067. Surfaced for `<SpacedReview section=…>` rendering and
// the audit graduations (PRA-1 / SR-1). Stores live in `runtime/`
// because the data is platform-wide, not tied to a specific component.
export { __setSections } from "../runtime/sections-store.ts";
export { __setUnits } from "../runtime/units-store.ts";
