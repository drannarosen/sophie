import {
  type Anchor,
  computeAsidePositions,
  type PlacementInput,
} from "./compute-placements.ts";

/**
 * Aside positioning — DOM lifecycle adapter.
 *
 * Per the PR 6 design doc (2026-05-13), `<Aside>` renders inline at
 * its MDX position as a `<details>` element. This module installs the
 * client-side docking lifecycle that drives placement:
 *
 *   1. In docked mode (desktop ≥768px AND data-view-mode="default"),
 *      computes absolute `top` values via the pure
 *      `computeAsidePositions` from `./compute-placements.ts` and
 *      applies them, opening each `<details>` imperatively.
 *
 *   2. In inline-fallback mode (mobile OR view-mode=focused|wide),
 *      clears the `top` values so CSS can render asides as inline
 *      collapsed `<details>`.
 *
 * Listeners: `window.resize` (debounced via rAF), a MutationObserver
 * on `<html>` for `data-view-mode`/`data-sidebar` attributes, and a
 * MutationObserver on `.sophie-content` for DOM changes from
 * interactive components. Idempotent via a window-level guard
 * matching the pattern in theme.ts:78 / view-mode.ts.
 *
 * Per ADR 0032 this is vanilla JS, not React.
 */

const GAP = 16;
const DOCK_BREAKPOINT_PX = 768;
const ASIDE_SELECTOR = "[data-sophie-aside]";
const TOC_SELECTOR = ".sophie-toc";

interface InstalledState {
  /** Most-recent applied placements; cached so re-runs can skip work. */
  lastSignature: string;
}

/**
 * Determine whether the current viewport + view-mode permits docking.
 * Mirrors the CSS gate in textbook-layout.css.
 */
function isDockingActive(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < DOCK_BREAKPOINT_PX) return false;
  return document.documentElement.dataset.viewMode === "default";
}

/**
 * Read the ToC's document-coordinate anchor box, or null if absent.
 */
function readTocAnchor(): Anchor | null {
  const toc = document.querySelector<HTMLElement>(TOC_SELECTOR);
  if (!toc) return null;
  return { top: toc.offsetTop, height: toc.offsetHeight };
}

/**
 * Find each aside's anchor element — the immediately-preceding root
 * element. Per the design doc authoring constraint, `<Aside>` is
 * block-level (root-scope MDX); previousElementSibling is well-defined.
 * Falls back to the parent's offsetTop if the aside is the first
 * child of its container (rare).
 */
function readAnchorTop(aside: HTMLElement): number {
  const prev = aside.previousElementSibling as HTMLElement | null;
  if (prev) return prev.offsetTop;
  if (aside.parentElement) return aside.parentElement.offsetTop;
  return 0;
}

/**
 * One-shot reposition: read DOM, compute placements, apply to asides.
 * Called by the lifecycle hooks (resize, mutation, viewModePref change).
 */
function reposition(state: InstalledState): void {
  if (typeof document === "undefined") return;
  const asides = Array.from(
    document.querySelectorAll<HTMLDetailsElement>(ASIDE_SELECTOR)
  );

  if (!isDockingActive()) {
    // Only reset asides on docked→inline TRANSITION (not on every
    // layout event while stably-inline). In stable inline mode the
    // user toggles each <details> open/closed via summary click;
    // clobbering aside.open on every ResizeObserver fire would snap
    // the user's open state back to closed whenever expanding content
    // reflows the page — a feedback loop the MutationObserver alone
    // didn't surface because <details>-expand isn't a structural DOM
    // change. (Surfaced 2026-05-20 when this fix added ResizeObserver
    // and aside.spec.ts:200 "mobile: clicking the summary toggles
    // open/closed" started failing on the second click.)
    if (state.lastSignature !== "inline") {
      for (const aside of asides) {
        aside.style.top = "";
        aside.open = false;
        aside.removeAttribute("data-aside-docked");
      }
      state.lastSignature = "inline";
    }
    return;
  }

  const toc = readTocAnchor();
  const inputs: PlacementInput[] = asides.map((aside) => ({
    anchorTop: readAnchorTop(aside),
    height: aside.offsetHeight,
  }));

  const placements = computeAsidePositions(inputs, toc, GAP);
  const signature = placements.map((p) => p.top).join(",");

  // Skip the DOM writes if nothing actually moved. Avoids feedback
  // loops with the ResizeObserver in the rare case where applying
  // top changes the aside's offsetHeight (it shouldn't, but defensive).
  if (signature === state.lastSignature) return;
  state.lastSignature = signature;

  for (let i = 0; i < asides.length; i++) {
    const aside = asides[i];
    const placement = placements[i];
    const input = inputs[i];
    if (!aside || !placement || !input) continue;
    aside.style.top = `${placement.top}px`;
    // Sprint J — Tufte-style connector: expose the vertical delta
    // between the aside's source position (anchorTop) and its docked
    // position so CSS can render a dashed connector line back to the
    // inline anchor. When delta is 0 (aside lands at its source y),
    // the connector has zero height and is invisible — natural fallback.
    const delta = Math.max(0, placement.top - input.anchorTop);
    aside.style.setProperty("--sophie-aside-anchor-delta", `${delta}px`);
    aside.setAttribute("data-aside-docked", "true");
    aside.open = true;
  }
}

