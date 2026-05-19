---
date: 2026-05-13T00:00:00.000Z
tags:
  - chrome
  - state
  - astro
  - bundling
  - gotcha
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0037: Cross-bundle chrome communication via DOM attributes + MutationObserver

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie's chrome layer (per
[ADR 0032](0032-vanilla-js-chrome-state.md)) ships as vanilla JS
inside one or more Astro `<script>` tags. Each `<script>` tag in
a separate `.astro` file becomes its **own JavaScript bundle** in
Astro's build output — modules imported by these scripts are
duplicated across bundles, and module-level singletons such as
[`viewModePref`](../../../packages/astro/src/preferences/view-mode.ts)
are *not* shared.

[Bucket B PR 6 (#35)](https://github.com/drannarosen/sophie/pull/35)
surfaced this concretely while wiring the `<Aside>` docking
script. The docking script lives inside `<TextbookLayout>`'s
`<script>` tag because aside positioning is a layout-level
concern; the script needed to re-position asides whenever the
view mode changed. The natural first draft —

```ts
// Inside packages/astro/src/lib/aside-positioning/install-positioning.ts
import { viewModePref } from "../preferences";
viewModePref.subscribe(scheduleReposition);
```

— compiled cleanly, passed unit tests, but **silently failed at
runtime in the integrated chapter**. The view-mode toggle would
update `data-view-mode` on `<html>`, but the docking script's
subscriber would never fire.

Investigation: Astro bundles `<TextbookLayout>`'s `<script>`
separately from `<ViewModeToggle>`'s `<script>`. Each bundle gets
its own copy of `viewModePref`. The toggle's bundle calls
`pref.write()` on *its* singleton; the layout's bundle subscribes
to *its* singleton. Two singletons → subscription on the wrong
one → silent failure. (Storage events, the cross-tab signal, only
fire across browsing contexts, not same-tab — so they don't bridge
the gap either.)

Same-bundle observation always works because there's only one
singleton in that bundle. PRs 1–5 didn't hit this because each
chrome primitive's state was observed by the same primitive (e.g.
`<ThemeToggle>`'s script reads `themePref` to update its own
aria-label). PR 6 is the first chrome behavior where the
*consumer* of state lives in a different `.astro` file than the
*owner* of that state.

## Decision

Sophie chrome scripts use **two distinct mechanisms** for observing
preference state, chosen by whether the observer lives in the
same bundle as the writer:

| Scenario | Mechanism |
|---|---|
| Same `<script>` tag / same Astro `.astro` file | `pref.subscribe(cb)` — the JS-level API on the `definePreference` singleton (ADR 0036) |
| Different `<script>` tags / different `.astro` files | `MutationObserver` on `<html>`, filtered to the preference's `data-*` attribute |
| Cross-tab (same origin) | `storage` event — already wired by the factory (ADR 0036) |
| Synchronous one-shot read (any context) | `document.documentElement.dataset.X` — DOM attribute is the truth source |

The DOM attribute is the **canonical truth source** for chrome
state. The factory's `applyAttribute()` runs on every `write()`,
so the attribute is always up-to-date for every same-tab observer
regardless of which bundle wrote it. JS singletons are
per-bundle conveniences over that truth.

Concrete pattern for cross-bundle observers:

```ts
// packages/astro/src/lib/aside-positioning/install-positioning.ts
function scheduleReposition(): void { /* … */ }

const htmlObserver = new MutationObserver(scheduleReposition);
htmlObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-view-mode", "data-sidebar"],
});

// Synchronous one-shot reads use the DOM, not the singleton:
const mode = document.documentElement.dataset.viewMode;
```

`MutationObserver` callbacks batch into microtasks, so multiple
attribute changes in the same tick coalesce into a single
callback. The pattern is roughly as cheap as a direct subscription
for typical chrome-state mutation rates (clicks, keyboard
shortcuts) — orders of magnitude below the rate at which
`MutationObserver` becomes a measurable cost.

## Rationale

- **The DOM attribute already exists.** ADR 0036's factory writes
  to `data-*` on `<html>` on every `write()`. Adding a
  `MutationObserver` is observing an existing signal, not
  introducing a new one.
- **The signal is bundle-agnostic.** Any script in any bundle on
  the same page sees the same DOM mutation. Cross-tab is already
  covered by storage events at the factory layer.
- **Same-bundle observation stays cheap.** The mechanism only
  switches to `MutationObserver` when the bundle boundary forces
  it. PRs 1–5 keep direct `pref.subscribe()`; they don't pay any
  cost for this rule.
- **Pure JS singletons remain useful** for typed
  read/write/cycle APIs (e.g. `viewModePref.write(nextViewMode(cur))`
  in `<ViewModeToggle>`'s script). The factory contract is
  unchanged; only the *cross-bundle observation channel* is
  re-routed.
- **No new abstraction needed.** No bus, no event emitter, no
  global registry. The DOM attribute *is* the bus.

## Alternatives considered

- **Custom DOM events** (`document.dispatchEvent(new CustomEvent('sophie:view-mode-change', {detail: ...}))`).
  Rejected: requires the *writer* to dispatch in addition to
  writing the attribute. Adds API surface to the factory. Storage
  events + DOM attribute changes already give us same-tab and
  cross-tab signals; CustomEvent is a third channel for the
  same information.
- **A shared in-memory registry** (`window.__sophiePrefs`).
  Rejected: leaks chrome state into the global namespace; the
  registry has to be initialized before any consumer reads it
  (timing-fragile across bundles); doesn't solve the underlying
  issue that the singleton-per-bundle problem applies to the
  registry too.
- **Single-bundle compilation** of all chrome scripts via an Astro
  plugin or configuration tweak. Rejected: fights Astro's
  per-component bundling model; the per-script bundle is
  desirable for tree-shaking and lazy execution. Forcing a single
  bundle for all chrome scripts would couple unrelated primitives
  (the search modal in PR 7 doesn't need theme code to load).
- **React Context across islands.** Rejected: chrome is not
  React (ADR 0032). Even if it were, Astro islands are isolated
  React trees; Context doesn't bridge them.

## Consequences

**Easier:**

- PRs 7 (search modal needs view-mode for keyboard handling) and
  8 (glossary popovers may coordinate with theme) inherit a
  clear pattern. They cite this ADR rather than re-discovering
  the bundling issue at integration time.
- AI authors per [ADR 0030](0030-audience-and-ai-author-model.md)
  get a documentable rule: "when in doubt about subscription,
  observe the DOM attribute."
- Test discipline: cross-bundle behavior is testable via the
  integrated chapter (Playwright e2e), and the pure positioning
  algorithm is testable in isolation (Vitest). Each layer has a
  clean test harness.

**Harder:**

- New observers must remember the `attributeFilter` array
  matches the preference's `attribute` config exactly. Typos
  fail silently. Mitigation: keep a brief inline comment naming
  the source preference.
- The DOM attribute is now load-bearing for cross-bundle
  observers, so accidental DOM manipulation that removes the
  attribute (e.g. a third-party script clearing dataset on
  `<html>`) would break observers. Low risk; Sophie controls
  its chrome surface end-to-end.

**Should existing PRs (1–5) refactor to this pattern?**

**No.** Each PR's chrome state is owned by the same primitive
that observes it — same `<script>` bundle, same singleton.
Direct `pref.subscribe()` is the lighter, correct mechanism
there. Refactoring would replace efficient direct subscriptions
with heavier DOM observations to solve a problem those PRs
don't have. The rule: **prefer the lightest synchronization
primitive that solves the actual coordination problem**.

**Triggers:**

- PR 7 (search modal): the modal lives in its own primitive but
  needs to react to view-mode (e.g. close modal when entering
  Focused mode? open behavior tied to layout state?). If yes,
  the modal's bundle observes `data-view-mode` per this ADR.
- PR 8 (glossary popovers): per-term hover is local to each
  popover, but a hypothetical "always-show definitions"
  preference would be cross-bundle.
- PR 9 (cross-reference previews): positioning previews relative
  to anchor is analogous to PR 6's aside docking — cross-bundle
  by the same logic.
- Future Phase 3 AI-authoring surface (per ADR 0030): if the
  authoring runtime needs to observe chrome state from a
  separate bundle, it follows this pattern.

## References

- [PR #35](https://github.com/drannarosen/sophie/pull/35) —
  introduced the pattern via the aside-positioning script.
- [`packages/astro/src/lib/aside-positioning/install-positioning.ts`](../../../packages/astro/src/lib/aside-positioning/install-positioning.ts)
  — first consumer; observe `data-view-mode` + `data-sidebar`.
- [ADR 0032](0032-vanilla-js-chrome-state.md) — vanilla JS
  chrome layer; this ADR refines its cross-bundle observation
  semantics.
- [ADR 0036](0036-define-preference-factory-pattern.md) — factory
  pattern; same-bundle `pref.subscribe()` is the in-bundle
  observation primitive that this ADR complements.
- [Astro docs — Script bundling](https://docs.astro.build/en/guides/client-side-scripts/)
  — Astro's per-script bundling behavior that motivated this ADR.
