---
date: 2026-05-09T00:00:00.000Z
tags:
  - components
  - mdx
  - hydration
  - persistence
  - astro
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0027: MDX-rendered React components are isolated SSR roots; data threads as props

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Step 6 of Phase 0 (per [ADR 0023](0023-vertical-slice-build-order.md))
shipped `@sophie/astro` with a "one-big-island-per-chapter"
architecture: every chapter wraps in `<SophieChapter client:load>`,
which provides three context providers — `SophieConfigProvider`
(course + chapter), `ProfileProvider`, `FigureRegistryProvider` — and
the entire chapter content was assumed to render inside that React
tree.

Step 7's vertical-slice acceptance — rendering the trimmed first
ASTR 201 reading with 6 interactive `<Callout>` instances — proved the
assumption wrong:

1. Astro 6 + `@astrojs/mdx@5` renders MDX content as **Astro
   server-side**, not React.
2. React components inside MDX (`<Callout>`, `<Figure>`) get their own
   `renderToStaticMarkup` SSR pass, **outside** any `client:load`
   parent's React tree.
3. Context providers from `<SophieChapter>` therefore **do not
   propagate** to MDX-rendered components. `useInteractive` →
   `useSophieConfig` threw at SSR time, before the page reached the
   browser.
4. Astro's `<Content components={…}>` map cannot carry hydration
   directives — `client:load` is a compile-time JSX attribute, not a
   runtime metadata field. The components map can only render static
   server-side React; persistence-bearing components need their own
   per-instance hydration boundary.

This is the exact discovery [ADR 0023](0023-vertical-slice-build-order.md)
designed step 7 to expose. Without it, the broken architecture would
have been ratified in Phase 1's first real chapter migration.

## Decision

**Persistence-bearing components are per-instance React islands and
receive course/chapter/id as props, not context.** Static components
flow through Astro's `<Content components>` map; interactive components
must be imported inside the MDX file and used with `client:load`.

Concretely:

- `<Callout>` is split into `<Callout>` (static, no persistence) and
  `<InteractiveCallout>` (persistence-bearing, requires `course`,
  `chapter`, `id`, used with `client:load`).
- `useInteractive` takes `(course, chapter, componentKey, initial)` —
  course/chapter as args, profile from `ProfileContext`.
- `<Figure>` takes `registry` as an optional prop. The `@sophie/astro`
  `makeStaticComponents({ figures })` factory binds the registry into
  a closure that consumers pass as the `<Content components>` map.
- `SophieConfigContext` and `FigureRegistryContext` are **deleted**.
  `ProfileContext` remains because Phase-5 instructor-mode UX is
  still scoped above the MDX boundary (the wrapper or the page) and
  the default `"student"` is correct for Phase 0.
- `<SophieChapter>` is reduced to a CSS-side-effects shell wrapper
  (theme.css + components/styles.css + katex.css). It carries no
  load-bearing state.

## Rationale

- **It is the only pattern that compiles.** The static map + per-MDX
  `client:load` pattern is the official Astro 6 + @astrojs/mdx
  pattern; alternatives we evaluated (lazy-import the component-mapping
  inside the integration hook; consumer-side `vite.ssr.noExternal`)
  fail at config-load time or at the React-tree boundary.
- **Persistence stays correct.** ADR 0007's `useInteractive` →
  `IndexedDBResponseStore` → `BroadcastChannel` chain still applies;
  course and chapter are now threaded explicitly rather than read from
  context that can't reach the call site.
- **The single Astro coupling point ([ADR 0001](0001-platform-not-monorepo.md))
  becomes more honest.** `@sophie/astro` now exports a
  `makeStaticComponents` factory and a CSS-shell wrapper — both
  consumer-facing helpers — and stops pretending to provide chapter
  context that doesn't reach where it's needed.
- **The framework-purity rule for `@sophie/components` ([ADR 0004](0004-component-contract-revisions.md))
  holds.** Components stay React-pure; the integration package owns
  the Astro-coupling.

## Alternatives considered

- **Custom Astro renderer that hides `client:load` from authors.**
  - Pros: chapter authors don't write hydration directives; closer to
    the original "single big island" promise.
  - Cons: significant engineering (a Vite plugin or custom MDX
    renderer); blocks Phase 0 acceptance.
  - Rejected for Phase 0; queued as Phase 1+ work before
    `drannarosen/astr201`'s first chapter ships, where author-DX
    matters at scale.

