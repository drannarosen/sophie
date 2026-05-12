---
title: PR 1 — Layout shell foundation
date: 2026-05-12
status: approved
phase: 2 (Bucket B / front-end shell)
pr-branch: feat/layout-shell-foundation
---

# PR 1 — Layout shell foundation (design doc)

## Context

Per the audit-first hands-on session on 2026-05-11/12, the smoke
chapter renders as a bare content column — no top bar, no sidebar,
no in-page ToC, no margin column. The locked
[overview design (§18)](../website/overview.md#18-layout-book-theme-three-view-modes-toggleable-chrome)
calls for a book-theme shell (top bar + collapsible left sidebar +
center content + collapsible right column) with three view modes
(Default / Focused / Wide) and toggleable chrome.

This is the first of ten Bucket B PRs that build out the chrome
incrementally. PR 1 ships **the visual frame and basic
sidebar-toggle button only** — every other piece (theme toggle,
sidebar nav contents, ToC, asides, search, etc.) lands in
PRs 2–10.

## Three forks pinned during brainstorm (2026-05-12)

| Fork | Decision | Rationale |
| --- | --- | --- |
| Where layout lives | **A + B compound-component pattern** | Ship assembled `<TextbookLayout>` AND primitive components. Default usage is one line; composition for sophisticated consumers. Matches Radix UI, React Aria, Astro Starlight precedent. |
| CSS approach | **CSS Grid (page-level) + Flexbox (component-internals)** | Grid is the right tool for 2D book-theme layout; view-mode switching becomes one-liner `grid-template-columns` swaps; sidebar collapse is a CSS variable swap. Container Queries deferred. |
| Chrome state (sidebar toggle, theme, view mode) | **Vanilla JS + `data-*` attributes on `<html>`** | Astro's island philosophy. ~0.5KB total vs ~30KB React. No FOUC (inline script in `<head>` sets attrs before paint). React islands reserved for primitives that genuinely need React (e.g., the eventual Pagefind modal). |

## Component shape

### Public API surface from `@sophie/astro/client`

```astro
---
// Default usage — one line; what AI scaffolds; what 95% of consumers use:
import { TextbookLayout } from "@sophie/astro/client";
---
<TextbookLayout>
  <slot />
</TextbookLayout>
```

```astro
---
// Custom composition — escape hatch:
import {
  TopBar,
  Sidebar,
  ContentColumn,
  RightColumn,
  SidebarToggle,
} from "@sophie/astro/client";
---
<TopBar><h1>Special Edition</h1><SidebarToggle /></TopBar>
<div class="sophie-shell">
  <Sidebar>{customNav}</Sidebar>
  <ContentColumn><slot /></ContentColumn>
  <RightColumn>{onlyToc}</RightColumn>
</div>
```

### Primitives shipping in PR 1

| Primitive | Purpose | Slot? | Notes |
| --- | --- | --- | --- |
| `<TextbookLayout>` | Assembled layout that composes all primitives | Yes (chapter content goes here) | Reads `defaultSidebarOpen?: boolean` prop (default `true`) |
| `<TopBar>` | Top-row container; sticky | Yes (logo / search / toggles go here) | Includes `<SidebarToggle>` in default composition |
| `<Sidebar>` | Left column container | Yes (nav contents go here in PR 3) | Empty in PR 1; just the visual frame |
| `<ContentColumn>` | Center column with reading-width cap | Yes (chapter content) | Default 75ch cap (Default mode) |
| `<RightColumn>` | Right column container | Yes (ToC + asides go here in PRs 4+6) | Empty in PR 1; just the visual frame |
| `<SidebarToggle>` | Hamburger button | No | Vanilla JS; toggles `[data-sidebar]` on `<html>` |

### Sidebar-toggle state machine

A single inline script in `<head>` (rendered by `<TextbookLayout>`):

```js
// Boot-time: set data-sidebar from localStorage or default ("open")
// Synchronously, before paint, to prevent FOUC.
(function () {
  const stored = localStorage.getItem("sophie:sidebar");
  document.documentElement.setAttribute(
    "data-sidebar",
    stored === "closed" ? "closed" : "open"
  );
})();
```

`<SidebarToggle>` button has its own client-side handler:

```js
// On click: flip data attribute + persist to localStorage
// On `storage` event: cross-tab sync
```

Total chrome JS: ~30 lines, ~0.5KB. Zero React.

## CSS approach

### Grid skeleton (in `packages/astro/src/styles/textbook-layout.css`)

```css
.sophie-shell {
  display: grid;
  grid-template-areas:
    "topbar  topbar   topbar"
    "sidebar content  right";
  grid-template-columns: var(--sophie-sidebar-w, 280px) 1fr var(--sophie-right-w, 280px);
  grid-template-rows: var(--sophie-topbar-h, 56px) 1fr;
  min-height: 100dvh;
}

.sophie-topbar { grid-area: topbar; }
.sophie-sidebar { grid-area: sidebar; }
.sophie-content { grid-area: content; }
.sophie-right { grid-area: right; }

/* Sidebar collapse via data attribute */
:root[data-sidebar="closed"] .sophie-shell {
  --sophie-sidebar-w: 0;
}

/* Mobile: single column, sidebar becomes slide-over */
@media (max-width: 768px) {
  .sophie-shell {
    grid-template-areas:
      "topbar"
      "content";
    grid-template-columns: 1fr;
  }
  .sophie-sidebar {
    position: fixed; inset-block-start: var(--sophie-topbar-h, 56px);
    inset-inline-start: 0; block-size: calc(100dvh - var(--sophie-topbar-h, 56px));
    inline-size: 280px;
    transform: translateX(-100%);
    transition: transform 200ms;
  }
  :root[data-sidebar="open"] .sophie-sidebar { transform: translateX(0); }
  .sophie-right { display: none; } /* mobile hides right column entirely */
}
```

### Theme tokens consumed (already in `@sophie/theme`)

- `--sophie-color-bg`, `--sophie-color-fg`, `--sophie-color-border`
- `--sophie-color-surface` (sidebar / top bar background)
- `--sophie-space-*` for padding
- `--sophie-focus-color`, `--sophie-focus-width` for the toggle button focus ring

If any token isn't yet exported from `@sophie/theme`, surface as a follow-up; do NOT block PR 1 by adding new tokens.

## Test strategy (TDD)

### Failing test first (Playwright e2e)

`examples/smoke/e2e/textbook-layout.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

test.describe("PR 1: TextbookLayout shell", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await context.addInitScript(() => localStorage.clear());
  });

  test("renders top bar, sidebar, and content column", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    await expect(page.locator(".sophie-topbar")).toBeVisible();
    await expect(page.locator(".sophie-sidebar")).toBeVisible();
    await expect(page.locator(".sophie-content")).toBeVisible();
  });

  test("default state: sidebar is open (data-sidebar='open' on html)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "open"
    );
  });

  test("clicking sidebar toggle: collapses sidebar; persists across reload", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /toggle sidebar/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );
  });

  test("axe-core: zero violations on the new layout chrome", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const AxeBuilder = (await import("@axe-core/playwright")).default;
    const results = await new AxeBuilder({ page })
      .include(".sophie-topbar, .sophie-sidebar, .sophie-content, .sophie-right")
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
```

These tests must FAIL on current main (no chrome exists) and PASS
after the implementation lands.

### Unit tests

- Vitest spec for the inline script's behavior (parse stored value;
  default to "open"; persist on toggle).

