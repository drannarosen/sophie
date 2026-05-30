# `expectChapterA11y(page)` — mandatory axe assertion

> Part of the [canonical e2e test patterns](./README.md) reference set.

## The rule

Per [ADR 0004](../../../../docs/website/decisions/0004-component-contract-revisions.md),
axe-core tests are mandatory on every component PR. For e2e specs,
that means: **every spec touching rendered chapter HTML ends with a
call to the shared `expectChapterA11y(page)` helper.**

The helper centralizes Sophie's standard a11y configuration —
**tag set**, **exclude list**, **disable list** — so individual specs
don't drift on which tags, excludes, or disables they pass to
`AxeBuilder`. One helper, one canonical pattern, one class of bugs
caught uniformly across the suite. Mirrors the canonical inline
pattern at [`proving-chapter.spec.ts:277-302`](../proving-chapter.spec.ts).

**Tag set:** WCAG 2.0 A/AA + WCAG 2.1 A/AA + `best-practice` (the
last transitively includes the R10 landmark rules).

**Excludes** — Phase-0 known-acceptable carve-outs:

- `.margin-note` — column-margin `<aside>` elements from raw MDX;
  partial fix in 9cc115f (spoiler-alerts chapter), full migration
  to a `<MarginNote>` component is queued
- `.task-list-item input[type='checkbox']` + `li > input[type='checkbox'][disabled]`
  — GFM task-list `[x]` syntax emits unlabeled disabled checkboxes;
  not actionable without a custom rehype plugin

**Disabled rules** — Phase-0 known-acceptable suppressions:

- `color-contrast` — token-level remediation tracked separately
  (GitHub issue #152)

The former `list` / `listitem` suppression was dropped 2026-05-30
(H5a): the `<ul><astro-slot><li>` render-layer artifact it guarded
against no longer exists — commit 4737e03 / ADR 0027 made
`<LearningObjectives>` render from props, not slotted children. When
the `color-contrast` follow-up (#152) lands, drop that entry too and
the suite tightens uniformly across all 35 specs.

## Two helpers, two contexts

Sophie ships **two sibling helpers** — `expectChapterA11y(page)` and
`expectCourseA11y(page)` — covering the two structural shapes that
recur across the smoke e2e suite.

| Helper | Use on | Astro-island carve-out |
| --- | --- | --- |
| `expectChapterA11y` | Chapter routes (`/units/.../reading`) — one hydrated chapter island per page | none — single `<main>`, single hydrated island |
| `expectCourseA11y` | Library / course-listing routes (`/library/*`) — multiple `<astro-island>` elements each emitting `<main>` | `.exclude("astro-island")` — keeps `landmark-no-duplicate-main` from firing on the multi-island layout |

The two helpers share every other configuration value (tag set,
margin-note/task-list excludes, color-contrast disable).
The astro-island exclude is the **only** difference and it tracks a
real structural distinction in how Astro hydrates the two route
families. Per W2 + DRY in `AGENTS.md`: a single helper with a boolean
flag would be terser but reads worse at call sites — explicit
signatures make the chapter-vs-course intent obvious at the test, and
the duplication inside `_helpers/axe.ts` is small and load-bearing.

Mirrors the multi-island axe convention documented in
[`library-rooms-axe.spec.ts:30-46`](../library-rooms-axe.spec.ts) —
the only spec that intentionally *omits* the astro-island exclude
because the bug class it covers (a stray `<main>` inside the chapter
layout's `<main>`) only fires when astro-island ISN'T excluded.

When the underlying Astro slot-shape gets fixed so course listings
emit one `<main>` per page (queued under the library-room ADR set),
the astro-island exclude drops and `expectCourseA11y` collapses into
`expectChapterA11y`. Single point of maintenance.

## The shape

At the end of every test block that renders chapter HTML:

```ts
import { expectChapterA11y } from "./_helpers/axe";

test("renders the deep-dive callout in its closed state", async ({
  page,
}) => {
  await page.goto("/chapters/measuring-the-sky");
  // ...test body...
  await expectChapterA11y(page);
});
```

The helper:

1. Constructs `new AxeBuilder({ page })`.
2. Scopes to chapter content (`main, [role='main'], article`).
3. Tags `wcag2aa`, `wcag21aa`, `landmark-unique`, `landmark-one-main`
   (the last two enforce R10's landmark-choice rule when components
   nest inside the chapter layout's `<main>`).
4. Runs `analyze()` and asserts `violations` is empty.

Any violation surfaces a real a11y bug; the helper doesn't silence
or filter them.

## When to use

- Every e2e spec under `examples/smoke/e2e/*.spec.ts` that navigates
  to a chapter URL.
- Every e2e spec under `examples/packed-smoke/e2e/*.spec.ts` for the
  same reason — the packed consumer is held to the same a11y bar as
  the workspace consumer.
- Component-level axe coverage (under `packages/components/**/*.test.tsx`)
  is a separate concern and uses `@axe-core/react` against rendered
  React trees, not `@axe-core/playwright` against a real browser. The
  helper here is e2e-only.

## Why R10 tags

R10 (see `AGENTS.md` "Standing PR-review rules") locks the landmark
choice for nested-under-parent components: `<section aria-labelledby>`,
never `<main>`, `<article>`, or bare `<div>`. The W4c audit surfaced
three same-root-cause landmark bugs that bare WCAG-AA tags missed
because they're landmark-*structure* violations, not WCAG criterion
violations. Adding `landmark-unique` and `landmark-one-main` to the
shared tag list catches that class of issue at every spec invocation.

## Canonical example

Canonical example: [`../_helpers/axe.ts`](../_helpers/axe.ts) — the
shared helper exporting `expectChapterA11y(page)`.

## Cross-references

- [Pattern index](./README.md)
- [`condition-based-waits.md`](./condition-based-waits.md)
- [`expect-poll-count.md`](./expect-poll-count.md)
- [ADR 0004](../../../../docs/website/decisions/0004-component-contract-revisions.md)
  — axe-core mandatory on every component PR
- [`AGENTS.md`](../../../../AGENTS.md) — Standing PR-review rules § R10
