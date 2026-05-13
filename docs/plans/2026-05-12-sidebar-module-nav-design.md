---
title: PR 3 — Sidebar module/chapter navigation
date: 2026-05-12
status: approved
phase: 2 (Bucket B / front-end shell)
pr-branch: feat/sidebar-module-nav
predecessor: PR #30 (definePreference + ThemeToggle), PR #31 (token rename)
---

# PR 3 — Sidebar module/chapter navigation (design doc)

## Context

PR 1 ([#29](https://github.com/drannarosen/sophie/pull/29)) shipped
the empty `<Sidebar>` slot in `<TextbookLayout>`. The smoke target
renders it with `Astro.slots.has("sidebar") === false`, which
collapses the column to 0 width per
[ADR 0034](../website/decisions/0034-empty-slot-collapse-pattern.md).

PR 3 fills the sidebar with a **module/chapter tree** sourced from
a new schema-driven `modules` Astro content collection. Per the
overview's [§18 book-theme layout](../website/overview.md), the
sidebar is the primary cross-chapter navigation surface in
Sophie's reader UI.

Scope locked via four brainstorm forks (2026-05-12):

| Fork | Decision | Rationale |
|---|---|---|
| Demo content | **3 chapters in 2 modules** (existing spoiler-alerts + 2 stubs in 2 module dirs) | Lets e2e verify real cross-chapter navigation + active-state movement; retires audit's P3-6 "second chapter" item; lifts domain-correctness cap. |
| Module source | **New `modules` Astro collection in `@sophie/core`** | Full schema-driven; consistent with Sophie's identity; right shape for Phase 7 `starter-textbook`. |
| Ordering | **Per-item `order: number`** on Module + Chapter | One file per chapter add; cheap for AI authors per [ADR 0030](../website/decisions/0030-audience-and-ai-author-model.md); duplicates caught by an `audit()` invariant. |
| Active state | **SSR `aria-current="page"` on matching link** (implicit from forks above) | Zero JS; works with print stylesheet; standard a11y idiom; CSS targets `[aria-current="page"]` for styling. |

## Schema delta (`@sophie/core`)

### New: `ModuleSchema`

```ts
// packages/core/src/schema/module.ts
import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

export const ModuleSchema = z.object({
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});

export type Module = z.infer<typeof ModuleSchema>;
```

Re-exported from `packages/core/src/schema/index.ts`.

### Amend: `ChapterSchema`

```ts
// packages/core/src/schema/chapter.ts
export const ChapterSchema = z.object({
  title: NonEmptyString,
  slug: Slug,
  module: Slug,                                  // NEW — link to parent module
  order: z.number().int().nonnegative().optional(), // NEW — within-module order
  lang: LangTag.optional(),
  description: z.string().optional(),
  tags: z.array(NonEmptyString).optional(),
  figures: z.record(Slug, FigureSchema).optional(),
});
```

`module` is **required**: every chapter belongs to a module. The
existing `spoiler-alerts.mdx` is the first chapter to add a
`module:` field. Tests in `packages/core/src/schema/chapter.test.ts`
expand to cover acceptance of the new field + rejection of
missing-module.

### New: `chaptersForModule` helper

```ts
// packages/core/src/schema/index.ts (or new module-nav.ts)
export function chaptersForModule(
  moduleSlug: string,
  chapters: ReadonlyArray<{ slug: string; module: string; order?: number; title: string }>,
): typeof chapters {
  return chapters
    .filter((c) => c.module === moduleSlug)
    .slice()
    .sort((a, b) => {
      if (a.order != null && b.order != null) return a.order - b.order;
      if (a.order != null) return -1;
      if (b.order != null) return 1;
      return a.title.localeCompare(b.title);
    });
}
```

Pure function; unit-tested in `module-nav.test.ts`.

## Smoke content layout

```
examples/smoke/src/content/
  modules/
    01-foundations.json      { slug: "foundations", title: "Foundations",
                               order: 1, description: ... }
    02-stars.json            { slug: "stars", title: "Stars & spectra",
                               order: 2, description: ... }
  chapters/
    01-foundations/
      spoiler-alerts.mdx     (existing; gains `module: "foundations"`, `order: 1`)
      measuring-the-sky.mdx  (NEW stub; module: foundations, order: 2)
    02-stars/
      stellar-evolution.mdx  (NEW stub; module: stars, order: 1)
  figures.ts
```

Stub chapters are intentionally minimal: ~30 lines of MDX each,
no real pedagogy, just enough frontmatter + a couple of paragraphs
+ one `<LearningObjectives>` block to render as a real chapter
through the existing platform components. They're labeled in
their own frontmatter `description` as "(stub — placeholder for
nav demo)".

The chapter glob loader updates to `**/*.mdx` (already is
recursive). The `[...slug].astro` route uses `chapter.id` (which
becomes `01-foundations/spoiler-alerts`) as the slug param — URLs
become `/chapters/01-foundations/spoiler-alerts`.

A new `modules` collection in `content.config.ts`:

```ts
const modules = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/modules" }),
  schema: ModuleSchema,
});
```

## Nav primitive — `<ModuleNav>` in `@sophie/astro`

```astro
---
// packages/astro/src/components/ModuleNav.astro
interface NavChapter {
  slug: string;      // chapter id (URL path segment after /chapters/)
  title: string;
  module: string;    // parent module slug
  order?: number;
}
interface NavModule {
  slug: string;
  title: string;
  order: number;
  description?: string;
}

interface Props {
  modules: ReadonlyArray<NavModule>;
  chapters: ReadonlyArray<NavChapter>;
  currentChapterSlug?: string;  // omit for index/non-chapter pages
}

const { modules, chapters, currentChapterSlug } = Astro.props;

// Sort modules by order asc; for each, get sorted chapter list.
const sortedModules = [...modules].sort((a, b) => a.order - b.order);
---

<nav class='sophie-module-nav' aria-label='Chapters'>
  <ol class='sophie-module-list'>
    {sortedModules.map((m) => (
      <li class='sophie-module' data-module={m.slug}>
        <h2 class='sophie-module-title'>{m.title}</h2>
        <ol class='sophie-chapter-list'>
          {chaptersForModule(m.slug, chapters).map((c) => (
            <li>
              <a
                href={`/chapters/${c.slug}`}
                aria-current={c.slug === currentChapterSlug ? "page" : undefined}
              >
                {c.title}
              </a>
            </li>
          ))}
        </ol>
      </li>
    ))}
  </ol>
</nav>
```

Single primitive, exported via `package.json` `exports`. No React
island; pure Astro + minimal CSS. The CSS adds `:focus-visible`,
`[aria-current="page"]` highlight, and indentation. Tokens from
`@sophie/theme` (`--sophie-text`, `--sophie-text-muted`,
`--sophie-bg`, `--sophie-accent`).

The wire-up in `ChapterLayout.astro`:

```astro
---
import { getCollection } from "astro:content";
import ModuleNav from "@sophie/astro/components/ModuleNav.astro";
const modules = (await getCollection("modules")).map((m) => m.data);
const chapters = (await getCollection("chapters")).map((c) => ({
  slug: c.id,
  title: c.data.title,
  module: c.data.module,
  order: c.data.order,
}));
---
<TextbookLayout>
  <Fragment slot="sidebar">
    <ModuleNav
      modules={modules}
      chapters={chapters}
      currentChapterSlug={Astro.props.chapter.id}
    />
  </Fragment>
  <slot />
</TextbookLayout>
```

When the sidebar slot is non-empty, the empty-slot-collapse logic
(ADR 0034) lets the column expand to its 280px default. PR 1's
mobile slide-over behavior carries through unchanged.

## Files

**New:**

- `packages/core/src/schema/module.ts` — ModuleSchema
- `packages/core/src/schema/module.test.ts` — Zod accept/reject cases
- `packages/core/src/schema/module-nav.ts` — `chaptersForModule` helper
- `packages/core/src/schema/module-nav.test.ts` — helper unit tests
- `packages/astro/src/components/ModuleNav.astro` — primitive
- `examples/smoke/src/content/modules/01-foundations.json`
- `examples/smoke/src/content/modules/02-stars.json`
- `examples/smoke/src/content/chapters/01-foundations/measuring-the-sky.mdx`
- `examples/smoke/src/content/chapters/02-stars/stellar-evolution.mdx`
- `examples/smoke/e2e/module-nav.spec.ts` — Playwright e2e

**Modified:**

- `packages/core/src/schema/chapter.ts` — add `module` + `order` fields
- `packages/core/src/schema/chapter.test.ts` — cover new fields
- `packages/core/src/schema/index.ts` — re-export ModuleSchema + helper
- `examples/smoke/src/content.config.ts` — add modules collection
- `examples/smoke/src/content/chapters/spoiler-alerts.mdx` — move to
  `01-foundations/` subdir; add `module: "foundations"`, `order: 1`
- `examples/smoke/src/layouts/ChapterLayout.astro` — fetch modules
  + chapters; pass to `<ModuleNav>` in sidebar slot
- `examples/smoke/src/pages/index.astro` — group chapters by module
  (optional polish; nav itself is sidebar)
- `packages/astro/package.json` — export `ModuleNav.astro`
- `packages/astro/src/styles/textbook-layout.css` — add styles for
  `.sophie-module-nav`, `.sophie-module`, `.sophie-chapter-list`,
  `[aria-current="page"]` highlight

## TDD plan

**Red phase — failing tests first:**

1. **Vitest** `packages/core/src/schema/module.test.ts`:
   - Accepts valid module ({slug, title, order:0}).
   - Rejects missing slug / title / order.
   - Rejects non-integer order, negative order.

2. **Vitest** `packages/core/src/schema/chapter.test.ts` (expanded):
   - Accepts chapter with `module: "foundations"` + `order: 1`.
   - Rejects chapter missing `module`.
   - Accepts chapter without `order` (optional).

3. **Vitest** `packages/core/src/schema/module-nav.test.ts`:
   - `chaptersForModule` returns only matching chapters.
   - Sorts by `order` ascending.
   - Falls back to title.localeCompare when both orders absent.
   - Empty-input → empty output.

4. **Playwright** `module-nav.spec.ts`:
   - Sidebar renders two `<h2>` module titles in order
     ("Foundations" before "Stars & spectra").
   - Each module has its chapter list with correct titles.
   - On `/chapters/01-foundations/spoiler-alerts`,
     `[aria-current="page"]` is on the matching link only.
   - Clicking another chapter navigates; `aria-current` moves.
   - axe-core: zero violations on the new nav region.
   - Empty-slot-collapse no longer applies (sidebar column
     expands to its 280px default).

## Verification (per superpowers:verification-before-completion)

```bash
pnpm exec turbo run typecheck test:unit build   # all packages green
pnpm exec biome check                            # clean
pnpm exec biome format --write                   # no diff
pnpm test:e2e                                    # 44 + ~6 new = ~50 green
pnpm --filter smoke dev                          # manual smoke:
#   - sidebar shows 2 modules with 3 chapters
#   - aria-current bolds the current chapter
#   - sidebar toggle still hides/shows it
#   - mobile slide-over works
#   - dark mode renders the nav correctly
```

CI gates: typecheck, test:unit, build, biome check, e2e,
axe-clean.

## Cadence checkpoints (per HITL mandate)

1. Design approved (this step) → branch + design doc commit.
2. Red tests written + failing → confirm shape before
   implementing.
3. ModuleSchema + chaptersForModule helper green → confirm
   shape before wiring smoke content.
4. Smoke content reshuffled + 2 stub chapters added → confirm
   visual look (manual smoke) before adding the nav primitive.
5. `<ModuleNav>` rendered + e2e green → confirm before opening
   PR.
6. PR opened → monitor CI; report status.

## Out of scope (deferred to later PRs)

- **In-page ToC** (PR 4) — right column.
- **Cross-chapter "previous / next" buttons** — could land in
  PR 4 or its own follow-up.
- **Collapsible modules** — modules always show their chapter
  list in PR 3. Collapsibility (with state via `definePreference`)
  is a candidate for a small follow-up once nav has feedback.
- **Breadcrumbs in TopBar** — PR 9-adjacent.
- **Search-driven nav (Cmd-K)** — PR 7.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Adding `module: required` to ChapterSchema breaks the existing smoke build | Migration happens in one commit: schema change + spoiler-alerts.mdx update + new dir layout in the same diff |
| URL change `/chapters/spoiler-alerts` → `/chapters/01-foundations/spoiler-alerts` breaks bookmarks | Pre-launch (zero production students); per Anna's no-back-compat-pre-launch posture, URLs may change freely |
| Stub chapters look weird in the rendered chapter view | They're labeled in their description as "(stub — placeholder for nav demo)"; e2e doesn't navigate to them except to verify the active-state transition |
| `aria-current="page"` SSR mismatch if a user navigates client-side | Astro is static + MPA by default; each navigation is a full page load; no SPA hydration mismatch path exists |
| Module + chapter `order` collisions go unnoticed | Audit step on `chaptersForModule` flags duplicate orders; unit-tested |

## ADR follow-up

If the schema-driven modules collection proves load-bearing for
Phase 7's `starter-textbook/` scaffolder, write a small ADR
capturing the "every chapter belongs to exactly one module"
invariant + the per-item ordering convention. Not required for
PR 3 itself; deferred until the pattern has at least one more
consumer (the scaffolder).
