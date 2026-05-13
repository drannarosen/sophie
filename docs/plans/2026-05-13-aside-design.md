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

### Sixth decision: content-width responds to sidebar state

PR 6 also folds in a **content-width calibration** surfaced
during planning. Currently `.sophie-content` is capped at
`min(75ch, 100%)` regardless of sidebar state — when the user
collapses the sidebar to gain reading room, the prose stays
narrow and the freed 280px becomes left-margin whitespace.
That ignores user signal: collapsing the sidebar means "I want
more horizontal room."

The new rule:

| State | Content cap |
|---|---|
| Default mode, `data-sidebar="open"` | `min(75ch, 100%)` *(current; readability sweet spot per Bringhurst)* |
| Default mode, `data-sidebar="closed"` | `min(95ch, 100%)` *(grows into freed sidebar space; capped to stay under "long-line readability ceiling")* |
| Focused mode | `min(85ch, 100%)` *(PR 5; sidebar forced hidden)* |
| Wide mode | `min(105ch, 100%)` *(PR 5; sidebar forced hidden)* |

CSS implementation uses cascade order: the sidebar-closed rule
appears *before* the view-mode rules, so Focused/Wide
overrides win when active even with sidebar collapsed. The
right column remains 280px in all states; this calibration
only widens content, not asides.

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

**Authoring constraint**: `<Aside>` MUST be used at MDX root
scope (block-level), not inside a paragraph. The positioning
script relies on the aside's previous element sibling at the
document level to identify the anchor; inline use breaks that
contract. Documented in
[`docs/reference/chapter-components.md`](../website/reference/chapter-components.md)
post-merge. Schema-level enforcement is out of scope (Zod
doesn't see MDX context); the convention is documentation +
audit warning if an aside is found inside a `<p>` at build time.

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

### Visual rendering across modes

The visual mode flip is **CSS-only**, but the `open` attribute
on `<details>` is **set imperatively by the positioning script**
when entering / leaving docked mode (CSS cannot toggle a
boolean DOM attribute). The two mechanisms are paired:

| Selector | Behavior |
|---|---|
| `.sophie-aside` (base) | `<details>` collapsed by default; summary visible; subtle border, kind-specific accent color via CSS variable |
| `:root[data-view-mode="default"] .sophie-aside` (desktop ≥768px) | `position: absolute; inset-inline-end: 20px; inline-size: 240px; top: <set by JS>` — escapes into right-column area. Summary hidden via CSS (`display: none`). The positioning script sets the `open` attribute when entering docked mode so the body is visible; clears it when leaving. |
| `@media (max-width: 768px)` OR `:root[data-view-mode="focused"\|"wide"]` | `position: static; inline-size: 100%; display: block`. Summary visible, kind label + title rendered as a clickable disclosure. User toggles via Enter/Space (browser default for `<details>`). |

The `<details>` element has a built-in summary marker
(triangle) and `display: list-item` on the summary. Both need
CSS reset:

```css
.sophie-aside-summary {
  list-style: none;            /* hide the marker box */
  cursor: pointer;
  min-block-size: 44px;        /* WCAG touch-target minimum */
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.sophie-aside-summary::-webkit-details-marker { display: none; }
.sophie-aside-summary::marker { content: ""; }
```

The CSS-only mode orchestration mirrors PR 5's view-mode CSS:
`data-view-mode` on `<html>` drives the visual rule; no JS
reaches across preferences except where the DOM attribute on
`<details>` must be set imperatively.

## Positioning machinery

A new module
[`packages/astro/src/lib/aside-positioning.ts`](../../packages/astro/src/lib/aside-positioning.ts)
ships the vanilla-JS docking logic. Pure function plus an
`installAsidePositioning()` lifecycle hook.

### Algorithm

```
on (initial load OR viewport resize OR data-view-mode change OR DOM mutation):
  dockingMode = (window.innerWidth >= 768) &&
                (document.documentElement.dataset.viewMode === "default")
  if (dockingMode):
    tocBottom = toc ? (toc.offsetTop + toc.offsetHeight + GAP) : 0
    asides = document.querySelectorAll('.sophie-aside[data-sophie-aside]')
    placed = []
    for each aside in document order:
      // Anchor is the immediately-preceding root-level element. The
      // authoring constraint (block-level <Aside>) makes this well-defined.
      anchor = aside.previousElementSibling
      if (!anchor):
        // Aside is the first child; anchor to parent's offsetTop.
        anchor = aside.parentElement
      anchorTop = anchor.offsetTop          // relative to .sophie-shell
      proposedTop = max(anchorTop, tocBottom)
      if (placed.length > 0):
        proposedTop = max(proposedTop, placed[-1].top + placed[-1].height + GAP)
      aside.style.top = `${proposedTop}px`
      aside.open = true                     // ensure body is visible in docked mode
      placed.push({ top: proposedTop, height: aside.offsetHeight })
  else:
    asides.forEach(a => {
      a.style.top = ""                      // CSS reverts to static positioning
      a.open = false                        // collapse to summary-only in inline mode
                                            // (user can re-open via summary click)
    })
```

Key choices in the algorithm:

- **Coordinate space is `.sophie-shell`-relative** (using
  `offsetTop`), because that's the containing block for the
  absolute-positioned aside. `getBoundingClientRect()` would
  be viewport-relative; wrong frame.
- **`aside.open` is set imperatively** (per the render contract
  note above). CSS can hide the marker but cannot toggle the
  `open` attribute.
- **Anchor fallback to parent** handles the edge case of an
  aside being the first child of its container (rare but
  possible if a chapter opens with an aside).
- **Re-runs are O(n)** in the number of asides. For typical
  chapter counts (< 20 asides), this is sub-millisecond.

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

### ToC ↔ aside vertical-collision rule

The ToC is sticky-positioned at the top of the right column;
asides are absolute-positioned. They share visual real estate
but use different positioning models. Concrete collision rule:

- The positioning script reads `tocSidebar.offsetTop +
  tocSidebar.offsetHeight + GAP` once at install time (and on
  each resize). Call this `tocBottom`.
- Each aside's computed `top` is clamped to a minimum of
  `tocBottom`: `top = max(anchor.offsetTop, tocBottom,
  previousAside.bottom + GAP)`.
- Result: asides never overlap the ToC's natural-flow box,
  even if the ToC isn't currently scrolled-into-view (it might
  be — sticky position keeps it visible).

