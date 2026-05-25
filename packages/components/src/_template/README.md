# Component template: copy this directory when adding a new store-backed component

When the AI author (or a human collaborator) adds a new store-backed
component to `@sophie/components`, **copy this `_template/` directory**
to `packages/components/src/components/<ComponentName>/` and customize
it. The gate convention is an authoring affordance, not a thing to
remember from scratch.

## Authoring steps

1. **Copy the directory.** `cp -r _template components/<ComponentName>`.
2. **Rename `Template` → `<ComponentName>`** in both `Template.tsx`
   and `Template.test.tsx`. Rename `lookupX` → `lookup<Something>`
   and replace `template-store.ts` with the real store-lookup module
   (or import the existing one — see `GlossaryTerm/definitions-store.ts`
   for the build-time pedagogy-index pattern).
2.5. **Fix the relative import depth.** The template lives at
   `src/_template/Template.tsx` (one level under `src/`) and imports
   `useHydrated` from `../runtime/useHydrated.ts`. After copying to
   `src/components/<ComponentName>/<ComponentName>.tsx` (two levels
   under `src/`), update that import to `../../runtime/useHydrated.ts`.
   TypeScript will flag it immediately if you forget, but the README
   surfaces it to save the round-trip.
3. **Replace `lookupX` with your actual store-lookup.** Real components
   source data from `virtual:sophie/pedagogy-index` (ADR 0038) or a
   sibling Zustand store — pick the pattern that matches your data
   shape (see "Existing examples" below).
4. **Write the RED test FIRST (TDD).** The two gate tests in
   `Template.test.tsx` are the floor, not the ceiling — keep them and
   add coverage for your component's specific behavior (popover open,
   keyboard activation, miss-fallback, etc.). The
   superpowers `test-driven-development` skill walks the cycle.
5. **Cite ADR 0038 in your component's JSDoc.** The gate convention
   is a structural decision (ADR 0038 Amendment 2); future readers
   need the breadcrumb when they encounter the `useHydrated` call at
   the top of render.

## Why this shape exists

Per **ADR 0038 § A2.2** (`useHydrated` gate) + **§ A2.6**
(`client:load` is mandatory): packed-copy consumers populate the
pedagogy store AFTER island SSR. Without the gate, server-side
emits the bare-children fallback while the client's first render
emits the full tree — same component, two tree shapes → React #418
hydration mismatch (the failure mode PR #172 fixed).

The gate forces SSR + first client render to emit identical
bare-children output regardless of store state. The full tree
appears once `useEffect` flips the gate.

## Vitest + tsup behavior

- **tsup**: `tsup.config.ts` uses an explicit entry map (no glob),
  so the `_template/` directory is automatically excluded from
  `dist/`. Verify with
  `pnpm --filter @sophie/components build && ls dist/` — `_template`
  should NOT appear.
- **vitest**: `Template.test.tsx` runs as a meta-test in the unit
  suite. The mocked `template-store.ts` makes the assertions
  deterministic, so the template's own tests pass without
  customization. Two extra tests in the suite are a worthwhile
  smoke gate on the template itself — a broken template would
  break this file first, before propagating to a real component
  copy-paste.

## Existing examples

- [`GlossaryTerm`](../components/GlossaryTerm/GlossaryTerm.tsx) — first
  PR-C1 consumer of the build-time pedagogy index. The canonical
  reference for the gate + popover + first-use-footnote pattern.
- [`KeyEquation`](../components/KeyEquation) — store-backed equation
  block with KaTeX rendering. Same gate convention; different post-
  mount UI shape.

## References

- [ADR 0038 § A2.2 — The convention: `useHydrated` gate at the top of render](../../../../docs/website/decisions/0038-pedagogy-index-pattern.md#a22--the-convention-usehydrated-gate-at-the-top-of-render)
- [ADR 0038 § A2.6 — `client:load` is mandatory for all five components](../../../../docs/website/decisions/0038-pedagogy-index-pattern.md#a26--clientload-is-mandatory-for-all-five-components)
- [`useHydrated` runtime hook](../runtime/useHydrated.ts)
- PR #172 — the original race-and-fix that established the gate.
