import {
  COMPONENT_EPISTEMIC_ROLES,
  ROLE_VIA_SLOT_ROLES,
} from "@sophie/components";
import type { EpistemicRole, PedagogyIndex } from "@sophie/core/schema";
import { EPISTEMIC_ROLES } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Epistemic-role coverage (RC1 / RC2) — the invariant that *consumes* the
 * declared eight-role contract (ADR 0058 R-audit-consumes-role), graduating
 * it from "declared + lint-gated" (R13) to "read by the build-time audit."
 *
 * For each chapter it reports which epistemic roles the chapter's pedagogy
 * components evidence, by joining the chapter-keyed index collections to the
 * component → role registry (`@sophie/components`). All findings are INFO:
 * role coverage is descriptive (a chapter legitimately need not exercise
 * every role), not a gate.
 *
 * **Scope — honest, and surfaced as RC2 (no silent caps).** Only the THREE
 * index collections that (a) carry a per-unit key AND (b) map to a declared
 * role are attributable per chapter, covering FIVE of the eight roles:
 *
 *   - `omiFlows`        → observable / model / inference  (OMIFlow slots)
 *   - `workedExamples`  → numerical                       (WorkedExample)
 *   - `misconceptions`  → misconception                   (Aside/Callout
 *                          misconception; same role CommonMisuse declares)
 *
 * The remaining three are NOT per-chapter attributable today:
 *   - assumption / approximation — evidenced by `<KeyEquation>` biography,
 *     which lives in the registry-global equation store, not per chapter.
 *   - uncertainty — no component declares it (the one taxonomy role with no
 *     authoring primitive yet).
 *
 * Standalone inline `<Observable>` / `<Assumption>` / `<BreaksWhen>` /
 * `<DerivationStep>` are not separately extracted, so their roles register
 * per chapter only when authored inside an extracted container (OMIFlow slot
 * / KeyEquation biography). Closing either gap is a future extractor change.
 *
 * The plugin is a pure read over the snapshotted index — no I/O, no caches.
 */

/** Chapter-keyed index collections → the role(s) each evidences, sourced
 *  from the declared role registry so the consts stay the single truth. */
const CHAPTER_KEYED_ROLE_SOURCES = [
  { collection: "omiFlows", roles: ROLE_VIA_SLOT_ROLES.OMIFlow },
  {
    collection: "workedExamples",
    roles: [COMPONENT_EPISTEMIC_ROLES.WorkedExample],
  },
  {
    collection: "misconceptions",
    roles: [COMPONENT_EPISTEMIC_ROLES.CommonMisuse],
  },
] as const;

/** The five roles this invariant can attribute per chapter (union of the
 *  source role sets), in canonical taxonomy order for stable messages. */
const ATTRIBUTABLE_ROLES: ReadonlyArray<EpistemicRole> = EPISTEMIC_ROLES.filter(
  (role) =>
    CHAPTER_KEYED_ROLE_SOURCES.some((source) =>
      (source.roles as ReadonlyArray<EpistemicRole>).includes(role)
    )
);

export function checkRoleCoverage(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  // chapter slug → set of evidenced roles, seeded so every known chapter
  // gets a finding (a chapter that evidences zero roles is the signal).
  const rolesByChapter = new Map<string, Set<EpistemicRole>>();
  for (const unit of index.units) {
    rolesByChapter.set(unit.id, new Set());
  }

  for (const source of CHAPTER_KEYED_ROLE_SOURCES) {
    const entries = index[source.collection] as ReadonlyArray<{ unit: string }>;
    for (const entry of entries) {
      let roles = rolesByChapter.get(entry.unit);
      if (!roles) {
        // An entry whose unit is not in index.units (e.g. registry-only
        // content). Still report it rather than silently dropping.
        roles = new Set();
        rolesByChapter.set(entry.unit, roles);
      }
      for (const role of source.roles) roles.add(role);
    }
  }

  // RC1 — per-chapter evidenced-role coverage (INFO).
  for (const [unitId, roles] of rolesByChapter) {
    const present = ATTRIBUTABLE_ROLES.filter((role) => roles.has(role));
    const absent = ATTRIBUTABLE_ROLES.filter((role) => !roles.has(role));
    sink.info.push({
      severity: "INFO",
      code: "RC1",
      message: `RC1: chapter "${unitId}" evidences ${present.length}/${ATTRIBUTABLE_ROLES.length} audit-attributable epistemic roles [${present.join(", ") || "none"}]${absent.length ? ` — absent: ${absent.join(", ")}` : ""}.`,
      location: { unit: unitId, anchor: "epistemic-role-coverage" },
    });
  }

  // RC2 — scope limit (INFO, emitted once; no silent caps).
  sink.info.push({
    severity: "INFO",
    code: "RC2",
    message: `RC2: role coverage attributes ${ATTRIBUTABLE_ROLES.length} of ${EPISTEMIC_ROLES.length} epistemic roles per chapter [${ATTRIBUTABLE_ROLES.join(", ")}]. Not per-chapter attributable: assumption + approximation (registry-global via <KeyEquation> biography), uncertainty (no authoring primitive). Standalone inline role components register only inside extracted containers (OMIFlow / KeyEquation).`,
    location: { unit: "*", anchor: "epistemic-role-coverage" },
  });
}
