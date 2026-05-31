import { z } from "zod";

export const Slug = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Slug must be lowercase kebab-case (letters, digits, hyphens; no leading/trailing/double hyphens)."
  );

export const NonEmptyString = z.string().min(1);

/**
 * A zero-padded ISO calendar date (`z.iso.date()`) or the literal `"tbd"`.
 * The single guard for any date that feeds the fail-closed solution-reveal
 * resolver (ADR 0096): `new Date(explicit)` is permissive (e.g.
 * `new Date("0")` is a valid Date), so this union — not the resolver — is
 * what rejects malformed dates before they reach build-time gating logic.
 * Shared by `assignments.ts` (assignedDate / dueDate) and `unit.ts`
 * (solutionsRevealDate override).
 */
export const DateOrTbd = z.union([z.iso.date(), z.literal("tbd")]);

export const LangTag = z
  .string()
  .min(2)
  .regex(
    /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/,
    "Lang must be a BCP 47 tag, e.g. 'en', 'en-US', 'pt-BR'."
  );
