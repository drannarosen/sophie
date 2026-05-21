# Sprint K — UI/UX + aesthetic audit (frontend-design lens)

**Date:** 2026-05-21
**Trigger:** Anna asked for an honest UI/UX assessment of Sophie's
current state, using the `frontend-design` skill's aesthetic-quality
principles as the reviewing rubric — not for building, for grading.
**Method:** Playwright MCP screenshot pass across 4 surfaces
(committed + uncommitted Sprint K state), graded on six axes
(visual hierarchy / distinctiveness / production polish /
information density / state coverage / accessibility), rolled up to
/100.
**Live URL:** `http://localhost:4321/chapters/spectra-and-composition`
(M2-L3 pilot chapter).
**Screenshots:** 19 captures in
[`assets/2026-05-21/`](assets/2026-05-21/).

---

## Grade

### Aesthetic + UX overall: **B+ (87/100)**

| Axis | Score /10 | Note |
|---|---|---|
| Visual hierarchy | **9.0** | Editorial typography is genuinely strong. Title bars are now consistent across LO/Predict/Reflection/Callout. KeyEquation is publication-grade. |
| Distinctiveness | **8.5** | Reads like a research-grade textbook, not a tailwind-shop dashboard. Brand voice (teal/rose accents, small-caps eyebrows, asides as truly marginal) is coherent. |
| Production polish | **8.0** | Most surfaces are tight. ToC scroll-spy, sidebar transitions, focus rings all present. Dark mode is well-implemented. Three real polish bugs (search modal tab clipping, KaTeX alignment in OMI inference block, breadcrumb-vs-status-chip spacing rhythm). |
| Information density | **9.5** | Probably the strongest axis. Margin notes, definitions, deep-dives, equation biographies — Sophie packs more pedagogical structure per page than Quarto or MyST while staying readable. |
| State coverage | **7.5** | Light/dark parity is solid. Mobile *after* user interaction is great. **Initial mobile state has a critical bug** (sidebar default-open swallows 75% of viewport). Search modal tabs clip at 1440px. No visible loading / empty / error states for search results pane. |
| Accessibility | **8.5** | Landmarks correct. Focus rings on most interactive surfaces. Tap targets ≥ 44px on mobile after sidebar closes. Open: `aria-controls` dangling ID (P3), `color-contrast` axe rule globally disabled with 59 known violations (P1 from code review). |

**Roll-up:** 51/60 → **85/100** on aesthetic axes alone.
**+2 strategic credit** for the OMIFlow component pattern — a
codified epistemic-role-binds-slot primitive that the
frontend-design rubric values highly (distinctive structural
innovation, not just decoration).
**Final: 87/100 → B+.**

### What the grade means

- **A (90+)**: production-grade textbook UI you'd ship to a paying
  publisher. Sophie is genuinely close — three or four hardening
  passes away.
- **A− (88-89)**: needs the mobile-initial-state bug, search modal
  width, and the color-contrast remediation. The aesthetic ceiling
  is already there; execution gaps hold the grade down.
- **B+ (this review, 87)**: above-average textbook UI with strong
  bones. The Sprint K work moved this number up by ~4 points from
  what it would have been on `main` alone.

---

## Honest narrative critique

**What's beautiful.**

Sophie's chapter reading view is the most pedagogically *legible*
textbook layout I've seen ship from a small team. The OMI flow
(Observable / Model / Inference) renders as three distinct visual
strata of the same idea — that's not decoration, that's *the
epistemic structure showing up as typography*. The KeyEquation
component is genuinely publication-grade: the `(3.1)` reference
pill, the `E_R 13.6 eV — Rydberg energy` constants row in italic-
serif math, the OBSERVABLE label in small caps, the ASSUMPTIONS
section with named sub-blocks (Single Electron, Point Nucleus,
Non-Relativistic, Bound state) each carrying their own
mini-statement of validity. This is the part of the platform that's
already at A-grade.

The interventions / Aside system is the second strength. Misconcep-
tions don't just sit inline as inert callouts — they declare what
they `address`, cite their source, and pull `refutation-text`
pills. That's literally the AAS-paper-style reference apparatus
rendered as a usable pedagogy device. The `↗ Addresses: two-myths-
to-kill-now` chrome on the intervention Asides is the kind of
detail that signals *this was thought about*.

Editorial typography is consistently strong: serif body, the
sans-serif eyebrow labels (`LECTURE 3`, `MIN READ`, `TRACK A`),
PART headers with the small-caps `PART 1 ·` and the horizontal
rule beneath. The brand vocabulary (teal for "key insight," pink/
rose for "predict," green for "callout") is restrained and reads as
intentional, not as a Bootstrap color-coded swarm.

