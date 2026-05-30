import type { EpistemicRole } from "@sophie/core/schema";
import { ASSUMPTION_EPISTEMIC_ROLE } from "./components/Assumption/Assumption.schema.ts";
import { BREAKS_WHEN_EPISTEMIC_ROLE } from "./components/BreaksWhen/BreaksWhen.schema.ts";
import { COMMON_MISUSE_EPISTEMIC_ROLE } from "./components/CommonMisuse/CommonMisuse.schema.ts";
import { DERIVATION_STEP_EPISTEMIC_ROLE } from "./components/DerivationStep/DerivationStep.schema.ts";
import { OBSERVABLE_EPISTEMIC_ROLE } from "./components/Observable/Observable.schema.ts";
import { WORKED_EXAMPLE_EPISTEMIC_ROLE } from "./components/WorkedExample/WorkedExample.schema.ts";

/**
 * The canonical component → epistemic-role registry: the one place the
 * eight-role contract (ADR 0058) is aggregated for *consumption* rather
 * than per-component *declaration*. Each value is re-exported from the
 * component's own `*_EPISTEMIC_ROLE` const (R13-enforced), so the consts
 * stay the single source of truth and this registry can never silently
 * drift from them — a renamed/removed const fails the import here.
 *
 * Consumed by the build-time pedagogy audit's role-coverage invariant
 * (ADR 0058 R-audit-consumes-role), which is what graduates the contract
 * from "declared + lint-gated" to "read by the audit."
 */

/**
 * The six components that declare a SINGLE epistemic role via their
 * canonical `*_EPISTEMIC_ROLE` const.
 */
export const COMPONENT_EPISTEMIC_ROLES = {
  Assumption: ASSUMPTION_EPISTEMIC_ROLE,
  BreaksWhen: BREAKS_WHEN_EPISTEMIC_ROLE,
  CommonMisuse: COMMON_MISUSE_EPISTEMIC_ROLE,
  DerivationStep: DERIVATION_STEP_EPISTEMIC_ROLE,
  Observable: OBSERVABLE_EPISTEMIC_ROLE,
  WorkedExample: WORKED_EXAMPLE_EPISTEMIC_ROLE,
} as const satisfies Record<string, EpistemicRole>;

/**
 * The two role-via-slot composition roots (ADR 0058 `ROLE_VIA_SLOT`):
 * their named slots carry roles rather than a single declared const, so
 * the role *set* is declared here. `OMIFlow`'s observable / model /
 * inference slots; `KeyEquation`'s biography groups (observable body +
 * assumption / approximation / misconception cards).
 */
export const ROLE_VIA_SLOT_ROLES = {
  OMIFlow: ["observable", "model", "inference"],
  KeyEquation: ["observable", "assumption", "approximation", "misconception"],
} as const satisfies Record<string, readonly EpistemicRole[]>;
