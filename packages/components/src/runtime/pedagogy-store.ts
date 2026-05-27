/**
 * Factory that produces the SSR→CSR-aware role-store shape used by
 * `<GlossaryTerm>`, `<EquationRef>`, `<FigureRef>` (and future inline-ref
 * components). Each role's store is a typed instance with:
 *
 *   - `set(entries)`: SSR-side setter (called by TextbookLayout)
 *   - `lookup(key)`: client-side lookup; auto-hydrates from a
 *     `<script id="...">` JSON payload on first call when no SSR
 *     setter ran
 *
 * Per ADR 0038 Revisions section: each role gets its own `<script>` tag
 * id; data flows server → __set*() OR script-tag-on-first-lookup →
 * client.
 *
 * Why a setter instead of a direct virtual-module import: the
 * `virtual:` protocol is a Vite-only convention. If
 * `@sophie/components` statically imported `virtual:sophie/...` it
 * would surface in `dist/index.js`, and any consumer that does a
 * bare-Node import (e.g. Astro's config loader) would hit
 * `ERR_UNKNOWN_URL_SCHEME` at runtime. Keeping the virtual import
 * behind the setter, in the Vite-aware @sophie/astro layer, isolates
 * the protocol coupling.
 *
 * Extracts the boilerplate that PR-C1's `definitions-store` and
 * PR-C2's `equations-store` duplicated verbatim. PR-C3 (decision #4)
 * migrates both to use this factory.
 */

export interface PedagogyStoreOptions<T> {
  /** DOM id of the SSR-emitted <script type="application/json"> tag. */
  scriptId: string;
  /** Tag prefix for dev-only console.error logs. e.g. "[EquationRef]" or "[FigureRef:registry]". */
  logTag: string;
  /** Function that returns the lookup key for an entry (typically the slug or name). */
  keyOf: (entry: T) => string;
  /**
   * How `set()` handles two entries that produce the same `keyOf` key.
   * Defaults to `"last-write-wins"` — the historical behavior, and
   * correct for most stores, whose `keyOf` is legitimately non-unique:
   * artifacts share a unit id across view-kinds (reading/practice/
   * slides), per-callsite USAGE stores share `unit#name` across
   * citations, and definitions/objectives recur by `slug`/`anchor`
   * across chapters (deliberate cross-chapter reinforcement), with
   * canonical resolution reading the parallel array snapshot. A store
   * opts into `"throw"` only when its key is globally unique by
   * contract AND a collision means an authoring mistake worth failing
   * the build — currently just the figure registry (`name`), where a
   * duplicate figure name silently overwrites asset metadata.
   */
  onDuplicateKey?: "throw" | "last-write-wins";
}

export interface PedagogyStore<T> {
  /** SSR setter: populate from server-side index. Suppresses later auto-hydration. */
  set: (entries: ReadonlyArray<T>) => void;
  /** Client-side lookup. Auto-hydrates from the script tag on first call when no setter ran. */
  lookup: (key: string) => T | undefined;
  /**
   * Iterate the full collection. Auto-hydrates from the script tag on
   * first call when no setter ran (mirrors `lookup`). Returns a stable
   * frozen array snapshot — callers can `.filter` / `.map` without
   * affecting the store. Added in Wedge B-followup (W1) for
   * `<SpacedReview section=…>`'s Unit enumeration; Cockpit (ADR 0076)
   * is the committed second caller.
   */
  all: () => ReadonlyArray<T>;
}

export function createPedagogyStore<T>(
  opts: PedagogyStoreOptions<T>
): PedagogyStore<T> {
  let byKey: Map<string, T> = new Map();
  let hydratedFromScript = false;

  function hydrateFromScriptTagIfPresent(): void {
    if (hydratedFromScript) return;
    if (typeof document === "undefined") return; // SSR — script-tag path is client-only
    const el = document.getElementById(opts.scriptId);
    const raw = el?.textContent;
    if (!raw) {
      hydratedFromScript = true;
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new TypeError(`Expected an array; got ${typeof parsed}`);
      }
      const entries = parsed as ReadonlyArray<T>;
      byKey = new Map(entries.map((e) => [opts.keyOf(e), e]));
    } catch (err) {
      // Malformed payload; leave the map as-is + surface the error
      // to the dev console so the build-vs-runtime mismatch is
      // debuggable. Silent in production.
      if (
        typeof process === "undefined" ||
        process.env?.NODE_ENV !== "production"
      ) {
        console.error(
          `${opts.logTag} Failed to parse \`${opts.scriptId}\` script payload; lookups will return undefined for this page.`,
          err
        );
      }
    }
    hydratedFromScript = true;
  }

  return {
    set(entries) {
      // Explicit setter wins; suppress later auto-hydration so a
      // test or future consumer can override the script-tag payload.
      hydratedFromScript = true;
      const throwOnDuplicate = opts.onDuplicateKey === "throw";
      const next = new Map<string, T>();
      for (const e of entries) {
        const key = opts.keyOf(e);
        if (throwOnDuplicate && next.has(key)) {
          throw new Error(
            `${opts.logTag} duplicate key "${key}" in set(). If this key is ` +
              `intentionally non-unique, set onDuplicateKey: "last-write-wins".`
          );
        }
        next.set(key, e);
      }
      byKey = next;
    },
    lookup(key) {
      hydrateFromScriptTagIfPresent();
      return byKey.get(key);
    },
    all() {
      hydrateFromScriptTagIfPresent();
      return Array.from(byKey.values());
    },
  };
}
