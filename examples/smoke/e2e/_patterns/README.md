# Canonical e2e test patterns

This directory is the SoTA reference set for Playwright e2e specs in
Sophie. The conventions encoded here used to be tribal knowledge; the
A+ hardening sprint (Phase B) lifts them into standalone reference docs
so new specs can be authored to the pattern, and review can cite the
pattern by file name.

Two project standards drive every pattern below:

- [`AGENTS.md`](../../../../AGENTS.md) "SoTA over simple" §
  **condition-based waiting over time-based.** Wait on actual
  state-machine signals; never on clock guesses.
- [ADR 0004](../../../../docs/website/decisions/0004-component-contract-revisions.md)
  **axe-core mandatory.** Every component PR (and every e2e spec
  touching rendered chapter HTML) carries an axe assertion.

## Pattern index

| Doc | One-line use case |
|---|---|
| [`condition-based-waits.md`](./condition-based-waits.md) | Wait on a discriminable DOM attribute (`aria-busy`, `data-state`, `aria-expanded`) instead of a clock. Use for any single-element ready-state assertion. |
| [`expect-poll-count.md`](./expect-poll-count.md) | Wait for **N elements** to satisfy a selector — the parallel-hydration-race-safe wait. Use when asserting "after hydration of N store-backed components, the DOM contains M nodes." |
| [`axe-core.md`](./axe-core.md) | Run `expectChapterA11y(page)` at the end of every spec touching rendered chapter HTML. WCAG 2.1 AA + R10 landmark tags per ADR 0004. |

## When you're writing a new spec

1. If you're waiting for *one* element to reach a known state →
   [`condition-based-waits.md`](./condition-based-waits.md).
2. If you're waiting for *N* elements to hydrate or appear →
   [`expect-poll-count.md`](./expect-poll-count.md).
3. Regardless, end the test with `await expectChapterA11y(page);` →
   [`axe-core.md`](./axe-core.md).

If a pattern doesn't fit, surface the gap rather than reaching for a
bare `{ timeout: N }` or `page.waitForTimeout(N)`. Those mask real
bugs and violate the SoTA-over-simple rule above.
