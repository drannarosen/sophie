import { definePreference } from "./define";

/**
 * `sidebarPref` — open/closed state of the left sidebar.
 *
 * Reflects onto `data-sidebar` on `<html>`; the CSS Grid layout in
 * `styles/textbook-layout.css` collapses the sidebar to 0 width when
 * `data-sidebar="closed"`.
 *
 * Sprint K (2026-05-21): default flipped from "open" to "closed" to
 * match the MyST-style "chapter is the content, chrome opens on
 * demand" UX. The viewport-aware boot expression in `<TextbookHead>`
 * is correspondingly simplified — default is "closed" on all
 * viewports. Users who open the sidebar persist that preference via
 * localStorage; the next reload remembers it.
 */
export type SidebarStored = "open" | "closed";

export const sidebarPref = definePreference<SidebarStored>({
  key: "sophie:sidebar",
  attribute: "data-sidebar",
  default: "closed",
  values: ["open", "closed"],
  parse: (raw) => (raw === "open" ? "open" : "closed"),
  serialize: (v) => v,
});
