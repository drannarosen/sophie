import { definePreference } from "./define";

/**
 * `themePref` — light/dark theme with three stored values:
 *
 *   - "system" → resolves to the OS preference at boot AND on every
 *     subsequent prefers-color-scheme change while stored stays
 *     "system" (via `installSystemThemeListener`).
 *   - "light"  → forces data-theme="light", ignores OS changes.
 *   - "dark"   → forces data-theme="dark",  ignores OS changes.
 *
 * Default is "system" — overview.md §15 ("no inequitable normative
 * affordance"): system is first-class, not an opt-out.
 *
 * The CSS layer (per ADR 0005) reads `data-theme` directly; this
 * module only writes the attribute.
 */
export type ThemeStored = "system" | "light" | "dark";
export type ThemeAttr = "light" | "dark";

/**
 * Cycle order for the `<ThemeToggle>` button: system → light → dark.
 * Wraps back to "system" after "dark".
 */
export function nextTheme(current: ThemeStored): ThemeStored {
  if (current === "system") return "light";
  if (current === "light") return "dark";
  return "system";
}

export function systemTheme(): ThemeAttr {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export const themePref = definePreference<ThemeStored, ThemeAttr>({
  key: "sophie:theme",
  attribute: "data-theme",
  default: "system",
  values: ["system", "light", "dark"],
  parse: (raw) =>
    raw === "light" || raw === "dark" || raw === "system" ? raw : "system",
  serialize: (v) => v,
  resolve: (stored) => (stored === "system" ? systemTheme() : stored),
  // Boot-time equivalent of `resolve`, expressed as JS source so it
  // runs inside the is:inline IIFE in <TextbookHead> before paint.
  resolveExpression:
    "(stored === 'system' " +
    "? (window.matchMedia && " +
    "window.matchMedia('(prefers-color-scheme: dark)').matches " +
    "? 'dark' : 'light') " +
    ": stored)",
});

/**
 * Subscribe to OS-level prefers-color-scheme changes and re-apply
 * `data-theme` whenever the stored value is "system". Explicit
 * "light"/"dark" choices override and silence this listener.
 *
 * Idempotent via a window-level guard (matching PR 1's
 * `__sophieSidebarStorageBound` pattern). Returns a cleanup function.
 */
export function installSystemThemeListener(): () => void {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {};
  }
  const guard = window as Window & { __sophieThemeMqlBound?: boolean };
  if (guard.__sophieThemeMqlBound) {
    return () => {};
  }
  guard.__sophieThemeMqlBound = true;

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = (event: MediaQueryListEvent | { matches: boolean }) => {
    if (themePref.read() !== "system") return;
    document.documentElement.setAttribute(
      "data-theme",
      event.matches ? "dark" : "light"
    );
  };
  mql.addEventListener("change", onChange);

  return () => {
    mql.removeEventListener("change", onChange);
    guard.__sophieThemeMqlBound = false;
  };
}
