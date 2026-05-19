/**
 * MyST plugin: inject a "Forward-looking specification" admonition on
 * every page with `status: future-package-split` frontmatter (ADR 0062).
 *
 * Reads the page-level `status:` field from the source file's raw
 * frontmatter (re-read from disk — `vfile.data.frontmatter` is
 * unreliable at the document stage; the validation-admonition plugin
 * sidesteps the issue by always emitting an admonition with a
 * "missing block" fallback, but we need the actual status value to
 * gate injection). When `status === "future-package-split"`, prepends
 * a `:::{important} Forward-looking specification` admonition to the
 * doc body (after the H1 and after any ADR-metadata + validation
 * admonitions where present).
 *
 * The banner content is static: every `future-package-split` page
 * gets the same prose. Authors who want a customized banner can edit
 * this file; per-page customization is intentionally not supported
 * (the banner exists precisely to give readers a *consistent* visual
 * cue across all forward-looking pages).
 *
 * Honors `SOPHIE_DOCS_INCLUDE_SPEC_BANNERS=0` — when set, the
 * admonition is skipped, parallel to the validation-admonition
 * plugin's SOPHIE_DOCS_INCLUDE_VALIDATION gate.
 *
 * No `@sophie/astro` import: the banner is content-static (no schema
 * parsing, no dynamic data extraction), so the plugin stays
 * self-contained. The trigger is a literal string comparison against
 * the 4-value `PageStatusSchema` from ADR 0062 / @sophie/core.
 */

import { readFileSync } from "node:fs";

const SPEC_BANNER_TITLE = "Forward-looking specification";
const SPEC_BANNER_BODY = [
  "This page describes API, CLI, or contracts that are **design-locked",
  "but not yet shipped** — implementation lands as part of a future",
  "package split (post-Phase-3, per [ADR 0062](/page-status-frontmatter-enum/)).",
  "Reading this page is reading a forward-looking specification, not",
  "documentation of running code.",
].join(" ");

const TRIGGER_STATUS = "future-package-split";

/**
 * Extract the raw page-level `status:` value from the source file's
 * YAML frontmatter. Minimal hand-rolled parser — we only need a
 * top-level scalar key — avoids a gray-matter dependency in this
 * `.mjs` plugin (the docs site doesn't carry gray-matter as a
 * top-level dep, and adding one would require a package.json change
 * just for this single read).
 *
 * Returns the unquoted scalar string or `undefined` when the page has
 * no `status:` key. The 4-value enum check happens at the call site;
 * this helper is intentionally vocabulary-agnostic.
 */
function readStatusFromDisk(filePath) {
  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
  if (!source.startsWith("---")) return undefined;
  const end = source.indexOf("\n---", 3);
  if (end < 0) return undefined;
  const fm = source.slice(3, end);
  // Match a top-level (un-indented) `status:` line. Captures the
  // value after the colon up to end-of-line; strips surrounding
  // quotes if present.
  const match = fm.match(/^status:\s*(.+?)\s*$/m);
  if (!match) return undefined;
  let value = match[1] ?? "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

const specBannerTransform = {
  name: "sophie:spec-banner",
  stage: "document",
  plugin: () => (tree, vfile) => {
    if (process.env.SOPHIE_DOCS_INCLUDE_SPEC_BANNERS === "0") return;

    const filePath = vfile?.path ?? vfile?.history?.[0] ?? "";
    if (!filePath) return;

    const status = readStatusFromDisk(filePath);
    if (status !== TRIGGER_STATUS) return;

    const node = buildSpecBannerNode();

    // MyST wraps document content in a `block` node:
    //   root → block → [admonition? (ADR metadata), admonition? (validation), heading, …content]
    // Inject the spec banner into that block. The banner slots in
    // AFTER the H1 + any existing top-of-doc admonitions (ADR metadata,
    // validation admonition from the sibling plugin) so the three
    // admonitions read top-down: metadata → validation → spec.
    const container = findContentContainer(tree);
    if (container === null) return;
    const insertAt = findInsertIndex(container);
    container.children.splice(insertAt, 0, node);
  },
};

function buildSpecBannerNode() {
  return {
    type: "admonition",
    kind: "important",
    children: [
      {
        type: "admonitionTitle",
        children: [{ type: "text", value: SPEC_BANNER_TITLE }],
      },
      {
        type: "paragraph",
        children: [{ type: "text", value: SPEC_BANNER_BODY }],
      },
    ],
  };
}

function findContentContainer(tree) {
  if (!Array.isArray(tree?.children) || tree.children.length === 0) {
    return null;
  }
  const first = tree.children[0];
  if (first?.type === "block" && Array.isArray(first.children)) {
    return first;
  }
  return tree;
}

function findInsertIndex(container) {
  // Walk past H1 + any existing top-of-doc admonitions (the ADR-metadata
  // block on ADRs + the validation admonition injected by the sibling
  // plugin). Stop at the first content node. Same algorithm as
  // validation-admonition-plugin.mjs so both plugins agree on placement.
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
  name: "Sophie: spec banner for future-package-split pages (ADR 0062)",
  transforms: [specBannerTransform],
};

export default plugin;
