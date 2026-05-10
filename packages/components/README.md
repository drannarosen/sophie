# @sophie/components

Sophie's framework-pure React components and persistence runtime.
Per [ADR 0001](../../docs/website/decisions/0001-platform-not-monorepo.md),
this package imports React, Zod, idb, and `@sophie/*` only — never
`astro:*` or `@astrojs/*`. Biome enforces the rule.

## Public surface

| Subpath | What it exports |
| --- | --- |
| `@sophie/components` | barrel — `<Callout>`, `<InteractiveCallout>`, `<Figure>`, `useInteractive`, contracts, schemas |
| `@sophie/components/contract` | `ComponentContract`, `SerializedNode`, `AuditFinding` |
| `@sophie/components/runtime` | `useInteractive`, `IndexedDBResponseStore`, `BroadcastChannelLayer`, `ProfileProvider`, `FigureRegistry` types |
| `@sophie/components/styles.css` | Bundled component stylesheet (side-effect-imported once by `@sophie/astro`'s `<SophieChapter>`) |

## Quick example

```tsx
// In MDX (or JSX) — static use; resolved through the components map
// passed to <Content components={makeStaticComponents({figures})}>.
<Callout variant="tip" title="Heads up">Body</Callout>
<Figure name="three-big-questions" />

// Persistence-bearing variant — must be imported per-MDX file and used
// with `client:load` so each instance is its own React island.
import { InteractiveCallout } from "@sophie/components";

<InteractiveCallout
  client:load
  course="astr201"
  chapter="spoiler-alerts"
  id="check-yourself-1"
  variant="tip"
>
  Mark this once you've finished the warm-up.
</InteractiveCallout>
```

## Persistence runtime

`useInteractive(course, chapter, componentKey, initial)` returns
`{ value, setValue, status, error }`. State is persisted to a
**per-course IndexedDB** (`sophie-${course}`) keyed by
`${profile}:${chapter}:${componentKey}`. Cross-tab sync via
`BroadcastChannel`, one channel per chapter (`sophie-${course}:${chapter}`).

`profile` is read from `<ProfileProvider>`; default `"student"`.
`SyncedResponseStore` interface is defined as the v3 server-sync seam
but not implemented in Phase 0.

**Why props instead of context for `course`/`chapter`:** per
[ADR 0027](../../docs/website/decisions/0027-mdx-render-boundary-prop-threading.md),
Astro 6 + MDX renders MDX content as Astro server-side; React
components inside MDX get isolated SSR passes that don't see context
providers from any `<SophieChapter client:load>` parent. Threading via
props is the only working pattern.

## Static / interactive split

| Component | Persistence | Hydration | Course/chapter source |
| --- | --- | --- | --- |
| `<Callout>` | none | none (static SSR) | n/a |
| `<InteractiveCallout>` | IndexedDB + BroadcastChannel | required (`client:load`) | props |
| `<Figure>` | none | none | `registry` prop or via `makeStaticComponents` map |

Phase 1's drannarosen/astr201 will likely motivate a custom MDX wrapper
or remark plugin that auto-injects `client:load` and the course/chapter
props on `<Interactive*>` JSX names — until then, MDX authors include
the directive at each call site.

## CSS Modules build pipeline

[ADR 0005](../../docs/website/decisions/0005-theming-three-layers.md)
locks CSS Modules for component styling. The build script
([scripts/build-css-modules.ts](scripts/build-css-modules.ts)):

1. Scans `src/**/*.module.css`.
2. Mangles class names via `postcss-modules`.
3. Emits `dist/**/*.module.css` (mangled, kept as a debug artifact)
   plus `dist/Foo.module.css.js` companions at dist root (default-export
   the class-name map; **no side-effect CSS import**).
4. Concatenates every mangled CSS into a single `dist/styles.css`,
   which `@sophie/astro`'s `<SophieChapter>` side-effect-imports once
   alongside theme.css and katex.css.

The dist-root location for `.module.css.js` companions matches the
relative paths used by tsup-bundled `dist/index.js`. The single
bundled stylesheet pattern (vs. per-component side-effect imports) was
adopted in step-7 review after the per-component approach broke
Astro's Vite-SSR config-loader (it can't resolve `.css` through plain
Node ESM).

## Test stack

Tests live next to source (`*.test.ts(x)`). Vitest (jsdom env) +
`@testing-library/react` + `jest-axe` (axe-core a11y assertions) +
`fake-indexeddb` (in-memory IDB). Runner wired in Phase 0 step 8.

## Phase 0 scope

- Components: `<Callout>`, `<InteractiveCallout>`, `<Figure>`. The
  other ~14 v1 components arrive in Phase 1.
- ComponentContract: `serialize`, `audit`, `containedIn`,
  `forbidsContaining` are declared on each contract but Phase 0 ships
  stubs only. Real semantics are Phase 3 (alongside Tier 1 / Tier 2
  audit checks).
- Persistence: full IndexedDB + BroadcastChannel wired end-to-end.
  `SyncedResponseStore` is interface-only.

## Deferred (later phases)

- 14 remaining v1 components (Phase 1).
- Radix UI primitives (Phase 1+).
- CodeMirror 6 / Pyodide / `<CodeCell>` (Phase 3).
- `<Demo>` / Cosmic Playground iframe (Phase 1+).
- Storybook isolation (Phase 1).
- `astro:assets`-aware figure component (Phase 1, in `@sophie/astro`).
- Real `serialize` / `audit` / composition enforcement (Phase 3).
- `SyncedResponseStore` server implementation (v3).
- Schema-versioned persisted-value migration in `useInteractive` per
  ADR 0007 (Phase 1+ when the first non-boolean state ships).
