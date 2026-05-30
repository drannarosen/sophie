---
title: Prerender / globalThis Runtime Doctrine
short_title: Prerender runtime doctrine
description: Why @sophie/astro externalizes prerender imports, uses globalThis singletons, and routes virtual modules through SSR setters — the packaging-bug-class that keeps recurring, and how to not reintroduce it.
tags:
  - build
  - astro-integration
  - prerender
  - regression-class
  - reference
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
status: shipped
---

# Prerender / globalThis runtime doctrine

This is the **internal** companion to
[coding-standards § Consumer-side requirements](../contributing/coding-standards.md#consumer-side-requirements).
That section tells a *consumer* repo what devDeps to carry; this doc tells a
*platform* contributor why `@sophie/astro` looks the way it does at the
prerender boundary — and which four patterns keep a recurring packaging-bug
class from coming back.

The bug class has one signature: **green locally, broken at the consumer
Astro build.** Unit tests pass, `pnpm build` passes, and the failure surfaces
only when a downstream repo runs `astro build` against the published dist. It
has bitten at least three times (dropped tsup entry, `ERR_UNKNOWN_URL_SCHEME`,
duplicated module state). Each of the four sections below is a structural
defense against one face of it.

## 1. The externalized-prerender boundary

`@sophie/astro` builds in two halves that meet at the prerender boundary:

- **`src/**/*.ts(x)` → tsup → `dist/`** (transformed, bundled ESM).
- **`src/**/*.astro` → copied *verbatim* into `dist/`** — Astro in the
  consumer app compiles them, not us.

The consequence: when a copied-verbatim `.astro` does a **value** import like
`import { renderMath } from "../lib/math-render/render-math"`, that `lib`
module must exist as its own `dist` entry — otherwise the consumer's Astro
build resolves an import that the published tree never emitted.

**Defense — derive entries, don't hand-maintain them** ([ADR 0091](../decisions/0091-tsup-entry-discovery.md)).
`packages/astro/tsup.config.ts` builds its `entry` map as
`{ ...INTRINSIC, ...discoverAstroEntries(SRC_DIR) }`: `INTRINSIC` is the small
set of entries with no `.astro` consumer (each carrying its rationale), and
`discoverAstroEntries` parses every `.astro` frontmatter + `<script>` block
(TypeScript compiler API, value-vs-type discrimination) to derive the rest.
Then `findMissingEntries` re-scans each `.astro` file's **raw text** with an
*independent* regex and throws at config-eval if any resolvable value-import is
absent from the final entry set. The two parsers use deliberately different
mechanisms so the validator catches the structured parser's blind spots
(CRLF frontmatter, string-truncation edges). A miss fails the **build loudly**
instead of shipping a dist that resolves wrong downstream.

**`import.meta.env` at prerender.** `import.meta.env.BASE_URL` is reliably
Vite-replaced **only** inside the `.astro` layer (and Vite-aware code). In the
tsup-built dist of `@sophie/*` — which runs externalized in Node during
SSR/prerender — `import.meta.env` is **undefined**. Never read it from a
framework-pure `@sophie/components` / `@sophie/core` module; receive the value
via a setter instead (§2). See [ADR 0092](../decisions/0092-base-path-correctness.md):
`joinBase` is deliberately zero-dep and Node-safe (no `import.meta.env`).

## 2. The globalThis-singleton doctrine

Two facts force cross-cutting runtime state onto `globalThis` rather than module
scope:

1. **tsup chunking can duplicate a module.** Even with `splitting: false`, a
   module pulled into two entry graphs can instantiate twice; module-level
   `let state` then exists in two copies and one writer's value is invisible to
   the other reader. `globalThis["__SOPHIE_…__"]` is the single shared cell.
2. **`import.meta.env` is undefined in the externalized SSR/prerender dist**
   (§1), so the value must be *pushed in* from the Vite-aware `.astro` layer.

The result is the **SSR-setter pattern**. Canonical minimal example,
`packages/core/src/runtime/base-url.ts`:

```ts
const BASE_URL_KEY = "__SOPHIE_BASE_URL__";

// Called from the .astro layer (where import.meta.env.BASE_URL is
// reliably Vite-replaced). globalThis, not module state, because tsup
// chunking can dupe modules.
export function setSophieBaseUrl(base: string): void {
  (globalThis as { [BASE_URL_KEY]?: string })[BASE_URL_KEY] = base;
}
export function getSophieBaseUrl(): string | undefined {
  return (globalThis as { [BASE_URL_KEY]?: string })[BASE_URL_KEY];
}
```

The same shape, generalized for collections, is the
**`createPedagogyStore<T>` factory** (`packages/components/src/runtime/pedagogy-store.ts`):
data flows *server → `set()`* on the SSR side, **or** *script-tag-on-first-lookup*
on the client (each role gets its own `<script type="application/json">` id per
[ADR 0038](../decisions/0038-pedagogy-index-pattern.md)). `TextbookLayout.astro`
is the SSR caller. The factory is the one sanctioned way to hold cross-chapter
state; framework-pure components never reach for module-level mutable state or a
direct virtual-module import (§3).

## 3. Virtual modules: Vite-only, route through a setter

`virtual:sophie/*` (pedagogy-index, figures, course-spec) uses the `virtual:`
protocol, which is a **Vite-only convention**. If `@sophie/components` *statically*
imported `virtual:sophie/…`, that specifier would surface in `dist/index.js`,
and any consumer doing a bare-Node import (e.g. Astro's config loader) would hit
**`ERR_UNKNOWN_URL_SCHEME`** at runtime.

**Defense — keep the virtual import behind the §2 setter, in the Vite-aware
`@sophie/astro` layer.** Framework-pure packages never name a `virtual:`
specifier. Two corollaries:

- **Always-register, never conditionally.** Virtual modules export `T | null`
  *always* (not "registered only when data exists"); the integration null-guards
  route injection separately. Dispatcher routes narrow at entry per **R12**
  (`if (!courseSpec) throw …`). See
  [virtual-modules.d.ts](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/virtual-modules.d.ts).
- **The predicted next instance** (a `ScheduleSchema` virtual module) will have
  the same `T | null` shape — register it unconditionally and narrow at the
  dispatcher.

## 4. What the smoke / packed-smoke gates catch

Unit tests and `pnpm build` run against **source**, not the **published
artifact shape** — so they are blind to every failure in §1–§3. The
`examples/smoke/` (and **packed**-smoke, which installs a `pnpm pack` tarball)
gates are the only layer that exercises a real consumer `astro build` against
the real dist. They are what caught the bug class each of the three times.
packed-smoke additionally **pins artifact schema versions**, so a dist-shape
drift fails CI rather than a consumer's machine.

**Corollary for local work:** a passing local smoke run can be a *stale dist*
(Playwright reuses the preview server; dist is not auto-rebuilt). Rebuild smoke
between a `@sophie/*` source fix and the e2e run, or CI catches what you missed.

## Author checklist

Before merging anything that touches the prerender boundary:

1. **New `.astro` value-import of a `lib` module?** Trust ADR 0091 discovery —
   but if you renamed/moved the module, run `pnpm --filter @sophie/astro build`
   and confirm no `findMissingEntries` throw.
2. **Reading `import.meta.env` anywhere outside `.astro`/Vite-aware code?**
   Don't. Route the value through an SSR setter (§2).
3. **Holding cross-cutting runtime state?** `globalThis["__SOPHIE_…__"]`, never
   module-level `let` (§2).
4. **Importing `virtual:sophie/*`?** Only from the `@sophie/astro` Vite layer;
   framework-pure packages get the data via a setter (§3).
5. **Changed dist shape (new entry, new export, moved file)?** Run smoke +
   packed-smoke locally — unit tests will not catch it (§4).

## See also

- [ADR 0022](../decisions/0022-tsup-library-builds.md) — tsup library builds +
  externalization/bundling policy (Amendment 1: Plot bundling).
- [ADR 0091](../decisions/0091-tsup-entry-discovery.md) —
  dynamic tsup-entry discovery + self-validation guard.
- [ADR 0092](../decisions/0092-base-path-correctness.md) — `joinBase` /
  `withBase` base-path correctness (Node-safe, no `import.meta.env`).
- [ADR 0038](../decisions/0038-pedagogy-index-pattern.md) — pedagogy-index +
  the script-tag hydration pattern.
- [coding-standards § Consumer-side requirements](../contributing/coding-standards.md#consumer-side-requirements)
  — the consumer-facing devDeps half of this boundary.
