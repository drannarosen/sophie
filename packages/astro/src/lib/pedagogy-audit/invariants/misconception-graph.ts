import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Misconception-graph integrity invariants (MG1 / MG2) per ADR 0044.
 *
 *   MG1 ERROR — cycle in the `prerequisite_misconceptions` graph
 *               (DAG violation; a curriculum bug — no valid sequencing).
 *   MG2 ERROR — a prerequisite references either (a) a misconception
 *               that doesn't exist anywhere in the index (dangling
 *               ref), or (b) a misconception introduced in the SAME or
 *               LATER chapter than the referring one (ordering
 *               violation — prerequisites must be addressed first).
 *
 * The misconception graph is distributively declared: each chapter's
 * `<Aside kind="misconception">` (or `<Callout variant="misconception">`)
 * carries the graph fields for that misconception. The audit walks the
 * pedagogy index, assembles the graph from the union of declarations,
 * and reports the two integrity violations.
 *
 * Chapter ordering source: the consumer-supplied `chapters` collection.
 * Entries with explicit `order` win; ties + missing-order entries fall
 * back to stable insertion order. Two misconceptions whose chapters
 * share the same order index are treated as "same position" — a
 * prerequisite that lives in a same-ordered chapter triggers MG2.
 * (Per ADR 0044 §Audit-invariants.)
 */
