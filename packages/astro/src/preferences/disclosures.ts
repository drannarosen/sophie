import { definePreference } from "./define";

/**
 * `disclosuresPref` — student-side override that forces every
 * disclosure-style Callout (`<Callout variant="deep-dive">`,
 * `<Callout variant="the-more-you-know">`) to render open.
 *
 *   - `"collapsed"` (default) → disclosures honor their author-
 *     authored default-collapsed state. Students opt-in to depth /
 *     enrichment surfaces one at a time.
 *   - `"expanded"` → CSS overrides `details[open]` on every deep-dive
 *     and the-more-you-know callout so all body content is visible
 *     simultaneously. For students with cognitive accommodations who
 *     prefer everything visible, or for instructors in classroom-
 *     projection mode who want to scan the whole chapter at once.
 *
 * Pattern: minimum-shape `definePreference` (cf. view-mode.ts) — no
 * `resolve` indirection because stored value === attribute value.
 * Pre-paint script in `<TextbookHead>` sets `data-disclosures` on
 * `<html>` before first paint to avoid flash.
 *
 * The toggle button (`<DisclosuresToggle>`) lives in the top bar next
 * to `<ViewModeToggle>` per ADR 0032 (vanilla JS chrome state) + the
 * 2026-05-19 architecture audit P2 #9 recommendation. CSS-only
 * override; the JS surface is just the toggle button + boot script.
 */
export type DisclosuresStored = "collapsed" | "expanded";

export const disclosuresPref = definePreference<DisclosuresStored>({
  key: "sophie:disclosures",
  attribute: "data-disclosures",
  default: "collapsed",
  values: ["collapsed", "expanded"],
  parse: (raw) => (raw === "expanded" ? "expanded" : "collapsed"),
  serialize: (v) => v,
});

/**
 * Toggle the disclosures preference (binary). Used by
 * `<DisclosuresToggle>`'s `bindToggle` call.
 */
export function nextDisclosures(cur: DisclosuresStored): DisclosuresStored {
  return cur === "expanded" ? "collapsed" : "expanded";
}
