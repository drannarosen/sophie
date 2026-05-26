---
date: 2026-05-12T00:00:00.000Z
tags:
  - chrome
  - state
  - factory
  - astro
  - preferences
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-25"
  evidence:
    - kind: deployment
      ref: packages/astro/src/preferences/define.ts
      date: "2026-05-25"
      notes: "The `definePreference` factory shipped at the canonical path this ADR specifies. Returns the `{ read, write, subscribe, bindToggle, bootScript }` surface this ADR locks."
    - kind: deployment
      ref: packages/astro/src/preferences/sidebar.ts
      date: "2026-05-25"
      notes: "Sidebar preference consumer — the canonical first factory call exporting a singleton, exactly the pattern this ADR's example illustrates."
    - kind: deployment
      ref: packages/astro/src/preferences/theme.ts
      date: "2026-05-25"
      notes: "Theme (light/dark) preference consumer composed through the factory — second consumer paying for the abstraction."
    - kind: deployment
      ref: packages/astro/src/preferences/view-mode.ts
      date: "2026-05-25"
      notes: "View-mode preference consumer (Bucket B PR 5) — third consumer, confirming the factory paid for itself across the 4+ Bucket B preferences this ADR queued."
    - kind: deployment
      ref: packages/astro/src/preferences/right-sidebar.ts
      date: "2026-05-25"
      notes: "Right-sidebar preference consumer — fourth singleton, all five chrome preferences now flow through the factory shape locked here."
    - kind: deployment
      ref: packages/astro/src/preferences/disclosures.ts
      date: "2026-05-25"
      notes: "Disclosures preference consumer — fifth singleton; the factory surface scaled across Bucket B without re-litigation."
    - kind: test
      ref: packages/astro/src/preferences/define.test.ts
      date: "2026-05-25"
      notes: "Unit tests on the factory itself exercise the localStorage round-trip + attribute-reflection + cross-tab sync invariants this ADR specifies."
  notes: |
    The `definePreference` factory shipped and scaled to five consumers
    (sidebar, theme, view-mode, right-sidebar, disclosures), each as a
    singleton export with the factory-returned surface. Companion test files
    per consumer (`theme.test.ts`, `view-mode.test.ts`) exercise the
    invariants the ADR locks.
---

