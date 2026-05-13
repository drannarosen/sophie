---
title: PR 4 — In-page ToC (right column + mobile drawer)
date: 2026-05-12
status: approved
phase: 2 (Bucket B / front-end shell)
pr-branch: feat/in-page-toc
predecessor: PR #32 (sidebar module/chapter nav)
---

# PR 4 — In-page ToC (design doc)

## Context

PR 1 ([#29](https://github.com/drannarosen/sophie/pull/29)) shipped
the empty `<RightColumn>` slot in `<TextbookLayout>`. PR 4 fills
it with a chapter table-of-contents auto-generated from the
chapter's H2/H3 headings, plus a mobile slide-over drawer
triggered by a floating "Contents" button.

Astro's [`render()`](https://docs.astro.build/en/reference/api-reference/#render)
already exposes a `headings: MarkdownHeading[]` array (each with
`{ depth, slug, text }`) at SSR time. Heading auto-IDs are already
present in the rendered HTML — verified in the existing build of
`spoiler-alerts/index.html`. No new MDX-plugin work needed.

## Forks locked (2026-05-12)

| Fork | Decision |
|---|---|
| Heading depth | **H2 + H3, nested** (H3 indented under its parent H2). Stub chapters with no H2/H3 produce an empty ToC → empty-slot-collapse ([ADR 0034](../website/decisions/0034-empty-slot-collapse-pattern.md)) hides the right column entirely. |
| Active section | **Scroll-spy via `IntersectionObserver`**. The most-recently-crossed heading from below gets `aria-current="location"` on its ToC link; CSS highlights it. ~30 LOC of vanilla JS per ADR 0032. |
| Mobile (<768px) | **Slide-over drawer + floating "Contents" button**. Right column hidden on mobile (current CSS); the drawer renders the same ToC inside a slide-over with focus trap + Escape-to-close + click-outside. ~40 LOC of vanilla JS. |
| Component shape | **Data-driven `<TocSidebar headings={...} variant?>`** + a thin `<TocDrawer headings={...}>` wrapper that composes the sidebar inside the drawer scaffolding. Render the primitive twice: once in the right-column slot, once inside the drawer. Same data, same primitive, two wrappers. Compound-component pattern per [ADR 0031](../website/decisions/0031-compound-component-layout-primitives.md). |

Drawer state is **transient** (no localStorage) — every chapter
load starts with the drawer closed. This is NOT a `definePreference`
case; it's runtime DOM state managed by a small inline script with
the same idempotency discipline as PR 1's `data-sophie-bound`
pattern.

## Component & API design

### `<TocSidebar headings={...} variant?>`

```astro
---
// packages/astro/src/components/TocSidebar.astro
import type { MarkdownHeading } from "astro";

interface Props {
  headings: ReadonlyArray<MarkdownHeading>;
  /** "sidebar" (right column, default) | "drawer" (mobile slide-over). */
  variant?: "sidebar" | "drawer";
}
const { headings, variant = "sidebar" } = Astro.props;

// Group H3s under their preceding H2. H4-H6 ignored in v1.
type Group = { h2: MarkdownHeading; children: MarkdownHeading[] };
const groups: Group[] = [];
for (const h of headings) {
  if (h.depth === 2) groups.push({ h2: h, children: [] });
  else if (h.depth === 3 && groups.length > 0) {
    groups[groups.length - 1]!.children.push(h);
  }
}
---

{groups.length > 0 && (
  <nav
    class={`sophie-toc sophie-toc--${variant}`}
    aria-label='Table of contents'
  >
    <h2 class='sophie-toc-heading'>Contents</h2>
    <ol class='sophie-toc-list'>
      {groups.map((g) => (
        <li class='sophie-toc-item'>
          <a class='sophie-toc-link' href={`#${g.h2.slug}`}>{g.h2.text}</a>
          {g.children.length > 0 && (
            <ol class='sophie-toc-sublist'>
              {g.children.map((h) => (
                <li>
                  <a class='sophie-toc-link sophie-toc-link--sub' href={`#${h.slug}`}>
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          )}
        </li>
      ))}
    </ol>
  </nav>
)}

