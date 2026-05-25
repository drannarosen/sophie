// PR-D1 packed-smoke figure registry — minimal, hand-authored (NOT
// generated from astr201). Two entries: one referenced by the
// reading.mdx via <FigureRef name="test-figure">, one extra to
// document the multi-entry shape.

import type { FigureRegistry } from "@sophie/components/runtime";

export const figures: FigureRegistry = {
  "test-figure": {
    name: "test-figure",
    src: "/figures/test-figure.svg",
    alt: "Placeholder test figure for packed-smoke hydration spec.",
    caption: "Placeholder test figure exercising FigureRef store binding.",
  },
};
