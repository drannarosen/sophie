import type { FigureUsageEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "../../runtime/pedagogy-store.ts";

/**
 * Figure-usages store. Per ADR 0038 + PR-C3 decisions #3 (two-tier
 * figures) and #6 (canonical resolution).
 *
 * Two access patterns are needed:
 *
 *   1. `lookupFigureUsage(key)` — exact lookup by composite key
 *      `${chapter}#${name}`. Backed by the shared
 *      `createPedagogyStore` factory; supports SSR setter +
 *      script-tag auto-hydration like the other pedagogy stores.
 *
 *   2. `lookupCanonicalUsageByName(name)` — "give me the canonical
 *      usage for this name regardless of chapter". Used by
 *      `<FigureRef name="X" />` to resolve the anchor + Fig.
 *      number. The factory's key-based Map can't answer this
 *      directly (the key includes `chapter`), so we keep a parallel
 *      module-level snapshot of the full usages array and iterate
 *      it on demand.
 *
 * Auto-hydrate parity (design decision): the parallel `allUsages`
 * snapshot is populated by `__setFigureUsages` (SSR path) AND by a
 * dedicated `hydrateAllUsagesFromScriptTagIfPresent` fallback
 * inside `lookupCanonicalUsageByName` (client-only first-lookup
 * path) — mirroring the factory's own script-tag hydration so the
 * two data shapes stay in lockstep on pages where no SSR setter
 * ran. The factory still owns the `byKey` Map; we only mirror the
 * raw entries here.
 */
const store = createPedagogyStore<FigureUsageEntry>({
  scriptId: "sophie-pedagogy-figure-usages",
  logTag: "[FigureRef:usages]",
  keyOf: (u) => `${u.chapter}#${u.name}`,
});

let allUsages: ReadonlyArray<FigureUsageEntry> = [];
let allUsagesHydratedFromScript = false;

function hydrateAllUsagesFromScriptTagIfPresent(): void {
  if (allUsagesHydratedFromScript) return;
  if (typeof document === "undefined") return; // SSR — client-only
  const el = document.getElementById("sophie-pedagogy-figure-usages");
  const raw = el?.textContent;
  if (!raw) {
    allUsagesHydratedFromScript = true;
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new TypeError(`Expected an array; got ${typeof parsed}`);
    }
    allUsages = parsed as ReadonlyArray<FigureUsageEntry>;
  } catch (err) {
    if (
      typeof process === "undefined" ||
      process.env?.NODE_ENV !== "production"
    ) {
      console.error(
        "[FigureRef:usages] Failed to parse `sophie-pedagogy-figure-usages` script payload; canonical lookups will return undefined for this page.",
        err
      );
    }
  }
  allUsagesHydratedFromScript = true;
}

export function __setFigureUsages(
  entries: ReadonlyArray<FigureUsageEntry>
): void {
  // Explicit setter wins over later auto-hydration; matches the
  // factory's own behavior so the parallel snapshot stays in sync.
  allUsages = entries;
  allUsagesHydratedFromScript = true;
  store.set(entries);
}

/** Composite-key lookup, `${chapter}#${name}`. */
export const lookupFigureUsage = store.lookup;

/**
 * Returns the canonical usage for a figure name. Prefers the
 * explicit-canonical entry; falls back to the first usage by
 * `(chapter, number)` ascending. Returns `undefined` if no usage
 * matches the name.
 */
export function lookupCanonicalUsageByName(
  name: string
): FigureUsageEntry | undefined {
  hydrateAllUsagesFromScriptTagIfPresent();
  const matches = allUsages.filter((u) => u.name === name);
  if (matches.length === 0) return undefined;
  return (
    matches.find((u) => u.canonical) ??
    [...matches].sort((a, b) =>
      a.chapter === b.chapter
        ? a.number - b.number
        : a.chapter.localeCompare(b.chapter)
    )[0]
  );
}