Dark mode is properly implemented (not just a CSS-vars flip):
backgrounds shift to slate-navy, brand colors hold their accent
roles, KaTeX renders crisply in light text on dark. The dark-
brand contrast ratios in the build log are documented at 11–13:1.

**What's generic.**

Almost nothing. This is the surprise of the audit — Sophie has
*resisted* the generic AI aesthetic. The places it slips toward
generic are minor:

- The search-modal pill tabs (All / Pages / Terms / Equations …)
  feel a touch shadcn-default — pure pills, equal-weight, no
  hierarchy among them.
- The "Contents" floating button at bottom-right on mobile is
  fine but reads as the platform-standard FAB shape; could pick
  up a touch more brand-voice.
- The smoke-fixture landing page is intentionally bare ("Sophie —
  Phase 0 smoke target") — fine for what it is, but it's not the
  platform's actual face. The real audit-able landing surface
  doesn't exist yet (that's a future chrome PR, not a Sprint K
  miss).

**What's broken.**

Two real bugs and one polish gap surfaced in the screenshot pass:

1. **Mobile initial state ships the sidebar open at 375px width.**
   The sidebar occupies 281px of the 375px viewport — that's 75%
   coverage. The chapter title gets clipped on the right. The
   user must manually click the menu toggle to recover. After
   they click, the layout is *correct and clean* (see
   `11-mobile-after-toggle-click.png`). Sprint K's "MyST-style
   default-closed sidebars" preference factory works as a
   preference — it just defaults to open on first SSR render.
   Almost certainly a hydration-ordering bug paired with the SSR
   issue Anna documented in commit `d0c3860`.

2. **Search modal tabs clip at 1440px desktop width.** The tabs
   read `All | Pages | Terms | Equations | Insights | Figures |
   Misconceptions | Objecti...` — "Objectives" gets cut off. The
   modal width is fixed; the tab row should either wrap, scroll
   horizontally, or shrink. Discoverable bug; minor in impact
   (Cmd+K still works) but visible polish gap.

3. **OMI block typography rhythm.** Looking at
   `04-omiflow-1-desktop.png` and `05-omiflow-2-desktop.png`,
   the OBSERVABLE / MODEL / INFERENCE labels work — but the
   horizontal accent bar between them is thin enough that on
   first scroll they feel like a single block rather than three
   distinct strata. A 1-2px increase in the inter-row divider
   weight, or a small vertical-rhythm bump, would make the three
   roles "land" faster.

**What's worth keeping the eye on.**

- The KeyEquation `(3.1)` reference number is faint in dark mode
  (`16-dark-keyequation.png`). Not failing, but close. Worth
  checking against the 59-violation color-contrast audit.
- The intervention `refutation-text` pill on dark mode wasn't
  captured (would need a misconception-page dark screenshot).
  Adding to the next VR pass list.
- The "Under Review" status chip in the topbar reads as Sophie-
  brand chrome but appears on every page, even when the chapter
  is `status: shipped`. Verify per-chapter visibility logic.

---

## Surface-by-surface findings

### Surface 1 — Chapter reading view (M2-L3, desktop 1440×900)

Screenshots: `02`, `03`, `04–09` (light), `15–16` (dark).

**Strong.** The hero (LECTURE 3 / Spectra & Composition / By Anna
Rosen / 30–55 MIN READ · TRACK A) is editorial-grade. The
`<LearningObjectives>` block reads as a focused checklist with
verb-leading items (Explain, Interpret, Use, Classify, Apply,
Distinguish, Synthesize, Connect). The OMI flow on Kirchhoff's
laws works — three strata, distinct accent bars, label-voice
pre-headers. The "Two myths to kill now" misconception cluster
shows real bibliographic chrome (`refutation-text` pill, Tippett
2010 citation, addresses pointer back to the lesson).

**Weak.** The OMI block accent bar weight is light enough that
the three roles can read as one block on first scroll. The
KeyEquation constants row (`E_R 13.6 eV — Rydberg energy`) sits
in a pale teal container that's almost invisible against the
surrounding card background. The "(3.1)" reference pill is small
and a touch buried.

### Surface 2 — Textbook navigation chrome

Screenshots: `01` (landing — bare smoke), `02` (chapter with both
sidebars open), `17` (sidebars open desktop), `19` (search modal).

