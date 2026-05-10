---
title: Set up dual-profile builds
short_title: Dual-profile builds
description: How to produce separate student and instructor static builds from a single source tree.
tags: [dual-profile, build, profile, instructor]
---

# Set up dual-profile builds

How the platform produces two separate static builds (student /
instructor) from a single source tree. Implementation lives in
`@sophie/astro` — the only Astro-coupled package — so consumer course
repos call the integration in `astro.config.mjs` and run `sophie
build:both` from the CLI; they don't implement profile filtering
themselves.

:::{seealso}
The deploy + Cloudflare Access setup (the v2 instructor-build hosting
piece) lives at [Set up Cloudflare Access](set-up-cloudflare-access.md).
:::

## v1 vs. v2 scope

This doc describes the **full v2 mechanism**. The **v1 ship** is a
strict subset of it.

**v1 (initial release):**

- Single build target: `sophie build` produces `dist/` for the
  student audience and deploys to GitHub Pages.
- Schema includes `Chapter.profiles` and `Mission.profiles` (default
  `['student', 'instructor']`); v1 doesn't act on entity-level
  filtering.
- MDX components `<SolutionKey>`, `<InstructorNote>`,
  `<MisconceptionGuide>`, `<TeachingTip>` exist but render to `null`
  unconditionally — they collapse and strip from the bundle.
- Authors write solutions and teaching notes *inline* in chapter
  MDX from day one; they're stripped at build but live colocated in
  source.
- No second deploy target. No Cloudflare Pages, no Cloudflare Access.
- For instructor-side viewing: `sophie preview --profile=instructor`
  builds locally on `localhost`.

**v2 (activated when triggers are met):**

- Second build target: `sophie build --profile=instructor` produces
  a separate `dist/instructor/`.
- MDX components flip from always-null to `PROFILE`-conditional.
- Entity-level filtering activates: chapters/missions tagged
  `[instructor]` only don't produce pages in the student build.
- Cloudflare Pages + Cloudflare Access deploy for the instructor
  build (see [Set up Cloudflare Access](set-up-cloudflare-access.md)).
- Optional custom domain via Cloudflare DNS.

**v2 triggers (any one is sufficient):**

- ≥10 chapters carrying substantial instructor content.
- TA or co-instructor needs remote access.
- Want to read teaching notes from phone/iPad before class.

**v2 migration cost:** ~1 evening of CI/Cloudflare work, ~10 lines
per component. Zero chapter content changes.

## TL;DR (v2 mechanism)

One codebase, one env var (`PROFILE`), two `astro build` invocations,
two separate `dist/` folders. Filtering happens at two levels:

1. **Entity-level** — content collections filter chapters/missions
   based on their declared `profiles` array. Excluded entities don't
   produce pages in the build at all.
2. **Body-level** — MDX components like `<SolutionKey>` and
   `<InstructorNote>` conditionally render based on the build's
   profile. In the student build, they collapse to `null` and
   tree-shake away.

## package.json scripts

In **v1**, only `build` and `preview --profile=instructor` are wired
into CI; the others exist but only `build` runs on push.

```jsonc
// v1 minimum
{
  "scripts": {
    "dev": "astro dev",
    "build": "PROFILE=student astro build",
    "preview": "astro preview",
    "preview:instructor": "PROFILE=instructor astro build && astro preview"
  }
}
```

When **v2** activates, scripts expand:

```jsonc
// v2 full
{
  "scripts": {
    "dev": "PROFILE=instructor astro dev",
    "build:student": "PROFILE=student astro build --outDir dist/student",
    "build:instructor": "PROFILE=instructor astro build --outDir dist/instructor",
    "build:both": "pnpm build:student && pnpm build:instructor",
    "preview:student": "astro preview --outDir dist/student",
    "preview:instructor": "astro preview --outDir dist/instructor"
  }
}
```

## astro.config.mjs

```js
import { defineConfig } from 'astro/config';
import sophie from '@sophie/astro';

const profile = process.env.PROFILE ?? 'student';

export default defineConfig({
  integrations: [sophie()],
  site: profile === 'student'
    ? 'https://drannarosen.github.io'
    : 'http://localhost:4321',
  base: profile === 'student' ? '/astr201' : '/astr201-instructor',
  vite: {
    define: {
      'import.meta.env.PROFILE': JSON.stringify(profile),
    },
  },
});
```

The `vite.define` line is the critical bit: it bakes the literal
string into the bundle wherever a component reads
`import.meta.env.PROFILE`, so dead branches tree-shake away.
`@sophie/astro` provides this wiring automatically; the config above
is the explicit version for clarity.

## src/content/config.ts

```ts
import { defineCollection } from 'astro:content';
import { ChapterSchema } from '@sophie/schema';

const chapters = defineCollection({
  type: 'content',
  schema: ChapterSchema,
});

export const collections = { chapters };
```

