# Distributability: source-level Plot bundling + figures subpath entry

**Date:** 2026-05-28
**Branch:** `feat/figures-subpath-plot-bundling`
**Status:** design validated in-thread (Anna), implementing
**ADRs:** amends [0022](../website/decisions/0022-tsup-library-builds.md)
(tsup builds), updates [0021](../website/decisions/0021-observable-plot-data-viz.md)
(Observable Plot); aligned with [0001](../website/decisions/0001-platform-not-monorepo.md)
(standalone platform) and [0084](../website/decisions/0084-packed-smoke-ci-gate.md)
(packed-smoke gate).

## Context

`@sophie/components` ships `@observablehq/plot` as an **externalized**
runtime import. tsup externalizes everything in `dependencies` by
default, and Plot is a `dependency`, so the dist emits a bare
`import … from "@observablehq/plot"`. Plot is itself ESM, but it pulls
one **CJS-only** transitive dependency, `interval-tree-1d@1.0.4`
(`"main": "interval-tree.js"`, no `module`, no `exports`). The first
time a Plot-using component renders, every consumer's Vite chokes on
that CJS link unless it pre-bundles the chain via:

```ts
optimizeDeps: {
  include: [
    "@sophie/components",
    "@sophie/components > @observablehq/plot",
    "@sophie/components > @observablehq/plot > interval-tree-1d",
  ],
}
```

That block was duplicated into `examples/packed-smoke/astro.config.ts`
and the astr201 consumer repo. The platform-hardening audit
(`docs/reviews/2026-05-28-platform-hardening-audit.md`, P2.1) proposed
*hoisting* the block into `defineSophieIntegration`'s vite config —
which relocates the band-aid rather than removing it, and only helps
Astro consumers. The bar for this work: **no hacks or band-aids — fix
the class, not the instance.**

## Root cause (verified)

- `@observablehq/plot@0.6.17`: ESM (`"type": "module"`), deps `d3@7`
  (ESM), `isoformat` (ESM), `interval-tree-1d` (**CJS-only**).
- Externalizing Plot exports its CJS-interop problem to every
  downstream bundler. The contamination is **transitive**, which is
  why a surgical `noExternal: ['interval-tree-1d']` is fragile — it
  reaches through Plot's internal dep path.
- Sole Plot importer in the codebase:
  `packages/components/src/figures/BlackbodyExplorer/BlackbodyExplorer.tsx:1`
  (`import * as Plot from "@observablehq/plot"`). `MultiRep` does **not**
  use Plot.

## Decision — Option 2: two orthogonal layers

### Layer A — clean interop (bundle at the source)

`tsup.config.ts` gains `noExternal: ["@observablehq/plot"]`. esbuild
absorbs Plot + d3 + isoformat + the CJS `interval-tree-1d` at
**component build time**, resolving the CJS→ESM interop once. The dist
becomes self-contained clean ESM; no consumer or integration needs
`optimizeDeps`. Plot moves `dependencies` → `devDependencies` (it's
bundled, so no consumer installs it). This is the standard
well-behaved-package contract: the producer owns its interop, the
consumer just imports.

### Layer B — structural isolation (figures subpath entry)

`noExternal` alone inlines Plot+d3 (~759 KB) into `index.js` because
`splitting: true` only factors out code shared *between* entry points,
and `BlackbodyExplorer` is reachable only from the main `index` entry.
Production tree-shaking *should* drop it for non-figure pages (Sophie's
auto-import emits per-page named imports, and the new `sideEffects`
field marks JS side-effect-free), but relying on a downstream bundler
to tree-shake a 759 KB inlined blob is a hope, not a guarantee — an
unacceptable sharp edge in a platform built for external adoption
(ADR 0001).

So Plot-using figures move behind a **`@sophie/components/figures`
subpath entry**. Plot leaves the main barrel's module graph entirely:
`import { MCQ }` never sees it; `import { BlackbodyExplorer } from
"@sophie/components/figures"` opts in. Isolation is structural, dev
mode stays lean, and the subpath is the exact seam for the future
`@sophie/figures` package extraction (`project_interactive_figure_package.md`)
— **without** doing the extraction now. Standard pattern for heavy,
opt-in pieces (cf. `@mui/material/styles`).

## File-by-file changes

**`packages/components/tsup.config.ts`**
- Add `noExternal: ["@observablehq/plot"]` (done).
- Add tsup entry `"figures/index": "src/figures/index.ts"`.

**`packages/components/package.json`**
- Move `@observablehq/plot` `dependencies` → `devDependencies` (done;
  lockfile already synced).
- Add `"sideEffects": ["**/*.css", "*.css"]` (done).
- Add `"./figures"` to `exports`
  (`types: ./dist/figures/index.d.ts`, `import: ./dist/figures/index.js`).

**`packages/components/src/figures/index.ts`** (new)
- Re-export from `./BlackbodyExplorer/index.ts`: `BlackbodyExplorer`,
  `BlackbodyExplorerProps` (type), `BlackbodyExplorerPropsSchema`,
  `blackbodyExplorerContract`.

**`packages/components/src/index.ts`**
- Remove the `BlackbodyExplorer` re-export block (lines ~410–419);
  replace with a short comment pointing to the `./figures` subpath.

