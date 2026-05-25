/**
 * Placeholder store-lookup stub for the component template.
 *
 * **Replace this file when you copy `_template/`.** Real store-backed
 * components (e.g. `GlossaryTerm/definitions-store.ts`) source their
 * data from the build-time pedagogy index (ADR 0038) via a virtual
 * Vite module (`virtual:sophie/pedagogy-index`) — see
 * `components/GlossaryTerm/definitions-store.ts` for the canonical
 * pattern.
 *
 * This stub exists only so `Template.tsx`'s `import` resolves and
 * the test file's `vi.mock(...)` has a real module to intercept.
 */

export interface TemplateEntry {
  /** Display name. */
  name: string;
  /** Destination route. */
  href: string;
}

export function lookupX(_name: string): TemplateEntry | undefined {
  // Real components would consult a store/index here. The template
  // returns `undefined` so the miss-path branch is exercised by
  // default; the test file mocks this to return a fixture entry.
  return undefined;
}