- **Lazy-import the component map inside `astro:config:setup` so static
  imports don't fire at config-load.**
  - Pros: small change to `@sophie/astro`.
  - Cons: dynamic imports inside the setup hook still load through
    Node ESM, not Vite, so the CSS side-effect crash recurs as soon as
    the hook fires; doesn't fix the SSR-context-boundary issue.
  - Rejected: tested and failed during step 7 execution.

- **Drop interactive `<Callout>` for Phase 0; ship static-only smoke
  target.**
  - Pros: smallest change.
  - Cons: skips ADR 0023's "persistence is observably exercised"
    acceptance bullet; defers the architectural finding without
    locking in a fix.
  - Rejected: violates the point of the vertical slice.

- **Pause and re-plan.**
  - Pros: most thorough.
  - Cons: ADR 0023 was designed exactly to surface this; the fix is
    self-contained; pausing burns days for what fits in half a day.
  - Rejected after considering: the props-based pivot is small enough
    to land directly.

## Consequences

**Easier:**

- `<InteractiveCallout>` is unambiguous in source — the prop list
  shows where state lives.
- The component contract pattern is exercised twice (static + interactive
  variants), which de-risks the contract architecture for Phase 1's
  ~14 remaining components.
- The single bundled `@sophie/components/styles.css` (replacing
  per-component CSS side-effects) matches industry patterns (MUI,
  Chakra) and makes Vite/Rollup happy in both build and SSR.
- `defineSophieIntegration()` can absorb consumer-side Vite stopgaps
  (`ssr.noExternal`, `rollupOptions.external`), keeping consumer
  `astro.config.ts` files minimal.

**Harder:**

- Chapter authors include `import { InteractiveCallout }` per MDX file
  and write `client:load course="…" chapter="…" id="…"` per call
  site. This is acceptable for Phase 0's smoke-target throwaway and
  for hand-authored Phase 1 content; it scales poorly to AI-authored
  chapters or course-wide automation. A custom MDX wrapper or remark
  plugin is the queued Phase-1 fix.
- `<SophieChapter>` is now ceremonial in Phase 0 (a CSS shell). The
  `client:load` directive on it carries no hydration state. Documented
  in the wrapper's JSDoc; revisit when Phase 1+ adds chapter-level
  React state (e.g., a profile selector UI).
- Phase 5's instructor-mode toggle now needs an explicit prop-or-page-
  state mechanism, not a single context flip. Documented as deferred.

**Triggers:**

- ADRs 0001, 0004, 0007 are unchanged in their architectural
  commitments; only the *implementation pattern* of how data reaches
  components inside MDX changes. None require revision.
- Phase 0 step 10 updates the relevant package READMEs and `myst.yml`
  TOC entry.
- Phase 1's chapter-authoring DX work (`drannarosen/astr201`) is
  expected to motivate a Sophie-specific MDX preprocessing layer that
  auto-injects `client:load` and the course/chapter props on
  `<Interactive*>` JSX names. Triggered before `astr201`'s first real
  chapter ships.

## References

- [ADR 0001](0001-platform-not-monorepo.md): single Astro coupling
  point — `@sophie/astro` owns the integration; `@sophie/components`
  is framework-pure.
- [ADR 0004](0004-component-contract-revisions.md): component contract
  + `useInteractive` helper. The hook's signature changes here from
  context-reading to course/chapter-as-args; the contract pattern is
  unchanged.
- [ADR 0007](0007-persistence-indexeddb.md): IndexedDB +
  `ResponseStore` + BroadcastChannel persistence. Unchanged; this ADR
  only changes how `useInteractive` *receives* the course/chapter
  identifiers.
- [ADR 0023](0023-vertical-slice-build-order.md): vertical-slice-first
  build order. This finding is the canonical demonstration of why ADR
  0023 was the right call — the broken assumption was caught by
  rendering one real chapter end-to-end, not by reasoning ahead.
- Step 7 implementation plan:
  `~/.claude/plans/we-are-continuing-sophie-sharded-oasis.md` (the
  pivoted plan that drove this decision).
- Astro 6 documentation on `<Content components>` and MDX hydration:
  components map cannot carry hydration directives.