**`packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts`**
- Add a component→source map (`BlackbodyExplorer →
  "@sophie/components/figures"`, default → `"@sophie/components"`).
- Emit one grouped `import { … } from <source>` per distinct source
  (today it merges all into one `@sophie/components` import). Update
  `sophie-auto-imports.test.ts`.

**`packages/theme/package.json`**
- Add `"sideEffects": ["**/*.css", "*.css"]`.

**`packages/astro/src/integration.ts`**
- Add `resolve: { dedupe: ["react", "react-dom"] }` to the vite block
  (sibling of `build:`). React single-instance safeguard — the
  non-band-aid half of audit P2.1. Keep `ssr.noExternal` as-is (Plot
  now rides inside the components bundle during SSR).

**`examples/packed-smoke/astro.config.ts`**
- Delete the `optimizeDeps` block. (astr201's identical block is a
  **follow-up in that repo**, not touched here.)

**`examples/packed-smoke/` fixture + e2e** (the linchpin)
- Add a chapter fixture rendering `<BlackbodyExplorer>` — neither smoke
  example currently renders a Plot component, so without this the
  band-aid removal would be a vacuous green.
- Add an e2e asserting SSR shell + client hydration + axe-clean. Closes
  audit P1.1 (BlackbodyExplorer absent from e2e).

**Docs (same PR — docs-no-drift):**
- Amend ADR 0022: externalization/bundling policy (leaf deps with
  CJS-interop hazards or heavy weight are bundled via `noExternal`, not
  externalized; heavy/optional components ship behind subpath entries).
- Update ADR 0021 `validation:` evidence (Plot: runtime-dep → bundled
  via tsup `noExternal`, declared devDependency, subpath-isolated; the
  Plot *choice* is unchanged).
- Update `docs/reviews/2026-05-28-platform-hardening-audit.md`: P2.1
  optimizeDeps half superseded by source-level bundling; P2.1 dedupe
  half + P2.3 shipped; P1.1 closed by the new e2e.
- Regenerate `docs/website/status/validation.md`
  (`pnpm tsx scripts/regenerate-validation-index.mts`).

## Verification (success criteria)

1. `pnpm turbo run build --filter=@sophie/components` green; inspect
   `dist/`: Plot/d3 present in `dist/figures/index.js`, **absent** from
   `dist/index.js` (main barrel lean again).
2. `pnpm typecheck` + Astro check green (catches any straggler importing
   the four moved names from the main barrel).
3. `pnpm exec biome check` — zero warnings **and** zero errors (grep full
   output, not tail).
4. MyST: `npx mystmd build --html` then `grep -c "⚠"` clean.
5. `pnpm install --frozen-lockfile` passes (Plot dep→devDep already in
   lockfile).
6. **packed-smoke green WITHOUT `optimizeDeps`:** `cd
   examples/packed-smoke && pnpm sync && pnpm build && pnpm test:e2e`,
   running e2e on isolated port **4410** (throwaway Playwright config
   with `reuseExistingServer: false` — a concurrent astr201 `astro dev`
   squats :4321/:4322). The BlackbodyExplorer e2e renders + hydrates +
   axe-clean against the packed tarball consumer.

## Implementation notes (as-built)

Two deltas surfaced during implementation; recorded here so the plan
matches what shipped:

1. **CSS-module companions are now entry-aware.** Moving figure code into
   `dist/figures/index.js` broke `BlackbodyExplorer`'s
   `./BlackbodyExplorer.module.css.js` import — esbuild rebases that
   sibling import to the *consuming chunk's* directory, but
   `scripts/build-css-modules.ts` emitted all companions flat at dist root.
   Fix: companions for `src/figures/**` modules now emit under
   `dist/figures/` (`companionJsPath`). This is a structural fix for the
   whole class (any figures-only CSS module), not a one-off. `BlackbodyExplorer`
   is the first component reachable *only* from a subdir entry; every prior
   component (even `runtime/` ones) lands in the root `dist/index.js` chunk.
2. **packed-smoke e2e asserts render + hydration + zero-error, not axe.**
   packed-smoke has no axe dependency, and adding one would be a new dep
   (HITL) for redundant coverage — `<BlackbodyExplorer>`'s a11y is already
   verified by its component-level `jest-axe` test (R11). The packed-smoke
   e2e's job is the *packaging* proof: the Plot `<svg>` (with a
   physically-correct Wien-peak aria-label) renders in a packed-tarball
   consumer with zero `optimizeDeps`.

Measured result: main `dist/index.js` dropped 759 KB → 195 KB with zero
d3 references; `dist/figures/index.js` (556 KB) carries Plot + d3.

## Out of scope (deferred)

- **astr201 `optimizeDeps` cleanup** — follow-up in the astr201 repo
  after this lands (+ `pnpm sync:sophie`).
- **Full `@sophie/figures` package extraction** — future collaborative
  brainstorm; this PR only cuts the subpath seam.
- **P2.4** (pedagogy-audit → `dist/.sophie/pedagogy-audit.json` +
  `astro:build:done` trigger) — separate ADR-shaped proposal first.
