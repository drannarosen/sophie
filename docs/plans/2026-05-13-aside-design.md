---
title: PR 6 — `<Aside>` Tufte-style margin notes
date: 2026-05-13
status: approved
phase: 2 (Bucket B / front-end shell)
pr-branch: feat/aside-component
predecessor: PR #34 (view modes + Lucide adapter)
---

# PR 6 — `<Aside>` Tufte-style margin notes (design doc)

## Context

Bucket B PR 6 ships
[`overview.md` §16 / §18](../website/overview.md)'s margin-aside
feature. The first PR in Bucket B that lives in
`@sophie/components` (React, pedagogy-layer) rather than
`@sophie/astro` (chrome) — `<Aside>` is inline-authored MDX
content, not a top-bar toggle. Co-evolves with the existing
right column (PR 4's `<TocSidebar>`).

| Mode / viewport | Aside rendering |
|---|---|
| Desktop Default mode | Docked in the right column at the vertical position of its MDX anchor paragraph, alongside the sticky ToC at top |
| Desktop Focused mode | Inline collapsed `<details>` in document flow |
| Desktop Wide mode | Inline collapsed `<details>` |
| Mobile (<768px) | Inline collapsed `<details>` |

Per the established pattern in [ADR 0032](../website/decisions/0032-vanilla-js-chrome-state.md),
the **positioning machinery** is vanilla JS in `@sophie/astro`
(the chrome layer); the **React component** holds the content,
schema, and visual styling.

## Five forks pinned during planning (2026-05-13, in-thread)

| Fork | Decision |
|---|---|
| Package location | **`@sophie/components`** for the React `<Aside>` content component; **`@sophie/astro`** for the vanilla-JS docking script + the `<AsideDocker />` host element |
| Variants | **Full 4-variant set**: `note` / `definition` / `digression` / `key-insight` |
| Title | **Optional `title` prop** matching `Callout`'s API |
| Positioning (desktop Default) | **Docked in right column** alongside ToC, vertically aligned to anchor via vanilla-JS scroll-spy + absolute positioning + collision-avoidance cascade |
| Inline fallback (mobile + Focused + Wide) | **`<details>`** with summary line (clickable to expand) |

Locked patterns inherited (not re-litigated): ADRs 0030–0036.
New chrome-layer JS follows the same idempotency + window-guard
discipline established by PRs 1–5.

## API design

```ts
// @sophie/components/Aside.schema.ts
export const AsideKind = z.enum([
  "note",
  "definition",
  "digression",
  "key-insight",
]);

export const AsidePropsSchema = z.object({
  kind: AsideKind.optional(),     // default "note"
  title: z.string().optional(),
  children: z.custom<ReactNode>(),
});
```

```mdx
<Aside kind="definition" title="Parallax">
  The apparent shift in a star's position due to Earth's motion
  around the Sun. Foundational to the first rung of the cosmic
  distance ladder.
</Aside>
```

### Component render contract

Renders **once** as a `<details>` element in document flow at
its MDX position. The `<details>` carries:

- `class="sophie-aside sophie-aside--<kind>"`
- `data-sophie-aside` (positioning hook)
- `data-aside-kind`
- `data-aside-title` (if provided)
- `<summary>` carries the kind's default label OR the title

```html
<details class="sophie-aside sophie-aside--definition"
         data-sophie-aside
         data-aside-kind="definition">
  <summary class="sophie-aside-summary">
    <span class="sophie-aside-marker">Definition</span>
    <span class="sophie-aside-title">Parallax</span>
  </summary>
  <div class="sophie-aside-body">
    The apparent shift in a star's position…
  </div>
</details>
```

### Visual rendering across modes (CSS-only orchestration)

| Selector | Behavior |
|---|---|
| `.sophie-aside` (base) | `<details>` collapsed by default; summary visible; subtle border, kind-specific accent color |
| `:root[data-view-mode="default"] .sophie-aside` (desktop ≥768px) | `position: absolute; inset-inline-end: …; inline-size: 240px; top: <computed>` — escapes into right-column area; `open` attribute forced via `details[data-sophie-aside]::details-content` rules + JS sets `open`; summary visually hidden |
| `@media (max-width: 768px) .sophie-aside`, `:root[data-view-mode="focused"|"wide"] .sophie-aside` | `position: static; inline-size: 100%; display: block` — inline collapsed `<details>` per fork 5 |

The CSS-only orchestration mirrors PR 5's view-mode CSS:
`data-view-mode` on `<html>` drives the visual rule; no JS
reaches across preferences.

## Positioning machinery

A new module
[`packages/astro/src/lib/aside-positioning.ts`](../../packages/astro/src/lib/aside-positioning.ts)
ships the vanilla-JS docking logic. Pure function plus an
`installAsidePositioning()` lifecycle hook.

### Algorithm

```
on (initial load OR viewport resize OR data-view-mode change OR DOM mutation):
  if (active mode allows docking):
    asides = document.querySelectorAll('.sophie-aside[data-sophie-aside]')
    placed = []
    for each aside in document order:
      anchor = aside.previousElementSibling OR aside.closest(...).previousElementSibling
              // The paragraph immediately preceding the aside in source order.
      anchorTop = anchor.getBoundingClientRect().top + window.scrollY
      proposedTop = anchorTop
      if (placed.length > 0):
        lastBottom = placed[-1].top + placed[-1].height + GAP
        proposedTop = max(proposedTop, lastBottom)
      aside.style.top = `${proposedTop}px`
      placed.push({ top: proposedTop, height: aside.offsetHeight })
  else:
    asides.forEach(a => a.style.top = '')   // CSS handles inline rendering
```

### Hook lifecycle

- `installAsidePositioning()` — idempotent via
  `window.__sophieAsideDockBound`. Listens to:
  - `window` `resize`
  - `viewModePref.subscribe(...)` (re-position when mode flips)
  - `MutationObserver` on `.sophie-content` for DOM changes
  - `ResizeObserver` on each aside (height changes from
    user-toggled `<details>`)
- Returns a cleanup that detaches all listeners + clears the
  window guard (matches `theme.ts`'s
  `installSystemThemeListener` pattern).

### Where the script runs

Wired by `<TextbookHead>`'s sibling primitive `<TextbookFoot>`
(NEW in this PR), placed at the end of `<body>` so the DOM is
fully parsed before the script runs. Alternative considered:
embedding inside `<AsideDocker>` (NEW) which renders inside
`<RightColumn>` — rejected because the script needs to operate
on the whole document, not just one slot.

## Right-column composition update

`<RightColumn>` now hosts TWO occupants in Default mode:

- `<TocSidebar>` at top (sticky, PR 4) — UNCHANGED
- Absolute-positioned asides escape into the column area via
  the positioning script; they overlay the column visually but
  remain inline in the DOM at their MDX-authored position

No portal / no React tree mutation. The positioning script
treats the right column as a coordinate target, not a DOM
parent. This is why a separate `<AsideDocker>` host is NOT
needed; CSS reserves visual space, JS computes coordinates.

## File inventory

### New files

| Path | Purpose |
|---|---|
| `packages/components/src/components/Aside/Aside.tsx` | React component (renders `<details>` with kind + title) |
| `packages/components/src/components/Aside/Aside.schema.ts` | Zod schema for `AsideProps` + `AsideKind` enum |
| `packages/components/src/components/Aside/Aside.schema.test.ts` | Schema rejection tests (variant validation, title type, etc.) |
| `packages/components/src/components/Aside/Aside.contract.ts` | Runtime contract (`audit()` stub; no domain invariants yet) |
| `packages/components/src/components/Aside/Aside.module.css` | Scoped styles: base + 4 kind variants + inline-fallback rules |
| `packages/components/src/components/Aside/Aside.test.tsx` | RTL behavior tests (renders summary; uses kind label; supports title; respects open/closed state) |
| `packages/components/src/components/Aside/Aside.stories.tsx` | Storybook stories (4 kinds × 2 states = 8 stories; all axe-clean) |
| `packages/components/src/components/Aside/index.ts` | Barrel |
| `packages/astro/src/lib/aside-positioning.ts` | Vanilla-JS docking script |
| `packages/astro/src/lib/aside-positioning.test.ts` | Vitest cases for the pure positioning algorithm (collision avoidance, anchor resolution, idempotency) |
| `examples/smoke/e2e/aside.spec.ts` | Playwright cases for the full integrated behavior (10+ cases) |

### Modified files

| Path | Change |
|---|---|
| `packages/components/src/index.ts` | Re-export `Aside`, `AsideKind`, `AsideProps`, `AsidePropsSchema` |
| `packages/astro/src/index.ts` | Re-export `installAsidePositioning` + `<AsideDocker>` (if needed) |
| `packages/astro/src/components/TextbookLayout.astro` | Wire the docking script via a new `<script>` block OR import via `<TextbookHead>` extension |
| `packages/astro/src/styles/textbook-layout.css` | Reserve right-column space for absolute-positioned asides; ensure `.sophie-shell` is `position: relative` so absolute children anchor correctly |
| `packages/astro/tsup.config.ts` | Add `lib/aside-positioning` entry |
| `examples/smoke/src/content/chapters/spoiler-alerts.mdx` | Add 2–3 `<Aside>` instances of different kinds to give e2e + visual smoke something to test |
| `examples/smoke/src/components/staticComponents.ts` (or wherever `makeStaticComponents` is configured) | Register `Aside` in the MDX component scope |
| `packages/astro/package.json` | Possibly add `./lib/aside-positioning` to exports |

## TDD plan

Same iron-law discipline as PR 5: red → green → refactor per
test cycle.

### Unit tests

**`Aside.schema.test.ts`** (~8 cases):
- `parse({ kind: "note" })` succeeds
- `parse({ kind: "definition", title: "Parallax" })` succeeds
- `parse({ kind: "invalid" })` rejects
- `parse({ title: 123 })` rejects (title must be string)
- `parse({})` succeeds (kind defaults to "note" at render time)
- `parse({ children: <p>x</p> })` succeeds
- AsideKind enum has exactly the 4 expected values
- Schema is `safeParse`-friendly (no thrown exceptions on malformed input)

**`Aside.test.tsx`** (~10 cases, RTL):
- Default renders as `<details>` with no `open` attr (collapsed)
- Default summary shows the kind's label ("Note")
- `kind="definition"` + `title="Parallax"` shows "Definition: Parallax" or similar layout
- Body content renders inside `.sophie-aside-body`
- Element has `role="note"` or appropriate ARIA
- Each kind variant applies the matching CSS class
- Schema rejection of unknown kind triggers prop-types-style warning (or just defaults to "note")
- `data-sophie-aside` marker present (positioning hook)
- Storybook stories axe-clean for all 4 kinds (delegated to `*.stories.tsx`)

**`aside-positioning.test.ts`** (~12 cases, JSDOM):
- Pure positioning function: given 1 aside + 1 anchor, returns `top = anchor.offsetTop`
- Given 2 asides with non-overlapping anchors, both get their anchor's offsetTop
- Given 2 asides whose computed positions would overlap, second cascades down by `previous.bottom + GAP`
- Given 0 asides, returns empty result (no throw)
- Anchor resolution: aside's immediately-preceding sibling, OR closest preceding section/heading
- Re-runs on `viewModePref` change (mode flipping default → focused clears top values)
- Idempotent install (window guard); double-install no-ops
- Cleanup detaches resize + mutation + viewModePref listeners
- Listens to MutationObserver on `.sophie-content`
- Listens to ResizeObserver on each aside (height changes)
- Skips positioning when viewport < 768px
- Skips positioning when `data-view-mode` is focused or wide

### E2E tests

**`aside.spec.ts`** (~10 cases):
- Smoke chapter renders the 2-3 `<Aside>` instances; each is in the document
- Desktop Default: asides have `top` style set, positioned in the right-column visual area
- Desktop Default: clicking an aside's summary toggles `open` (default browser `<details>` behavior; should still work even in docked mode)
- Cycling view mode to Focused: asides return to inline `<details>` (collapsed by default)
- Resize from desktop → mobile: asides re-render inline; `top` style cleared
- Two asides anchored to consecutive paragraphs do not overlap (collision-avoidance cascade)
- Scroll-spy: scrolling the page does NOT cause aside top values to change (asides are anchored to absolute scroll position, not viewport)
- axe-core: zero violations on each aside in each kind
- axe-core: docked-mode asides still meet contrast / role / label requirements
- Asides survive a reload + view-mode change cycle without losing position

## Verification

```bash
pnpm exec turbo run typecheck test:unit build   # 13/13 green
pnpm install --frozen-lockfile                   # CI gate, per memory pre-pr-lockfile-check
pnpm exec biome check .                          # zero warnings, zero errors
pnpm test:e2e                                    # 70 prior + 10 new = 80 green
```

Manual smoke via Playwright MCP / browser:
- Reload spoiler-alerts; verify asides positioned in right column
- Toggle view mode to Focused → asides fall inline; back to Default → re-dock
- Resize from 1440px to 600px → asides flip to inline at 768px
- Click summary of inline aside → opens; close → collapses

## Cadence checkpoints (per HITL mandate)

Stop and report back after each of:

1. Branch + this design doc committed (current step).
2. `Aside.schema.ts` + schema tests green; component skeleton renders.
3. CSS variants + Storybook stories axe-clean.
4. `aside-positioning.ts` unit tests green (pure algorithm).
5. Smoke chapter integrates 2-3 asides; e2e cases 1-2 green.
6. CSS + positioning script wired; e2e cases 3-7 green (docked behavior).
7. Mode-flip + resize + collision e2e cases green (8-10).
8. Full local verification + push + PR.
9. Merge on green CI.

## Known risks / mitigations

| Risk | Mitigation |
|---|---|
| Asides + ToC vertically collide in the right column | ToC is sticky-positioned at top of right column; asides position absolutely below it. Cascade reserves space; if vertical capacity exceeded, asides extend below the visible right column (page scroll). Acceptable v1. |
| Multiple asides clustered tightly cascade into next section's space | Acceptable v1; visual review during checkpoint 6 will surface bad cases. P3 follow-up if it's actually a problem. |
| `details` `open` attribute conflict between docked + inline modes | In docked mode, summary is visually hidden + `open` enforced via CSS / `details::content` rules. Toggling is moot. |
| Mutation observer fires too frequently during prose-load animations | Debounced via `requestAnimationFrame`; positioning recompute is O(asides), tiny. |
| Browser without `IntersectionObserver` / `ResizeObserver` | Both are Baseline-2017+; Sophie's audience uses modern browsers. No polyfill needed. |
| Right column reserved width too narrow for some asides (long quotes) | Aside max-inline-size capped at 240px; longer content wraps. Reaching the cap is an authoring concern, not a layout bug. |

## Out of scope (deferred)

- **Footnote / endnote popovers** (overview.md §16 item L). Different interaction model (hover preview, no docking). Separate PR.
- **Numbered margin asides** (Tufte's "(1)", "(2)" markers). Adds counter + cross-ref complexity; skip for v1 — title-as-anchor suffices.
- **Long-aside chunking** (collapse > N lines). Add when authoring practice surfaces actual long asides.
- **Aside-to-aside cross-references**. Outside the v1 scope.
- **Right-column "asides also dock" alongside ToC** as a layout pattern persisted per-chapter. The CSS architecture would support it but the schema doesn't expose it.

## ADR follow-up

If the docking script proves load-bearing (as the
`definePreference` factory did in PR 2), write a small ADR
post-merge codifying the
**"vanilla-JS DOM-coordinate-driven layout adapter" pattern**
that this PR introduces. Similar pattern likely needed for
Bucket B PR 9 (`<ChapterRef>` / `<EqRef>` hover previews —
also need positioning relative to anchor). Direct-push per the
ADRs-codify-shipped-patterns cadence.
