# @sophie/astro

The single Astro coupling point for Sophie, per
[ADR 0001](../../docs/website/decisions/0001-platform-not-monorepo.md).
Wires `@astrojs/mdx` + `@astrojs/react` + the Sophie MDX plugin chain
+ Vite stopgaps + `<SophieChapter>` (CSS shell) + `makeStaticComponents`
(component-map factory).

Built against Astro 6 (was Astro 5 originally — see
[ADR 0002 revision note](../../docs/website/decisions/0002-renderer-astro-mdx.md)).

## Public surface

| Subpath | What it exports |
| --- | --- |
| `@sophie/astro` | `defineSophieIntegration({ figures })`, `makeStaticComponents()` |
| `@sophie/astro/client` | `<SophieChapter>` — CSS-shell wrapper |
| `@sophie/astro/components/ChapterLayout.astro` | Canonical chapter layout (ADR-0082) |
| `@sophie/astro/routes/reading.astro` | Reading route — injected by `defineSophieIntegration` |
| `virtual:sophie/figures` | Virtual module exposing the consumer's figure registry (ADR-0082) |

## Quick recipe (consumer Astro app)

Per [ADR-0082](../../docs/website/decisions/0082-chapter-layout-extraction.md),
`defineSophieIntegration` injects the canonical `/units/[unit]/reading`
route and registers a Vite virtual module exposing the course's figure
registry. The consumer's `astro.config.ts` is one line:

```ts
import { defineConfig } from "astro/config";
import { defineSophieIntegration } from "@sophie/astro";
import { figures } from "./src/content/figures.ts";

export default defineConfig({
  integrations: [defineSophieIntegration({ figures })],
});
```

`src/content.config.ts` declares the content collections (sections,
units, artifacts, registries) per [ADR-0067](../../docs/website/decisions/0067-content-collections-shape.md).

**No `src/layouts/ChapterLayout.astro` or `src/pages/units/[unit]/reading.astro`
in the consumer.** Both live in `@sophie/astro` and are wired through
`injectRoute`. If a consumer ships its own `src/pages/units/[unit]/reading.astro`,
the integration emits a build-time warning (Astro #3809 shadow-warning
mitigation per ADR-0082 § Consequences).

For interactive (persistence-bearing) callouts, the MDX file imports
the component directly and uses `client:load` per call-site:

```mdx
import { InteractiveCallout } from "@sophie/components";

<InteractiveCallout
  client:load
  course="astr201"
  chapter="spoiler-alerts"
  id="check-yourself-1"
  variant="tip"
>
  Mark when reviewed.
</InteractiveCallout>
```

The 5 store-backed components (`GlossaryTerm`, `KeyEquation`,
`EquationRef`, `FigureRef`, `ChapterRef`) **require** a `client:*`
directive per [ADR 0038 § A2.6](../../docs/website/decisions/0038-pedagogy-index-pattern.md#a26--clientload-is-mandatory-for-all-five-components);
the audit invariant `CL1` catches missing directives at build time.

## Behavior

`defineSophieIntegration()` returns an `AstroIntegration` that, on
`astro:config:setup`:

1. Adds `@astrojs/mdx` with:
   - `remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMath]`
   - `rehypePlugins: [rehypeKatex]`
2. Adds `@astrojs/react`.
3. Sets `vite.ssr.noExternal: ["@sophie/astro", "@sophie/components"]`
   so Vite handles the CSS-Module wrappers in workspace packages
   correctly during SSR.
4. Sets `vite.build.rollupOptions.external: ["vite/internal"]` to dodge
   a transient `@vitejs/plugin-react@5.2.0` × Vite-7.3.3 incompatibility
   (the plugin does `await import("vite/internal")` and Vite 7 doesn't
   expose that subpath; rollup's commonjs-resolver crashes at build).
   Removable when upstream ships a fix.
5. Logs `Sophie integration loaded (MDX + React)` at info level.

`<SophieChapter>` side-effect-imports `@sophie/theme/css`,
`@sophie/components/styles.css`, and `katex/dist/katex.min.css`. It
renders its children inside a React fragment.

`makeStaticComponents({ figures })` returns the components map for
`<Content components={…}>`. It includes `<Callout>` (passed through
unchanged) and `<Figure>` (closure-bound to the figure registry so MDX
call sites can write `<Figure name="…" />` without manual registry
plumbing).

## Architecture note (ADR 0027)

Step 6 originally documented a "one-big-island-per-chapter" pattern
with `SophieConfig`, `Profile`, and `FigureRegistry` contexts threaded
through `<SophieChapter>`. Step 7's vertical-slice acceptance proved
this doesn't work: Astro 6 + `@astrojs/mdx` 5 renders MDX content as
Astro server-side, so React components inside MDX get isolated SSR
passes outside any `client:load` parent's React tree. Context providers
don't reach them.

Phase 0 (post-pivot) threads course/chapter as **props** on
`<InteractiveCallout>`, the figure registry via the components map, and
keeps `<SophieChapter>` as a CSS-shell wrapper. Full rationale and
alternatives are in
[ADR 0027](../../docs/website/decisions/0027-mdx-render-boundary-prop-threading.md).

## Deferred

- Custom Astro renderer / remark plugin that auto-injects `client:load`
  + course/chapter props on `<Interactive*>` JSX so chapter authors
  don't write them manually (Phase 1+, before drannarosen/astr201's
  first chapter ships).
- Reveal.js / slides pipeline (Phase 1+).
- Cosmic Playground iframe + postMessage (Phase 1+).
- Shiki / rehype-pretty-code (Phase 1+; no code in proving chapter).
- rehype-citation (Phase 1+; first chapter with bib).
- `astro:assets`-aware `<SophieFigure>` (Phase 1+).
- `--profile` CLI flag + dual-render (Phase 5).
- Print-mode CSS (Phase 4).
- Pagefind search (Phase 2).
- Custom audit hooks for Tier 1/2 checks (Phase 3 — Astro Content
  Collections cover Phase 0 schema needs).