export function checkMisconceptionGraph(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  if (index.misconceptions.length === 0) return;

  // Build name → introducing chapter map. The misconception's `anchor`
  // is the slug we resolve against (matches the authoring shape: a
  // <Aside title="Universe with a center"> produces anchor
  // "universe-with-a-center"; cross-references use that same slug).
  const misconceptionByAnchor = new Map<
    string,
    { chapter: string; anchor: string }
  >();
  for (const m of index.misconceptions) {
    // First-seen wins. M2 (extractor-level) already prevents cross-
    // chapter explicit-id collisions; auto-anchors (`misc-N`) are
    // chapter-scoped so different chapters can both have a `misc-1`,
    // but those auto-anchors aren't valid reference targets across
    // chapters anyway — authors who want to declare a graph edge use
    // explicit slugs.
    if (!misconceptionByAnchor.has(m.anchor)) {
      misconceptionByAnchor.set(m.anchor, {
        chapter: m.chapter,
        anchor: m.anchor,
      });
    }
  }

  // Chapter ordering. W2/D2 graduation: derive from index.units (was
  // index.chapters). UnitEntry.order is required (UnitSchema), so no
  // optional fallback needed — but keep the insertion-order fallback
  // for sentinel safety with literally-constructed test fixtures.
  // Units not in the collection (which can happen when a chapter's
  // misconception declares a prereq but the chapter itself isn't yet
  // wired into the units collection) get a sentinel ordering of
  // +Infinity so they never look "earlier" than anything else.
  const chapterOrder = new Map<string, number>();
  index.units.forEach((u, i) => {
    chapterOrder.set(u.id, u.order ?? i);
  });
  const orderOf = (chapter: string): number =>
    chapterOrder.has(chapter)
      ? (chapterOrder.get(chapter) as number)
      : Number.POSITIVE_INFINITY;

  // MG2 — dangling reference + earlier-chapter ordering check.
  for (const m of index.misconceptions) {
    const prereqs = m.prerequisite_misconceptions ?? [];
    for (const prereqAnchor of prereqs) {
      const target = misconceptionByAnchor.get(prereqAnchor);
      if (!target) {
        sink.errors.push({
          severity: "ERROR",
          code: "MG2",
          message: `MG2: misconception "${m.anchor}" in chapter "${m.chapter}" declares prerequisite "${prereqAnchor}", but no misconception with that anchor is declared anywhere in the textbook. Resolution: either declare the prerequisite misconception in an earlier chapter, or remove the dangling reference.`,
          location: { chapter: m.chapter, anchor: m.anchor },
        });
        continue;
      }
      // Self-reference: a misconception listing itself as a prerequisite
      // is a degenerate cycle of length 1. MG1 catches it below too,
      // but we surface it as MG2 here for the clearer dangling-style
      // diagnostic since it's also "no earlier chapter introduces it".
      if (target.anchor === m.anchor && target.chapter === m.chapter) {
        // Skip — let MG1 surface it as a cycle.
        continue;
      }
      const prereqOrder = orderOf(target.chapter);
      const selfOrder = orderOf(m.chapter);
      if (!(prereqOrder < selfOrder)) {
        sink.errors.push({
          severity: "ERROR",
          code: "MG2",
          message: `MG2: misconception "${m.anchor}" in chapter "${m.chapter}" declares prerequisite "${prereqAnchor}" (in chapter "${target.chapter}"), but that prerequisite is not introduced in an earlier chapter (by the chapters collection's declared order). Resolution: either reorder the chapters so the prerequisite is introduced first, or remove the prerequisite declaration.`,
          location: { chapter: m.chapter, anchor: m.anchor },
        });
      }
    }
  }

  // MG1 — cycle detection over the prerequisite graph. Iterative DFS
  // with WHITE/GRAY/BLACK coloring; an edge into a GRAY node closes a
  // cycle. Only edges whose target exists in the index are walked —
  // dangling edges are MG2's concern, not MG1's.
  const adjacency = new Map<string, string[]>();
  for (const m of index.misconceptions) {
    const targets: string[] = [];
    for (const prereqAnchor of m.prerequisite_misconceptions ?? []) {
      if (misconceptionByAnchor.has(prereqAnchor)) {
        targets.push(prereqAnchor);
      }
    }
    adjacency.set(m.anchor, targets);
  }
  // GRAY = on current DFS stack; BLACK = fully processed. WHITE is the
  // implicit "not in the map" state — no explicit value needed.
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const reportedCycleSignatures = new Set<string>();
  for (const startAnchor of adjacency.keys()) {
    if (color.get(startAnchor) !== undefined) continue;
    // Iterative DFS stack of frames: [node, nextChildIndex].
    const stack: Array<{ node: string; i: number }> = [
      { node: startAnchor, i: 0 },
    ];
    color.set(startAnchor, GRAY);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (!frame) break;
      const children = adjacency.get(frame.node) ?? [];
      if (frame.i >= children.length) {
        color.set(frame.node, BLACK);
        stack.pop();
        continue;
      }
      const next = children[frame.i];
      frame.i += 1;
      if (next === undefined) continue;
      const c = color.get(next);
      if (c === GRAY) {
        // Cycle. Reconstruct it from the stack between `next` and top.
        const cyclePath: string[] = [];
        let started = false;
        for (const f of stack) {
          if (f.node === next) started = true;
          if (started) cyclePath.push(f.node);
        }
        cyclePath.push(next);
        // Dedup cycles reported from different start points. Canonical
        // signature: rotate to the lexicographically smallest anchor
        // and join.
        const ring = cyclePath.slice(0, -1);
        let minIdx = 0;
        for (let k = 1; k < ring.length; k += 1) {
          const a = ring[k];
          const b = ring[minIdx];
          if (a !== undefined && b !== undefined && a < b) minIdx = k;
        }
        const rotated = [...ring.slice(minIdx), ...ring.slice(0, minIdx)];
        const sig = rotated.join(" -> ");
        if (!reportedCycleSignatures.has(sig)) {
          reportedCycleSignatures.add(sig);
          const home = misconceptionByAnchor.get(rotated[0] ?? next);
          sink.errors.push({
            severity: "ERROR",
            code: "MG1",
            message: `MG1: cycle in prerequisite_misconceptions graph: ${rotated.join(" → ")} → ${rotated[0] ?? next}. Curriculum bug — a misconception cannot be both a prerequisite of another AND depend on it. Resolution: remove one of the prerequisite edges.`,
            location: home
              ? { chapter: home.chapter, anchor: home.anchor }
              : undefined,
          });
        }
      } else if (c === undefined) {
        color.set(next, GRAY);
        stack.push({ node: next, i: 0 });
      }
    }
  }
}