**Strong.** TocSidebar's scroll-spy works (the current section
highlights as you scroll). The left ModuleNav has clean module/
chapter hierarchy with proper disclosure indicators. The topbar
"MOD 2 · LECTURE 3 · UNDER REVIEW" breadcrumb reads as small-caps
editorial chrome, not as Bootstrap-button-row chrome. SearchTrigger
in the topbar uses an `<input type="search">` shape with
`aria-keyshortcuts="Control+K Meta+K"` — both an idiomatic input
and a typed keyboard hint.

**Weak.** Search modal tabs clip at 1440px (see "what's broken"
above). The modal has no visible result-region empty state beyond
"Try typing a term, equation, key insight, or chapter name." —
that's fine as instruction, but loading / no-results / error
states aren't surfaced in the audit. The breadcrumb gap between
"LECTURE 3" and "UNDER REVIEW" status chip on mobile sits a little
tight (visible in `12-mobile-omiflow.png` top bar).

### Surface 3 — Component states + dark mode

Screenshots: `15-dark-mode-desktop`, `16-dark-keyequation`.

**Strong.** Dark mode is a real implementation — not just
inverted colors. Brand teal/rose hold their accent roles. KaTeX
math renders in light text on dark backgrounds without the
common "math renders too thin in dark mode" defect. The
LearningObjectives checkbox affordances are still visible against
the darker card surface. Theme cycling works (system → light →
dark → system) via the `data-theme-pref` toggle.

**Weak.** The `(3.1)` equation reference pill in dark mode is
near-invisible — needs a brighter accent or higher contrast
border. Hover/focus/active states for theme/sidebar/toc toggles
weren't fully exercised in the audit (would need a Storybook VR
pass to cover comprehensively).

### Surface 4 — Mobile <768px viewport

Screenshots: `10-chapter-hero-mobile-375` (broken initial state),
`11-mobile-after-toggle-click` (recovered), `12-mobile-omiflow`,
`13-mobile-keyequation`, `14-mobile-keyequation-full`.

**Strong.** *After* the user closes the sidebar, mobile is
genuinely good. The hero (LECTURE 3 / Spectra & Composition / By
Anna Rosen / 30–55 MIN READ · TRACK A) stacks cleanly. The
"After this reading, you should be able to:" LearningObjectives
checklist remains readable at 375px. The PART headers, Predict
callouts ("Think first"), and intervention Asides all reflow.
KeyEquation renders without horizontal overflow: the `E_n = -13.6
eV / n^2` equation centers in the column, the (3.1) reference pill
stays on the right edge, the OBSERVABLE label and ASSUMPTIONS
section preserve their structure. The "Contents" floating button
at bottom-right is the right mobile affordance for the ToC.

**Weak (critical).** Mobile initial state has the sidebar covering
75% of the viewport. This is the single highest-impact UI/UX
defect in the audit. Hydration-ordering bug paired with the SSR
issue Anna documented in commit `d0c3860`. Fix candidates: (a)
SSR-side viewport-conditional default, (b) move the sidebar
initial state behind a class added in a blocking inline `<script>`
in `<head>`, (c) accept the FOUC and use CSS `@media (max-width:
767px)` to force-hide the sidebar pre-hydration.

---

## P1–P5 improvement directions

### P1 — block any user-facing demo

1. **Fix the mobile initial-state sidebar-open bug.**
   `packages/astro/src/components/TextbookLayout.astro` (likely)
   + `packages/astro/src/preferences/sidebar.ts`. The MyST-style
   preference factory works after hydration; the SSR default needs
   to be viewport-aware OR a blocking inline `<script>` in
   `<head>` needs to set the `data-sidebar` attribute before
   first paint OR a CSS `@media (max-width: 767px) {
   [data-sidebar="open"] .sophie-sidebar { display: none; }}`
   guard needs to hide the sidebar pre-hydration. Pre-launch this
   ships with no production students; post-launch this is a
   first-impression killer.

2. **Remediate the color-contrast 59-violation surface** OR land a
   tracked GitHub issue with the violation enumeration. This is
   the same P1 from the code-quality review's Agent-3 backlog
   check. ADR 0004 mandates axe coverage; the indefinite-disable
   without a compensating control is the gap. Half-to-one-day
   discovery + N for fixes.

### P2 — should-fix before next chapter pilot

3. **Search modal tabs clipping at 1440px.**
   `packages/components/src/components/Search/SearchModal.tsx`. Tab
   row should wrap, horizontally scroll, or shrink. Trivial fix
   (CSS); high visibility for the only "command palette" surface
   in the platform.

