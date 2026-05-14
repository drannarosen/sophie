---
date: 2026-05-12
tags: [chrome, state, performance, astro, react]
---

# ADR 0032: Vanilla JS + `data-*` attributes for chrome state (not React islands)

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

PR 1 (Bucket B) introduced the layout shell with a sidebar toggle.
Subsequent Bucket B PRs (2 theme toggle, 5 view modes, others)
will add more chrome interactions. The state powering these
interactions could live in:

1. React islands per primitive (`<SidebarToggle client:load />`,
   `<ThemeToggle client:load />`, etc.).
2. Vanilla JavaScript with state on `<html>` via `data-*`
   attributes.

React islands cost ~30 KB gzipped (React + react-dom + the
component) on every page load even when interactivity is rare.
Sophie's chrome interactions (toggle sidebar, switch theme, cycle
view mode) are simple state machines: click → flip a CSS
attribute. They do not need React's reconciler, concurrent
rendering, or context.

Astro's whole architecture is "islands" — interactivity where it's
needed, static everywhere else. Chrome state is exactly the
"static-with-rare-interactivity" case.

## Decision

Sophie's chrome state lives in **`data-*` attributes on `<html>`**,
managed by **vanilla JavaScript** (~30 LOC, ~0.5 KB total). React
islands are reserved for primitives that genuinely need React
features (e.g., the eventual Pagefind search modal in PR 7 with
focus trapping and complex keyboard handling).

Concretely, for each chrome state (sidebar, theme, view mode):

- An `is:inline` boot script in `<TextbookHead>` (lives in
  `<head>`) reads `localStorage` synchronously **before paint** and
  sets the `data-*` attribute. Prevents FOUC of the user's
  preference.
- A small client-side script in the toggle primitive (bundled by
  Astro from a `<script>` tag) wires the click handler. Persists
  to `localStorage` on change. Cross-tab sync via the `storage`
  event.
- CSS reads the `data-*` attribute (`:root[data-sidebar="closed"]
  .sophie-sidebar { … }`) for visual state. No JS reflow logic.

## Rationale

- **Performance.** ~0.5 KB chrome JS vs. ~30 KB for React. Real
  difference in first-paint and time-to-interactive on slow
  connections.
- **No FOUC.** Inline boot script in `<head>` sets state before
  paint. React islands hydrate after first paint, producing a
  visible flash of "wrong" state.
- **Astro idiomatic.** Aligns with Astro's island philosophy:
  static HTML + JS where needed.
- **Pedagogy components stay React.** `@sophie/components` (per
  [ADR 0027](0027-mdx-render-boundary-prop-threading.md)) is React.
  Chrome and pedagogy components live cleanly in different layers
  with different runtimes.
- **Testing pattern is clean.** Playwright e2e asserts data
  attribute + visual state. Vitest unit-tests any non-trivial
  pure-function helpers (e.g., the
  viewport-aware-default-resolver from PR 1's mobile fix-up).

## Alternatives considered

- **React islands per chrome primitive.** Rejected: ~30 KB cost
  for state that never needs React features; FOUC; over-coupled
  to the React renderer for primitives that are just
  toggle-and-persist.
- **Single React app for the entire chrome.** Rejected: same FOUC
  + bundle cost as per-primitive islands; also fights Astro's
  island model.

## Consequences

**Easier:**

- Each new chrome primitive is small: Astro markup + ~10–20 lines
  of vanilla JS in a `<script>` tag.
- Storybook stories for primitives are visually clean (no React
  hydration overhead in stories).
- Print stylesheet (PR 10) doesn't fight a React island for
  rendering control.

**Harder:**

- Vanilla JS that lives across primitives needs idempotency
  guards (the SidebarToggle script uses
  `:not([data-sophie-bound])` for this) — scripts may load
  multiple times if multiple toggles are on a page.
- Cross-state coordination (e.g., view mode and sidebar both
  affect the layout) requires CSS-variable orchestration, not
  React state.

**Triggers:**

- A subordinate constraint, separately documented in
  [ADR 0033](0033-is-inline-outside-react-island.md): `is:inline`
  scripts MUST live outside React islands or Astro's processing
  mangles them. The `<TextbookHead>` primitive exists for this
  reason.
- The empty-slot-collapse pattern
  ([ADR 0034](0034-empty-slot-collapse-pattern.md)) similarly
  uses Astro-side detection + CSS variables to avoid JS for layout
  decisions.
- Pagefind search modal (PR 7) is the *one* primitive that
  legitimately needs React (focus trapping, keyboard arrow nav,
  complex modal state) — that PR's brainstorm will revisit
  whether to use Radix Dialog (already a dep per
  [ADR 0019](0019-radix-ui-primitives.md)) or hand-roll.

## References

- [PR #29](https://github.com/drannarosen/sophie/pull/29) —
  first vanilla-JS chrome state implementation.
- [overview.md §18](../overview.md) — book-theme layout + view
  modes design intent.
- [ADR 0027](0027-mdx-render-boundary-prop-threading.md) —
  pedagogy components stay React per ADR 0004.
- [ADR 0019](0019-radix-ui-primitives.md) — Radix UI as the
  React-side primitive library when React is genuinely needed.