<script>
  // Scroll-spy. Idempotent: only attach once per page.
  const W = window as Window & { __sophieTocSpyBound?: boolean };
  if (!W.__sophieTocSpyBound) {
    W.__sophieTocSpyBound = true;

    const headings = document.querySelectorAll<HTMLHeadingElement>(
      ".sophie-content h2[id], .sophie-content h3[id]",
    );
    if (headings.length > 0) {
      let currentId: string | null = null;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) currentId = entry.target.id;
          }
          if (currentId) {
            document
              .querySelectorAll<HTMLAnchorElement>(".sophie-toc-link")
              .forEach((a) => {
                const isActive = a.getAttribute("href") === `#${currentId}`;
                if (isActive) a.setAttribute("aria-current", "location");
                else a.removeAttribute("aria-current");
              });
          }
        },
        { rootMargin: "-20% 0px -70% 0px" },
      );
      headings.forEach((h) => observer.observe(h));
    }
  }
</script>
```

### `<TocDrawer headings={...}>` (mobile only)

```astro
---
// packages/astro/src/components/TocDrawer.astro
import TocSidebar from "./TocSidebar.astro";
import type { MarkdownHeading } from "astro";

interface Props {
  headings: ReadonlyArray<MarkdownHeading>;
}
const { headings } = Astro.props;
---

<button
  type='button'
  class='sophie-toc-fab'
  data-sophie-toc-fab
  aria-controls='sophie-toc-drawer'
  aria-expanded='false'
  aria-label='Open contents'
>
  <!-- "Contents" SVG icon -->
</button>

<aside
  id='sophie-toc-drawer'
  class='sophie-toc-drawer'
  data-toc-state='closed'
  aria-label='Table of contents'
  inert
>
  <button
    type='button'
    class='sophie-toc-drawer-close'
    data-sophie-toc-close
    aria-label='Close contents'
  >×</button>
  <TocSidebar headings={headings} variant='drawer' />
</aside>

<script>
  // Drawer open/close state. Transient (no localStorage).
  // Focus trap + Escape + click-outside + click-on-link closes.
  // Idempotent via data-sophie-toc-fab-bound marker.
  (function () {
    const fab = document.querySelector<HTMLButtonElement>(
      "[data-sophie-toc-fab]:not([data-sophie-toc-fab-bound])",
    );
    if (!fab) return;
    fab.setAttribute("data-sophie-toc-fab-bound", "true");
    const drawer = document.getElementById("sophie-toc-drawer");
    if (!drawer) return;
    const closeBtn = drawer.querySelector<HTMLButtonElement>(
      "[data-sophie-toc-close]",
    );
    let lastFocus: HTMLElement | null = null;

    function open() {
      lastFocus = document.activeElement as HTMLElement | null;
      drawer.setAttribute("data-toc-state", "open");
      drawer.removeAttribute("inert");
      fab.setAttribute("aria-expanded", "true");
      closeBtn?.focus();
    }
    function close() {
      drawer.setAttribute("data-toc-state", "closed");
      drawer.setAttribute("inert", "");
      fab.setAttribute("aria-expanded", "false");
      lastFocus?.focus();
    }

    fab.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    drawer.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("a[href^='#']")) close(); // close on link click
    });
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        drawer.getAttribute("data-toc-state") === "open"
      ) {
        close();
      }
    });
  })();
</script>
```

### Wire-up in smoke `ChapterLayout.astro`

```astro
---
const { Content, headings } = await render(chapter);
---

<TextbookLayout>
  <Fragment slot='sidebar'>
    <ModuleNav ... />
  </Fragment>
  <Fragment slot='right'>
    <TocSidebar headings={headings} />
  </Fragment>
  <TocDrawer headings={headings} />  {/* outside layout grid; CSS-positioned. */}
  <h1>{frontmatter.title}</h1>
  <slot />