## File-by-file plan

**New files:**

- `packages/astro/src/client/TextbookLayout.astro`
- `packages/astro/src/client/TopBar.astro`
- `packages/astro/src/client/Sidebar.astro`
- `packages/astro/src/client/ContentColumn.astro`
- `packages/astro/src/client/RightColumn.astro`
- `packages/astro/src/client/SidebarToggle.astro`
- `packages/astro/src/client/sidebar-state.client.ts` — inline-script source + tested unit
- `packages/astro/src/client/sidebar-state.test.ts` — vitest unit tests for the script
- `packages/astro/src/styles/textbook-layout.css`
- `examples/smoke/e2e/textbook-layout.spec.ts` — Playwright e2e

**Modified files:**

- `packages/astro/package.json` — add `./client/TextbookLayout`,
  `./client/TopBar`, etc. to `exports`
- `packages/astro/src/index.ts` — re-exports if helpful
- `examples/smoke/src/layouts/ChapterLayout.astro` — use new
  `TextbookLayout`

## Out of scope (deferred to later PRs)

- **Theme toggle**: PR 2 (with `usePreference` hook for non-React-island prefs that DO need shared state across multiple primitives)
- **Sidebar nav contents**: PR 3 (module/chapter tree)
- **In-page ToC contents**: PR 4
- **View modes (Default/Focused/Wide)**: PR 5
- **`<Aside>` margin notes**: PR 6
- **Pagefind search UI**: PR 7
- **Glossary popovers**: PR 8
- **Cross-reference previews**: PR 9
- **Print stylesheet polish**: PR 10
- **Visual regression baselines**: deferred per
  [ADR 0028](../website/decisions/0028-storybook-setup.md) (Linux
  Docker baseline generation needed first)

## Verification (per superpowers:verification-before-completion)

Before claiming PR 1 complete:

- `pnpm exec turbo run typecheck test:unit build` → all green
- `pnpm exec biome check` → clean
- `pnpm test:e2e` → all 26 prior + new layout spec all green
- `pnpm --filter smoke dev` → navigate; sidebar toggle works;
  reload preserves state; cross-tab works (storage event)
- Lighthouse a11y score on the chapter page ≥ 95 (manual check
  for now; CI gate lands in a later Phase 2 PR)