4. **OMI inter-role accent bar weight.** Bump the
   horizontal-divider weight between Observable / Model /
   Inference in the OMIFlow component by 1-2px, OR add an
   inter-block vertical-rhythm bump (`gap: var(--sophie-space-4)`
   between role-blocks instead of whatever's currently there).
   The three roles should "land" faster on first scroll. Aesthetic
   call — defer to Anna; the current shape is correct, just lower
   contrast than the underlying data structure suggests it should
   be. (`feedback_aesthetic_unlocked_prelaunch` — propose
   strongest shape, not least-disruptive.)

5. **KeyEquation reference pill in dark mode.** `(3.1)` pill is
   near-invisible against the dark card background. Bump the
   border or text-color one notch brighter in the dark token set.

6. **KeyEquation constants row container contrast (light mode).**
   The pale-teal `<dl>` block carrying `E_R 13.6 eV — Rydberg
   energy` sits at near-zero contrast against the surrounding
   card. Increase border or reduce fill saturation.

### P3 — polish for the next visual sprint

7. **Search modal empty / loading / error / no-results states.**
   Probably already exist in code; verify by typing a non-matching
   query, throwing a network error, etc. Document in a Storybook
   story per state.

8. **Topbar status chip per-chapter visibility.** Confirm "UNDER
   REVIEW" status chip respects per-chapter `status:` frontmatter
   rather than rendering on every page.

9. **Breadcrumb-vs-status-chip spacing rhythm on mobile.** Topbar
   reads a touch cramped between "LECTURE 3" and "UNDER REVIEW"
   chip on 375px viewport. ~4px gap bump in the topbar component.

10. **VR baselines for Sprint K sidebars' new default-closed state.**
    Same item from the code-quality review P3 backlog.

11. **Theme-toggle hover / focus / active state inspection.** Run
    a Storybook test-runner pass that captures all interactive
    state variants. The platform has `@storybook/test-runner` set
    up post-PR #132; this is one of its highest-leverage uses.

### P4 — aesthetic upgrades (pre-launch unlocked per
[`feedback_aesthetic_unlocked_prelaunch`](../../../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_aesthetic_unlocked_prelaunch.md))

12. **Floating "Contents" mobile FAB brand voice.** Currently
    reads as platform-standard FAB. Could pick up a touch more
    Sophie-brand voice — small-caps label, brand-teal accent on
    open-state, subtle entrance animation. Low cost, raises
    distinctiveness axis from 8.5 → 9.0+.

13. **Search modal pill-tab hierarchy.** Currently all tabs read
    at equal weight. Consider: primary tabs (All / Pages /
    Terms) larger; secondary tabs (Equations / Insights /
    Figures / Misconceptions / Objectives) smaller or in a
    second row. Reduces the "shadcn-default" read.

14. **Landing surface design.** The current smoke-fixture index
    is intentionally bare. The platform doesn't yet have its
    actual face. Worth a future chrome PR that establishes the
    textbook-home pattern (table of contents at module level,
    progress markers, "Continue reading" affordance, course-
    level chrome). Not Sprint K scope.

### P5 — defer / track

15. **Print stylesheet sanity check.** `@media print` was on the
    audit list; not exercised in this pass. Lower priority pre-
    launch but a real consumer of a textbook UI is "print this
    chapter for class."

16. **Reduced-motion preference handling.** Sidebar / ToC /
    modal transitions should respect `prefers-reduced-motion:
    reduce`. Sprint K added some animation; confirm gates.

---

## What this review is *not* claiming

- Not a comprehensive a11y audit. The 59-violation color-contrast
  surface is the headline item; a full axe-core sweep against the
  shipped Storybook is the next audit pass.
- Not a Storybook visual-regression check. The screenshot pass
  here was hand-driven for design grading; the platform has
  `@storybook/test-runner` (per ADR 0057, PR #132) for VR
  baselines, which is the right tool for catching pixel-level
  drift between releases.
- Not a comparative analysis against MyST / Quarto / Pandoc /
  Bookdown. Sophie's distinctiveness is graded against the
  generic-AI-aesthetic baseline frontend-design enshrines, not
  against the open-source textbook field — that comparison would
  be its own review.
- Not a performance / Core Web Vitals audit. Sprint K's CSS-grid
  refactor likely shifted LCP / CLS; Lighthouse hasn't been run.

---

## Close-out checklist

- [ ] P1 #1 (mobile sidebar initial state) gets a tracked fix
      before this review's directions roll into a sprint.
- [ ] P1 #2 (color-contrast issue) status confirmed from the
      code-quality review's parallel finding.
- [ ] This review linked in `docs/reviews/README.md` table.
- [ ] Phase C synthesis presents top 3 hardening targets across
      both 2026-05-21 reviews.
