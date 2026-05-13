---
title: PR 5 — `<ViewModeToggle>` (Default / Focused / Wide) + Lucide icon adapter
date: 2026-05-12
status: approved
phase: 2 (Bucket B / front-end shell)
pr-branch: feat/view-modes
predecessor: PR #33 (in-page ToC + mobile drawer)
---

# PR 5 — `<ViewModeToggle>` + two-adapter Lucide icon convention (design doc)

## Context

Bucket B's seventh-of-ten chrome features:
[`overview.md` §18](../website/overview.md) specifies three
user-toggleable view modes that progressively trade chrome
for canvas, and [the audit at PR-2 closure](../reviews/2026-05-12-bucket-b-pr2-audit.md)
schedules it as the third consumer of the
[`definePreference`](../../packages/astro/src/preferences/define.ts)
factory ratified by
[ADR 0036](../website/decisions/0036-define-preference-factory-pattern.md).

| Mode | Sidebar | Right column | Content cap | Use case |
|---|---|---|---|---|
| `default` | follows `sidebarPref` | visible (ToC + future asides) | `min(75ch, 100%)` | typical reading |
| `focused` | forced hidden | hidden | `min(85ch, 100%)` | long-form prose |
| `wide` | forced hidden | hidden | `min(105ch, 100%)` | code/figure-heavy chapters; projection |

State is CSS-only orchestrated via `data-view-mode` on
`<html>`. No JavaScript reaches across preferences: when
Focused/Wide hides the sidebar, `sidebarPref` is **untouched**,
so cycling back to Default reveals the sidebar in whatever
state the user last left it. This preserves overview.md §18's
"independent toggles" contract.

PR 5 has two outcomes:

1. **Ship `<ViewModeToggle>`**: the third primitive built on
   `definePreference`. Exercises the factory's no-resolve
   path (stored value === attribute value), making it the
   canonical minimum-shape example.

2. **Introduce the two-adapter Lucide icon convention**: this
   PR is the smallest possible vehicle for codifying how
   icons enter `@sophie/astro` (vanilla, via `lucide-static`'s
   SVG-string imports) versus `@sophie/components` (React,
   via `lucide-react` — deferred to a follow-up PR). Today
   every chrome icon is hand-inlined. Three primitives in,
   the inconsistency surface is small enough that the
   refactor cost is bounded; six more primitives are coming
   in Bucket B PRs 6–10 plus Phase 2+ work, and waiting
   compounds drift.

The work also refactors `<SidebarToggle>` (hamburger) and
`<ThemeToggle>` (sun / moon / half-circle) to source their
SVGs from `lucide-static`'s `Menu`, `Sun`, `Moon`, and
`SunMoon` icons. PR 1's 8-case textbook-layout e2e suite +
PR 2's 10-case theme-toggle e2e suite are the regression
nets — no behavior changes, only the SVG source.

## Forks pinned during planning (2026-05-12, in-thread)

Locked patterns inherited (not re-litigated):

- `definePreference` factory for chrome state
  ([ADR 0036](../website/decisions/0036-define-preference-factory-pattern.md)).
- Vanilla JS + `data-*` on `<html>`, no React
  ([ADR 0032](../website/decisions/0032-vanilla-js-chrome-state.md)).
- Boot script lives in `<TextbookHead>`
  ([ADR 0033](../website/decisions/0033-is-inline-outside-react-island.md)).
- Compound-component pattern: ship both assembled + primitives
  ([ADR 0031](../website/decisions/0031-compound-component-layout-primitives.md)).
- AI-as-author primary audience
  ([ADR 0030](../website/decisions/0030-audience-and-ai-author-model.md)) —
  the minimum-shape `definePreference` call documents the
  pattern for AI authors.

Five forks resolved via `AskUserQuestion`:

| Fork | Decision | Rationale |
|---|---|---|
| Keyboard shortcut | **`v` alone, with input-focus guard** | Textbook-UX idiom (Slack/Twitter/Gmail). Guard skips `input`/`textarea`/`[contenteditable]`; persistence makes accidental presses low-cost to undo. |
| `<SidebarToggle>` in Focused/Wide | **Hidden via CSS** (`display: none`) | Per overview.md §18: "Default mode supports per-element toggles" — the per-element toggle is only meaningful in Default. Avoids dead UI. |
| Icon style | **Three bespoke column-shape SVG icons** | Three-cols / one-narrow / one-wider — maps directly to what the layout does. No Lucide equivalent fits; bespoke icons live in `packages/astro/src/icons/view-mode.ts`. |
| Top-bar trailing order | **ViewMode then Theme** (left-to-right) | Layout-shape control first, color second — matches cognitive order "how is this page laid out → what colors am I reading it in". CSS `> :first-child + *` rule already pushes second child right; third child sits beside via existing `gap`. |
| Icon strategy (cross-cutting) | **Lucide everywhere via two adapters: `lucide-static` (chrome) + `lucide-react` (pedagogy)** | Single icon vocabulary across the platform. `lucide-static` exports SVG strings (no React); aligns with ADR 0032. `lucide-react` for `@sophie/components` is out of scope for PR 5 — listed under follow-ups. ADR 0037 direct-pushed post-merge, codifying shipped reality. |

