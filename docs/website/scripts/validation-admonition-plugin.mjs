/**
 * MyST plugin: inject the per-contract validation admonition (ADR 0056).
 *
 * Reads the `validation:` frontmatter block on every ADR + reference
 * doc, derives the most recent Revisions-section date, and prepends
 * a `:::{admonition} Validation` node to the doc body (after the H1
 * and after the ADR-metadata admonition where present).
 *
 * Honors `SOPHIE_DOCS_INCLUDE_VALIDATION=0` — when set, the admonition
 * is skipped, matching the private-build gate (Decision 7).
 *
 * The renderer + AST builder live in `@sophie/astro` so the same
 * source-of-truth covers both this MyST plugin and the Sophie-hosted
 * future (ADR 0010: MyST is transitional → Sophie-hosted later).
 */

import { readFileSync } from "node:fs";
// Relative path import: docs/website is not a pnpm workspace package
// (and doesn't carry a package.json), so it can't resolve "@sophie/astro"
// from node_modules. The compiled bundle lives at a stable workspace
// path; the docs build runs after @sophie/astro:build per the
// turbo dependency graph, so dist/ is always populated by build time.
// When docs/website graduates to a workspace package, switch back to
// the bare "@sophie/astro" import.
import {
  buildValidationAdmonitionNode,
  extractLastRevisedDate,
  isContractFile,
  parseValidationFrontmatter,
} from "../../../packages/astro/dist/index.js";

const validationAdmonitionTransform = {
  name: "sophie:validation-admonition",
  stage: "document",
  plugin: () => (tree, vfile) => {
    const filePath = vfile?.path ?? vfile?.history?.[0] ?? "";
    if (!isContractFile(filePath)) return;

    const frontmatter = vfile?.data?.frontmatter ?? {};
    // Run the raw frontmatter through ValidationSchema.safeParse so
    // Date objects (from gray-matter's auto-parse of unquoted ISO dates),
    // unknown status values, and other malformed shapes never reach the
    // renderer. On parse failure, fall back to the unvalidated UI so
    // authors see a clear "something is off" signal — V0 surfaces the
    // exact parse error via the extractor's audit pipeline.
    const validation = parseValidationFrontmatter(frontmatter.validation);

    // Re-read the source from disk to extract the Revisions-section
    // date. MyST does not preserve the original markdown on the vfile
    // after parsing, so a disk read is required. Files are small
    // (~10–200 lines); the cost is negligible.
    let lastRevisedDate = null;
    try {
      const source = readFileSync(filePath, "utf8");
      lastRevisedDate = extractLastRevisedDate(source);
    } catch {
      // Source unavailable (synthetic file or test harness); fall
      // back to null (no staleness signal). The block still renders.
      lastRevisedDate = null;
    }

    const node = buildValidationAdmonitionNode({
      validation,
      lastRevisedDate,
    });
    if (node === null) return;

    // MyST wraps document content in a `block` node:
    //   root → block → [admonition? (ADR metadata), heading, …content]
    // Inject the validation admonition into that block. For ADRs, the
    // first child is the ADR-metadata admonition; the validation
    // admonition slots in immediately *after* the metadata so both
    // surfaces appear at the top of the page in source order. For
    // reference docs (no metadata block), the validation admonition
    // becomes the first child.
    const container = findContentContainer(tree);
    if (container === null) return;
    const insertAt = findInsertIndex(container);
    container.children.splice(insertAt, 0, node);
  },
};

function findContentContainer(tree) {
  if (!Array.isArray(tree?.children) || tree.children.length === 0) {
    return null;
  }
  // MyST wraps each parsed page in a `block` root child. If the first
  // child is a block, descend into it; otherwise treat the root as the
  // container directly.
  const first = tree.children[0];
  if (first?.type === "block" && Array.isArray(first.children)) {
    return first;
  }
  return tree;
}

function findInsertIndex(container) {
  // Walk past H1 + any existing top-of-doc admonition (the ADR-metadata
  // block on ADRs). Stop at the first content node.
  let i = 0;
  while (i < container.children.length) {
    const node = container.children[i];
    if (node?.type === "heading" && node.depth === 1) {
      i += 1;
      continue;
    }
    if (node?.type === "admonition") {
      i += 1;
      continue;
    }
    break;
  }
  return i;
}

const plugin = {
  name: "Sophie: validation admonition (ADR 0056)",
  transforms: [validationAdmonitionTransform],
};

export default plugin;
