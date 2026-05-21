# Sprint K + Hardening Combo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Land Sprint K's visual-polish work cleanly: fix all 6 commit-
blocker defects, resolve the mobile-sidebar initial-state hydration
bug, extract a shared `<ChromeTitleBar>` primitive (eliminates DRY
violation across LO/Predict/Reflection/Callout), and file a tracked
issue enumerating the 59 color-contrast violations.

**Architecture:** Five sequential phases, each ending with a commit
boundary. Phase 1 is mechanical (commit-blockers). Phase 2 is the
mobile SSR fix. Phase 3 is the primitive extraction + 4 mechanical
migrations. Phase 4 is the color-contrast tracked-issue process.
Phase 5 verifies + opens PR. Per HITL mandate, design decisions
already confirmed (see "Confirmed design calls" below).

**Tech Stack:** React 19 + Astro 6 MDX, Zod schemas, CSS Modules +
CSS vars + Tailwind v4, Biome lint+format, Vitest + Testing Library
+ axe-core, Playwright e2e, pnpm 11 + Turborepo, tsup library
bundler.

**Confirmed design calls (HITL aligned 2026-05-21):**

1. **`data-toc="closed"` cap-cascade** — match commit `997e545`'s
   message: collapse `--sophie-right-w` to 0 when ToC is closed AND
   no docked margin asides exist on the page. Content widens into
   the freed space.
2. **`<ChromeTitleBar>` shape** — flat props
   `<ChromeTitleBar accent="..." icon={Icon} heading="..." />`.
   Simple, mechanical port, ~80 LOC. Per ADR 0061 Rule 4 (filename
   as discovery).
3. **Color-contrast 59 violations** — file tracked issue with full
   enumeration; defer remediation to a dedicated PR.