For visual clarity when the ToC sticks over a docked aside as
the user scrolls, `.sophie-toc` gets `z-index: 2` and
`.sophie-aside` gets `z-index: 1` so the ToC reads cleanly
when they momentarily occupy the same viewport region.

### Containing block: `.sophie-shell { position: relative }`

Absolute positioning requires a positioned ancestor as the
containing block. `.sophie-shell` (PR 1's grid root) currently
has no explicit `position` (defaults to `static`). PR 6 adds
`position: relative` to `.sophie-shell` so absolute children
anchor against the shell's bounding box. Side effect on PR 1+:
none — no descendant was relying on `static` as the containing
block. Verified by the 8-test textbook-layout suite continuing
to pass.

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
| `examples/smoke/e2e/aside.spec.ts` | Playwright cases for the full integrated `<Aside>` behavior (12 cases) |
| `examples/smoke/e2e/content-width.spec.ts` | Playwright cases for the new sidebar-driven content-cap rule (4 cases) |

### Modified files

| Path | Change |
|---|---|
| `packages/components/src/index.ts` | Re-export `Aside`, `AsideKind`, `AsideProps`, `AsidePropsSchema` |
| `packages/astro/src/index.ts` | Re-export `installAsidePositioning` + `<AsideDocker>` (if needed) |
| `packages/astro/src/components/TextbookLayout.astro` | Wire the docking script via a new `<script>` block OR import via `<TextbookHead>` extension |
| `packages/astro/src/styles/textbook-layout.css` | Reserve right-column space for absolute-positioned asides; ensure `.sophie-shell` is `position: relative` so absolute children anchor correctly |
| `packages/astro/tsup.config.ts` | Add `lib/aside-positioning` entry |
| `examples/smoke/src/content/chapters/spoiler-alerts.mdx` | Add **at least 3 `<Aside>` instances** spanning at least 2 different kinds, with at least 2 of them anchored to **consecutive paragraphs** so the collision-avoidance cascade is exercised end-to-end. Content is real chapter-relevant prose (parallax definition, observational-history digression, etc.), not lorem ipsum. |
| `examples/smoke/src/components/staticComponents.ts` (or wherever `makeStaticComponents` is configured) | Register `Aside` in the MDX component scope. Exact path identified during implementation. |
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

**`aside-positioning.test.ts`** (~14 cases, JSDOM):
- Pure positioning function: given 1 aside + 1 anchor, returns `top = anchor.offsetTop`
- Given 2 asides with non-overlapping anchors, both get their anchor's offsetTop
- Given 2 asides whose computed positions would overlap, second cascades down by `previous.bottom + GAP`
- Given 0 asides, returns empty result (no throw)
- Anchor resolution: aside's immediately-preceding sibling
- Anchor fallback: aside as first child uses parent's offsetTop
- ToC-collision clamp: if ToC exists, every aside's top is ≥ tocBottom
- Re-runs on `viewModePref` change (mode flipping default → focused clears top values + closes details)
- Docked mode sets `details.open = true`; inline mode clears `open`
- Idempotent install (window guard); double-install no-ops
- Cleanup detaches resize + mutation + viewModePref listeners
- Listens to MutationObserver on `.sophie-content`
- Listens to ResizeObserver on each aside (height changes)
- Skips positioning when viewport < 768px
- Skips positioning when `data-view-mode` is focused or wide

### E2E tests

**`content-width.spec.ts`** (~4 cases — for the sidebar-driven content cap):
- Default mode + sidebar="open": `.sophie-content` computed `max-inline-size` ≈ 75ch (≈600px)
- Default mode + sidebar="closed": `.sophie-content` computed `max-inline-size` ≈ 95ch (≈760px)
- Focused mode + sidebar="closed": content stays at 85ch (view-mode override wins)
- Wide mode + sidebar="open": content at 105ch (view-mode override; sidebar still forced hidden)

**`aside.spec.ts`** (~12 cases):
- Smoke chapter renders all `<Aside>` instances; each is in the document
- Desktop Default: asides have `top` style set, positioned in the right-column visual area
- Desktop Default: docked asides are open (body visible without click)
- Desktop Default: summary is visually hidden (display: none)
- Cycling view mode to Focused: asides return to inline collapsed `<details>` (`open` cleared, summary visible)
- Resize from desktop → mobile: asides re-render inline; `top` style cleared
- Inline mode: clicking the summary toggles open/closed (standard `<details>` behavior)
- Inline mode: summary keyboard-activates via Enter/Space (WCAG)
- Inline mode: summary has min 44px tap target (WCAG mobile)
- Two asides anchored to consecutive paragraphs do not overlap (collision-avoidance cascade)
- ToC ↔ aside vertical-collision: when the first aside's anchor is above the ToC's natural-flow bottom, the aside is pushed below `tocBottom`
- Scroll-spy: scrolling the page does NOT cause aside top values to recompute (asides are document-coordinate positioned, not viewport)
- axe-core: zero violations on each aside in each kind in both modes

## Verification

```bash
pnpm exec turbo run typecheck test:unit build   # 13/13 green
pnpm install --frozen-lockfile                   # CI gate, per memory pre-pr-lockfile-check
pnpm exec biome check .                          # zero warnings, zero errors
pnpm test:e2e                                    # 70 prior + 12 aside + 4 content-width = 86 green
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
