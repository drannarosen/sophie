import { definePreference } from "./define";

/**
 * `sidebarPref` — open/closed state of the left sidebar.
 *
 * Reflects onto `data-sidebar` on `<html>`; the CSS Grid layout in
 * `styles/textbook-layout.css` collapses the sidebar to 0 width when
 * `data-sidebar="closed"`.
 *
 * The viewport-aware default (mobile-default-closed, desktop-default-
 * open) is injected into the boot script via `defaultExpression` in
 * `<TextbookHead>` — it is NOT baked into the factory because the
 * factory is generic across all chrome preferences.
 */
export type SidebarStored = "open" | "closed";

export const sidebarPref = definePreference<SidebarStored>({
  key: "sophie:sidebar",
  attribute: "data-sidebar",
  default: "open",
  values: ["open", "closed"],
  parse: (raw) => (raw === "closed" ? "closed" : "open"),
  serialize: (v) => v,
});