/**
 * Install the docking lifecycle. Idempotent via a window-level guard
 * (matches the pattern in theme.ts:78 / view-mode.ts).
 *
 * Listeners:
 *   - `window.resize` (debounced via rAF)
 *   - MutationObserver on `<html>` for `data-view-mode` /
 *     `data-sidebar` attribute flips
 *   - MutationObserver on `.sophie-content` for DOM structure changes
 *     (added/removed nodes — e.g. interactive component hydration)
 *   - **ResizeObserver on `.sophie-content`** for element-size
 *     changes that don't change DOM structure: font loading (IBM
 *     Plex async-loads, KaTeX em-based math metrics shift), images
 *     that resize after natural-size load, lazy-loaded content. The
 *     MutationObserver misses these because the DOM tree never
 *     mutates — only the rendered heights do. Without this listener,
 *     the cascade computes positions from stale heights and adjacent
 *     docked asides overlap after the post-paint layout shift.
 *   - **`document.fonts.ready`** one-shot: fonts loading async is
 *     the most common height-shift trigger; await the FontFaceSet
 *     ready promise and schedule one explicit reposition so the
 *     cascade catches the font-induced reflow as early as possible
 *     even on browsers whose ResizeObserver coalesces aggressively.
 *
 * Returns a cleanup function that detaches all listeners + resets
 * the guard.
 */
export function installAsidePositioning(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const guard = window as Window & { __sophieAsideDockBound?: boolean };
  if (guard.__sophieAsideDockBound) {
    return () => {};
  }
  guard.__sophieAsideDockBound = true;

  const state: InstalledState = { lastSignature: "" };

  let rafId: number | null = null;
  function scheduleReposition(): void {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      reposition(state);
    });
  }

  // Initial run after layout settles.
  scheduleReposition();

  window.addEventListener("resize", scheduleReposition);

  // View-mode + sidebar changes are signaled via `data-view-mode`
  // and `data-sidebar` attributes on <html>. We can't subscribe to
  // viewModePref directly: Astro bundles each `<script>` tag in a
  // separate module instance, so our copy of `viewModePref` is
  // different from the one ViewModeToggle writes to. The DOM-level
  // signal works regardless of which bundle wrote the attribute.
  let htmlObserver: MutationObserver | null = null;
  if (typeof MutationObserver !== "undefined") {
    htmlObserver = new MutationObserver(scheduleReposition);
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-view-mode", "data-sidebar"],
    });
  }

  let mutationObserver: MutationObserver | null = null;
  let resizeObserver: ResizeObserver | null = null;
  const content = document.querySelector(".sophie-content");
  if (content && typeof MutationObserver !== "undefined") {
    mutationObserver = new MutationObserver(scheduleReposition);
    mutationObserver.observe(content, {
      childList: true,
      subtree: true,
    });
  }

  // ResizeObserver catches element-size changes that don't change DOM
  // structure: font loading, image natural-size load, lazy hydration
  // of inline math (KaTeX em metrics shift when the body font swaps
  // from fallback to IBM Plex Sans). Observing `.sophie-content`
  // bubbles up any descendant resize without needing per-element
  // wiring. Cheap, scoped, and self-cleans when the page unmounts.
  if (content && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(scheduleReposition);
    resizeObserver.observe(content);
  }

  // One-shot fonts-ready trigger. document.fonts.ready resolves once
  // every declared @font-face has either loaded or failed. Schedule a
  // reposition then so the cascade sees post-font-swap heights as soon
  // as possible — most browsers' ResizeObservers coalesce, so this
  // explicit kick avoids a visible mid-page reflow window.
  if (
    typeof document !== "undefined" &&
    typeof (document as Document & { fonts?: FontFaceSet }).fonts !==
      "undefined"
  ) {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(scheduleReposition).catch(() => {
      // Font load failures are not the cascade's concern; ResizeObserver
      // will still catch any layout shift that does occur.
    });
  }

  return () => {
    window.removeEventListener("resize", scheduleReposition);
    if (htmlObserver) {
      htmlObserver.disconnect();
      htmlObserver = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    guard.__sophieAsideDockBound = false;
  };
}
