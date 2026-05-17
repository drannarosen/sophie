import { z } from "zod";

/**
 * The canonical 8-role epistemic taxonomy per ADR 0058. Closed at v1;
 * a ninth role earns its keep only via a new ADR amending 0058.
 *
 * Roles in canonical order:
 * - observable     — measured / observed phenomenon (what data shows)
 * - model          — formal / equational / computational model (what we posit)
 * - inference      — probabilistic conclusion from model + data
 * - assumption     — explicit precondition on a model's validity
 * - approximation  — simplification with a known domain of validity
 * - uncertainty    — posterior spread, error bar, degeneracy
 * - numerical      — discretization, integrator, convergence artifact
 * - misconception  — canonical student-side wrong model
 */
export const EPISTEMIC_ROLES = [
  "observable",
  "model",
  "inference",
  "assumption",
  "approximation",
  "uncertainty",
  "numerical",
  "misconception",
] as const;

export const EpistemicRoleSchema = z.enum(EPISTEMIC_ROLES);

export type EpistemicRole = z.infer<typeof EpistemicRoleSchema>;
