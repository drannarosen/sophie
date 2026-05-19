/**
 * Barrel for the aside-positioning cluster (ADR 0061 C7).
 *
 * Two files behind one re-export surface:
 *
 *   - `compute-placements.ts` — pure placement algorithm
 *     (`computeAsidePositions`) + the `PlacementInput` / `AsidePlacement`
 *     / `Anchor` types. No DOM access; deterministic unit-testable.
 *   - `install-positioning.ts` — DOM lifecycle adapter
 *     (`installAsidePositioning`) that calls `computeAsidePositions`
 *     inside the resize/MutationObserver/rAF event loop.
 *
 * Consumers may import from this barrel for ergonomics, or from the
 * focused file for blast-radius traceability. TextbookLayout's
 * client-side `<script>` block imports `install-positioning.ts`
 * directly so the tsup entry maps to that file (the compute helper
 * tree-shakes in via the internal import).
 */

export {
  type Anchor,
  type AsidePlacement,
  computeAsidePositions,
  type PlacementInput,
} from "./compute-placements.ts";
export { installAsidePositioning } from "./install-positioning.ts";
