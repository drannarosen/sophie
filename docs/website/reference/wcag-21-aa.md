---
title: WCAG 2.1 AA accessibility reference
short_title: WCAG 2.1 AA
description: >-
  How Sophie's component contract, theme tokens, Radix primitives, and
  CI gates enforce WCAG 2.1 Level AA on day 1 — plus the gaps still on
  the hardening backlog and the criteria chapter authors own.
tags:
  - accessibility
  - a11y
  - wcag
  - compliance
  - reference
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
status: shipped
---

# WCAG 2.1 AA

Sophie's accessibility reference. This page maps the **Web Content
Accessibility Guidelines 2.1 Level AA** to Sophie's day-1
infrastructure — the contract, the primitives, the tokens, and the CI
gates that make accessibility a *schema property* rather than a
retrofit chore. It also names the gaps that remain on the hardening
backlog and tells chapter authors what they own.

:::{seealso}
The per-component accessibility implementation rules live in
[`component-contract.md` § 8.10](component-contract.md). The
load-bearing decisions are
[ADR 0004](../decisions/0004-component-contract-revisions.md) (axe-core
gate), [ADR 0019](../decisions/0019-radix-ui-primitives.md) (Radix
primitives), [ADR 0005](../decisions/0005-theming-three-layers.md)
(tokens), and [ADR 0057](../decisions/0057-visual-regression-baseline.md)
(visual regression).
:::

## 1. Why this doc exists

