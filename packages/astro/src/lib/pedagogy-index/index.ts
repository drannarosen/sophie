/**
 * Barrel for the pedagogy-index cluster (ADR 0038 + ADR 0061 C1).
 *
 * The cluster splits the former 2,454-LOC `pedagogy-index-extractor.ts`
 * into focused files by role, per ADR 0061 Rules 1 + 4:
 *
 *   - `jsx-utils.ts`              — JSX attribute readers + types.
 *   - `extractors/*.ts`           — pure tree-walk extractors (one per
 *                                    pedagogy role); each returns
 *                                    `RoleEntry[]`.
 *   - `transforms/*.ts`           — terminal tree mutations that rewrite
 *                                    JSX shape (LO/MultiRep/Intervention)
 *                                    or annotate nodes (first-use glossary).
 *   - `accumulator.ts`            — cross-chapter `IndexAccumulator`
 *                                    singleton + global state.
 *   - `orchestrator.ts`           — remark plugin entry point that wires
 *                                    extractors + transforms + accumulator
 *                                    into the unified MDX pipeline.
 *
 * Consumers may import from this barrel for ergonomics, or from the
 * focused file for blast-radius traceability. Production code paths
 * tend to favor the focused import; the package barrel
 * `packages/astro/src/index.ts` re-exports through this one.
 */

export {
  indexAccumulator,
  resetIndexAccumulator,
} from "./accumulator.ts";
export { buildBiographyFromChildren } from "./extractors/biography.ts";
export { extractDeepDives } from "./extractors/deep-dives.ts";
export { extractDefinitions } from "./extractors/definitions.ts";
export { extractEquationCitations } from "./extractors/equation-citations.ts";
export { extractEquationRegistryDeclaration } from "./extractors/equation-registry.ts";
export { extractFigures } from "./extractors/figures.ts";
export { extractInlineRefUsages } from "./extractors/inline-refs.ts";
export { extractInterventions } from "./extractors/interventions.ts";
export { extractKeyInsights } from "./extractors/key-insights.ts";
export { extractMisconceptions } from "./extractors/misconceptions.ts";
export {
  buildRepsFromMultiRepChildren,
  extractMultiReps,
} from "./extractors/multireps.ts";
export { extractObjectives } from "./extractors/objectives.ts";
export { extractOMIFlows } from "./extractors/omi-flow.ts";
export {
  type PedagogyIndexRemarkPluginOptions,
  pedagogyIndexRemarkPlugin,
} from "./orchestrator.ts";
export { markFirstUseGlossaryTerms } from "./transforms/first-use-glossary.ts";
export { transformIntervention } from "./transforms/intervention.ts";
export { transformLearningObjectives } from "./transforms/learning-objectives.ts";
export { transformMultiRep } from "./transforms/multirep.ts";
