import { definePreference } from "./define";

/**
 * `viewModePref` — the textbook's per-chapter layout shape.
 *
 *   - `"default"` → three-column shell (sidebar follows `sidebarPref`,
 *     right column visible, content cap min(75ch, 100%)).
 *   - `"focused"` → both side columns forced hidden via CSS; content
 *     cap relaxes to min(85ch, 100%). `sidebarPref` is NOT touched —
 *     cycling back to `"default"` reveals it in its last state.
 *   - `"wide"`    → same chrome-hiding as `"focused"` with content
 *     cap relaxed further to min(105ch, 100%); intended for
 *     figure-heavy chapters, code-walkthroughs, and classroom
 *     projection.
 *
 * Pattern: per overview.md §18 ("independent toggles") the view-mode
 * preference and the sidebar preference are deliberately
 * non-coordinating. CSS orchestrates the cross-state visual rule
 * (`:root[data-view-mode='focused'|'wide'] .sophie-sidebar { ... }`)
 * without any JavaScript reaching across preferences.
 *
 * This is the canonical "minimum-shape" `definePreference` call:
 * stored value === attribute value, no `resolve` indirection
 * (cf. theme.ts which uses matchMedia, sidebar.ts which uses
 * viewport-default).
 */
export type ViewModeStored = "default" | "focused" | "wide";

export const viewModePref = definePreference<ViewModeStored>({
  key: "sophie:view-mode",
  attribute: "data-view-mode",
  default: "default",
  values: ["default", "focused", "wide"],
  parse: (raw) =>
    raw === "focused" || raw === "wide" || raw === "default" ? raw : "default",
  serialize: (v) => v,
});

/**
 * Cycle order for the `<ViewModeToggle>` button + the keyboard
 * shortcut: default → focused → wide → default. Progressive
 * chrome-removal — each step trades chrome for canvas.
 */
export function nextViewMode(cur: ViewModeStored): ViewModeStored {
  if (cur === "default") return "focused";
  if (cur === "focused") return "wide";
  return "default";
}

/**
 * Returns true when the user is typing in a text-entry surface, so
 * the global `v` shortcut should be ignored. Consults
 * `document.activeElement` (the focus truth), not `event.target` —
 * usually identical but `activeElement` reflects the user's actual
 * editing context if the two ever diverge.
 */
function isTypingInTextSurface(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (el.isContentEditable) return true;
  // `isContentEditable` is the canonical API but JSDOM's coverage is
  // uneven; fall back to walking up the ancestor chain. This also
  // correctly handles the real-browser case where a child element of
  // a `<div contenteditable>` is the focused target.
  return (
    el.closest(
      '[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'
    ) !== null
  );
}

/**
 * Install the global `v` shortcut that cycles `viewModePref` through
 * default → focused → wide → default.
 *
 * Skipped when:
 *   - Any of meta/ctrl/alt is held (don't hijack Cmd+V paste etc.).
 *   - Focus is inside a text-entry surface (input, textarea, select,
 *     or contenteditable) — students typing in a `<Reflection>` or
 *     similar must not have their `v` keypress cycle the layout.
 *
 * Idempotent: a window-level guard (`__sophieViewModeShortcutBound`)
 * ensures the listener is registered at most once per window. Returns
 * a cleanup function that removes the listener and resets the guard.
 *
 * Per ADR 0036, this lives alongside the preference rather than
 * inside the generic factory — keyboard shortcuts are
 * preference-specific UX, not a chrome-state contract.
 */
export function installViewModeKeyboardShortcut(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const guard = window as Window & { __sophieViewModeShortcutBound?: boolean };
  if (guard.__sophieViewModeShortcutBound) {
    return () => {};
  }
  guard.__sophieViewModeShortcutBound = true;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.toLowerCase() !== "v") return;
    if (isTypingInTextSurface()) return;
    viewModePref.write(nextViewMode(viewModePref.read()));
  };

  window.addEventListener("keydown", onKeyDown);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    guard.__sophieViewModeShortcutBound = false;
  };
}