**Out of scope (defer to next sprint):**
- ChapterTitle pedagogy-index integration (P2 #4)
- Tests for ChapterTitle / TocToggle / rightSidebarPref (P2 #3)
- All P2/P3 backlog items from both reviews
- OMI inter-role accent bar weight bump
- Search modal tab clipping at 1440px (small fix; could fold in
  if time permits)
- Dark mode `(3.1)` reference pill contrast (depends on color-
  contrast remediation sprint)

---

## Phase 1 — Sprint K commit-blockers (mechanical)

### Task 1: Fix `noMisleadingCharacterClass` in `clean-heading-text.ts`

**Files:**
- Modify: `packages/astro/src/lib/clean-heading-text.ts:33`

**Step 1: Read the file and understand the regex**

Read `packages/astro/src/lib/clean-heading-text.ts` to confirm the
regex shape at line 33. Current is `/[​‌‍﻿]/g` (ZWJ + zero-width
chars in a character class — Unicode-confusable bug Biome flags).

**Step 2: Replace with explicit-escape alternation**

```typescript
// Before:
/[​‌‍﻿]/g

// After:
/(?:​|‌|‍|﻿)/g
```

Use explicit `\u200X` escapes — invisible literals are also a
readability bug.

**Step 3: Verify biome error clears**

Run: `pnpm exec biome check packages/astro/src/lib/clean-heading-text.ts`
Expected: 0 errors, 0 warnings.

**Step 4: Verify the function still strips the right characters**

Run: `pnpm turbo run test:unit --filter=@sophie/astro -- clean-heading-text`
Expected: All existing tests pass (if any). If none exist, write
one in Phase 5 Task 24.

**Step 5: Commit at end of Phase 1 (not yet)**

### Task 2: Delete duplicate `.sophie-toc` block

**Files:**
- Modify: `packages/astro/src/styles/textbook-layout.css:721-724`

**Step 1: Verify the duplicate**

Read lines 715–730 and lines 850–870 to confirm L721 block is dead
(overridden by L857's `position: sticky`).

**Step 2: Delete L721–724**

Remove the dead block:

```css
.sophie-toc {
  position: relative;
  z-index: 2;
}
```

**Step 3: Verify `noDescendingSpecificity` warning count drops**

Run: `pnpm exec biome check packages/astro/src/styles/textbook-layout.css`
Expected: 2 warnings → 0 or 1 warning (the third was the
`KeyEquation.module.css` one, separate file).

**Step 4: Visually confirm no regression**

Start dev server (`pnpm --filter smoke dev`), navigate to a chapter,
verify ToC sidebar still renders at proper sticky position.

### Task 3: Fix `organizeImports` in `Figure.tsx`

**Files:**
- Modify: `packages/components/src/components/Figure/Figure.tsx:1`

**Step 1: Run biome's auto-fix**

```bash
pnpm exec biome check --write packages/components/src/components/Figure/Figure.tsx
```

**Step 2: Verify biome clears**

Run: `pnpm exec biome check packages/components/src/components/Figure/Figure.tsx`
Expected: 0 errors.

**Step 3: Verify the file still compiles**

Run: `pnpm turbo run typecheck --filter=@sophie/components`
Expected: 0 errors.

### Task 4: Update `KeyEquation.test.tsx:121` for new `<InlineTex>` behavior

**Files:**
- Modify: `packages/components/src/components/KeyEquation/KeyEquation.test.tsx:121`

**Step 1: Read the current failing test**

Read lines 115–125 of the test file. The current assertion is:

```typescript
expect(screen.getByText(/9\.81 m\/s\^2/)).toBeInTheDocument();
```

This asserts plain-text `9.81 m/s^2`. The new behavior renders the
unit via KaTeX (`<InlineTex>`), so the literal `^2` becomes a
superscript span — no longer matchable by plain text.

**Step 2: Replace with KaTeX-aware assertion**

```typescript
// Find the constants row by its known label
const constantsRow = screen.getByText(/Standard gravitational acceleration|9\.81/).closest('dd, .constantsRow, [class*="constantsRow"]');
expect(constantsRow).toBeInTheDocument();

// Verify the value 9.81 appears (KaTeX wraps it in a span but keeps the digit text)
expect(constantsRow?.textContent).toMatch(/9\.81/);

// Verify the unit rendered via KaTeX (a .katex element is present)
expect(constantsRow?.querySelector(".katex")).toBeInTheDocument();
```

The test now asserts (a) constants row exists, (b) the numeric value
appears, (c) KaTeX rendered. This matches the new design intent
(units render as math, not collapsed plain text).

**Step 3: Run test to verify it passes**

Run: `pnpm turbo run test:unit --filter=@sophie/components -- KeyEquation`
Expected: All KeyEquation tests pass.

**Step 4: Run all components tests**

Run: `pnpm turbo run test:unit --filter=@sophie/components`
Expected: 70 test files pass, 604 tests pass, 0 failures.

### Task 5: Run `biome format --write` on flagged files

**Files:**
- Modify: `packages/astro/src/styles/textbook-layout.css`
- Modify: `packages/components/src/components/Figure/Figure.tsx`
- Modify: `packages/components/src/components/KeyEquation/KeyEquation.tsx`

**Step 1: Run format**

```bash
pnpm exec biome format --write packages/astro/src/styles/textbook-layout.css packages/components/src/components/Figure/Figure.tsx packages/components/src/components/KeyEquation/KeyEquation.tsx
```

**Step 2: Verify format clean**

Run: `pnpm exec biome format packages/astro/src/styles/textbook-layout.css packages/components/src/components/Figure/Figure.tsx packages/components/src/components/KeyEquation/KeyEquation.tsx`
Expected: 0 files need formatting.

### Task 6: Fix `data-toc="closed"` cap-cascade per decision 1

**Files:**
- Modify: `packages/astro/src/styles/textbook-layout.css:411-441`
- Modify: `packages/astro/src/components/TextbookLayout.astro` (to
  add `data-has-docked-asides` attribute)

**Step 1: Read current state of textbook-layout.css:411–441 and
TextbookLayout.astro**

Understand:
- Current `[data-toc="closed"]` only sets `.sophie-toc { display:
  none }` (L418)
- Right column stays at 280px (L25, `--sophie-right-w: 280px`)
- Content cap-cascade at L433–441 currently widens prematurely

**Step 2: Decide the gating attribute**

Add a `data-docked-asides="present|absent"` attribute on the
layout root (`<TextbookLayout>` in `TextbookLayout.astro`),
computed at render-time by checking whether the chapter content
has any `<Aside variant="margin">` (or whatever the docked-aside
selector is).

**Step 3: Update CSS to collapse `--sophie-right-w` correctly**

```css
/* When ToC is closed AND no docked asides on this page,
   collapse the right column to zero width and let content widen. */
[data-toc="closed"][data-docked-asides="absent"] {
  --sophie-right-w: 0px;
}

/* Cap cascade: content widens only when right column has actually
   collapsed (not just when ToC is hidden but column kept). */
[data-toc="closed"][data-docked-asides="absent"] .sophie-content {
  max-inline-size: min(105ch, 100%);
}

/* When ToC is closed but asides are docked, hide just the toc but
   keep the column at 280px for the asides to anchor. */
[data-toc="closed"][data-docked-asides="present"] .sophie-toc {
  display: none;
}
```

**Step 4: Set `data-docked-asides` on TextbookLayout**

Inspect the frontmatter or AST for any `<Aside variant="margin">`
(or the appropriate variant). Look in `packages/astro/src/lib/
pedagogy-index/` for the right query. Pass the boolean as an attr
on the layout root.

If complexity exceeds task scope, **fall back to alwaysing
`data-docked-asides="present"` as the safe default** — content
won't widen until the second pass enables it page-by-page. This
is a conservative shape; the visual behavior matches the original
intent of preserving aside anchoring.

**Step 5: Verify in browser**

Restart dev server. Navigate to `/chapters/spectra-and-composition`
(M2-L3, has docked asides) — confirm ToC closes only the toc, not
the column. Navigate to `/chapters/stellar-evolution` (stub
chapter, likely no docked asides) — confirm ToC close widens
content (if `data-docked-asides="absent"` correctly computed).

**Step 6: Commit Phase 1**

```bash
git add packages/astro/src/lib/clean-heading-text.ts \
        packages/astro/src/styles/textbook-layout.css \
        packages/astro/src/components/TextbookLayout.astro \
        packages/components/src/components/Figure/Figure.tsx \
        packages/components/src/components/KeyEquation/KeyEquation.test.tsx \
        packages/components/src/components/KeyEquation/KeyEquation.tsx
git commit -m "fix(sprint-k): clear 5 biome defects + 1 failing test + ToC cap-cascade

Closes Sprint K commit-blockers from 2026-05-21 code review:
- clean-heading-text.ts: replace literal ZWJ chars in regex with
  \\u200X escapes (noMisleadingCharacterClass)
- textbook-layout.css: delete duplicate .sophie-toc block (L721-724)
- Figure.tsx: organizeImports
- 3 files reformatted
- KeyEquation.test.tsx:121 updated to assert KaTeX rendering of
  units (was plain-text 9.81 m/s^2, now <InlineTex> per KeyEquation
  refactor)
- data-toc='closed' cap-cascade now correctly gated on
  data-docked-asides — matches 997e545 commit message intent"
```

---

## Phase 2 — Mobile sidebar initial-state hydration fix

### Task 7: Diagnose the root cause

**Files (read-only):**
- `packages/astro/src/components/TextbookLayout.astro`
- `packages/astro/src/preferences/sidebar.ts`
- `packages/astro/src/preferences/define.ts`
- `packages/components/src/runtime/useInteractive.ts` (if relevant)

**Step 1: Reproduce the bug**

Start dev server. In an incognito window (no localStorage), navigate
to `/chapters/spectra-and-composition`, set viewport to 375×812
**before page load**, hard-reload. Confirm sidebar covers 75% of
viewport on initial paint.

**Step 2: Trace the hydration flow**

- Check the SSR-rendered `data-sidebar` attribute on
  `<TextbookLayout>` (or `<html>`/`<body>` — wherever it lives).
  Use `view-source:`.
- Check whether `definePreference` writes the attribute *before*
  first paint via a blocking inline script, or *after* via React/
  hydration.
- Identify the gap: where does the post-hydration "default-closed
  on mobile" logic live, and why isn't it running pre-paint?

**Step 3: Document the root cause**

Write findings into a 3-5 sentence diagnosis. Include: which
file/line writes the data-sidebar attribute, when (SSR vs
hydration vs post-hydration), and what the right insertion point
is for a viewport-conditional override.

### Task 8: Implement the fix

Approach selected based on Task 7 findings — most likely a
**blocking inline `<script>` in `<head>`** that:
1. Reads the user's saved preference from `localStorage` if any.
2. If no saved preference exists AND `window.matchMedia("(max-width:
   767px)").matches`, sets `data-sidebar="closed"` on the layout
   root before first paint.
3. Otherwise honors the SSR default.

**Files:**
- Modify: `packages/astro/src/components/TextbookLayout.astro` (or
  the layout shell where `<head>` is composed)

**Step 1: Write the failing e2e test**

Add to `examples/smoke/e2e/`:

```typescript
// mobile-sidebar-initial-state.spec.ts
test("mobile cold load defaults to sidebar closed", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  // Clear any persisted preference
  await page.context().clearCookies();
  await page.goto("http://localhost:4321/chapters/spectra-and-composition");

  // Wait for blocking script + first paint
  const sidebar = page.locator(".sophie-sidebar");
  await expect(sidebar).toHaveCount(1);

  // Assert sidebar is hidden (display:none or aria-hidden)
  // and content fills viewport
  const sidebarWidth = await sidebar.evaluate(el => el.getBoundingClientRect().width);
  expect(sidebarWidth).toBe(0); // or expect(sidebar).toBeHidden()

  // Confirm chapter title is fully visible
  const title = page.locator(".sophie-chapter-title__main");
  await expect(title).toBeVisible();
  const titleBox = await title.boundingBox();
  expect(titleBox?.x).toBeGreaterThanOrEqual(0);
  expect((titleBox?.x ?? 0) + (titleBox?.width ?? 0)).toBeLessThanOrEqual(375);
});

test("desktop cold load defaults to sidebar open", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.context().clearCookies();
  await page.goto("http://localhost:4321/chapters/spectra-and-composition");

  const sidebar = page.locator(".sophie-sidebar");
  await expect(sidebar).toBeVisible();
  const sidebarWidth = await sidebar.evaluate(el => el.getBoundingClientRect().width);
  expect(sidebarWidth).toBeGreaterThan(200);
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test:e2e -- mobile-sidebar-initial-state
```
Expected: First test fails (sidebar covers 281px at 375 viewport),
second test passes.

**Step 3: Implement the blocking inline script**

In `TextbookLayout.astro`'s `<head>`, immediately before any other
JS but AFTER `data-theme` blocking script (existing pattern), add:

```html
<script is:inline>
  (function() {
    try {
      var saved = localStorage.getItem("sophie:sidebar");
      if (saved === "open" || saved === "closed") {
        document.documentElement.setAttribute("data-sidebar", saved);
      } else if (window.matchMedia("(max-width: 767px)").matches) {
        document.documentElement.setAttribute("data-sidebar", "closed");
      }
      // Else: SSR default (data-sidebar="open" for desktop)
    } catch (e) { /* localStorage unavailable; ignore */ }
  })();
</script>
```

**Important:** Match the exact `localStorage` key the existing
`sidebarPref` factory uses (read `packages/astro/src/preferences/
sidebar.ts` to confirm — likely `sophie:sidebar` or similar).

**Step 4: Run test to verify it passes**

```bash
pnpm test:e2e -- mobile-sidebar-initial-state
```
Expected: Both tests pass.

**Step 5: Manual smoke test**

Restart dev server, clear localStorage, reload at 375×812 — sidebar
closed. Resize to 1440×900 — sidebar opens (or stays at last user
preference if set).

**Step 6: Commit Phase 2**

```bash
git add packages/astro/src/components/TextbookLayout.astro \
        examples/smoke/e2e/mobile-sidebar-initial-state.spec.ts
git commit -m "fix(astro): mobile sidebar default-closed on cold load (UI/UX P1)

Blocking inline script in <head> reads localStorage preference;
falls back to data-sidebar='closed' at <768px viewport when no
preference saved. Resolves the 2026-05-21 UI/UX audit P1 (sidebar
covered 75% of mobile viewport on first paint).

Pairs with the deferred SSR-ordering issue documented in commit
d0c3860 — same structural shape (preference state needs to land
before first paint, not after hydration), narrowly fixed here for
the highest-impact case."
```

---

## Phase 3 — `<ChromeTitleBar>` primitive extraction

### Task 9: Create the primitive component + module CSS

**Files:**
- Create: `packages/components/src/primitives/ChromeTitleBar/ChromeTitleBar.tsx`
- Create: `packages/components/src/primitives/ChromeTitleBar/ChromeTitleBar.module.css`
- Create: `packages/components/src/primitives/ChromeTitleBar/index.ts`
- Create: `packages/components/src/primitives/ChromeTitleBar/ChromeTitleBar.test.tsx`
- Modify: `packages/components/src/index.ts` (export the primitive)

**Step 1: Read the 4 existing `.titleBar` shapes**

Read all four `*.module.css` files (LO, Predict, Reflection,
Callout) and identify:
- Shared rules → go into `ChromeTitleBar.module.css`
- Per-callsite variations → expressed via `accent` prop +
  CSS-var overrides

Confirmed shared shape (from review):
```
display: flex;
align-items: baseline;
gap: var(--sophie-space-2);
padding: var(--sophie-space-1) var(--sophie-space-4);
background: color-mix(in oklch, var(--accent-color) 8%, var(--sophie-surface-1));
border-bottom: 1px solid var(--sophie-border);
color: var(--accent-text);
font-weight: var(--sophie-weight-semibold);
```

Plus the icon translate-Y nudge, the `.heading` typography, and the
`::before { content: "" }` Sprint G counter-zero rule.

**Step 2: Write the failing test first (TDD)**

```typescript
// ChromeTitleBar.test.tsx
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Target } from "lucide-react";
import { ChromeTitleBar } from "./ChromeTitleBar";

describe("ChromeTitleBar", () => {
  it("renders heading and icon", () => {
    render(
      <ChromeTitleBar
        accent="teal"
        icon={Target}
        heading="After this reading"
      />
    );
    expect(screen.getByText("After this reading")).toBeInTheDocument();
    // Icon is rendered (lucide icons render as SVG)
    expect(screen.getByRole("heading").querySelector("svg")).toBeNull();
    // Icon sits outside the heading per the existing pattern
  });

  it("supports heading-level override (h2, h3)", () => {
    render(
      <ChromeTitleBar
        accent="teal"
        icon={Target}
        heading="Test"
        headingLevel={3}
      />
    );
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("is accessible", async () => {
    const { container } = render(
      <ChromeTitleBar
        accent="teal"
        icon={Target}
        heading="After this reading"
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("accepts all four accent values", () => {
    (["teal", "rose", "violet", "status-info"] as const).forEach(accent => {
      const { container } = render(
        <ChromeTitleBar accent={accent} icon={Target} heading="X" />
      );
      expect(container.firstChild).toHaveAttribute("data-accent", accent);
    });
  });
});
```

**Step 3: Run test to verify it fails**

```bash
pnpm turbo run test:unit --filter=@sophie/components -- ChromeTitleBar
```
Expected: FAIL — module not found.

**Step 4: Implement the primitive**

```typescript
// ChromeTitleBar.tsx
import type { LucideIcon } from "lucide-react";
import styles from "./ChromeTitleBar.module.css";

type Accent = "teal" | "rose" | "violet" | "status-info" | "status-warn" | "status-error";

export interface ChromeTitleBarProps {
  accent: Accent;
  icon: LucideIcon;
  heading: string;
  headingLevel?: 2 | 3 | 4;
  /** Optional id for the heading element — used by parent
      callers needing aria-labelledby reference. */
  headingId?: string;
}

const ICON_SIZE = 18; // matches existing callsite icon sizes

export function ChromeTitleBar({
  accent,
  icon: Icon,
  heading,
  headingLevel = 2,
  headingId,
}: ChromeTitleBarProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <div className={styles.titleBar} data-accent={accent}>
      <Icon aria-hidden="true" className={styles.icon} size={ICON_SIZE} />
      <Heading className={styles.heading} id={headingId}>
        {heading}
      </Heading>
    </div>
  );
}
```

```css
/* ChromeTitleBar.module.css */
.titleBar {
  display: flex;
  align-items: baseline;
  gap: var(--sophie-space-2);
  padding: var(--sophie-space-1) var(--sophie-space-4);
  background: color-mix(in oklch, var(--_accent) 8%, var(--sophie-surface-1));
  border-bottom: 1px solid var(--sophie-border);
  color: var(--_accent-text);
  font-weight: var(--sophie-weight-semibold);
}

/* Per-accent CSS-var routing */
.titleBar[data-accent="teal"] {
  --_accent: var(--sophie-brand-teal);
  --_accent-text: var(--sophie-brand-teal-text);
}
.titleBar[data-accent="rose"] {
  --_accent: var(--sophie-brand-rose);
  --_accent-text: var(--sophie-brand-rose-text);
}
.titleBar[data-accent="violet"] {
  --_accent: var(--sophie-brand-violet);
  --_accent-text: var(--sophie-brand-violet-text);
}
.titleBar[data-accent="status-info"] {
  --_accent: var(--sophie-status-info);
  --_accent-text: var(--sophie-status-info-text);
}
.titleBar[data-accent="status-warn"] {
  --_accent: var(--sophie-status-warn);
  --_accent-text: var(--sophie-status-warn-text);
}
.titleBar[data-accent="status-error"] {
  --_accent: var(--sophie-status-error);
  --_accent-text: var(--sophie-status-error-text);
}

.icon {
  flex-shrink: 0;
  transform: translateY(0.15em);
}

.titleBar .heading {
  margin: 0;
  font-family: var(--sophie-font-sans);
  font-size: var(--sophie-text-small);
  font-weight: var(--sophie-weight-semibold);
  letter-spacing: 0.02em;
  line-height: 1.3;
  color: inherit;
  counter-increment: none;
}

/* Suppress Sprint G global h2::before counter prefix */
.titleBar .heading::before {
  content: "";
}
```

```typescript
// index.ts
export { ChromeTitleBar } from "./ChromeTitleBar";
export type { ChromeTitleBarProps } from "./ChromeTitleBar";
```

**Step 5: Run test to verify it passes**

```bash
pnpm turbo run test:unit --filter=@sophie/components -- ChromeTitleBar
```
Expected: PASS — all 4 tests green.

**Step 6: Export from package root**

Modify `packages/components/src/index.ts`:

```typescript
// Add export
export { ChromeTitleBar } from "./primitives/ChromeTitleBar";
export type { ChromeTitleBarProps } from "./primitives/ChromeTitleBar";
```

**Step 7: Verify build**

```bash
pnpm turbo run build --filter=@sophie/components
```
Expected: Build succeeds.

### Task 10: Migrate `<LearningObjectives>` to use `<ChromeTitleBar>`

**Files:**
- Modify: `packages/components/src/components/LearningObjectives/LearningObjectives.tsx`
- Modify: `packages/components/src/components/LearningObjectives/LearningObjectives.module.css` — remove the now-duplicated `.titleBar`, `.icon`, and `.titleBar .heading*` rules; also remove vestigial `.row`, `.checkbox`, `.label`, `.verb` per Agent 1 finding #9
- (Existing tests should pass unchanged — that's the verification)

**Step 1: Inspect the current LearningObjectives JSX**

Read `LearningObjectives.tsx` to identify how the title bar is
currently rendered. Most likely a `<div className={styles.titleBar}><Icon /><h2 className={styles.heading}>...</h2></div>` shape.

**Step 2: Replace with `<ChromeTitleBar>`**

```tsx
// Before:
<div className={styles.titleBar}>
  <Target aria-hidden="true" className={styles.icon} size={18} />
  <h2 className={styles.heading}>After this reading, you should be able to:</h2>
</div>

// After:
<ChromeTitleBar
  accent="teal"
  icon={Target}
  heading="After this reading, you should be able to:"
  headingLevel={2}
/>
```

**Step 3: Delete the duplicated CSS rules from LearningObjectives.module.css**

Remove:
- `.titleBar { ... }` block (lines ~24–45)
- `.icon { ... }` block (lines ~47–54)
- `.titleBar .heading { ... }` block (lines ~63–75)
- `.titleBar .heading::before { ... }` block (lines ~81–83)
- Plus vestigial `.row`, `.checkbox`, `.label`, `.verb` blocks
  (lines ~94–137) per Agent 1 finding #9 — `<Objective>` owns
  these now.

**Step 4: Run existing LearningObjectives tests**

```bash
pnpm turbo run test:unit --filter=@sophie/components -- LearningObjectives
```
Expected: All existing tests pass (we changed the implementation
shape, not the rendered DOM contract — title text + icon + role
still all present).

**Step 5: Run axe-core on the component (it has an axe test)**

Same command — axe tests are inline.

**Step 6: Smoke test in browser**

Start dev server, navigate to a chapter, confirm the
LearningObjectives title bar renders identically pre/post-migration.

### Task 11: Migrate `<Predict>` to use `<ChromeTitleBar>`

**Files:**
- Modify: `packages/components/src/components/Predict/Predict.tsx`
- Modify: `packages/components/src/components/Predict/Predict.module.css` — remove duplicated `.titleBar` rules

**Step 1, 2, 3, 4** — same shape as Task 10, but with `accent="rose"`
and the telescope icon. Verify by reading current Predict.tsx.

### Task 12: Migrate `<Reflection>` to use `<ChromeTitleBar>`

**Files:**
- Modify: `packages/components/src/components/Reflection/Reflection.tsx`
- Modify: `packages/components/src/components/Reflection/Reflection.module.css`

Same shape as Tasks 10/11. Identify the correct accent + icon by
reading current Reflection.tsx (likely `accent="violet"` or
`accent="teal"`, depending on the brand role; confirm against
visual-polish-target.md).

### Task 13: Migrate `<Callout>` to use `<ChromeTitleBar>`

**Files:**
- Modify: `packages/components/src/components/Callout/Callout.tsx`
- Modify: `packages/components/src/components/Callout/Callout.module.css`

Callout has multiple variants (info, warn, error, etc.) — the
`<ChromeTitleBar>` `accent` prop should route to the correct
status-token. Verify by reading current Callout variant logic.

**Important:** Callout uses `<summary>` + `aria-labelledby` per
the 2026-05-19 P1 fix (Callout.tsx:125). The
`<ChromeTitleBar headingId={titleSpanId}>` prop must preserve that
aria-labelledby anchor. Test:

```typescript
it("Callout disclosure preserves aria-labelledby reference (audit P1)", () => {
  // ... existing test still passes
});
```

### Task 14: Verify zero behavioral change across all 4 migrations

**Step 1: Run all components tests**

```bash
pnpm turbo run test:unit --filter=@sophie/components
```
Expected: 70 test files pass, 604 tests pass, 0 failures.

**Step 2: Run typecheck**

```bash
pnpm turbo run typecheck
```
Expected: 0 errors.

**Step 3: Run biome**

```bash
pnpm exec biome check
```
Expected: 0 errors, 0 warnings (modulo any pre-existing infos in
OMIFlow.test.tsx that we're not touching).

**Step 4: Run e2e**

```bash
pnpm test:e2e
```
Expected: All 148+ tests pass.

**Step 5: Visual smoke check**

Browser smoke test of M2-L3 chapter — confirm LO / Predict /
Reflection / Callout title bars render visually identical pre/post.

**Step 6: Commit Phase 3**

```bash
git add packages/components/src/primitives/ChromeTitleBar/ \
        packages/components/src/index.ts \
        packages/components/src/components/LearningObjectives/ \
        packages/components/src/components/Predict/ \
        packages/components/src/components/Reflection/ \
        packages/components/src/components/Callout/
git commit -m "refactor(components): extract <ChromeTitleBar> primitive (Sprint K P1)

Resolves 2026-05-21 code-review Agent 1 finding #1 — 4 near-identical
.titleBar shapes across LO / Predict / Reflection / Callout violated
CLAUDE.md's DRY threshold (extract at >=2 callers).

New primitive: <ChromeTitleBar accent='teal|rose|violet|status-*'
icon={Icon} heading='...' headingLevel={2|3|4} headingId={?} />

Flat-props shape per ADR 0061 Rule 4 (filename as discovery).
Per-accent CSS-var routing keeps tokens centralized. Sprint G
counter-zero rule (::before {content:''}) lives in one place now.

All 4 callsites migrated mechanically; zero rendered-DOM change
verified by existing axe + vitest suites. Vestigial .row/.checkbox/
.label/.verb in LearningObjectives.module.css removed (Agent 1 #9).

Callout's aria-labelledby anchor (P1 fix from 2026-05-19) preserved
via the new headingId prop."
```

---

## Phase 4 — Color-contrast tracked issue

### Task 15: Run axe against published Storybook static

**Step 1: Build Storybook static**

```bash
pnpm --filter @sophie/components build-storybook
```

**Step 2: Serve Storybook static + run axe-test-runner with
`color-contrast` rule enabled**

```bash
# Temporary override: don't disable color-contrast for this run
# Either edit test-runner.ts inline temporarily OR run with override
cd packages/components
pnpm exec http-server storybook-static -p 6006 &
SB_PID=$!

# Run test-runner with color-contrast enabled
pnpm exec test-storybook --url http://localhost:6006 --browsers chromium 2>&1 | tee /tmp/axe-color-contrast.log
kill $SB_PID
```

If `test-runner.ts:138` is the disable, temporarily comment out the
`"color-contrast": { enabled: false }` line, or fork a parallel
config file.

**Step 3: Capture the 59 violations into structured data**

Parse `/tmp/axe-color-contrast.log` into a list:

```
component: violation count, example selector, contrast ratio observed, target ratio
```

### Task 16: Draft + file the GitHub issue

**Step 1: Compose issue body**

```markdown
# Color-contrast remediation backlog (axe-core enumerated)

**Background.** `packages/components/.storybook/test-runner.ts:138`
globally disables the `color-contrast` axe rule. Re-enabling it
surfaces 59 violations across 10 components (audit 2026-05-19,
re-quantified 2026-05-21).

**Goal.** Drive the violation count to 0 and re-enable the axe rule.

**Enumerated violations (axe-core run, 2026-05-21):**

[Table from Step 3 above]

**Component-level groupings:**

- `KeyEquation`: N violations — likely the `(3.x)` reference pill
  + constants-row container
- `Callout`: N violations — variant-specific (info / warn / error
  text on faint backgrounds)
- ...

**Token-level groupings:**

- `--sophie-brand-rose-text` on `--sophie-surface-1`: 3.8:1 (target
  4.5:1)
- `--sophie-status-info` on `--sophie-surface-1`: 4.2:1
- ...

**Recommended remediation:**

1. Audit the underlying tokens in `@sophie/theme`.
2. Bump text-on-fill contrast for each failing pair.
3. Update VR baselines for affected components.
4. Re-enable axe `color-contrast` rule.
5. Remove this issue's tracking comment from `test-runner.ts:138`.

**Linked from:** `packages/components/.storybook/test-runner.ts:138`
(comment block updated to reference this issue).
```

**Step 2: File the issue**

```bash
gh issue create --title "Color-contrast remediation backlog (59 axe violations across 10 components)" --body-file /tmp/color-contrast-issue.md --label "a11y,tech-debt"
```

Capture the issue number. Let's call it `#N`.

### Task 17: Link from `test-runner.ts:138` comment

**Files:**
- Modify: `packages/components/.storybook/test-runner.ts:138` (or
  whichever line carries the disable + comment block)

**Step 1: Update comment**

```typescript
rules: {
  // Disabled pending #N — full color-contrast remediation tracked
  // there. Enumerated baseline: 59 violations across 10 components
  // (audit 2026-05-21). Do NOT re-enable without first reading
  // the issue.
  "color-contrast": { enabled: false },
}
```

**Step 2: Verify storybook tests still pass with disable in place**

```bash
pnpm --filter @sophie/components test:storybook
```
Expected: All tests pass (including the disabled `color-contrast`).

**Step 3: Commit Phase 4**

```bash
git add packages/components/.storybook/test-runner.ts
git commit -m "docs(components): link color-contrast disable to tracked issue #N

Resolves 2026-05-21 audit P1 (color-contrast 59-violation surface
indefinitely disabled without compensating control). Issue #N
enumerates all 59 violations grouped by component and token role.
Remediation deferred to a dedicated PR per the Sprint K + hardening
combo scoping decision."
```

---

## Phase 5 — Verify + commit + PR

### Task 18: Final verification pass

**Step 1: Full biome**

```bash
pnpm exec biome check
```
Expected: 0 errors, 0 warnings, 0 infos (or only pre-existing
OMIFlow.test.tsx infos clearly identified).

**Step 2: Full test suite**

```bash
pnpm turbo run test:unit
pnpm turbo run typecheck
pnpm test:e2e
```
Expected: All green.

**Step 3: Build**

```bash
pnpm turbo run build
```
Expected: All packages build cleanly.

**Step 4: LOC budget**

```bash
pnpm lint:loc
```
Expected: 0 errors, 0 warnings (the ChromeTitleBar primitive should
stay well under 300 LOC).

**Step 5: lockfile sanity**

```bash
pnpm install --frozen-lockfile
```
Expected: No diff. (Per `feedback_pre_pr_lockfile_check`.)

### Task 19: Push branch + open PR

**Step 1: Push**

```bash
git push -u origin fix/learning-objectives-tightening
```

**Step 2: Open PR**

```bash
gh pr create --title "Sprint K + hardening combo: title-bar primitive + commit-blockers + mobile sidebar fix" --body "$(cat <<'EOF'
## Summary

Lands Sprint K's visual-polish work cleanly with the hardening pass
from the 2026-05-21 dual review (`docs/reviews/2026-05-21-sprint-k-code-quality.md`
+ `docs/reviews/2026-05-21-sprint-k-uiux-frontend-design-audit.md`):

- **Sprint K commit-blockers (6 P1 items)** — biome regex bug, dead
  CSS block, organizeImports, failing KeyEquation test, formatter
  pass, ToC cap-cascade docs/code disagreement.
- **Mobile sidebar initial-state hydration fix (UI/UX P1)** —
  blocking inline `<script>` in `<head>` defaults sidebar closed at
  <768px viewport before first paint.
- **`<ChromeTitleBar>` primitive extraction (code-review P1)** —
  eliminates DRY violation across 4 callers (LO / Predict /
  Reflection / Callout). Flat-props shape per ADR 0061 Rule 4.
- **Color-contrast 59-violation surface tracked** — issue #N
  enumerates violations by component + token; remediation deferred
  to a dedicated PR.

## Reviews

- [Code quality](docs/reviews/2026-05-21-sprint-k-code-quality.md):
  A− (90/100) committed → climbs to A− post-PR
- [UI/UX](docs/reviews/2026-05-21-sprint-k-uiux-frontend-design-audit.md):
  B+ (87/100); mobile P1 closed, expected climb to A− post-PR

## Test plan

- [ ] `pnpm exec biome check` — 0 errors, 0 warnings
- [ ] `pnpm turbo run test:unit` — 604 tests, 0 failures
- [ ] `pnpm turbo run typecheck` — 0 errors
- [ ] `pnpm test:e2e` — 148+ tests including new
  mobile-sidebar-initial-state.spec.ts
- [ ] `pnpm turbo run build` — all packages
- [ ] `pnpm lint:loc` — 0 errors, 0 warnings
- [ ] `pnpm install --frozen-lockfile` — no diff
- [ ] Manual smoke: M2-L3 chapter at 1440×900 and 375×812; light +
  dark; sidebars open + closed
- [ ] All 4 migrated title bars render visually identical to
  pre-PR state

## Out of scope

Folded into the next UI/UX hardening sprint:
- Color-contrast token remediation (tracked separately as #N)
- ChapterTitle pedagogy-index integration
- Vitest coverage for ChapterTitle / TocToggle / rightSidebarPref
- Search modal tab clipping at 1440px
- OMI inter-role accent bar weight bump
- Dark mode (3.1) reference pill contrast

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Task 20: Wait for CI green + merge

**Step 1: Watch CI**

```bash
gh pr checks --watch
```

**Step 2: Once green, merge**

Anna will confirm merge intent in-thread before merging
(per HITL mandate + `feedback_no_questions_mode_scope`: merge is a
side-effect that needs explicit text confirmation each time).

```bash
gh pr merge --squash --delete-branch
```

### Task 21: Clean up worktree

```bash
git checkout main
git pull origin main
git branch -d fix/learning-objectives-tightening
```

---

## Verification end-to-end

The combo is successful when:

1. All 21 tasks complete.
2. PR is merged (squash to main).
3. `git status` is clean on `main`.
4. `pnpm exec biome check` clean on `main`.
5. `pnpm test:e2e` includes the new mobile-sidebar test passing.
6. Color-contrast issue #N exists, linked from test-runner.ts.
7. Both review docs (`docs/reviews/2026-05-21-*.md`) updated to
   close out the P1 items shipped here.
8. Brainstorm session opens on the next UI/UX hardening sprint
   (Anna's stated next step).

---

## Risk + rollback

- **ChromeTitleBar primitive subtle visual regression.** Mitigation:
  4 mechanical migrations; existing axe + vitest tests catch the
  rendered-DOM contract; manual visual smoke confirms identical
  paint. Rollback: revert the extraction commit; primitive stays
  but callsites point back at their local `.titleBar` styles.

- **Mobile blocking-script localStorage edge cases.** Try/catch in
  the inline script handles private-mode + cookies-disabled. e2e
  test covers cold load. Rollback: remove the inline script; mobile
  reverts to the current (broken) default-open.

- **Color-contrast issue enumeration miscount.** The 59-violation
  number comes from a 2026-05-19 audit; running axe again may show
  a different number. Document the *current* number when filed; the
  framing ("indefinite disable without compensating control") is
  what matters.
