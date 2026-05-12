---
title: PR 2 — `definePreference` helper + `<ThemeToggle>` primitive
date: 2026-05-12
status: approved
phase: 2 (Bucket B / front-end shell)
pr-branch: feat/use-preference-and-theme-toggle
predecessor: PR #29 (layout shell foundation)
---

# PR 2 — `definePreference` helper + `<ThemeToggle>` primitive (design doc)

## Context

PR 1 ([#29](https://github.com/drannarosen/sophie/pull/29)) shipped the
layout shell with a [`<SidebarToggle>`](../../packages/astro/src/components/SidebarToggle.astro)
whose chrome-state logic (`data-sidebar` on `<html>` + localStorage +
`storage` event cross-tab sync) was hand-rolled inline inside the
component. Bucket B PRs 2–10 each add more chrome interactions (theme,
view modes, search, etc.) that share that exact pattern. Without an
extraction, each new toggle copies ~30 lines of vanilla JS and grows
the combinatorial drift surface.

PR 2 has two outcomes:

1. **Extract** `definePreference` — a typed factory that encapsulates
   the data-attribute + localStorage + cross-tab sync + boot-script
   pattern. Per [ADR 0032](../website/decisions/0032-vanilla-js-chrome-state.md),
   chrome state is vanilla JS on the page, not React; the factory
   reflects that (it is *not* a React hook, hence `definePreference`
   not `usePreference`).

2. **Ship** `<ThemeToggle>` — the first new primitive built on
   `definePreference`. Drives `data-theme="light"|"dark"` on `<html>`,
   which the existing `@sophie/theme` CSS custom-property layer
   (per [ADR 0005](../website/decisions/0005-theming-three-layers.md))
   already maps to visual state. Tri-state model: `system` / `light` /
   `dark`, defaulting to `system` and following the OS via
   `matchMedia('(prefers-color-scheme: dark)')` while in system mode.

The work also migrates the existing `<SidebarToggle>` to consume
`definePreference`, eliminating dual-shape drift before it sets in —
in line with the project's no-back-compat-pre-launch posture: drop
legacy, refactor call sites, don't ship dual-shape bridges.

## Forks pinned during brainstorm (2026-05-12)

Locked patterns inherited from prior ADRs (not re-litigated):

- Boot scripts live in `<TextbookHead>`, not a separate `<ThemeHead>`
  ([ADR 0033](../website/decisions/0033-is-inline-outside-react-island.md)
  Triggers section).
- Vanilla JS + `data-*` on `<html>`
  ([ADR 0032](../website/decisions/0032-vanilla-js-chrome-state.md)).
- localStorage + `storage` event cross-tab sync (pattern from PR 1).
- CSS `:root[data-theme="dark"]` overrides handled by `@sophie/theme`
  ([ADR 0005](../website/decisions/0005-theming-three-layers.md));
  no JS-side variable plumbing needed.

Four forks resolved via `AskUserQuestion`:

| Fork | Decision | Rationale |
| --- | --- | --- |
| API shape + naming | **Factory `definePreference(...)`** returning `{ read, write, subscribe, bindToggle, bootScript }`. | Renamed from `usePreference` because the chrome is vanilla JS (ADR 0032); `use*` naming would invite misuse inside React islands. |
| Theme state model | **Tri-state: `system` / `light` / `dark`**, defaulting to `system`. | matchMedia listener keeps `data-theme` live-synced with the OS while stored value is `system`. Aligns with overview.md §15 (no normative affordance — `system` is first-class). |
| Boot structure | **One `<script is:inline>` per preference** in TextbookHead. | Each preference owns its boot via `pref.bootScript()`. Isomorphic with the compound-component pattern ([ADR 0031](../website/decisions/0031-compound-component-layout-primitives.md)). ~250-byte IIFE-wrapper overhead at 3 prefs is negligible. |
| Module layout | **`packages/astro/src/preferences/`** subfolder. | `define.ts` for the factory; `theme.ts` and `sidebar.ts` for instances; `index.ts` re-exports. Scales for PR 5's view-mode preference. |

## Component & API design

### `definePreference` factory

```ts
// packages/astro/src/preferences/define.ts

export interface PreferenceOptions<TStored, TAttr extends string = string> {
  /** localStorage key, e.g. "sophie:theme". */
  key: string;
  /** data-* attribute name on <html>, e.g. "data-theme". */
  attribute: string;
  /** Default stored value when no localStorage entry exists. */
  default: TStored;
  /** Parse a raw localStorage value (may be null) into the typed stored value. */
  parse: (raw: string | null) => TStored;
  /** Serialize the stored value back to a string for localStorage. */
  serialize: (value: TStored) => string;
  /**
   * Optional mapper from stored value to attribute value.
   * For tri-state preferences (theme: stored 'system' → attribute 'light'|'dark')
   * this resolves at boot and on change. Defaults to identity (cast to string).
   */
  resolve?: (stored: TStored) => TAttr;
}

export interface Preference<TStored> {
  read(): TStored;
  write(next: TStored): void;
  subscribe(cb: (next: TStored) => void): () => void;
  bindToggle(el: HTMLElement, cycle: (current: TStored) => TStored): void;
  /** IIFE string suitable for <script is:inline> in TextbookHead. */
  bootScript(): string;
}

export function definePreference<TStored>(
  opts: PreferenceOptions<TStored>,
): Preference<TStored>;
```

**Key invariants** (enforced by tests, not just docs):

- `bootScript()` output is a self-contained IIFE; safe to embed
  multiple times; never throws (wraps the localStorage read in
  try/catch, matching SidebarToggle's Safari-private-mode behavior).
- `bindToggle` is idempotent via a `data-sophie-bound` attribute on
  the button (matching PR 1's pattern at
  [SidebarToggle.astro:68](../../packages/astro/src/components/SidebarToggle.astro)).
- Cross-tab `storage` listener is registered exactly once per
  preference per window (window-level guard, generalizing PR 1's
  `__sophieSidebarStorageBound`).
- `subscribe(cb)` fires for both same-tab writes (via `write()`) and
  cross-tab updates (via `storage` event).

### Concrete preferences

```ts
// packages/astro/src/preferences/sidebar.ts
export const sidebarPref = definePreference<"open" | "closed">({
  key: "sophie:sidebar",
  attribute: "data-sidebar",
  default: "open", // viewport-aware override stays in TextbookHead boot
  parse: (raw) => (raw === "closed" ? "closed" : "open"),
  serialize: (v) => v,
});
```

```ts
// packages/astro/src/preferences/theme.ts
export type ThemeStored = "system" | "light" | "dark";
export type ThemeAttr   = "light" | "dark";

export const themePref = definePreference<ThemeStored>({
  key: "sophie:theme",
  attribute: "data-theme",
  default: "system",
  parse: (raw) =>
    raw === "light" || raw === "dark" || raw === "system" ? raw : "system",
  serialize: (v) => v,
  resolve: (stored) => (stored === "system" ? systemTheme() : stored),
});

function systemTheme(): ThemeAttr {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// Theme-specific extra: live OS switching while stored === 'system'.
// Wired by ThemeToggle's component script (runs client-side only).
export function installSystemThemeListener(): () => void { /* ... */ }
```

### `<ThemeToggle>` primitive

A cycle button (`system → light → dark → system`) in the top bar.
Aria-label dynamically reflects current state ("Theme: system, click
to switch to light"). Visual icon switches with state. No React; ~20
LOC of vanilla JS in a `<script>` tag, matching SidebarToggle's shape.

```astro
<button
  type="button"
  class="sophie-theme-toggle"
  data-sophie-theme-toggle
  aria-label="Theme: system"
>
  <!-- inline SVG icons; CSS swaps which is visible via data-theme -->
</button>
<script>
  import { themePref, installSystemThemeListener } from "../preferences";
  // bindToggle on every button; install matchMedia listener once.
</script>
```

### TextbookHead delta

Current TextbookHead has a hand-rolled `is:inline` for sidebar.
Replace with one `is:inline` per preference, sourced from
`pref.bootScript()`:

```astro
---
import { sidebarPref, themePref } from "../preferences";
const sidebarBoot = sidebarPref.bootScript({ /* viewport-aware default */ });
const themeBoot   = themePref.bootScript();
---
<script is:inline set:html={sidebarBoot} />
<script is:inline set:html={themeBoot} />
```

Sidebar's viewport-aware default (mobile-default-closed) stays — it's
passed as an option to `bootScript`, which gains an optional
`defaultExpression: string` hook for injecting a fallback expression.

## Files

**New:**

- `packages/astro/src/preferences/define.ts` — factory
- `packages/astro/src/preferences/define.test.ts` — vitest unit
- `packages/astro/src/preferences/sidebar.ts` — sidebarPref instance
- `packages/astro/src/preferences/theme.ts` — themePref + matchMedia helper
- `packages/astro/src/preferences/theme.test.ts` — vitest unit for theme parse/resolve
- `packages/astro/src/preferences/index.ts` — barrel re-exports
- `packages/astro/src/components/ThemeToggle.astro` — primitive
- `examples/smoke/e2e/theme-toggle.spec.ts` — Playwright e2e

**Modified:**

- `packages/astro/src/components/SidebarToggle.astro` — replace inline
  IIFE with `sidebarPref.bindToggle(...)`
- `packages/astro/src/components/TextbookHead.astro` — emit per-preference
  `bootScript()` instead of inline IIFE
- `packages/astro/src/components/TopBar.astro` — include `<ThemeToggle />`
  in the default composition (next to `<SidebarToggle />`)
- `packages/astro/package.json` / `packages/astro/src/index.ts` —
  re-exports as needed; `preferences/` defaults to internal-only for PR 2
- `examples/smoke/e2e/textbook-layout.spec.ts` — no functional change
  expected; suite is the regression net for the SidebarToggle migration

## TDD plan

**Red phase — failing tests first:**

1. **Vitest** `preferences/define.test.ts`:
   - `read()` returns default when localStorage is empty.
   - `read()` returns parsed value when set.
   - `write(v)` persists to localStorage AND sets data-attribute.
   - `write(v)` notifies subscribers in same tab.
   - Storage event from another tab notifies subscribers.
   - `bindToggle` is idempotent across multiple calls.
   - `bootScript()` returns a parseable IIFE that, when eval'd in a
     JSDOM `window`, sets `data-*` correctly under all 3 cases:
     stored=null (→ default), stored=valid, stored=invalid (→ default).
   - localStorage throw (Safari private mode) is swallowed; default
     is applied.

2. **Vitest** `preferences/theme.test.ts`:
   - `parse` handles all valid + invalid inputs.
   - `resolve('system')` returns 'light' when matchMedia is mocked light.
   - `resolve('system')` returns 'dark' when matchMedia is mocked dark.
   - `resolve('light')` returns 'light' unconditionally.
   - matchMedia change event re-applies attribute ONLY when stored
     value is `'system'`.

3. **Playwright e2e** `theme-toggle.spec.ts`:
   - Initial load with empty localStorage: `data-theme` matches system
     `prefers-color-scheme`.
   - Click toggle: cycles `system → light → dark → system`; both
     `data-theme` and stored value update accordingly.
   - Reload preserves stored state.
   - Cross-tab: open second tab; toggling in tab A updates tab B's
     `data-theme` within one event loop tick (via `storage` event).
   - axe-core: zero violations on the new toggle.

**Green phase** — minimal implementation to pass.

**Refactor phase** — migrate SidebarToggle + TextbookHead to use the
factory; the existing 34-test PR 1 suite is the safety net (no
regressions allowed).

## Verification

Before claiming PR 2 complete:

```bash
pnpm exec turbo run typecheck test:unit build   # all packages green
pnpm exec biome check                            # clean
pnpm exec biome format --write                   # no diff after
pnpm --filter smoke test:e2e                     # 34 prior + new suite green
pnpm --filter smoke dev                          # manual smoke:
#   - theme toggle cycles correctly
#   - reload preserves stored value
#   - open two tabs, toggle in one, watch the other update
#   - dev-tools: localStorage['sophie:theme'] reflects choice
#   - dev-tools: <html data-theme="..."> updates live
#   - DevTools "Emulate prefers-color-scheme: dark" with stored='system'
#     flips data-theme without changing storage
```

CI gates (must stay green): typecheck, test:unit, build, biome check,
Playwright e2e, axe-clean.

## Cadence checkpoints (per HITL mandate)

Stop and report back after each of:

1. Branch created + this design doc committed (the current step).
2. Red tests written + failing → confirm shape before implementing.
3. `definePreference` green → confirm shape before refactoring.
4. SidebarToggle migration green (34-test suite still green) →
   confirm no regressions before adding ThemeToggle.
5. ThemeToggle green + e2e passing → confirm UX before opening PR.
6. PR opened → monitor CI; report status.

## Out of scope (deferred)

- Reduced-motion handling beyond what tokens already provide.
- High-contrast theme variant (token-level work; not a chrome PR).
- Theme-aware syntax highlighting (Shiki dual-theme mode);
  Phase 2 follow-up touching `@sophie/theme` build.
- Concept-map / mind-map theming (Phase 2+ component work).
- View-mode preference (PR 5).
- `<ThemeToggle>` placement anywhere other than the default `<TopBar>`.

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| SidebarToggle migration regresses PR 1 behavior | 34-test e2e suite from PR 1 must stay green; that's the safety net |
| `bootScript()` string-gen is fragile to escape bugs | Vitest evaluates the returned string in JSDOM as part of the unit suite |
| matchMedia listener leaks across HMR reloads in dev | Same idempotency pattern as PR 1's `__sophieSidebarStorageBound` (window-level guard) |
| Tri-state UX feels weird with one cycle button | Smoke-test during checkpoint 5; if rough, fall back to binary in this PR and revisit |
| Theme + sidebar inline scripts run in wrong order | Independent (different attributes, different keys); order does not matter — verified by test |

## ADR follow-up

If the `resolve()` mapper convention proves load-bearing — likely,
since view modes in PR 5 will want similar indirection (stored =
`default` / `focused` / `wide`, attribute = same) — write a small ADR
0035 capturing the pattern post-merge, direct-push per docs bypass.
Not required for PR 2 itself.
