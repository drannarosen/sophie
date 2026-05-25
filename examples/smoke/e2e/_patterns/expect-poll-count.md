# `expect.poll(count)` — parallel-hydration-race-safe wait

> Part of the [canonical e2e test patterns](./README.md) reference set.

## The use case

You need to assert: "after the page hydrates, **at least N** elements
matching this selector are present." This shape comes up whenever
multiple store-backed islands hydrate in parallel and the test needs
to verify the whole batch landed — not just any one of them.

A single-element [condition wait](./condition-based-waits.md) handles
"one element reached state X." This pattern handles "N elements
reached state X," where the test can't pin a single locator because
the elements share a selector.

## The shape

```ts
await expect
  .poll(
    async () => page.locator("[data-state='open']").count(),
    {
      timeout: 10_000,
      message: "≥5 store-backed islands hydrated",
    },
  )
  .toBeGreaterThan(4);
```

Playwright re-evaluates the poll function until the matcher passes or
the poll timeout fires. The function returns a fresh `count()` each
tick; the matcher compares it to the threshold. No clock guesses, no
`waitForTimeout`, no flaky "did all five render yet?" guard.

For "all N islands hydrated as detected via `data-state`," the shape
is the same — change the selector and the threshold to suit.

## The anti-pattern

```ts
// BEFORE — clock guess; flakes on slow CI, passes when the page is
// rendered-but-not-hydrated:
await page.waitForTimeout(2000);
const count = await page.locator("[data-state='open']").count();
expect(count).toBeGreaterThan(4);
```

The bare sleep is anti-SoTA per `AGENTS.md` "condition-based waiting
over time-based." It hides the real signal (a count crossing a
threshold) behind a hope (2 seconds is enough).

## When to reach for this vs. `toHaveCount`

- Use `expect(locator).toHaveCount(N)` when you know the **exact**
  number expected and want it pinned (`learning-objectives.spec.ts`
  uses this for the 1-Objective chapter).
- Use `expect.poll(() => count()).toBeGreaterThan(N)` when you're
  asserting **at least N** hydrated, and the batch may grow as the
  page accretes more islands. This is the resilient shape for
  cross-spec invariants like "the packed-smoke chapter hydrates at
  least 5 store-backed components without a React #418."

## Canonical example

Canonical example: forthcoming in
`examples/packed-smoke/e2e/hydration-mismatch-defense.spec.ts`
(Task B.5; this doc will be updated with a Markdown link once that
task lands).

## Cross-references

- [Pattern index](./README.md)
- [`condition-based-waits.md`](./condition-based-waits.md) — for
  waiting on **one** element's state
- [`axe-core.md`](./axe-core.md) — for the mandatory a11y assertion
  that ends every spec
- [`AGENTS.md`](../../../../AGENTS.md) — Engineering principles §
  SoTA over simple § condition-based waiting
