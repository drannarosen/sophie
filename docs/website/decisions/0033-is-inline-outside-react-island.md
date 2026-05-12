---
status: accepted
date: 2026-05-12
deciders: [anna]
supersedes: ~
superseded-by: ~
tags: [astro, react, ssr, scripts, gotcha]
---

# ADR 0033: `is:inline` scripts MUST live outside React islands

## Context

PR 1 (Bucket B) initially placed an `is:inline` boot script
(synchronous state-from-localStorage read) inside the
`<TextbookLayout>` Astro component. `<TextbookLayout>` is
typically rendered inside the consumer's `<SophieChapter
client:load>` wrapper (a React island per
[ADR 0027](0027-mdx-render-boundary-prop-threading.md)).

The behavior was wrong:

- The script TEXT was visibly mangled in the rendered HTML. The
  IIFE wrapper was stripped; only fragment statements remained.
- The script *did not run*; localStorage persistence appeared
  broken because the boot read never fired.

Investigation traced this to React's SSR processing of the
`<SophieChapter>`'s `<slot>` contents. Astro's `is:inline`
directive is an Astro-compile-time hint; React's renderer doesn't
recognize it and processes the inner script through its HTML
serialization path, which strips IIFE wrappers and breaks the JS.

## Decision

`is:inline` scripts MUST be rendered **outside** any React island.
For Sophie, this means: chrome boot scripts that need to run
synchronously before paint live in their own dedicated Astro
components placed inside the consumer's `<head>`, NOT inside any
React-rendered subtree.

Concrete pattern (used in PR 1):

```astro
<head>
  <TextbookHead />  {/* ships the is:inline boot script(s) */}
</head>
<body>
  <SophieChapter client:load>  {/* React island */}
    <TextbookLayout>
      <slot />  {/* chapter content */}
    </TextbookLayout>
  </SophieChapter>
</body>
```

A `<TextbookHead />` (or analogous) component is the canonical
location for any boot script that needs to fire before paint.

## Rationale

- **The behavior is non-obvious and load-bearing.** Without
  this pattern, every future Sophie chrome state machine (theme
  toggle in PR 2, view modes in PR 5, etc.) would silently fail
  to read localStorage on first paint and produce FOUC.
- **`<head>` is naturally outside any React island.** It also
  matches Astro's idiomatic placement for boot scripts (theme,
  fonts, analytics).
- **Component-scoped.** Each chrome primitive that needs a boot
  script ships its own `<*Head>` companion, kept in
  `@sophie/astro/components/*Head.astro`. Consumers compose them
  in `<head>` like any other meta primitive.

## Alternatives considered

- **Inline boot script in the consumer's `<head>` directly.**
  Rejected: forces every consumer to copy-paste the boot logic;
  divergence guaranteed; doesn't ship with the layout package.
- **Bundled `<script>` (no `is:inline`).** Astro bundles these as
  `type="module"` deferred scripts. Rejected: defers past first
  paint, producing FOUC of the user's persisted preferences.
- **Single global `<SophieHead>` component that bundles every boot
  script.** Plausible refactor for later; deferred until there are
  ≥3 boot-script consumers and a clear shared shape.

## Consequences

**Easier:**

- Future chrome primitives that need a boot script have a clear
  pattern: ship an `*Head.astro` companion.
- React islands' SSR behavior is no longer a hidden constraint —
  it's a documented architectural rule.

**Harder:**

- Consumers must remember to put `<TextbookHead />` (and future
  `*Head` companions) inside `<head>`. The compound-component
  pattern from [ADR 0031](0031-compound-component-layout-primitives.md)
  helps by encouraging consumers to `import` both.
- Phase 7's `templates/starter-textbook/` scaffolder must include
  the `<*Head />` placements in the default `ChapterLayout.astro`
  template.

**Triggers:**

- PR 2 (theme toggle) ships its own boot logic; combined into the
  same `<TextbookHead />` rather than a separate `<ThemeHead />`
  to keep the consumer surface small (one head primitive per
  layout family).
- PR 5 (view modes) similarly extends `<TextbookHead />`.
- The Sophie skill ecosystem and `sophie create textbook`
  scaffolder must surface this pattern as a first-class authoring
  step.

## References

- [PR #29](https://github.com/drannarosen/sophie/pull/29) — bug
  discovery + fix; the `<TextbookHead>` primitive was extracted
  during PR 1 review.
- [ADR 0027](0027-mdx-render-boundary-prop-threading.md) — React
  islands' SSR boundary is the analogous Astro/React-interop
  constraint.
- [ADR 0032](0032-vanilla-js-chrome-state.md) — vanilla JS chrome
  state pattern that depends on this.
- [Astro docs — Script directives](https://docs.astro.build/en/guides/client-side-scripts/)
  — official `is:inline` semantics.
