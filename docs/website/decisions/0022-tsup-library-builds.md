---
date: 2026-05-09T00:00:00.000Z
tags:
  - build
  - tsup
  - esbuild
  - library
  - packaging
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-28"
  evidence:
    - kind: deployment
      ref: packages/components/tsup.config.ts
      date: "2026-05-28"
      notes: "Amendment 1 (externalization/bundling policy): `noExternal: ['@observablehq/plot']` bundles Plot (+ its CJS-only transitive `interval-tree-1d`) into the dist at build time, and the `figures/index` entry + `./figures` export isolate Plot to a subpath. Main barrel index.js dropped 759K→195K with zero d3 refs; figures/index.js carries Plot. No consumer needs an optimizeDeps band-aid."
    - kind: test
      ref: examples/packed-smoke/e2e/blackbody-figure-render.spec.ts
      date: "2026-05-28"
      notes: "BlackbodyExplorer renders its Plot SVG in the packed-tarball consumer with ZERO optimizeDeps config — proves the CJS→ESM interop is resolved at the source per Amendment 1."
    - kind: deployment
      ref: packages/core/tsup.config.ts
      date: "2026-05-25"
      notes: "`@sophie/core` ships a tsup config file — the bundler choice this ADR locks is in active force at the schema package boundary."
    - kind: deployment
      ref: packages/components/tsup.config.ts
      date: "2026-05-25"
      notes: "`@sophie/components` ships a tsup config file — the canonical pedagogy-component package builds via tsup."
    - kind: deployment
      ref: packages/theme/tsup.config.ts
      date: "2026-05-25"
      notes: "`@sophie/theme` ships a tsup config file — the design-tokens package builds via tsup, producing ESM + CJS + d.ts."
    - kind: deployment
      ref: packages/cli/tsup.config.ts
      date: "2026-05-25"
      notes: "`@sophie/cli` ships a tsup config file — the CLI package builds via tsup."
    - kind: deployment
      ref: packages/astro/tsup.config.ts
      date: "2026-05-25"
      notes: "`@sophie/astro` ships a tsup config file — even the Astro integration package this ADR called out as a special case builds via tsup (with Astro-aware externals)."
  notes: |
    All five published `@sophie/*` packages ship a `tsup.config.ts` and build
    via tsup. The bundler choice this ADR locks is uniform across the
    package graph; no package has migrated to webpack/rollup/Vite-library
    mode. The "~8 publishable packages" projection in the ADR Context now
    rolls up to 5 shipped packages — schema collapsed into `@sophie/core`;
    other planned packages remain pre-vertical-slice per ADR 0023.
---

# ADR 0022: tsup for `@sophie/*` library package builds

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie ships ~8 publishable packages: `@sophie/schema`,
`@sophie/components`, `@sophie/theme`, `@sophie/audit`,
`@sophie/cli`, `@sophie/renderer-contract`, `@sophie/astro`,
`@sophie/cosmic-playground`. Each needs to be built from TypeScript
source into:

- **ESM output** (modern consumers, tree-shakable).
- **CJS output** (legacy compatibility for tools that haven't
  migrated).
- **`.d.ts` declaration files** (type information for consumers).
- **Source maps** (debugging across the package boundary).

`@sophie/astro` is a special case (Astro integration; bundled
slightly differently per Astro conventions); the others are
classic npm libraries.

A bundler choice for libraries is distinct from the *application*
bundler ([Astro](../decisions/0002-renderer-astro-mdx.md), which
uses Vite under the hood for application code). Library bundling
needs different defaults (preserve module structure, generate
declaration files, dual-format output).

## Decision

**tsup** (built on esbuild) is the bundler for `@sophie/*` library
packages. Configured per-package via `tsup.config.ts`. Produces
ESM + CJS + `.d.ts` outputs in one invocation. Run via Turborepo
([ADR 0014](0014-turborepo-monorepo-orchestration.md)) for caching.

## Rationale

- **Speed.** esbuild-based; builds are sub-second for typical
  packages. Critical for fast Turborepo cache misses.
- **Single config per package.** `tsup.config.ts` declares entry
  points, format (ESM/CJS), declaration generation, externals.
  No webpack-config or rollup-config gymnastics.
- **Dual-format output trivially.** `format: ['esm', 'cjs']` —
  tsup handles dual-package-hazard concerns (correct `package.json`
  `exports` field, separate `.d.ts` for each).
- **Declaration generation built in.** `dts: true` invokes the
  TypeScript compiler for declarations alongside the esbuild bundle;
  one tool, one config.
- **Mature, popular.** Used by tRPC, Vite, t3 stack, many
  mainstream library authors. Stable API, active maintenance.
- **Pairs with pnpm + Turborepo.** Per-package builds cache
  cleanly via Turborepo's content hashing
  ([ADR 0014](0014-turborepo-monorepo-orchestration.md));
  tsup respects pnpm's workspace `peerDependencies` correctly.

## Alternatives considered