# ADR 0036: `definePreference` factory + `resolve` / `resolveExpression` pattern

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[Bucket B PR 2 (#30)](https://github.com/drannarosen/sophie/pull/30)
extracted the chrome-state pattern from PR 1's hand-rolled
`<SidebarToggle>` into a generic factory at
[`packages/astro/src/preferences/define.ts`](../../../packages/astro/src/preferences/define.ts).
Bucket B PRs 5 (view modes), 7 (search), 8 (glossary
popovers), and 9 (cross-ref previews) all need
preference-shaped state with the same invariants:
localStorage round-trip, `data-*` attribute reflection,
cross-tab `storage` event sync, idempotent toggle binding,
and FOUC-free boot via an `is:inline` script.

[ADR 0032](0032-vanilla-js-chrome-state.md) locked the
"vanilla JS, not React" decision. [ADR 0031](0031-compound-component-layout-primitives.md)
locked the compound-component shape for primitives. This ADR
locks **the factory shape** that those primitives use.

## Decision

Chrome-state preferences in Sophie use the **`definePreference`
factory** from `@sophie/astro/preferences/define`. Each
preference is one factory call exporting a singleton:

```ts
export const sidebarPref = definePreference<"open" | "closed">({
  key: "sophie:sidebar",
  attribute: "data-sidebar",
  default: "open",
  values: ["open", "closed"],
  parse:  (raw) => (raw === "closed" ? "closed" : "open"),
  serialize: (v) => v,
});
```

The factory returns `{ read, write, subscribe, bindToggle,
bootScript }`. Invariants enforced by tests:

- `bootScript()` is a self-contained IIFE string; safe to
  embed multiple times; never throws.
- `bindToggle` is idempotent via a `data-sophie-pref-<key>`
  marker.
- Cross-tab `storage` listener is registered exactly once
  per preference per window.
- `subscribe(cb)` fires for both same-tab `write()` and
  cross-tab updates.

### Paired `resolve` + `resolveExpression`

For preferences whose **stored value doesn't 1:1 map to the
DOM attribute value** (e.g., theme: stored `"system"` →
attribute `"light"|"dark"` resolved via `matchMedia`), two
paired hooks live on `PreferenceOptions`:

| Hook | When it runs | Form |
|---|---|---|
| `resolve(stored) => attr` | Runtime; called by `write()` and the `storage` event handler | TypeScript function with closures |
| `resolveExpression: string` | Boot time; embedded inside the `is:inline` IIFE in `<TextbookHead>` | JavaScript source string; references local `stored` |

The runtime `resolve` function cannot be safely
stringified (closures, imports, etc.). `resolveExpression`
makes the boot logic match runtime explicitly, in source
form. Tests evaluate the generated boot string via
`new Function(script)()` to verify the two paths agree.

For 1:1 preferences (sidebar: stored value === attribute
value), both hooks are omitted; the factory defaults to
identity.

### Each new preference adds three things

1. A file at `packages/astro/src/preferences/<name>.ts`
   exporting one `definePreference(...)` singleton.
2. An import in `packages/astro/src/preferences/index.ts`.
3. One line in `<TextbookHead>` emitting
   `pref.bootScript(...)` as an `is:inline` script.

The toggle component (if any) imports the singleton and
calls `pref.bindToggle(button, cycleFn)`.

## Rationale

- **Reuse without copy-paste.** PR 1's hand-rolled
  SidebarToggle was ~50 LOC of inline IIFE; PR 2 reduced it
  to one factory call. PRs 5/7/8/9 each save the same ~50 LOC.
- **Invariants enforced once.** Idempotency, cross-tab sync,
  Safari-private-mode handling all live in the factory.
  New preferences don't risk regressions on those.
- **Boot-script-as-string is the only sound boot path.**
  `is:inline` scripts must be statically present at SSR
  time. A function-valued resolve can't be serialized;
  emitting source text from the factory is the smallest
  correct abstraction.
- **`resolve` + `resolveExpression` duplication is bounded.**
  Each preference defines them once; tests verify they agree.
  The alternative (compile-time codegen of boot scripts from
  function bodies) is real engineering for a 2-3 line saving.

## Alternatives considered

- **Per-primitive hand-rolled JS (PR 1's pattern).**
  Rejected after PR 1 — copy-paste drift surface; invariants
  re-implemented per primitive.
- **A React hook (`usePreference`).** Rejected per
  [ADR 0032](0032-vanilla-js-chrome-state.md): chrome state
  is vanilla JS; React-hook naming would invite misuse inside
  islands.
- **Compile-time codegen of boot scripts from function
  bodies.** Rejected: AST-walking + closure analysis +
  serialization at build time, vs. one extra source string
  per preference. Effort:value upside-down.
- **A single shared `chromeState` registry that internalizes
  all preferences.** Rejected: closes the door on per-primitive
  composition; fights the compound-component pattern
  (ADR 0031); makes adding a new preference a centralized
  surgery instead of a self-contained file.

## Consequences

**Easier:**

- Each Bucket B PR 5/7/8/9 adds ~30 LOC of preference
  configuration + a small toggle primitive, instead of
  re-implementing localStorage + storage events from scratch.
- Tests for new preferences follow the established pattern
  (one file per preference; vitest unit + Playwright e2e).
  The `define.test.ts` suite is the regression net for the
  factory itself.
- The factory pattern is documentable for AI authors (per
  [ADR 0030](0030-audience-and-ai-author-model.md)) — "to
  add a new chrome preference, define one of these."

**Harder:**

- `resolveExpression` must stay in sync with `resolve` by
  hand. Test discipline mitigates: every preference that
  ships a `resolveExpression` should test that the generated
  boot script and the runtime resolve produce the same
  attribute value for representative stored values.
- The factory's API surface grew during PR 2 (`values`,
  `resolveExpression`, `BootScriptOptions.defaultExpression`).
  Future additions need to clear the same bar: real new
  preference required it, not speculative.

**Triggers:**

- PR 5 (view modes) is the next factory consumer. Likely
  shape: stored ∈ {default, focused, wide}; attribute same;
  no `resolve` needed; cycle button in top bar.
- PR 7 (search modal-open state) probably uses the factory
  for keyboard-shortcut-triggered open/closed, even though
  the modal content itself is React.
- PR 8 (glossary popover global "always-show" preference)
  may use the factory; per-term hover state stays component-
  local.

## References

- [PR #30](https://github.com/drannarosen/sophie/pull/30) —
  factory introduction + first two consumers.
- [ADR 0031](0031-compound-component-layout-primitives.md) —
  compound-component pattern that primitives wrapping the
  factory follow.
- [ADR 0032](0032-vanilla-js-chrome-state.md) — parent
  pattern; this ADR is its concrete factory shape.
- [ADR 0033](0033-is-inline-outside-react-island.md) — why
  `bootScript()` output goes in `<TextbookHead>` not inside
  any React island.
- [`packages/astro/src/preferences/define.ts`](../../../packages/astro/src/preferences/define.ts)
  — the factory.
- [Audit 2026-05-12](../../reviews/2026-05-12-bucket-b-pr2-audit.md)
  §"Architecture" — the architectural lift this pattern
  produced.
