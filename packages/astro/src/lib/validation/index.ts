/**
 * Barrel for the validation cluster (ADR 0056 + ADR 0061 C5).
 *
 * Four files behind one re-export surface so consumers can choose
 * either focused-import (e.g. `from "./validation/extractor"`) for
 * blast-radius traceability or barrel-import for ergonomics. The
 * package-public surface in `packages/astro/src/index.ts` imports
 * from this barrel.
 *
 * - `extractor.ts`        — build-time walk over decisions/ + reference/
 *                            that produces ContractValidationEntry[] +
 *                            V0/V8 extractor findings.
 * - `index-generator.ts`  — pure function: PedagogyIndex → Markdown body
 *                            for docs/website/status/validation.md.
 * - `index-writer.ts`     — I/O wrapper around the generator + env-flag
 *                            + status-dir-absent guards.
 * - `admonition-plugin.ts` — pure renderer + AST builder used by the
 *                            MyST plugin in
 *                            docs/website/scripts/validation-admonition-plugin.mjs.
 */

export {
  buildValidationAdmonitionNode,
  extractLastRevisedDate,
  isContractFile,
  type MystAdmonitionNode,
  parseValidationFrontmatter,
  renderValidationAdmonition,
} from "./admonition-plugin.ts";
export {
  type ContractValidationsExtractionResult,
  extractContractValidations,
} from "./extractor.ts";
export {
  contractHref,
  generateValidationIndex,
} from "./index-generator.ts";
export { writeValidationIndexMarkdown } from "./index-writer.ts";
