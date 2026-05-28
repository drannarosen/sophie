// `@sophie/components/figures` — subpath entry for Plot-using interactive
// figures. Kept OUT of the main barrel (`src/index.ts`) so @observablehq/plot
// + d3 (bundled via tsup `noExternal`, ~759 KB) never enter the main module
// graph: `import { MCQ } from "@sophie/components"` stays Plot-free, while
// `import { BlackbodyExplorer } from "@sophie/components/figures"` opts in.
// Structural isolation, not tree-shaking-dependent — and the seam for the
// future @sophie/figures package. See ADR 0021 + ADR 0022 amendment and
// docs/plans/2026-05-28-distributability-design.md.
export {
  BlackbodyExplorer,
  type BlackbodyExplorerProps,
  BlackbodyExplorerPropsSchema,
  blackbodyExplorerContract,
} from "./BlackbodyExplorer/index.ts";
