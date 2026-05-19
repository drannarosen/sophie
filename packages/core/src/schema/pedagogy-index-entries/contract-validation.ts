import { z } from "zod";
import { PageStatusSchema } from "../page-status.ts";
import { NonEmptyString } from "../primitives.ts";
import { ValidationSchema } from "../validation.ts";

/**
 * Contract-validation pedagogy entry — one per ADR or reference doc on
 * disk (ADR 0056). Populated by the contract-validations extractor
 * (`packages/astro/src/lib/validation/extractor.ts`); never touched by
 * the chapter MDX remark plugin. Powers audit invariants V1–V7 (per-
 * entry checks against the typed `Validation` block) and the validation-
 * status index page.
 */

/**
 * A contract document's validation block (ADR 0056) — one entry per
 * ADR or reference doc on disk. Populated by the contract-validations
 * extractor (`packages/astro/src/lib/validation/extractor.ts`); never
 * touched by the chapter MDX remark plugin. Powers audit invariants
 * V1–V7 (per-entry checks against the typed `Validation` block) and
 * is the source-of-truth surface for the eventual `/contracts/`
 * validation-status index page (PR 5).
 *
 * `validation` is optional because PR 6 reaches initial-pass coverage
 * incrementally; until every contract carries a block, V1/V2 surface
 * the gaps. PR 6 promotes V1/V2 from WARNING → ERROR once initial-
 * pass is complete.
 *
 * `lastRevisedDate` is the most recent ISO date parsed out of the
 * doc's Revisions section (canonical `**§N — YYYY-MM-DD —` or the
 * `## Revisions (YYYY-MM-DD — …)` H2-inline shape; mirrors the PR
 * #50 staleness detector). Powers the staleness signal in PR 5; left
 * here on the entry so the audit can surface staleness warnings
 * without re-parsing the source.
 */
export const ContractValidationEntrySchema = z.object({
  /** Repo-root-relative path (e.g. "docs/website/decisions/0001-platform-not-monorepo.md"). */
  path: NonEmptyString,
  /** Parsed validation block; undefined when the doc has no `validation:` frontmatter (V1/V2 fire). */
  validation: ValidationSchema.optional(),
  /**
   * Page-level lifecycle status (ADR 0062). Orthogonal to the validation
   * block's `status:` subkey: this field describes whether the contract
   * documented on the page is implemented (`shipped`), spec-locked but
   * unimplemented (`accepted-design` / `future-package-split`), or
   * partial (`mixed`). Undefined when the doc has no `status:` frontmatter
   * — rollout incompleteness is observability, not a defect (see
   * `scripts/lint-status.ts`). Parse failures surface as `S0` extractor
   * findings, not silent fallthrough.
   */
  status: PageStatusSchema.optional(),
  /** Most recent Revisions-section ISO date, or null if no Revisions section. */
  lastRevisedDate: z.string().nullable(),
});
export type ContractValidationEntry = z.infer<
  typeof ContractValidationEntrySchema
>;