In **April 2024**, the U.S. Department of Justice published its
[final rule under ADA Title II](https://www.ada.gov/resources/2024-03-08-web-rule/)
establishing **WCAG 2.1 Level AA** as the technical accessibility
standard for web content and mobile applications operated by state
and local government entities. In **April 2026**, DOJ issued a
[Federal Register extension](https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web)
pushing compliance dates back by one year — *but the rule itself
remains in force*.

SDSU is a public university in the California State University
system. Course materials published through Sophie therefore fall
under Title II's scope. Most education platforms treat accessibility
as a retrofit problem — "build the course first, audit and fix it
later." That model is expensive, slow, and incomplete in practice,
and STEM content (equations, plots, simulations, code blocks) is
exactly where retrofit-based tools fail hardest. The DOJ rule
specifically names STEM materials as a domain where automated
remediation and generative AI cannot be relied on at scale.

Sophie's counter-proposition is structural: **accessibility belongs
in the content model, the authoring workflow, the QA system, and the
publishing pipeline from day one**. The platform encodes WCAG 2.1 AA
practices in the component contract; chapter authors meet the
remaining criteria through guided authoring; the audit and CI gates
catch regressions before they ship.

A note on language. Throughout this document, Sophie's claims are
deliberately framed in **WCAG-aligned, accessible-by-design** terms.
Sophie does not assert ADA conformance, legal compliance, or any form
of guarantee — those determinations belong to institutional legal and
accessibility review, never to the platform. This framing is not
hedging; it is honest scoping of what tooling can verify.

This page exists for four audiences: engineers building components,
chapter authors writing lessons, institutional accessibility
reviewers auditing Sophie-published courses, and grant reviewers
evaluating Sophie's pedagogical and equity claims.

## 2. Sophie's bet: schema-driven accessibility, not retrofit

Every Sophie pedagogy component (`<Figure>`, `<Prediction>`,
`<ParameterSlider>`, `<KeyEquation>`, ...) implements the same
[component contract](component-contract.md): a Zod schema, a
`serialize` function, a `render` function, and a Storybook story with
mandatory axe-core tests. The contract is *the* path into the page.
Authors and AI co-authors cannot place a figure on the page without
going through `<Figure>`; they cannot skip the schema; they cannot
silence the axe-core gate. The schema *is* the accessibility
contract.

What this buys an institution:

- **Lower compliance risk.** Structural gates catch the violations
  that block retrofit audits — missing alt text, broken keyboard
  navigation, focus traps, missing ARIA labels — before publication,
  not after.
- **Less remediation work.** Authoring-time prevention costs an order
  of magnitude less than post-hoc remediation across years of
  accumulated content.
- **AI authoring guardrails.** Sophie's authoring model treats AI as
  the primary draft author with the instructor as supervisor
  ([ADR 0030](../decisions/0030-audience-and-ai-authoring-model.md)).
  Without structural guardrails, AI tends to produce visually
  polished but semantically broken pages. Sophie's schema constrains
  the AI's output surface so accessibility gaps become *syntactically
  detectable*, not stylistically excusable.
- **Better STEM teaching.** The same schema fields that satisfy WCAG
  1.1.1 (text alternatives) also force authors to articulate *what
  the reader should notice in this figure* — a pedagogical question
  that improves the lesson, not just the audit.

## 3. WCAG 2.1 AA primer (POUR)

WCAG 2.1 organizes accessibility into four principles, conventionally
remembered as **POUR**: content must be **P**erceivable, **O**perable,
**U**nderstandable, and **R**obust. Each principle decomposes into
*guidelines*, and each guideline decomposes into *success criteria*
(SCs) tagged with a conformance level — **A** (basic floor), **AA**
(institutional target), or **AAA** (most stringent).

"Level AA conformance" means meeting **every Level A and every Level
AA success criterion** that applies to the content. The DOJ Title II
rule adopts WCAG 2.1 AA as its technical standard. AAA is not required
and is often impractical for STEM content.

WCAG 2.1 (published 2018) extended WCAG 2.0 with criteria
particularly relevant to:

- **Mobile accessibility** — orientation lock prohibitions, pointer
  gestures, target size guidance.
- **Low-vision users** — reflow at 320 CSS pixels, non-text contrast,
  text-spacing overrides.
- **Cognitive and learning disabilities** — input-purpose
  identification, status messages, content-on-hover semantics.

Sophie targets **WCAG 2.1 AA**. The criteria tables in the following
section identify every relevant Level A and AA SC and tag each one
**SHIPPED**, **PARTIAL**, or **DEFERRED** against Sophie's current
infrastructure.

## 4. How Sophie implements WCAG 2.1 AA — by principle

Each subsection below explains one POUR principle in plain English,
then maps the applicable Level A and AA success criteria to Sophie's
implementation status. SC numbers follow the
[W3C/WAI canonical numbering](https://www.w3.org/TR/WCAG21/).

### 4.1 Perceivable

Information and interface components must be presented to users in
ways they can perceive — by sight, sound, touch, or any combination.
For a STEM textbook, this is the principle that figures, equations,
tables, and color-coded elements live or die by.

Sophie's day-1 posture: the `<Figure>` schema requires `alt` at the
type level; equations render as real text via KaTeX rather than as
images; tokens encode color in pairs (light/dark) that respect
`prefers-color-scheme`; the design system reserves a focus-ring
token. The remaining work is the color-contrast remediation tracked
in issue #152.

| SC | Level | Sophie implementation | Status |
| --- | --- | --- | --- |
| 1.1.1 Non-text Content | A | `<Figure>` schema requires `alt: z.string().min(1)`; `<FigureRef>` pulls `alt` from registered figure metadata; KaTeX-rendered math is real text; long-description and pedagogical-role slots on `<Figure>` are planned | PARTIAL |
| 1.2.1–1.2.5 Time-based Media | A/AA | No video or audio components ship yet; captions/transcripts/audio-description deferred to Phase 2+ | DEFERRED |
| 1.3.1 Info and Relationships | A | Semantic HTML throughout: `<ChapterTitle>` emits a single `<h1>`; sections use `<section aria-labelledby>`; TocSidebar derives an outline from chapter h2/h3 headings | SHIPPED |
| 1.3.2 Meaningful Sequence | A | DOM order matches reading order; the Pedagogy Index audit enforces section structure invariants | SHIPPED |
| 1.3.3 Sensory Characteristics | A | Style guide: never refer to "the button on the right" or "the red box" alone — always pair shape/position with label | SHIPPED (convention) |
| 1.3.4 Orientation | AA | Tailwind v4 responsive layout ([ADR 0026](../decisions/0026-tailwind-v4-css-first.md)); no orientation locks | SHIPPED |
| 1.3.5 Identify Input Purpose | AA | Limited input surface today; `<ParameterSlider>` wires explicit `<label>` + `<output>`; broader autocomplete attributes pending response-component expansion | PARTIAL |
| 1.4.1 Use of Color | A | Token system reserves text + iconography + color as a triad on `<Callout>` and `<Aside>` variants; no information conveyed by color alone | SHIPPED |
| 1.4.3 Contrast (Minimum) | AA | Tokens defined in [`anchors.ts`](https://github.com/drannarosen/sophie/blob/main/packages/theme/src/anchors.ts) with light/dark pairs; 59 variant-token violations enumerated in issue #152; focused remediation sprint scoped | DEFERRED |
| 1.4.4 Resize Text | AA | All text sized via tokens (rem-based); no fixed-pixel text; honors browser zoom up to 200% | SHIPPED |
| 1.4.5 Images of Text | AA | Sophie renders math via KaTeX text-mode, code via syntax-highlighted real text (Shiki + [CodeMirror 6](../decisions/0018-codemirror-6-for-codecell.md)); never images of equations | SHIPPED |
| 1.4.10 Reflow | AA | Tailwind responsive breakpoints; in-page ToC collapses to mobile drawer at 768px; content reflows to 320 CSS pixels without horizontal scroll | SHIPPED |
| 1.4.11 Non-text Contrast | AA | Focus-ring token (2px width, dedicated color) defined in [`tokens.ts`](https://github.com/drannarosen/sophie/blob/main/packages/theme/src/tokens.ts); UI-component contrast audited alongside issue #152 | PARTIAL |
| 1.4.12 Text Spacing | AA | Token-driven spacing scale; line-height 1.65 in prose contexts; user-stylesheet overrides do not break layout | SHIPPED |
| 1.4.13 Content on Hover or Focus | AA | Radix `<HoverCard>` provides dismissable, hoverable, persistent tooltip semantics on `<FigureRef>`, `<EquationRef>`, `<GlossaryTerm>` | SHIPPED |

### 4.2 Operable

User-interface components and navigation must be operable. A
keyboard-only user, a switch-device user, and a touch user must all
be able to reach and activate every interactive element. For Sophie,
this is the principle that distinguishes "beautiful React widget" from
"actually usable widget."

Sophie's day-1 posture: every interactive component is built on
**Radix UI** primitives ([ADR 0019](../decisions/0019-radix-ui-primitives.md))
that ship WCAG-correct keyboard patterns out of the box — slider
arrow keys with home/end, dialog focus trap and escape dismissal,
collapsible space/enter toggle. Custom `onKeyDown` handlers cover the
small set of chapter-level patterns Radix does not own (in-page ToC
scroll-spy, search modal slash-key). Skip-link primitives are the
notable gap.

| SC | Level | Sophie implementation | Status |
| --- | --- | --- | --- |
| 2.1.1 Keyboard | A | Radix primitives provide keyboard nav for slider, dialog, collapsible, hover-card; `tabIndex` discipline on composite widgets; `<ParameterSlider>` arrow keys + home/end inherited | SHIPPED |
| 2.1.2 No Keyboard Trap | A | Radix `<Dialog>` manages focus trap with escape dismissal; no custom focus traps elsewhere | SHIPPED |
| 2.1.4 Character Key Shortcuts | A | Search modal uses modifier-key shortcut (Cmd/Ctrl+K), not bare character keys | SHIPPED |
| 2.4.1 Bypass Blocks | A | Skip-link primitive not yet implemented; the in-page ToC partially mitigates by giving keyboard users a jump-list, but a dedicated skip-link is needed | DEFERRED |
| 2.4.2 Page Titled | A | Astro page-title pattern produces unique, descriptive `<title>` per chapter | SHIPPED |
| 2.4.3 Focus Order | A | DOM order matches visual order; Radix `<Dialog>` manages focus on open/close | SHIPPED |
| 2.4.4 Link Purpose (In Context) | A | Author responsibility — see [§ 10 What chapter authors are responsible for](#what-chapter-authors-are-responsible-for). The component contract does not auto-generate link text | AUTHOR-OWNED |
| 2.4.5 Multiple Ways | AA | Sophie pages reachable through site nav, in-page ToC, and search modal (Pagefind-backed) | SHIPPED |
| 2.4.6 Headings and Labels | AA | Pedagogy Index audit enforces section structure; sentence-case heading convention; component-emitted headings carry descriptive text from required schema fields | SHIPPED |
| 2.4.7 Focus Visible | AA | `--sophie-focus-color` + `--sophie-focus-width` tokens applied site-wide; visible focus rings on every interactive | SHIPPED |
| 2.5.1 Pointer Gestures | A | No path-based or multi-point gestures required for any interaction | SHIPPED |
| 2.5.2 Pointer Cancellation | A | Radix primitives use up-event activation; no custom down-event handlers | SHIPPED |
| 2.5.3 Label in Name | A | Visible labels match accessible names on every Radix-backed control | SHIPPED |
| 2.5.4 Motion Actuation | A | No motion-actuated controls in v1 | SHIPPED |

### 4.3 Understandable

Information and operation of the user interface must be
understandable — content readable, interactions predictable, errors
identified and corrected. For a textbook, this is the principle that
turns "page that works" into "page a learner can actually follow."

Sophie's day-1 posture: navigation is consistent across the site
(Astro layout); component identity is consistent (one `<Prediction>`
looks like every other `<Prediction>` because the contract registry
enforces it); the `useInteractive` hook gates input until persistence
hydrates, preventing the silent-data-loss anti-pattern. Per-field
error ARIA is the notable partial — `<Reflection>` and `<Prediction>`
surface persistence state, but standardized error-message
announcement awaits the next response-component expansion.

| SC | Level | Sophie implementation | Status |
| --- | --- | --- | --- |
| 3.1.1 Language of Page | A | `Chapter.lang` reserved in the schema ([ADR 0009](../decisions/0009-i18n-deferred.md)) but not yet emitted as `<html lang>`; English-only content for v1 | DEFERRED |
| 3.1.2 Language of Parts | AA | Same as 3.1.1 — deferred with i18n | DEFERRED |
| 3.2.1 On Focus | A | Focus does not trigger context change; Radix focus management is purely state-internal | SHIPPED |
| 3.2.2 On Input | A | Input does not trigger context change; `useInteractive` persists silently without navigation side effects | SHIPPED |
| 3.2.3 Consistent Navigation | AA | Astro layout enforces consistent header, sidebar, and footer across all chapter pages | SHIPPED |
| 3.2.4 Consistent Identification | AA | The component contract registry ensures the same component renders the same way wherever it appears — same labels, same ARIA, same keyboard pattern | SHIPPED |
| 3.3.1 Error Identification | A | `useInteractive` surfaces an `error` state; component-level wiring varies; standardized `role="alert"` / `aria-live` announcement deferred | PARTIAL |
| 3.3.2 Labels or Instructions | A | `<ParameterSlider>` wires label + output; broader form labeling pattern documented in component-contract.md § 8.10 | SHIPPED |
| 3.3.3 Error Suggestion | AA | Author-owned for response components today; structured error-suggestion API deferred | DEFERRED |
| 3.3.4 Error Prevention | AA | No legal/financial/data-destructive operations; not currently applicable to chapter content | N/A |

### 4.4 Robust

Content must be robust enough to be interpreted by a wide variety of
user agents, including assistive technologies. As assistive
technologies evolve, content should remain accessible — meaning the
underlying HTML must be valid, semantic, and ARIA-correct.

Sophie's day-1 posture: every interactive component goes through
Radix, which is industry-standard for ARIA correctness; the Astro +
React build pipeline validates HTML; the axe-core gate catches
ARIA-usage and naming violations on every Storybook story and every
smoke-test e2e spec. Live regions handle the small set of dynamic
status updates Sophie ships today.

| SC | Level | Sophie implementation | Status |
| --- | --- | --- | --- |
| 4.1.1 Parsing | A | (Obsoleted in WCAG 2.2; preserved here for 2.1 conformance.) Astro + React + MDX pipeline emits valid HTML5; build fails on parse errors | SHIPPED |
| 4.1.2 Name, Role, Value | A | Radix primitives carry correct ARIA roles, accessible names, and value semantics; axe-core gate enforces; `<ParameterSlider>` uses `aria-label`; sections use `aria-labelledby` | SHIPPED |
| 4.1.3 Status Messages | AA | `role="status"` live regions in `HydrationAnnouncer` and `SearchModal.ResultList`; planned expansion as response components grow | PARTIAL |

## 5. Schema as accessibility primitive

The previous section maps WCAG criteria to Sophie components. This
section inverts the question: **for each Sophie authoring element,
what accessibility contract does it enforce by virtue of its
schema?** This is the highest-leverage idea in the doc, because it
shows where Sophie spends accessibility budget once and reaps it
across every chapter forever.

| Sophie element | Accessibility contract enforced (or planned) |
| --- | --- |
| `<Figure>` | `alt` required at schema level (`z.string().min(1)`); `caption` slot; long-description slot (planned); pedagogical-role field (planned) |
| `<FigureRef>` | Pulls registered `alt` from figure metadata; one-source-of-truth — authors cannot drift |
| `<ParameterSlider>` | Radix Slider keyboard nav (arrows, home/end); `aria-label`; visible `<output>` readout linked via `htmlFor` |
| `<CollapsibleCard>` | Radix Collapsible; `aria-expanded` reflects state; space/enter toggle |
| Search modal | Radix Dialog focus trap; escape dismissal; live-region result count |
| `<ChapterTitle>` + section structure | Single `<h1>`; sentence case; `aria-labelledby` for sections |
| In-page TocSidebar | `aria-current="location"` on the active link; scroll-spy observes only chapter headings |
| `<Callout>` / `<Aside>` | Icon + text label + token color (never color-alone); `role` and labeling conventions |
| `<KeyEquation>` / `<EquationRef>` | KaTeX text-mode rendering (real text, not images); MathML emission planned for screen-reader semantic math |
| `<CodeCell>` (planned) | Real text via CodeMirror 6 ([ADR 0018](../decisions/0018-codemirror-6-for-codecell.md)); keyboard support inherited from CodeMirror |
| `<Reflection>` / `<Prediction>` | `useInteractive` gates input with `aria-busy` until hydration completes; per-field error ARIA planned |
| `<GlossaryTerm>` | Radix HoverCard for definition popover; persistent on hover and focus; keyboard-dismissable |
| Slides (RevealJS adapter) | Reading order derives from DOM; figure alt text inherits from chapter schema; slide-title-per-slide enforcement planned |
| Exported PDF (future) | Planned: tagged structure with reading order, or explicit "not accessibility-safe" flag if tagging is impractical |

The point: when an author wants to add a figure to a chapter, the
only path is through `<Figure>`, and `<Figure>`'s schema demands
`alt`. There is no "skip the audit" path because there is no path
around the schema. Same for equations, callouts, sliders, and every
other pedagogy primitive. Accessibility violations become structural
build errors, not retrospective audit findings.

## 6. STEM-specific accessibility

The DOJ Title II rule explicitly names STEM materials as a domain
where automated remediation and generative AI cannot be relied on at
scale. This is exactly Sophie's distinctive opportunity:
schema-driven STEM accessibility, not heroic per-chapter remediation.

**Figure descriptions for plots.** Alt text is necessary but not
sufficient for a scientific plot. "Scatter plot with two axes" tells
a screen-reader user nothing useful. What the reader needs to know
is the *pedagogical claim the plot exists to support* — the trend,
the comparison, the inference. Sophie's `<Figure>` schema separates
`alt` (short, perceptual) from `caption` (the pedagogical statement)
and reserves a future `longDescription` slot for the structured
narrative a screen-reader user can navigate.

**Accessible equations.** Sophie renders mathematics through KaTeX in
text mode — real Unicode and HTML, not images. Symbols are bound to
the [notation registry](notation-registry-schema.md) and surface
through `<GlossaryTerm>` for assistive technologies that benefit from
explicit definitions. MathML emission is on the roadmap for
screen-readers that consume semantic math.

**Variable and unit definitions.** Every equation in a Sophie chapter
goes through the [`<EquationRef>`](equation-registry-schema.md) and
[Equation Biography](equation-biography-schema.md) patterns
([ADR 0046](../decisions/0046-equation-biographies.md)). Variables
and units are declared once in the registry, referenced everywhere,
and made auditable. A screen-reader user reaches the symbol meaning
the same way a sighted reader does — through structured prose, not
inscrutable rendering.

**Non-color encoding.** The epistemic role contract
([ADR 0058](../decisions/0058-epistemic-component-contract.md))
binds each pedagogy element to a role — `observable`, `model`,
`inference`, `assumption`, `approximation`, `uncertainty`,
`numerical`, `misconception`. Roles surface as text labels and icons
in addition to color, so the signal is never color-only. ADR 0058 is
optional and additive in v1; components that opt in carry the
strongest accessibility-by-default story.

**Keyboard-operable simulations.** Interactive figures and Cosmic
Playground iframes ([ADR 0008](../decisions/0008-cosmic-playground-manifest.md))
must pass axe-playwright before they merge. Radix primitives provide
the keyboard foundation; the demo manifest carries the accessibility
contract across the iframe boundary.

**Alternative representations.** The MultiRep component
([ADR 0043](../decisions/0043-notation-registry-and-multirep.md)) is
the seed of the "text fallback for visual reasoning" pattern — the
same scientific concept rendered as equation, plot, prose, and
schematic, each carrying the same meaning. A learner who cannot
parse the plot can follow the prose; an assistive-technology user
gets the same reasoning structure.

## 7. The governance layer

Four ADRs and one CI gate hold WCAG conformance in place.

**[ADR 0004 — component contract](../decisions/0004-component-contract-revisions.md).**
The contract mandates axe-core tests in Storybook and Playwright for
every component. Accessibility is *verified at runtime against the
rendered DOM*, not declared as data. Truth lives in the test results,
not the schema metadata. Every component PR runs axe-playwright on
its stories.

**[ADR 0019 — Radix UI primitives](../decisions/0019-radix-ui-primitives.md).**
Sophie's interactive components are built on Radix headless
primitives. Radix ships WCAG-correct keyboard navigation, ARIA
attributes, focus management, and dismissal semantics. The platform
inherits the work of the Radix team for every slider, dialog,
collapsible, hover-card, and tooltip — not re-implementing
accessibility per component.

**[ADR 0005 — theming](../decisions/0005-theming-three-layers.md).**
A three-layer token system (TypeScript tokens → CSS custom properties
→ Tailwind preset) lets dark mode, `prefers-reduced-motion`, and
high-contrast preferences resolve via `:root[data-theme]` and
`@media (prefers-*)` overrides — without runtime JavaScript toggles.
Users who set system-wide preferences see Sophie respect them.

**[ADR 0057 — visual regression baseline](../decisions/0057-visual-regression-baseline.md).**
A self-hosted `@storybook/test-runner` + Playwright VR baseline on
CI's Linux runner catches design-system drift — including the kind of
quiet token regression that erodes contrast and focus visibility
between releases.

**The axe-core rule allowlist.** The Storybook test-runner currently
runs every axe rule *except* `color-contrast`, which is disabled
pending the issue #152 token remediation sprint. The structural axe
rules (labels, landmarks, focus, ARIA usage, name-role-value, image
alt, and ~20 others) are enforced. The disablement is
file-scoped, documented in
[`test-runner.ts`](https://github.com/drannarosen/sophie/blob/main/packages/components/.storybook/test-runner.ts),
and tracked publicly in [issue #152](https://github.com/drannarosen/sophie/issues/152)
— not silently swallowed.

## 8. AI-authoring guardrails

Sophie's authoring model treats AI as the primary draft author with
the instructor as supervisor
([ADR 0030](../decisions/0030-audience-and-ai-authoring-model.md);
[ADR 0042](../decisions/0042-pedagogy-contract-and-ai-ledger.md)).
Without structural guardrails, AI drafts tend toward visually
polished but semantically broken pages — figure-rich and
alt-text-missing; math-heavy and screen-reader-unreadable; colorful
and color-only. Sophie's schema constrains the AI's output surface so
those gaps become *syntactically detectable*, not stylistically
excusable.

**Today.** Schema validation rejects malformed components at build
time. The axe-core CI gate catches structural ARIA and keyboard
violations on every PR. The [Pedagogy Index audit](audit-baseline.md)
checks section structure invariants. A `<Figure>` without `alt`
fails the schema; a `<Prediction>` without keyboard support fails
axe; a chapter with a broken heading sequence is auditable.

**Planned roadmap.** The next layer of authoring-time accessibility
support is on the backlog:

- **Accessibility linter.** Warn at build time on color-only meaning,
  "click here" link text, autoplay motion, missing transcript
  references, and low-contrast design-token usage.
- **STEM figure-accessibility contract.** Extend `<Figure>` to
  require `caption`, `longDescription`, `dataSummary`, and
  `pedagogicalRole` as structured fields — not optional. The
  pedagogical-role field doubles as a teaching artifact.
- **AI accessibility reviewer prompt.** A standard checklist Sophie
  runs against every AI-drafted lesson: are figures described? Are
  equations introduced in words? Are variables defined? Are units
  explicit? Is meaning conveyed without color alone? Could a
  screen-reader user follow the argument? Could a keyboard-only user
  operate every interaction?

## 9. Known gaps + path to closure

Sophie's infrastructure enforces WCAG 2.1 AA at the contract layer
for shipped components. The criteria and roadmap items below are
**tracked but deferred to the hardening phase**. Naming them
publicly is part of the honesty discipline of
[ADR 0056](../decisions/0056-validation-tracker-frontmatter.md): the
gap exists, it is documented, and the closure plan is named.

| Gap | Affected SC | Tracking | Closure plan |
| --- | --- | --- | --- |
| 59 color-contrast violations across 10 components | 1.4.3, 1.4.11 | [issue #152](https://github.com/drannarosen/sophie/issues/152) | Token-audit + per-component remediation sprint (1–2 days) |
| No skip-link primitive | 2.4.1 | Hardening backlog | Skip-link Astro component + Tailwind utility |
| No captions / transcripts / audio description | 1.2.1–1.2.5 | Phase 2+ | When media components ship; today no video/audio components exist |
| Math alt text / MathML emission | 1.1.1 | Roadmap | KaTeX → MathML pipeline when ready |
| Per-field error ARIA (`role="alert"` / `aria-describedby`) | 3.3.1, 3.3.3 | Roadmap | Standardize when response-component family expands beyond `<Reflection>` and `<Prediction>` |
| Heading-level-sequence lint | 1.3.1, 2.4.6 | Roadmap | Add to pedagogy-audit Tier-1 invariants |
| `Chapter.lang` → `<html lang>` emission | 3.1.1, 3.1.2 | [ADR 0009](../decisions/0009-i18n-deferred.md) | v2+ i18n work |
| STEM figure-accessibility contract (`<Figure>` long-description, data-summary, pedagogical-role required) | 1.1.1 extends | Roadmap | Future ADR; schema extension |
| Accessibility linter (color-only, "click here", autoplay, low contrast) | various | Tooling backlog | Sophie CLI lint subcommand post–Sprint K |
| AI accessibility reviewer prompt | n/a (process) | Roadmap | Connects to [ADR 0030](../decisions/0030-audience-and-ai-authoring-model.md) + [ADR 0042](../decisions/0042-pedagogy-contract-and-ai-ledger.md) |

(what-chapter-authors-are-responsible-for)=

## 10. What chapter authors are responsible for

Sophie's schema covers a lot, but accessibility is collaborative.
Authors own the semantic quality of the content the schema cannot
infer. The checklist below names the criteria that fall on the
author, not the platform.

- **Provide meaningful `alt` text on every `<Figure>`.** The schema
  enforces *presence* — an empty alt fails the build. The semantic
  quality is your job. Aim for what a screen-reader user needs to
  know about the figure's pedagogical role, not what it visually
  looks like.
- **Respect heading hierarchy.** Use h2 and h3 inside a chapter
  exactly as you would in print — h3 only inside h2, never skipping
  levels. Sentence case throughout. The Pedagogy Index audit and the
  in-page ToC depend on this.
- **Write descriptive link text.** Never "click here" or "read more."
  The link text should make sense out of context, because
  screen-reader users navigate by link list. Better: "Download the
  lecture notes on stellar spectra."
- **Never rely on color alone for meaning.** Pair color with text,
  icon, or pattern. Sophie's `<Callout>` variants do this by
  default; if you author a custom annotation, follow the pattern.
- **Pair complex math with a prose gloss.** KaTeX renders the
  symbols; you owe the reader a sentence about what the equation
  says and why it matters. This benefits sighted readers, too.
- **Set `aria-label` on `<ParameterSlider>` when there's no visible
  label.** Most chapters can use a visible label; if the design
  requires a label-less slider, the accessible name is your
  responsibility.
- **Treat figure captions as pedagogical statements.** "What should
  the reader notice?" — not "Figure 3."

Deeper authoring patterns live in
[`chapter-components.md`](chapter-components.md) and the per-component
implementation notes in
[`component-contract.md`](component-contract.md).

## 11. Institutional value

The combination of schema-driven accessibility, axe-core CI
gating, Radix primitives, and the Pedagogy Index audit is unusual in
education tooling. Most AI courseware promises *generate lessons
fast*. Sophie's offer is structurally different:

> Sophie helps faculty create AI-assisted, accessible-by-design STEM
> course materials using structured authoring schemas, built-in
> accessibility checks, and WCAG-aware publishing pipelines —
> reducing the burden of retroactive remediation while improving
> student access and learning.

That sentence captures Sophie's positioning relative to WCAG 2.1 AA
and the DOJ Title II rule. It is deliberately scoped: Sophie helps,
checks, supports, and aligns. Sophie does not guarantee, certify, or
indemnify.

**What Sophie claims.** Alignment with WCAG 2.1 AA practices;
schema-enforced accessibility-by-design authoring; axe-core verified
component-level conformance for shipped components; auditable a11y
QA through the Pedagogy Index and visual-regression baselines.

**What Sophie does not claim.** ADA conformance guarantees. Legal
indemnification. A substitute for institutional accessibility
review. Full WCAG 2.1 AA conformance until the gaps in § 9 close.

That distinction is load-bearing. Tooling can verify what tooling can
verify — semantic structure, ARIA correctness, keyboard reachability,
visible focus, token contrast (once issue #152 closes), and the
schema-level presence of required accessibility fields. Tooling
cannot verify the *semantic quality* of human-authored text, the
appropriateness of an alt description for a specific learner
population, or institutional readiness for a Title II audit. Those
remain with the institution.

For public universities, community colleges, K–12 systems, libraries,
and government-adjacent education programs operating under the DOJ
Title II rule, schema-driven accessibility lowers the cost of doing
the right thing. That is the institutional adoption case for Sophie.

## 12. References

### Regulatory and standards sources

- [Nondiscrimination on the Basis of Disability: Accessibility of Web
  Information and Services of State and Local Government Entities](https://www.ada.gov/resources/2024-03-08-web-rule/),
  U.S. Department of Justice, final rule, March 8, 2024. *Retrieved
  2026-05-22.*
- [Extension of Compliance Dates for Nondiscrimination on the Basis
  of Disability; Accessibility of Web Information and Services of
  State and Local Government Entities](https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web),
  U.S. Department of Justice, Federal Register, April 20, 2026.
  *Retrieved 2026-05-22.*
- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/TR/WCAG21/),
  W3C Recommendation, June 5, 2018. *Retrieved 2026-05-22.*
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/),
  W3C/WAI guidance documents. *Retrieved 2026-05-22.*

### Sophie internal references

- [`component-contract.md` § 8.10 Accessibility](component-contract.md)
  — per-component implementation notes.
- [ADR 0004 — Component contract revisions](../decisions/0004-component-contract-revisions.md)
  — axe-core gate mandate.
- [ADR 0005 — Theming](../decisions/0005-theming-three-layers.md) —
  token-driven dark mode + reduced-motion + high-contrast.
- [ADR 0019 — Radix UI primitives](../decisions/0019-radix-ui-primitives.md)
  — accessible interactive foundation.
- [ADR 0028 — Storybook setup](../decisions/0028-storybook-setup.md)
  — `@storybook/addon-a11y` and axe-playwright wiring.
- [ADR 0030 — Audience and AI authoring model](../decisions/0030-audience-and-ai-authoring-model.md)
  — AI as primary author with instructor as supervisor.
- [ADR 0042 — Pedagogy contract and AI ledger](../decisions/0042-pedagogy-contract-and-ai-ledger.md)
  — AI authoring provenance.
- [ADR 0043 — Notation registry and MultiRep](../decisions/0043-notation-registry-and-multirep.md)
  — alternative representations for STEM content.
- [ADR 0046 — Equation biographies](../decisions/0046-equation-biographies.md)
  — structured equation metadata.
- [ADR 0057 — Visual regression baseline](../decisions/0057-visual-regression-baseline.md)
  — CI VR baseline catching contrast drift.
- [ADR 0058 — Epistemic component contract](../decisions/0058-epistemic-component-contract.md)
  — role contract enabling non-color encoding.
- [GitHub issue #152 — Color contrast remediation](https://github.com/drannarosen/sophie/issues/152)
  — 59 enumerated violations + closure plan.
