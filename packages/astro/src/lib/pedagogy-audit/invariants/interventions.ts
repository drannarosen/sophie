import { getInterventionByName } from "@sophie/components";
import type { PedagogyIndex } from "@sophie/core/schema";
import type { AuditContext } from "../context.ts";
import type { FindingSink } from "../types.ts";

/**
 * Intervention audit invariants per ADR 0044 + 2026-05-17 design §D7.
 *
 *   I2 ERROR    Unknown canonical intervention type.
 *   I1 WARNING  Unknown `addresses=…` OR "this" outside misconception
 *               parent (extractor leaves "this" verbatim when no
 *               enclosing <Aside kind="misconception">).
 *   I3 INFO     Bridging-analogy without `limits` (Clement 1993 nudge).
 *
 * MG3 + MG4 (misconception pairing summary) live in a sibling file
 * since they're about misconception coverage rather than per-
 * intervention authoring.
 *
 * I4 (move-index integrity) is deferred until `move-index.ts` ships;
 * the `move:` field on each `intervention-index.ts` entry is the
 * forward-compat seam.
 */
export function checkInterventions(
  index: PedagogyIndex,
  ctx: AuditContext,
  sink: FindingSink
): void {
  // I2 ERROR — unknown canonical type. The extractor's `.superRefine`
  // (PR-β) catches `type="custom"` without `name` at parse time. I2
  // here catches the "made up canonical name" case (typo or author
  // reaching for a name that doesn't exist in the library). Schema
  // layer is permissive on `type: z.string()` per design §D1; the
  // audit is the enforcement surface for catalog membership.
  for (const iv of index.interventions) {
    if (iv.type === "custom") continue;
    if (getInterventionByName(iv.type) !== undefined) continue;
    sink.errors.push({
      severity: "ERROR",
      code: "I2",
      message: `I2: <Intervention type="${iv.type}"> in chapter "${iv.unit}" — "${iv.type}" is not a canonical name in intervention-index.ts. Resolution: pick one of the 12 canonical interventions (see docs/website/reference/intervention-library.md), or declare \`type="custom" name="${iv.type}"\` to opt out of the canonical library.`,
      location: { unit: iv.unit, anchor: iv.anchor },
    });
  }

  // I1 WARNING — <Intervention addresses="…"> references a
  // misconception not declared anywhere in the course, OR the literal
  // "this" survived extraction. The extractor (PR-γ) rewrites "this"
  // → enclosing misconception name when the Intervention is nested in
  // a misconception Aside. Surviving "this" means the Intervention
  // was standalone with `addresses="this"` — a real authoring bug.
  // Authors who address a misconception declared in ANOTHER chapter
  // pass this check (the misconception set is course-wide).
  for (const iv of index.interventions) {
    for (const target of iv.addresses) {
      if (target === "this") {
        sink.warnings.push({
          severity: "WARNING",
          code: "I1",
          message: `I1: <Intervention type="${iv.type}"> in chapter "${iv.unit}" — \`addresses="this"\` survived extraction (the Intervention is not nested inside a <Aside kind="misconception">). Resolution: nest the intervention inside the misconception Aside, or replace "this" with the misconception's anchor slug.`,
          location: { unit: iv.unit, anchor: iv.anchor },
        });
        continue;
      }
      if (ctx.declaredMisconceptionAnchors.has(target)) continue;
      sink.warnings.push({
        severity: "WARNING",
        code: "I1",
        message: `I1: <Intervention type="${iv.type}"> in chapter "${iv.unit}" — \`addresses="${target}"\` references a misconception not declared anywhere in the course. Resolution: declare the misconception (Aside or Callout with that anchor) in some chapter, or fix the slug typo.`,
        location: { unit: iv.unit, anchor: iv.anchor },
      });
    }
  }

  // I3 INFO — bridging-analogy without `limits` (Clement 1993 nudge).
  // Clement 1993's bridging-analogy framework prescribes EXPLICIT
  // limits ("the analogy maps X but breaks down on Y") as essential
  // for resilient remediation. Authoring nudge, INFO-level.
  for (const iv of index.interventions) {
    if (iv.type !== "bridging-analogy") continue;
    if (iv.limits) continue;
    sink.info.push({
      severity: "INFO",
      code: "I3",
      message: `I3: <Intervention type="bridging-analogy"> in chapter "${iv.unit}" lacks \`limits\`. Authoring nudge — Clement 1993 prescribes explicit limits ("the analogy maps X but breaks down on Y") for resilient remediation.`,
      location: { unit: iv.unit, anchor: iv.anchor },
    });
  }
}