`ChapterSchema` is the same Zod schema documented in
[Content schema](../reference/content-schema.md). Astro's content
collection system consumes Zod natively — no adapter needed. See
[ADR 0003](../decisions/0003-zod-as-source-of-truth.md).

## Page-level filtering

```astro
---
// src/pages/chapters/[slug].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const chapters = await getCollection(
    'chapters',
    ({ data }) => data.profiles.includes(import.meta.env.PROFILE)
  );
  return chapters.map((chapter) => ({
    params: { slug: chapter.slug },
    props: { chapter },
  }));
}

const { chapter } = Astro.props;
const { Content } = await chapter.render();
---
<Layout>
  <article>
    <Content />
  </article>
</Layout>
```

## MDX components for inline conditional rendering

In **v1**, these always return `null`. They exist only so chapter
authors can write solutions and notes inline; build-time stripping
removes them from the bundle.

```tsx
// v1 minimum (provided by @sophie/components)
export const InstructorOnly = (_: { children: any }) => null;
export const StudentOnly = ({ children }: { children: any }) => <>{children}</>;
export const SolutionKey = (_: { children: any }) => null;
export const InstructorNote = (_: { children: any }) => null;
```

In **v2**, the same components become PROFILE-conditional via
`useProfile()` (a React context provided by `@sophie/astro`):

```tsx
// v2 (provided by @sophie/components, reading context from @sophie/astro)
import { useProfile } from '@sophie/components/runtime';

export const InstructorOnly = ({ children }) =>
  useProfile() === 'instructor' ? <>{children}</> : null;

export const StudentOnly = ({ children }) =>
  useProfile() === 'student' ? <>{children}</> : null;

export const SolutionKey = ({ children }) =>
  useProfile() === 'instructor'
    ? <aside class="solution-key">{children}</aside>
    : null;

export const InstructorNote = ({ children }) =>
  useProfile() === 'instructor'
    ? <aside class="instructor-note">{children}</aside>
    : null;
```

This is the "flip" — no chapter content changes, just the
implementation in `@sophie/components`.

## A chapter using both

```mdx
---
id: flux-luminosity-distance
title: "Flux, Luminosity, and Distance"
profiles: [student, instructor]
---
import { Prediction, SolutionKey, InstructorNote } from '@sophie/components';

## How flux relates to luminosity

The flux you measure on Earth depends on both how bright the star
actually is and how far away it is.

<Prediction
  question="If the distance to a star doubles, what happens to the
            measured flux?"
  choices={["Doubles", "Halves", "Decreases by 4×", "Stays the same"]}
/>

<SolutionKey>
Flux scales as $1/d^2$, so distance doubling → 4× flux drop.
</SolutionKey>

<InstructorNote>
Common stumble: students conflate flux and luminosity here. Plan ~10
minutes of board work showing the inverse-square diagram before the
demo.
</InstructorNote>
```

One source. Two audiences. Different bundles.

## Output layout

```text
dist/
  student/
    index.html
    chapters/
      flux-luminosity-distance/
        index.html         # student content only
    _astro/                # tree-shaken bundle, no instructor strings
  instructor/
    index.html
    chapters/
      flux-luminosity-distance/
        index.html         # student + instructor content
    _astro/                # different bundle
```

## Audit checks (when v2 is active)

- Every `<Prediction>` in the student build has a matching
  `<SolutionKey>` (by ID) in the instructor build.
- Every misconception declared in chapter frontmatter is addressed
  by a `<MisconceptionGuide>` somewhere in the instructor build.
- No `<SolutionKey>` content accidentally appears in the student
  bundle (smoke-test via `grep` on `dist/student/`).
- Student-build entities don't reference instructor-only entities.

## Caveats and verification

- The "no instructor strings in the student bundle" property depends
  on Vite's literal-string substitution + tree-shaking working as
  expected. For anything genuinely sensitive (solution keys), `grep`
  the student `dist/` for known instructor-only strings as a smoke
  test before trusting it.
- Astro evolves; verify the current syntax for `vite.define`, content
  collections, and `astro:env` against current Astro docs when wiring
  this up for real. The newer `astro:env` typed-env API is a cleaner
  alternative to `vite.define` once it stabilizes; either works.

## Why this is better than Quarto's profile system

Quarto's `_quarto-student.yml` / `_quarto-instructor.yml` gate at the
file level (or via per-chunk `#| profile:` flags). Maintaining two
near-identical config files is high-friction, which is probably why
the dual-profile YAMLs in existing courses never got used.

The Astro + MDX approach removes that friction by letting instructor
content live *inline* in the natural flow of the prose — see the
`<InstructorNote>` example above. One file, one source of truth, two
audiences. Build-time filtering guarantees the student bundle is
genuinely clean of instructor content.
