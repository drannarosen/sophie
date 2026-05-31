/**
 * Home-background theme seam (ADR 0097 #4).
 *
 * The course-home background is resolved through a single registry keyed
 * by a theme id. Today the registry has exactly one entry — `"starfield"`
 * (the Deep Field aesthetic) — used as the default when no/unknown id is
 * given. This is the SoTA shape (no hardwired background) with W2-minimal
 * code (one implementation, no speculative themes).
 *
 * **The resolver is the single swap point.** Adding a second theme is a
 * registry-entry addition here — never a signature change in
 * `HomeBackground.astro` or its callers. A future palette/multi-theme ADR
 * extends `BackgroundDescriptor` + this registry, not the shell.
 */

/** The kinds of background a theme can render. One member today. */
export type BackgroundKind = "starfield";

/** What `HomeBackground.astro` needs to render a resolved background. */
export interface BackgroundDescriptor {
  /** Stable theme id (registry key). */
  readonly id: string;
  /** Which renderer the shell switches on. */
  readonly kind: BackgroundKind;
}

/** The default theme id, used for absent/unknown ids. */
export const DEFAULT_HOME_BACKGROUND = "starfield";

const STARFIELD: BackgroundDescriptor = { id: "starfield", kind: "starfield" };

/**
 * The registry: theme id → descriptor. Exactly one entry now. Add a
 * second theme by adding a key here — no other file changes.
 */
const HOME_BACKGROUNDS: Readonly<Record<string, BackgroundDescriptor>> = {
  [DEFAULT_HOME_BACKGROUND]: STARFIELD,
};

/**
 * Resolve a theme id to its background descriptor. Unknown or absent ids
 * fall back to {@link DEFAULT_HOME_BACKGROUND} (`starfield`), so the home
 * always has a background. Never throws.
 */
export function resolveHomeBackground(themeId?: string): BackgroundDescriptor {
  const id = themeId ?? DEFAULT_HOME_BACKGROUND;
  // `?? STARFIELD` is the default-fallback (the registry's default entry
  // IS `STARFIELD`); it also satisfies `noUncheckedIndexedAccess`.
  return HOME_BACKGROUNDS[id] ?? STARFIELD;
}
