import type { EquationCitationEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "../../runtime/pedagogy-store.ts";

/**
 * Equation-citations store (Sprint E). Per-callsite records emitted by
 * `extractEquationCitations` — one entry per `<KeyEquation refId="...">`
 * appearance in a chapter. Drives the margin-gutter "(C.N)" label on
 * KeyEquation and the "Eq. C.N" label on EquationRef.
 *
 * Two access patterns mirror the figure-usages-store contract:
 *   1. `lookupEquationCitation("chapter#refId")` — exact lookup when
 *      the caller knows both. Used by KeyEquation (it knows its
 *      refId; chapter context comes from a wrapper or the canonical
 *      lookup fallback).
 *   2. `lookupCanonicalCitationByRefId(refId)` — "give me any
 *      citation for this equation, preferring the lowest chapter
 *      number". Used by EquationRef which has only the refId.
 *
 * Auto-hydrate parity: the parallel `allCitations` snapshot is
 * populated by `__setEquationCitations` (SSR path) AND by a dedicated
 * `hydrateAllCitationsFromScriptTagIfPresent` fallback inside
 * `lookupCanonicalCitationByRefId` (client-only first-lookup path) —
 * mirroring the factory's own script-tag hydration.
 */
const store = createPedagogyStore<EquationCitationEntry>({
  scriptId: "sophie-pedagogy-equation-citations",
  logTag: "[EquationRef:citations]",
  keyOf: (c) => `${c.chapter}#${c.refId}`,
});

let allCitations: ReadonlyArray<EquationCitationEntry> = [];
let allCitationsHydratedFromScript = false;

function hydrateAllCitationsFromScriptTagIfPresent(): void {
  if (allCitationsHydratedFromScript) return;
  if (typeof document === "undefined") return;
  const el = document.getElementById("sophie-pedagogy-equation-citations");
  const raw = el?.textContent;
  if (!raw) {
    allCitationsHydratedFromScript = true;
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new TypeError(`Expected an array; got ${typeof parsed}`);
    }
    allCitations = parsed as ReadonlyArray<EquationCitationEntry>;
  } catch (err) {
    if (
      typeof process === "undefined" ||
      process.env?.NODE_ENV !== "production"
    ) {
      console.error(
        "[EquationRef:citations] Failed to parse `sophie-pedagogy-equation-citations` script payload; canonical lookups will return undefined for this page.",
        err
      );
    }
  }
  allCitationsHydratedFromScript = true;
}

export function __setEquationCitations(
  entries: ReadonlyArray<EquationCitationEntry>
): void {
  allCitations = entries;
  allCitationsHydratedFromScript = true;
  store.set(entries);
}

/** Composite-key lookup, `${chapter}#${refId}`. */
export const lookupEquationCitation = store.lookup;

/**
 * Returns a canonical citation for an equation refId, preferring the
 * lowest chapter number when the equation is cited in multiple
 * chapters. Returns `undefined` if no citation matches the refId.
 */
export function lookupCanonicalCitationByRefId(
  refId: string
): EquationCitationEntry | undefined {
  hydrateAllCitationsFromScriptTagIfPresent();
  const matches = allCitations.filter((c) => c.refId === refId);
  if (matches.length === 0) return undefined;
  return [...matches].sort((a, b) => {
    const an = a.chapterNumber ?? Number.POSITIVE_INFINITY;
    const bn = b.chapterNumber ?? Number.POSITIVE_INFINITY;
    if (an !== bn) return an - bn;
    return a.number - b.number;
  })[0];
}
