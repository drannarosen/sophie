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
  const chaptersWithKeyInsights = new Set<string>();
  for (const ki of index.keyInsights) chaptersWithKeyInsights.add(ki.chapter);
  for (const ch of index.chapters) {
    if (chaptersWithKeyInsights.has(ch.slug)) continue;
    sink.info.push({
      severity: "INFO",
      code: "K1",
      message: `K1: chapter "${ch.slug}" has zero <KeyInsight>s. Informational — not a defect.`,
      location: { chapter: ch.slug },
    });
  }
}
