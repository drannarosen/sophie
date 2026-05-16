import { z } from "zod";

/**
 * Validation block schema (ADR 0056). Powers the `validation:` frontmatter
 * key on every ADR and reference doc; the contract-validations extractor
 * (`@sophie/astro/lib/validation-extractor.ts`) parses each block through
 * `ValidationSchema.safeParse` and emits a `ContractValidationEntry` plus
 * any audit findings.
 *
 * Invariant ownership split (PR 3 of ADR 0056):
 *
 *   - **V3 (status validated/re-validation-needed requires
 *     last_validated_date)** is enforced here via `.refine()`. The
 *     extractor's V0 finding surfaces any schema-parse failure
 *     (including V3) to the audit report; V3 stays at the audit layer
 *     as defense-in-depth for inputs that bypass the extractor (direct
 *     `ContractValidationEntry` construction in tests / future
 *     synthesizers).
 *
 *   - **V0 (parse failure) + V8 (unknown key)** are surfaced by the
 *     extractor, which has access to the raw `Record<string, unknown>`
 *     frontmatter shape Zod 4's `.strip()` discards.
 *
 *   - **V1, V2, V4, V5, V6, V7** are audit-layer invariants on
 *     already-typed `Validation` blocks. See
 *     `@sophie/astro/lib/pedagogy-audit.ts` for the implementations.
 */
export const ValidationKindSchema = z.enum([
  "test",
  "chapter",
  "review",
  "deployment",
  "audit",
  "manual",
]);
export type ValidationKind = z.infer<typeof ValidationKindSchema>;

export const ValidationStatusSchema = z.enum([
  "unvalidated",
  "in-progress",
  "validated",
  "re-validation-needed",
]);
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

export const ValidationEvidenceSchema = z.object({
  kind: ValidationKindSchema,
  ref: z.string().nullable(),
  date: z.string().nullable(),
  notes: z.string().optional(),
});
export type ValidationEvidence = z.infer<typeof ValidationEvidenceSchema>;

export const ValidationSchema = z
  .object({
    status: ValidationStatusSchema,
    last_validated_date: z.string().nullable(),
    evidence: z.array(ValidationEvidenceSchema).default([]),
    notes: z.string().optional(),
  })
  .refine(
    (block) => {
      if (
        block.status === "validated" ||
        block.status === "re-validation-needed"
      ) {
        return block.last_validated_date !== null;
      }
      return true;
    },
    {
      message:
        "last_validated_date is required when status is validated or re-validation-needed",
      path: ["last_validated_date"],
    }
  );
export type Validation = z.infer<typeof ValidationSchema>;
