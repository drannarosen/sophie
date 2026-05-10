# @sophie/components

Sophie's framework-pure React components and persistence runtime.
Per [ADR 0001](../../docs/website/decisions/0001-platform-not-monorepo.md),
this package imports React, Zod, idb, and `@sophie/*` only — never
`astro:*` or `@astrojs/*`. Biome enforces the rule.

## Public surface

| Subpath | What it exports |
| --- | --- |
| `@sophie/components` | barrel — `Callout`, `Figure`, `useInteractive`, contexts |
| `@sophie/components/contract` | `ComponentContract`, `SerializedNode`, `AuditFinding` |
| `@sophie/components/runtime` | `useInteractive`, `IndexedDBResponseStore`, `BroadcastChannelLayer`, `SophieConfigProvider`, `ProfileContext`, `FigureRegistryProvider` |
| `@sophie/components/Callout` | `<Callout>` + contract |
| `@sophie/components/Figure` | `<Figure>` + contract |

## Quick example

```tsx
import { Callout, Figure, useInteractive } from "@sophie/components";

// In an Astro layout (set by @sophie/astro per chapter render):
<SophieConfigProvider course="astr201" chapter="spoiler-alerts">
  <ProfileContext.Provider value="student">
    <FigureRegistryProvider value={chapter.figures}>
      <Callout variant="tip" id="warmup" interactive>
        Mark this once you've finished the warm-up.
      </Callout>
      <Figure name="three-big-questions" />
    </FigureRegistryProvider>
  </ProfileContext.Provider>
</SophieConfigProvider>
```

## Persistence runtime

`useInteractive(key, initial)` returns
`{ value, setValue, status, error }`. State is persisted to a
**per-course IndexedDB** (`sophie-${course}`) keyed by
`${profile}:${chapter}:${componentKey}`. Cross-tab sync via
`BroadcastChannel`, one channel per chapter (`sophie-${course}:${chapter}`).

The `SyncedResponseStore` interface is defined as the v3 server-sync
seam but not implemented in Phase 0.

## CSS Modules build pipeline

[ADR 0005](../../docs/website/decisions/0005-theming-three-layers.md)
locks CSS Modules for component styling. tsup doesn't natively
transform CSS Modules, so this package adds a small build script:

- Source: `Foo.module.css` (plain CSS, intent-named classes).
- TS source: `import styles from "./Foo.module.css.js";`
  (a wildcard ambient in `src/css-modules.d.ts` types it as
  `Record<string, string>`).
- Build (`scripts/build-css-modules.ts`, run by tsup `onSuccess`):
  1. Scans `src/**/*.module.css`.
  2. Mangles class names via `postcss-modules`.
  3. Emits `dist/**/*.module.css` (mangled CSS) plus
     `dist/**/*.module.css.js` (a tiny companion that side-effect-loads
     the CSS and default-exports the class-name map).
- Result: `@sophie/components` ships pre-mangled CSS. **No consumer
  bundler dependency** — works in any consumer that can load CSS
  files (Vite, webpack, Rspack, esbuild, …).

## Test stack

Tests live next to source (`*.test.ts(x)`). Vitest (jsdom env) +
`@testing-library/react` + `jest-axe` (axe-core a11y assertions) +
`fake-indexeddb` (in-memory IDB). Runner is wired in Phase 0 step 8.

## Phase 0 scope

- Components: `<Callout>`, `<Figure>`. The other ~14 v1 components
  arrive in Phase 1.
- ComponentContract: `serialize`, `audit`, `containedIn`,
  `forbidsContaining` are declared on the contract but Phase 0 ships
  stubs only. Real semantics are Phase 3 (alongside Tier 1 / Tier 2
  audit checks).
- Persistence: full IndexedDB + BroadcastChannel + ProfileContext
  wired end-to-end. `SyncedResponseStore` is interface-only.

## Deferred (later phases)

- 14 remaining v1 components (Phase 1).
- Radix UI primitives (Phase 1+).
- CodeMirror 6 / Pyodide / `<CodeCell>` (Phase 3).
- `<Demo>` / Cosmic Playground iframe (Phase 1+).
- Storybook isolation (Phase 1).
- `astro:assets`-aware `<SophieFigure>` (Phase 1, in `@sophie/astro`).
- Real `serialize` / `audit` / composition enforcement (Phase 3).
- `SyncedResponseStore` server implementation (v3).
