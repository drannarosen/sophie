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
    let bag = objectiveIdsByChapter.get(obj.chapter);
    if (!bag) {
      bag = new Map();
      objectiveIdsByChapter.set(obj.chapter, bag);
    }
    bag.set(obj.id, (bag.get(obj.id) ?? 0) + 1);
  }
  for (const [chapter, bag] of objectiveIdsByChapter) {
    for (const [id, count] of bag) {
      if (count < 2) continue;
      sink.errors.push({
        severity: "ERROR",
        code: "O1",
        message: `O1: duplicate <Objective id="${id}"> within chapter "${chapter}" (${count} occurrences). Resolution: change one of the \`id\` props so each objective has a stable, unique id within the chapter.`,
        location: { chapter, anchor: `lo-${slugify(id)}` },
      });
    }
  }

  // O2 — chapter with zero objectives.
  const chaptersWithObjectives = new Set<string>();
  for (const obj of index.objectives) chaptersWithObjectives.add(obj.chapter);
  for (const ch of index.chapters) {
    if (chaptersWithObjectives.has(ch.slug)) continue;
    sink.warnings.push({
      severity: "WARNING",
      code: "O2",
      message: `O2: chapter "${ch.slug}" has zero learning objectives. Pedagogical roll-up coverage will skip this chapter.`,
      location: { chapter: ch.slug },
    });
  }
}
