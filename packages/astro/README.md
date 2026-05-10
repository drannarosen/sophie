# @sophie/astro

The single Astro coupling point for Sophie, per
[ADR 0001](../../docs/website/decisions/0001-platform-not-monorepo.md).
Wires `@astrojs/mdx` + `@astrojs/react` + the Sophie component
mapping. Provides `<SophieChapter>`, the client wrapper that
side-effect-loads theme CSS and KaTeX CSS and threads the runtime
contexts (`SophieConfig`, `Profile`, `FigureRegistry`) into every
chapter render.

Built against Astro 6 (was Astro 5 originally — see
[ADR 0002 revision note](../../docs/website/decisions/0002-renderer-astro-mdx.md)).

## Public surface

| Subpath | What it exports |
| --- | --- |
| `@sophie/astro` | `defineSophieIntegration()` — the integration factory |
| `@sophie/astro/client` | `<SophieChapter>` — provider wrapper + CSS side-effects |

## Quick recipe (for a consumer Astro app)

`astro.config.ts`:

```ts
import { defineConfig } from "astro/config";
import { defineSophieIntegration } from "@sophie/astro";

export default defineConfig({
  integrations: [defineSophieIntegration()],
});
```

`src/content.config.ts` — schema validation via Astro Content
Collections (we lean on Astro's native validator instead of
duplicating it):

```ts
import { defineCollection } from "astro:content";
import { ChapterSchema } from "@sophie/core/schema";

export const collections = {
  chapters: defineCollection({ type: "content", schema: ChapterSchema }),
};
```

`src/layouts/ChapterLayout.astro`:

```astro
---
import { SophieChapter } from "@sophie/astro/client";
const { frontmatter } = Astro.props;
---
<html lang={frontmatter.lang ?? "en"}>
  <head>
    <meta charset="utf-8" />
    <title>{frontmatter.title}</title>
  </head>
  <body>
    <SophieChapter
      course="astr201"
      chapter={frontmatter.slug}
      figures={frontmatter.figures}
      client:load
    >
      <slot />
    </SophieChapter>
  </body>
</html>
```

That's the full wiring: integration in `astro.config.ts`, schema in
`content.config.ts`, `<SophieChapter>` in the layout.

## Behavior

`defineSophieIntegration()` returns an `AstroIntegration` that:

1. Adds `@astrojs/mdx` with:
   - `remarkPlugins: [remarkGfm, remarkFrontmatter]`
   - `rehypePlugins: [rehypeKatex]`
   - `components: { Callout, Figure }` (from `@sophie/components`)
2. Adds `@astrojs/react`.
3. Logs `Sophie integration loaded (MDX + React)` at info level.

`<SophieChapter>` side-effect-imports `@sophie/theme/css` and
`katex/dist/katex.min.css`, then wraps `children` in three
providers in this order: `SophieConfigProvider` → `ProfileProvider`
→ `FigureRegistryProvider`.

## Phase 0 island strategy

**One-big-island-per-chapter.** Every chapter is wrapped in
`<SophieChapter ... client:load>`, putting the entire chapter content
into a single React tree. Trade-off: heavier JS payload than
per-island hydration, but contexts propagate correctly and there's
zero magic. Phase 1+ optimizes to per-island hydration where it
matters.

## Deferred

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
- Per-island provider auto-injection via custom Astro renderer
  (Phase 1+).
