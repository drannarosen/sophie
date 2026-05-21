import { definePreference } from "./define";

/**
 * `rightSidebarPref` — open/closed state of the right column
 * (in-page Table of Contents on desktop).
 *
 * Mirrors `sidebarPref`'s shape: reflects onto `data-toc` on `<html>`;
 * the CSS Grid layout in `styles/textbook-layout.css` collapses the
 * right column to 0 width when `data-toc="closed"`. The Contents
 * toggle button (`<TocToggle>`) drives this preference, parallel to
 * how `<SidebarToggle>` drives `sidebarPref`.
 *
 * Sprint K (2026-05-21): introduced alongside the sidebarPref default
 * flip to match MyST's "chapter is content; chrome opens on demand"
 * UX. Default closed across all viewports; user opens explicitly.
 *
 * Distinct from the EXISTING mobile-only transient drawer in
 * `<TocDrawer>` (per ADR 0036 "transient view state"). The drawer
 * remains a one-shot overlay; this preference is for the *persistent*
 * desktop right column. The two coexist: on mobile, only the drawer
 * shows (CSS hides the right column at <768px regardless); on
 * desktop, the drawer's FAB hides and the persistent column is
 * controlled by this preference.
 */
export type RightSidebarStored = "open" | "closed";

export const rightSidebarPref = definePreference<RightSidebarStored>({
  key: "sophie:toc",
  attribute: "data-toc",
  default: "closed",
  values: ["open", "closed"],
  parse: (raw) => (raw === "open" ? "open" : "closed"),
  serialize: (v) => v,
});
