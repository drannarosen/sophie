import type { PedagogyIndex } from "@sophie/core/schema";
import { slugify } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Learning-objective audit invariants (O1 / O2).
 *
 *   O1 ERROR    — duplicate <Objective id="..."> within a chapter.
 *                 Defense-in-depth; `extractObjectives` already throws
 *                 on this at extract time. The audit re-checks the
 *                 snapshotted state for bypass paths (external
 *                 accumulator population in tests, future synthesizers).
 *   O2 WARNING  — chapter with zero learning objectives. Pedagogical
 *                 roll-up coverage will skip the chapter.
 */
export function checkObjectives(index: PedagogyIndex, sink: FindingSink): void {
  // O1 — duplicate objective id within a chapter.
  const objectiveIdsByChapter = new Map<string, Map<string, number>>();
  for (const obj of index.objectives) {
    let bag = objectiveIdsByChapter.get(obj.unit);
    if (!bag) {
      bag = new Map();
      objectiveIdsByChapter.set(obj.unit, bag);
    }
    bag.set(obj.id, (bag.get(obj.id) ?? 0) + 1);
  }
  for (const [unitId, bag] of objectiveIdsByChapter) {
    for (const [id, count] of bag) {
      if (count < 2) continue;
      sink.errors.push({
        severity: "ERROR",
        code: "O1",
        // CLI prefix word "chapter:" preserved per W3/D2 (educator vocabulary)
        message: `O1: duplicate <Objective id="${id}"> within chapter "${unitId}" (${count} occurrences). Resolution: change one of the \`id\` props so each objective has a stable, unique id within the chapter.`,
        location: { unit: unitId, anchor: `lo-${slugify(id)}` },
      });
    }
  }

  // O2 — chapter with zero objectives. W2/D2 graduation: iterate
  // index.units (was index.chapters); per-callsite ObjectiveEntry still
  // keys by chapter: string whose value equals u.id.
  const chaptersWithObjectives = new Set<string>();
  for (const obj of index.objectives) chaptersWithObjectives.add(obj.unit);
  for (const u of index.units) {
    if (chaptersWithObjectives.has(u.id)) continue;
    sink.warnings.push({
      severity: "WARNING",
      code: "O2",
      message: `O2: chapter "${u.id}" has zero learning objectives. Pedagogical roll-up coverage will skip this chapter.`,
      location: { unit: u.id },
    });
  }
}