- **unbuild** (Nuxt's library bundler). Pros: similar idea; clean
  defaults. Cons: smaller community than tsup; ecosystem leans
  Vue. Rejected — tsup wins on momentum.
- **Rollup directly.** Pros: maximum control; what Astro itself
  uses internally. Cons: rollup-config files become significant
  per-package; declaration generation needs a separate plugin
  invocation. Rejected — tsup wraps rollup-style flexibility with
  esbuild's speed and a smaller config surface.
- **esbuild directly.** Pros: simplest possible. Cons: declaration
  generation is a separate tool invocation; dual-format output
  needs custom orchestration. Rejected — tsup is the small wrapper
  that handles these.
- **Bun's native bundler.** Pros: extremely fast, integrated. Cons:
  Bun is newer; library output compatibility with the Node
  ecosystem still has rough edges. Rejected for v1; revisit when
  `@sophie/cli` considers Bun as a runtime
  ([ADR 0011](0011-pnpm-package-manager.md) defers this).
- **tsc only.** Pros: official TypeScript output. Cons: no bundling;
  separate steps for ESM vs CJS; slower. Rejected.
- **Astro's bundler for everything.** Astro is application-shaped,
  not library-shaped; using it for `@sophie/schema` would be a
  shape mismatch. Rejected.

## Consequences

**Easier:**

- Adding a new `@sophie/*` package is: write source, write a
  `tsup.config.ts`, add to Turborepo pipeline, ship.
- ESM-first with CJS fallback handled correctly without manual
  `package.json exports` engineering.
- Sub-second builds in development; Turborepo caches CI builds.

**Harder:**

- One more config file per package (`tsup.config.ts`). Mitigated
  by a shared base config in `@sophie/internal-tsconfig` (or
  similar) that each package extends.
- Some advanced bundler features (custom resolution, complex
  plugin chains) need switching to Rollup if they ever come up.
  Acceptable trade-off; not yet on the horizon.
- For the Astro integration package (`@sophie/astro`), tsup is
  used but with Astro-aware externals; documented in that
  package's README.

**Triggers:**

- Each `@sophie/*` package ships a `tsup.config.ts` from Phase 0.
- A shared base config in `@sophie/internal-tsconfig` (workspace
  package, not published) provides defaults; per-package configs
  extend.
- Turborepo pipeline runs `tsup` via `pnpm turbo run build
  --filter=@sophie/<package>`.
- `package.json` `exports` field generated by tsup or written
  manually following its dual-format convention.

## Amendments

### Amendment 1 — Externalization/bundling policy + subpath entries for heavy deps (2026-05-28)

**Trigger.** Distributability hardening
([design doc](../../plans/2026-05-28-distributability-design.md);
platform-hardening audit P2.1/P2.3). The original ADR locked tsup as the
bundler but said nothing about *when* a dependency should be externalized
vs bundled. tsup's default — externalize everything in `dependencies` —
exported `@observablehq/plot`'s CJS-interop problem to every consumer:
Plot is ESM but pulls one CJS-only transitive (`interval-tree-1d`), so
each consumer's Vite needed an `optimizeDeps.include` band-aid (duplicated
across packed-smoke + astr201) or the build failed on first plot render.

**Decision (externalization policy).** A `@sophie/*` package's tsup config
externalizes a dependency when it is **peer-shared** (one instance must be
shared with the consumer — React, `react-dom`, `react/jsx-runtime`) or a
**framework boundary** (`@sophie/*`, virtual modules, CSS-module
companions). A dependency that is a **leaf implementation detail** — used
internally, not part of the consumer-facing contract, and especially one
with CJS-interop hazards or heavy transitive weight — is **bundled**
(`noExternal`) so esbuild resolves its interop once at build time and the
dist ships clean ESM. The consumer contract shrinks to "just import it";
no consumer or integration carries bundler-pre-bundling config for it.
`@observablehq/plot` is the first such dependency: bundled via
`noExternal`, moved from `dependencies` to `devDependencies` (it's bundled,
so no consumer installs it).

**Decision (subpath entries for heavy components).** A bundled heavy
dependency must not bloat the main barrel. Components that pull a heavy
dep ship behind a **subpath entry** (a dedicated tsup entry + `exports`
key) so the dependency stays out of the main barrel's module graph — Plot
isolation is structural, not reliant on consumer-side tree-shaking. The
first instance is `@sophie/components/figures` (the `figures/index` entry),
which carries `@observablehq/plot` + d3; `import { MCQ } from
"@sophie/components"` never sees Plot, while `import { BlackbodyExplorer }
from "@sophie/components/figures"` opts in. Sophie's MDX auto-import plugin
maps figure components to the subpath
(`SOPHIE_COMPONENT_IMPORT_SOURCE` in `sophie-auto-imports.ts`) and emits
one grouped import per distinct source. The subpath is also the seam for a
future `@sophie/figures` package extraction without forcing it now.

**Companion.** `"sideEffects": ["**/*.css","*.css"]` added to
`@sophie/components` + `@sophie/theme` `package.json` so CSS-bundling vs
JS-tree-shaking is explicit for distributed consumers. The CSS-module
companion build (`scripts/build-css-modules.ts`) is now entry-aware:
companions for `src/figures/**` modules emit beside the `dist/figures/`
chunk that imports them (esbuild rebases the sibling `./Foo.module.css.js`
import to the consuming chunk's directory).

**Supersedes.** Audit P2.1's `optimizeDeps`-injection half (relocating the
band-aid into the integration) is obsoleted — bundling at the source
removes the need entirely, and helps every consumer, not just Astro ones.
P2.1's `resolve.dedupe: ['react','react-dom']` half is retained and lives
in `defineSophieIntegration`'s vite block (the legitimate React-single-
instance safeguard, ADR 0019-adjacent).

## References

- [tsup documentation](https://tsup.egoist.dev/).
- [esbuild documentation](https://esbuild.github.io/).
- [ADR 0011](0011-pnpm-package-manager.md) — pnpm workspaces tsup
  builds within.
- [ADR 0014](0014-turborepo-monorepo-orchestration.md) — Turborepo
  caches tsup outputs.
- [Roadmap → Phase 0](../status/roadmap.md) — package skeletons
  ship with tsup configured.