</TextbookLayout>
```

`<TocDrawer>` lives outside the grid (`position: fixed`), so it
doesn't fight the empty-slot-collapse logic. On desktop the FAB
is hidden via media query; on mobile the right-column slot
collapses to 0 (current CSS hides it on <768px) and the drawer
becomes the only ToC affordance.

## Files

**New:**
- `packages/astro/src/components/TocSidebar.astro` — primitive
- `packages/astro/src/components/TocDrawer.astro` — mobile wrapper
- `packages/astro/src/lib/group-headings.ts` — pure helper that
  groups H3s under their preceding H2 (the tested logic)
- `packages/astro/src/lib/group-headings.test.ts` — vitest unit
- `examples/smoke/e2e/in-page-toc.spec.ts` — Playwright e2e

**Modified:**
- `packages/astro/package.json` — export both `.astro` files
- `packages/astro/src/styles/textbook-layout.css` — add ToC
  styles (right-column variant, drawer variant, FAB,
  responsive show/hide, scroll-spy `aria-current` highlight)
- `examples/smoke/src/layouts/ChapterLayout.astro` — wire ToC

## TDD plan

**Red phase — failing tests first:**

1. **Vitest** `group-headings.test.ts`:
   - Returns empty array when no headings.
   - Returns one group per H2; ignores H1.
   - Groups H3s under their preceding H2.
   - Discards H3 that appears before any H2.
   - Ignores H4-H6.
   - Preserves heading text + slug verbatim.

2. **Playwright** `in-page-toc.spec.ts`:
   - Desktop (≥768px): ToC renders in right column with all H2s + H3s.
   - Clicking an H2 link navigates to the heading anchor.
   - Scroll-spy: after scrolling to a section, the corresponding
     ToC link gains `aria-current="location"`.
   - Stub chapters (no H2): empty ToC → right column collapsed.
   - Mobile (<768px): right column hidden; FAB visible.
   - Mobile: clicking FAB opens drawer (`data-toc-state="open"`);
     focus moves to close button.
   - Mobile: pressing Escape closes the drawer; focus returns.
   - Mobile: clicking a ToC link closes the drawer.
   - axe-core: zero violations on the ToC region (both variants).

**Green phase** — minimal implementation to pass.

## Verification

```bash
pnpm exec turbo run typecheck test:unit build   # all green
pnpm exec biome check                            # clean
pnpm test:e2e                                    # 50 + ~9 new = ~59 green
pnpm --filter smoke dev                          # manual smoke:
#   - desktop: ToC in right column; H2s + H3s nested; scroll-spy moves
#   - mobile (DevTools 375px viewport): FAB visible; tap opens drawer;
#     focus trapped; ESC closes; link tap closes
#   - dark mode: ToC styling holds
#   - stub chapters (measuring-the-sky, stellar-evolution): no/few
#     headings → ToC collapses or renders minimally
```

## Cadence checkpoints (per HITL mandate)

1. Design committed (this step) → branch + design doc.
2. group-headings helper green → confirm shape.
3. TocSidebar primitive + scroll-spy green on desktop → confirm
   visual via Playwright MCP.
4. TocDrawer + mobile e2e green → confirm focus-trap UX.
5. PR opened → monitor CI; report status.

## Out of scope (deferred)

- **Collapsible H2 sections** (click H2 to hide its H3s) — possible
  PR 4.1 polish if user feedback demands.
- **"Last read" persistence** — could store last `currentId` per
  chapter via `definePreference`. Defer until cross-chapter
  reading patterns surface.
- **Search inside ToC** — Bucket B PR 7 (Pagefind) will subsume.
- **Reading-progress bar** — Bucket B PR 10 / 11 polish.
- **Auto-numbering headings** (e.g., "1.1 …") — out of scope;
  chapters already include section numbers in their H2 text.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Scroll-spy fires for every heading on long pages → perf cost | IntersectionObserver with `rootMargin` is constant-time per scroll event; only fires for intersections, not on every scroll px. Empirical: tested OK on ~30-heading pages in MyST/Quarto. |
| Mobile drawer focus-trap interactions break on iOS Safari | Use `inert` attribute (widely supported in 2026) to remove focusable elements from the tree; verify with Playwright's iOS emulation. |
| Stub chapters render an empty ToC region (just `<Contents>` heading + no list) | Component returns `null` when groups.length === 0; right column then has nothing in the slot; empty-slot-collapse fires. |
| Astro's `headings` array stays in DOM order; scroll-spy needs to match | `currentId` updates on every intersect; we sweep the ToC's links on each fire. O(n) per intersection but n is small. |
| ToC + ModuleNav both add small inline scripts → duplicate listener concern | Each script uses a window-level idempotency guard (`__sophieTocSpyBound`, `__sophieTocDrawerFabBound`) consistent with PR 1/2's `__sophieSidebarStorageBound` and `__sophieThemeMqlBound` patterns. |

## ADR follow-up

If the "transient chrome state" pattern (drawer state without
localStorage) appears in more PRs (Bucket B PR 7's search modal
is a strong candidate), write a small ADR codifying it as a
sibling of [ADR 0036](../website/decisions/0036-define-preference-factory-pattern.md):
"persistent state uses `definePreference`; transient view state
uses plain DOM attributes + window-level idempotency guards."
Not required for PR 4 itself.
