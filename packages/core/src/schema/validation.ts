import { z } from "zod";

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