### Why ADR 0032 still holds (asked in-thread)

The factory boundary preserves optionality. If we ever
need to flip chrome to React, a `usePreference(pref)` hook
wraps the same `read` / `write` / `subscribe` contract;
toggle components rewrite to consume the hook instead of
`bindToggle`. The factory's external surface doesn't change.
Today, FOUC prevention + ~30KB bundle savings + Astro
idiomatic alignment outweigh React's reconciler/concurrent
features — none of which chrome state uses. We revisit when
a chrome primitive accumulates form-state complexity or
when vanilla JS chrome surface climbs past ~500 LOC of
state code (currently ~150).

## Component & API design

### `viewModePref` — minimum-shape `definePreference` call

```ts
// packages/astro/src/preferences/view-mode.ts
import { definePreference } from "./define";

export type ViewModeStored = "default" | "focused" | "wide";

export const viewModePref = definePreference<ViewModeStored>({
  key: "sophie:view-mode",
  attribute: "data-view-mode",
  default: "default",
  values: ["default", "focused", "wide"],
  parse: (raw) =>
    raw === "focused" || raw === "wide" ? raw : "default",
  serialize: (v) => v,
});

export function nextViewMode(cur: ViewModeStored): ViewModeStored {
  if (cur === "default") return "focused";
  if (cur === "focused") return "wide";
  return "default";
}

/**
 * Global keyboard shortcut: `v` cycles view mode. Skipped when
 * focus is inside text-entry surfaces. Idempotent via a
 * window-level guard (matches the matchMedia pattern in
 * theme.ts:78).
 */
export function installViewModeKeyboardShortcut(): () => void;
```

**No `resolve`** — stored value is the attribute value
verbatim. This makes `viewModePref` the canonical
minimum-shape example for the factory; sidebar uses
`defaultExpression` for viewport-awareness, theme uses
`resolve` + `resolveExpression` for matchMedia. View-mode
uses neither.

### Input-focus guard

```ts
function shouldSkipShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (target.isContentEditable) return true;
  return false;
}
```

The handler also skips when modifier keys are pressed
(`event.metaKey`, `event.ctrlKey`, `event.altKey`) — both
to avoid hijacking system shortcuts like Cmd+V (paste) and
to keep the shortcut single-finger.

### `<ViewModeToggle>` primitive

