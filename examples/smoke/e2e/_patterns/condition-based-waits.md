# Condition-based waits

> Part of the [canonical e2e test patterns](./README.md) reference set.

## The rule

Wait on a **discriminable DOM attribute** the page actually emits when
it reaches the state you care about. Never wait on a clock.

The SoTA shapes Playwright supports for single-element waits:

```ts
// 1. Aria-busy clears once a hydrated store-backed component finishes
// its first render + state read.
await expect(ul).toHaveAttribute("aria-busy", "false");

// 2. Radix-backed primitives emit data-state="open" / "closed".
await expect(callout).toHaveAttribute("data-state", "open");

// 3. Disclosure / accordion / dropdown triggers emit aria-expanded.
await expect(trigger).toHaveAttribute("aria-expanded", "true");

// 4. Plain visibility — implicit auto-retry, NO timeout option.
await expect(el).toBeVisible();
```

Playwright's `expect(locator)` matchers retry automatically until the
condition holds or the **global** test timeout fires. That global is
the right place to bound a runaway test; a **per-assertion** timeout
is a clock guess that suppresses the symptom of a real race.

## The anti-pattern

```ts
// BEFORE — clock guess, masks real bugs:
await expect(callout).toBeVisible({ timeout: 5000 });

// BEFORE — even worse, a bare sleep:
await page.waitForTimeout(2000);
await expect(callout).toBeVisible();
```

A `{ timeout: N }` argument is a project smell anywhere outside the
global test config. It says "I don't know which DOM signal flips when
this becomes ready, so I'm hoping 5 seconds is long enough." That hope
breaks on slow CI runners and silently passes when the component
regresses to "rendered but not interactive."

## The fix

Read the component source. Find the attribute that flips when the
state you care about is reached. Wait on *that*.

```ts
// AFTER — waits on the signal the component actually emits:
await expect(callout).toHaveAttribute("data-state", "open");
```

If the component doesn't emit a discriminable signal, **that is the
bug** — add the signal to the component (it's almost always a Radix
data attribute, an `aria-busy` flip, or an `aria-expanded` flip) and
then wait on it.

## Canonical example

[`../learning-objectives.spec.ts`](../learning-objectives.spec.ts) —
the `aria-busy="false"` wait on the Objectives `<ul>` is the model
shape for "store-backed component finished hydrating."

```ts
const ul = page.locator(LO_UL_SELECTOR);
await expect(ul).toHaveAttribute("aria-busy", "false");
```

The `useHydrated`-gated `useInteractive` store flips `aria-busy` from
`true` to `false` once the persisted state is read; the test waits on
that flip rather than on a clock.

## Cross-references

- [Pattern index](./README.md)
- [`expect-poll-count.md`](./expect-poll-count.md) — for waiting on
  **N elements**, not one
- [`axe-core.md`](./axe-core.md) — for the mandatory a11y assertion
  that ends every spec
- [`AGENTS.md`](../../../../AGENTS.md) — Engineering principles §
  SoTA over simple § condition-based waiting
