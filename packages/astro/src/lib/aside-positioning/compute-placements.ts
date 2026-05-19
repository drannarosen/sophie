/**
 * Aside positioning — pure placement algorithm.
 *
 * Given document-coordinate anchors and heights for N asides plus an
 * optional ToC anchor, compute each aside's `top` value with the
 * ToC-and-cascade clamp rules. No DOM access; deterministic for unit
 * testing.
 *
 * The DOM lifecycle (event listeners, MutationObserver, idempotency
 * guard, rAF debouncing) lives in the sibling `install-positioning.ts`
 * module per ADR 0061 §C7 (pure vs DOM seam split).
 */

export interface PlacementInput {
  /** Document-coordinate top of the aside's anchor paragraph (offsetTop). */
  anchorTop: number;
  /** Aside's current rendered height in px. */
  height: number;
}

export interface AsidePlacement {
  /** Resolved top in document coordinates (offsetTop on the aside). */
  top: number;
  /** Echoed back from input — convenience for the next cascade step. */
  height: number;
}

export interface Anchor {
  top: number;
  height: number;
}

/**
 * Pure positioning algorithm. Given the document-coordinate anchors
 * and heights of N asides plus an optional ToC anchor, compute each
 * aside's `top` value in document coordinates.
 *
 * Rules (in evaluation order per aside):
 *   1. Start at the aside's `anchorTop`.
 *   2. Clamp to `tocBottom + gap` if the ToC exists (asides must
 *      not overlap the ToC's natural-flow box).
 *   3. Clamp to `previousAside.bottom + gap` if there is a previous
 *      aside (asides must not overlap each other).
 *
 * Input order is preserved in output. The algorithm processes asides
 * in input order (matches DOM document order at the call site).
 */
export function computeAsidePositions(
  asides: ReadonlyArray<PlacementInput>,
  toc: Anchor | null,
  gap: number
): AsidePlacement[] {
  const tocBottom = toc ? toc.top + toc.height + gap : -Infinity;
  const placements: AsidePlacement[] = [];

  for (const input of asides) {
    let top = input.anchorTop;
    if (top < tocBottom) {
      top = tocBottom;
    }
    if (placements.length > 0) {
      const prev = placements[placements.length - 1];
      if (prev) {
        const prevBottom = prev.top + prev.height + gap;
        if (top < prevBottom) {
          top = prevBottom;
        }
      }
    }
    placements.push({ top, height: input.height });
  }

  return placements;
}