Cycle button in the top bar; aria-label reflects current
mode ("View: default" / "View: focused" / "View: wide"). Three
stacked bespoke SVG icons; CSS shows one at a time based on
`[data-view-mode-pref]` (the **stored** value, matching
`<ThemeToggle>`'s `[data-theme-pref]` pattern).

```astro
<button
  type="button"
  class="sophie-view-mode-toggle"
  data-sophie-view-mode-toggle
  data-view-mode-pref="default"
  aria-label="View: default"
>
  <Fragment set:html={ViewModeDefaultIcon} />
  <Fragment set:html={ViewModeFocusedIcon} />
  <Fragment set:html={ViewModeWideIcon} />
</button>
<script>
  import {
    installViewModeKeyboardShortcut,
    nextViewMode,
    viewModePref,
  } from "../preferences";
  // syncUI, bindToggle pattern matches ThemeToggle.
  installViewModeKeyboardShortcut();
</script>
```

### Icon module layout

```
packages/astro/src/icons/
  index.ts        — re-exports Lucide SVG strings + bespoke icons under a uniform surface
  view-mode.ts    — bespoke ViewModeDefault/Focused/Wide column-shape SVG strings
  icons.test.ts   — vitest smoke: each export starts with `<svg` and has a `viewBox`
```

`index.ts` is the only file primitives import from.
Re-exported names use Sophie-namespaced PascalCase
(`Menu`, `Sun`, `Moon`, `SunMoon`, `X`, plus
`ViewModeDefault`, `ViewModeFocused`, `ViewModeWide`).
Future Lucide additions in PRs 6–10 (e.g., `Search`,
`BookOpen`, `Hash`) land here.

### TextbookHead delta

One additional `<script is:inline>` line, sourced from the
factory:

```astro
---
import { sidebarPref, themePref, viewModePref } from "../preferences";

const sidebarBoot = sidebarPref.bootScript({
  defaultExpression: "(window.innerWidth < 768 ? 'closed' : 'open')",
});
const themeBoot    = themePref.bootScript();
const viewModeBoot = viewModePref.bootScript();
---
<script is:inline set:html={sidebarBoot} />
<script is:inline set:html={themeBoot} />
<script is:inline set:html={viewModeBoot} />
```

### TextbookLayout delta

Default `topbar-trailing` slot gains `<ViewModeToggle />`
before `<ThemeToggle />`:

```astro
<slot name='topbar-trailing'>
  <ViewModeToggle />
  <ThemeToggle />
</slot>
```

The existing TopBar CSS rule (`> :first-child + *` →
`margin-inline-start: auto`) handles the layout: the second
child (ViewModeToggle) gets the auto-margin, the third
(ThemeToggle) sits beside it via the existing `gap: 0.75rem`.
No CSS surgery required.

### CSS orchestration

```css
/* Content cap per mode. */
:root[data-view-mode="focused"] .sophie-content {
  max-inline-size: min(85ch, 100%);
}
:root[data-view-mode="wide"] .sophie-content {
  max-inline-size: min(105ch, 100%);
}

/* Focused + Wide collapse both side columns regardless of sidebarPref. */
:root[data-view-mode="focused"] .sophie-shell,
:root[data-view-mode="wide"]    .sophie-shell {
  --sophie-sidebar-w: 0;
  --sophie-right-w: 0;
}
:root[data-view-mode="focused"] .sophie-sidebar,
:root[data-view-mode="wide"]    .sophie-sidebar {
  visibility: hidden;
  border-inline-end: 0;
}
:root[data-view-mode="focused"] .sophie-right,
:root[data-view-mode="wide"]    .sophie-right {
  visibility: hidden;
  border-inline-start: 0;
}

/* Hide the per-element sidebar toggle when its target is force-hidden. */
:root[data-view-mode="focused"] .sophie-sidebar-toggle,
:root[data-view-mode="wide"]    .sophie-sidebar-toggle {
  display: none;
}

/* Icon swap by stored value (mirrors ThemeToggle's pattern). */
.sophie-view-mode-icon {
  display: none;
}
.sophie-view-mode-toggle[data-view-mode-pref="default"] .sophie-view-mode-icon-default,
.sophie-view-mode-toggle[data-view-mode-pref="focused"] .sophie-view-mode-icon-focused,
.sophie-view-mode-toggle[data-view-mode-pref="wide"]    .sophie-view-mode-icon-wide {
  display: inline-block;
}
```

Mobile (≤768px) is unchanged: the existing media query
already collapses to a single column with sidebar as a
slide-over and `.sophie-right { display: none }`. View
modes have no visual effect on mobile, matching overview.md
§18 ("Default and Focused render identically on mobile;
Wide is always full-width"). The toggle remains visible so
state persists across viewport changes.

## Files

**New:**

- `packages/astro/src/preferences/view-mode.ts` — `viewModePref`, `nextViewMode`, `installViewModeKeyboardShortcut`
- `packages/astro/src/preferences/view-mode.test.ts` — vitest unit (16 cases)
- `packages/astro/src/components/ViewModeToggle.astro` — primitive
- `packages/astro/src/icons/index.ts` — uniform icon export surface (Lucide + bespoke)
- `packages/astro/src/icons/view-mode.ts` — bespoke column-shape SVG strings
- `packages/astro/src/icons/icons.test.ts` — vitest smoke (shape regression net)
- `examples/smoke/e2e/view-modes.spec.ts` — Playwright e2e (12 cases)

**Modified:**

- `packages/astro/src/preferences/index.ts` — re-export view-mode bindings
- `packages/astro/src/components/TextbookHead.astro` — third `bootScript()` line
- `packages/astro/src/components/TextbookLayout.astro` — default trailing slot adds `<ViewModeToggle />`
- `packages/astro/src/components/SidebarToggle.astro` — swap inline hamburger SVG to `Menu` from icons module
- `packages/astro/src/components/ThemeToggle.astro` — swap inline sun/moon/half SVGs to `Sun` / `Moon` / `SunMoon` from icons module
- `packages/astro/src/styles/textbook-layout.css` — view-mode CSS rules + `.sophie-view-mode-toggle` styles
- `packages/astro/package.json` — add `lucide-static` dep; add new exports

## TDD plan

**Red phase — failing tests first:**

1. **Vitest** `preferences/view-mode.test.ts` (16 cases):
   - parse: null/focused/wide/garbage → expected values (4 cases)
   - serialize: roundtrip (1 case)
   - cycle: default→focused→wide→default (3 cases)
   - keyboard shortcut: pressing `v` body-focused triggers write
   - keyboard guard: input / textarea / contenteditable skip (3 cases)
   - capital `V` fires; Cmd/Ctrl+V does NOT (2 cases)
   - idempotent install (1 case)
   - boot-script eval: stored null/focused/wide/garbage/localStorage-throws (single multi-case test)

2. **Vitest** `icons/icons.test.ts`:
   - each exported icon string starts with `<svg`
   - each exported icon string contains `viewBox=`

3. **Playwright e2e** `view-modes.spec.ts` (12 cases per the plan).

**Green phase** — minimal implementation to pass.

**Refactor phase** — swap SidebarToggle + ThemeToggle SVGs to Lucide. PR 1's 8-case textbook-layout + PR 2's 10-case theme-toggle e2e suites are the safety net.

## Verification

```bash
pnpm exec turbo run typecheck test:unit build
pnpm --filter smoke test:e2e        # 58 prior + 12 new = 70 green
pnpm exec biome check                # zero warnings AND zero errors
pnpm --filter smoke dev               # manual smoke:
#   - cycle ViewModeToggle: aria-label syncs, sidebar/right collapse, content width changes
#   - press `v` body-focused: cycles
#   - focus an <input>, press `v`: does NOT cycle
#   - reload: mode preserved
#   - open second tab, cycle in tab A: tab B's data-view-mode updates
#   - in Focused/Wide, SidebarToggle is hidden
#   - cycle to Default with sidebarPref="closed": sidebar stays closed
#   - cycle to Default with sidebarPref="open":   sidebar opens
```

## Cadence checkpoints (per HITL mandate)

Stop and report back after each of:

1. Branch created + this design doc committed (current step).
2. `lucide-static` installed + `packages/astro/src/icons/` scaffolded + icons.test.ts green.
3. `view-mode.test.ts` cases 1–8 written + failing → confirm shape.
4. view-mode.ts factory call + nextViewMode green.
5. Keyboard shortcut tests + impl green.
6. e2e cases 1–2 green (toggle renders + cycles) → confirm UX before adding CSS orchestration.
7. CSS orchestration green (e2e cases 3–7) → confirm visuals.
8. Cross-tab + keyboard e2e green (cases 8–12).
9. SidebarToggle + ThemeToggle migrated to Lucide; PR 1 + PR 2 e2e baselines still green.
10. PR opened → monitor CI; report status.

## Out of scope (deferred)

- **`lucide-react` adoption in `@sophie/components`**: a separate follow-up PR. Pedagogy components currently inline a few SVGs; the refactor is mechanical but lives in a different package and review scope.
- **ADR 0037** codifying the two-adapter rule: direct-pushed *after* PR 5 lands, matching the ADRs-codify-shipped-patterns cadence used by ADRs 0030–0034 + 0035–0036.
- **`<Aside>` margin notes** (PR 6) — Focused/Wide have no margin column to dock to; the inline-collapse fallback per overview.md §18 belongs in PR 6.
- **Print stylesheet** (PR 10) — print should override view mode to a Wide-like full-content rendering; PR 10's scope.
- **Reduced-motion preference toggle**: not chrome state in the same shape.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Bespoke view-mode icons look inconsistent next to Lucide neighbors | Hand-tune to Lucide's stroke-width (2) + 20×20 viewBox; visual smoke during checkpoint 7 |
| `lucide-static` adds noticeable bundle weight | Per-icon imports tree-shake; 5 icons ≈ 1–2KB total. Verify via `pnpm --filter smoke build` output size after refactor. |
| Keyboard shortcut `v` collides with screen-reader navigation | NVDA + VoiceOver use single-key shortcuts only when forms-mode is off; our guard exits early on contenteditable. Manual a11y smoke at checkpoint 5. |
| View-mode + sidebar pref cross-state confusion (user toggles sidebar in Focused, then cycles to Default) | The CSS hides — does not write — sidebar state. Cycling to Default reveals sidebarPref's last value. e2e cases 5+6 lock this contract. |
| `lucide-static` import shape changes between versions | `icons.test.ts` smoke catches the regression; pinned exact version in package.json |

## ADR follow-up

Direct-push after PR 5 merges: **ADR 0037 — two-adapter
Lucide icon convention**. Codifies the rule that
`@sophie/astro` chrome imports from `lucide-static` (SVG
strings, no React), and `@sophie/components` pedagogy
imports from `lucide-react` (when that refactor lands).
Cites this design doc + PR 5 commit as shipped evidence.
