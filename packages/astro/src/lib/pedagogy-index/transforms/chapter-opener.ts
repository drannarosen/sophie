import type { Heading, PhrasingContent, Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Sprint H + Bug 2 follow-up — chapter-opener attribute via remark.
 *
 * Walks markdown headings, finds the FIRST h2 that is not a chrome
 * heading (Concept throughline / Summary / Practice problems /
 * Chapter glossary), and stamps `data-chapter-opener="true"` onto
 * the rendered HTML element via `data.hProperties`.
 *
 * Why this transform exists: the first-attempt Sprint H wrote raw
 * `<h2 data-chapter-opener>...</h2>` JSX wrappers directly in the
 * chapter MDX. That broke Astro's markdown-heading extraction
 * (raw HTML headings are invisible to `headings[]`), removing
 * Part 1 from the in-page ToC. The 2026-05-20 verify pass surfaced
 * the regression. This transform restores the attribute without
 * touching the markdown heading syntax.
 *
 * Identification rule: the FIRST h2 whose text (case-insensitive,
 * trimmed) is not in the chrome list. For the pilot chapter this
 * matches "Kirchhoff's laws: why stars show absorption spectra"
 * (Part 1). Chapters that lack any chrome h2 would mark their
 * literal first h2.
 *
 * The chrome list mirrors the CSS opt-out selector in
 * `textbook-layout.css`. If a future chapter introduces a new
 * chrome heading, add it here AND to the CSS selector together.
 */
const CHROME_HEADING_TEXTS = new Set([
  "concept throughline",
  "summary",
  "practice problems",
  "chapter glossary",
]);

interface HastProperties {
  [key: string]: string | number | boolean | undefined;
}

interface MdastWithHast {
  data?: {
    hProperties?: HastProperties;
  };
}

function stringifyHeadingText(node: Heading): string {
  // mdast heading children are phrasing content (text, emphasis,
  // inlineCode, etc.). For the chrome-match we only need the
  // flattened text; concatenating `value` properties is enough
  // for any case we'll hit in practice (chrome titles are plain
  // text by convention).
  return node.children
    .map((child: PhrasingContent) => {
      if ("value" in child && typeof child.value === "string") {
        return child.value;
      }
      // Recurse one level for em/strong/inlineCode wrappers.
      if ("children" in child && Array.isArray(child.children)) {
        return child.children
          .map((grand) =>
            "value" in grand && typeof grand.value === "string"
              ? grand.value
              : ""
          )
          .join("");
      }
      return "";
    })
    .join("")
    .trim();
}

export function markChapterOpener(tree: Root): void {
  let stamped = false;
  visit(tree, "heading", (node: Heading) => {
    if (stamped) return;
    if (node.depth !== 2) return;
    const text = stringifyHeadingText(node).toLowerCase();
    if (CHROME_HEADING_TEXTS.has(text)) return;
    // First non-chrome h2 found. Attach hProperties.dataChapterOpener
    // so the rendered HTML carries `data-chapter-opener="true"`. The
    // remark→rehype bridge camelCases `dataChapterOpener` back to the
    // dash-case attribute at HTML generation time.
    const withHast = node as Heading & MdastWithHast;
    if (!withHast.data) withHast.data = {};
    if (!withHast.data.hProperties) withHast.data.hProperties = {};
    withHast.data.hProperties.dataChapterOpener = "true";
    stamped = true;
  });
}
