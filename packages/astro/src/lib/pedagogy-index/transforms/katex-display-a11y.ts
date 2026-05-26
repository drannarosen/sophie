import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * Rehype plugin — stamp keyboard-a11y attributes onto `.katex-display`
 * scroll containers.
 *
 * Why this transform exists. `rehype-katex` emits display equations as
 * `<span class="katex-display">…</span>` (or `<div>` in some versions);
 * the shipped `ChapterLayout` applies `overflow-x: auto` so a wide
 * equation scrolls within its column on narrow viewports. Without
 * `tabindex="0"` + an accessible name on that scroll container, axe
 * reports `scrollable-region-focusable`: keyboard-only users cannot
 * reach the scrolled content. The M2-L2 Surface Flux & Colors pilot
 * confirmed the violation at 375 px on a dense-math chapter
 * (`docs/website/pilots/m2-l2-surface-flux-and-colors.md`, Surprise #2)
 * and it is filed as issue #192.
 *
 * Why a build-time rehype plugin rather than runtime JS: zero
 * hydration-class regression risk (the `useHydrated`-gate family,
 * ADRs 0038/0083/0084, was hardened to avoid post-mount DOM mutations
 * after the React #418 storm). Build-time output is static; the
 * attributes are present on first paint with no flash.
 *
 * Per R10 (AGENTS.md): the scroll container is `role="group"`, not a
 * landmark. KaTeX-display lives inside the chapter's `<main>` landmark
 * and is many-per-page; promoting it to `<section aria-labelledby>` /
 * `role="region"` would pollute the landmark tree. `group` is the
 * correct ARIA role for a named focusable region that isn't landmark-
 * worthy.
 */
const KATEX_DISPLAY_CLASS = "katex-display";

function classListIncludes(className: unknown, needle: string): boolean {
  if (Array.isArray(className)) {
    return className.some((c) => c === needle);
  }
  if (typeof className === "string") {
    return className.split(/\s+/).includes(needle);
  }
  return false;
}

export function rehypeKatexDisplayA11y() {
  return (tree: Root): void => {
    visit(tree, "element", (node: Element) => {
      const className = node.properties?.className;
      if (!classListIncludes(className, KATEX_DISPLAY_CLASS)) return;
      // hast camelCase keys: `tabIndex` → `tabindex`,
      // `ariaLabel` → `aria-label` at HTML-serialize time.
      const properties = node.properties ?? {};
      // Don't clobber author-supplied overrides (KaTeX itself does not
      // set these, but a future upstream change might — preserve their
      // value to keep the plugin idempotent and forward-compatible).
      if (properties.tabIndex === undefined) {
        properties.tabIndex = 0;
      }
      if (properties.role === undefined) {
        properties.role = "group";
      }
      if (properties.ariaLabel === undefined) {
        properties.ariaLabel = "Equation, scrollable";
      }
      node.properties = properties;
    });
  };
}
