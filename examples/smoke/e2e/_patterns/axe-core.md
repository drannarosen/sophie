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

- `color-contrast` — Sprint-K P1 token-level remediation
- `list` / `listitem` — Astro-slot inside MDX `client:load` island
  trips WCAG 1.3.1 on a render-layer artifact (PR-C4
  `<LearningObjectives>` shape, commit 4737e03)

When those follow-ups land, drop the corresponding entry from the
helper and the suite tightens uniformly across all 35 specs.

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
