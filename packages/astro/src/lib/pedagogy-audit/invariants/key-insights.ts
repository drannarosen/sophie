import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Key-insight coverage invariant (K1).
 *
 *   K1 INFO — chapter has zero <KeyInsight>s. Informational — not a
 *             defect. Surfaces in the audit so the author knows which
 *             chapters could benefit from a key-insight callout.
 */
export function checkKeyInsights(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  // W2/D2 graduation: iterate index.units (was index.chapters). The
  // per-callsite KeyInsightEntry still keys by chapter: string whose
  // value equals u.id (W2 D4 1:1 convention); the lookup set is unchanged.
  const chaptersWithKeyInsights = new Set<string>();
  for (const ki of index.keyInsights) chaptersWithKeyInsights.add(ki.chapter);
  for (const u of index.units) {
    if (chaptersWithKeyInsights.has(u.id)) continue;
    sink.info.push({
      severity: "INFO",
      code: "K1",
      message: `K1: chapter "${u.id}" has zero <KeyInsight>s. Informational — not a defect.`,
      location: { chapter: u.id },
    });
  }
}
