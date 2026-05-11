# Phase 1 Hardening Audit

**Date**: 2026-05-10
**Scope**: All 13 Phase 1 components in `packages/components`, the Astro
integration layer in `packages/astro`, the persistence runtime, and the
smoke chapter in `examples/smoke`.
**Trigger**: Trio 3 closed (PR #15 merged). Anna asked for an
expert-level review before proceeding to Trio 4 — "let's harden the
code."
**Methodology**: Three parallel deep-read audits — architecture/
contract correctness, CSS Modules + theming, accessibility + runtime
integration — followed by spot-verification of the most surprising
claims against actual `file:line`.
**Verdict**: **B− (73/100)**. Strong fundamentals, real hardening work
to do before the next trio.

---

## Executive summary

Phase 1 ships a coherent component library with disciplined patterns:
every component has a Zod schema as source of truth, every persistence-
bearing component correctly spreads `controlProps` (the rule codified
after PR #8), every test file invokes axe-core, every CSS Module uses
Sophie tokens *predominantly*. The shape is right.

The hardening gaps are concentrated in three areas:

1. **Accessibility beyond axe-core.** axe is clean across all 13
   components, but axe doesn't catch keyboard traps, missing focus
   management after dynamic reveals, missing live-region
   announcements, or missing `:focus-visible` on radios/checkboxes.
   Five distinct WCAG-2.1 issues identified, all real-world failures.
2. **Token discipline drift.** Eight hardcoded hex values (two of
   them in `box-shadow` mix calls that *will* misbehave in dark mode;
   six as innermost fallbacks inside three-level `var()` chains).
   Four references to non-existent tokens (`--color-text-muted`,
   `--color-accent`, `--color-surface-alt`) that silently fall through
   to fallback values.
3. **One real data-loss hazard.** `useInteractive`'s
   BroadcastChannel sync has no last-write-wins guard, so concurrent
   writes from two tabs can silently lose the user's interaction
   (Issue P1-7 below). The hydration guard prevented this *during*
   hydration; nothing prevents it *after* hydration when two tabs
   stay open.

There is also one outright **bug** (InteractiveCallout always renders
an empty `<p>.title` element when `title` is omitted, diverging from
the static Callout's conditional render at the same file/component),
one **fragile pattern** (Predict's explicit `disabled={gatedDisabled}`
override of the spread `controlProps.disabled` works correctly but
breaks if a maintainer reorders), and a **platform-wide gap** (every
single `audit()` function returns `[]`, including in cases where the
contract's own `forbidsContaining` declares invariants nothing
actually enforces).

The good news: every P1 finding is mechanical to fix. The hardest
fix is the BroadcastChannel race condition (~4 hours including
tests). Everything else is ≤2 hours.

---

## Test metrics (post-Trio-3, all green)

| Layer | Count | Notes |
|---|---|---|
| `@sophie/components` unit tests | 102 in 16 files | All axe-clean. 12 component dirs + slugifyTerm helper. |
| `@sophie/astro` unit tests | 6 | 100% coverage on `components.tsx`. |
| `@sophie/core` unit tests | 15 | Schema validation surface. |
| `examples/smoke` e2e tests | 24 in 7 specs | All passing. |
| Storybook test-runner stories | 45 axe-clean | All 12 component dirs covered. |
| **Total unit + integration** | **147** | |

**Coverage shape**:

| Spec file | Tests | Covers |
|---|---|---|
| `collapsible-card.spec.ts` | 3 | Open/closed, hash anchor, axe |
| `key-equation.spec.ts` | 4 | Render, hash, KaTeX inside, axe |
| `learning-objectives.spec.ts` | 3 | Render, persistence, axe |
| `mini-glossary.spec.ts` | 5 | Render+14 pairs, per-term ids, outer hash, per-term hash, axe |
| `predict.spec.ts` | 3 | Render, persistence, axe |
| `proving-chapter.spec.ts` | 3 | Counts/tables, IDB persistence, axe |
| `self-assessment.spec.ts` | 3 | Family rendering, persistence, axe |

**E2E gaps**: No dedicated spec for static Callout, InteractiveCallout
in isolation, Figure, InteractiveCheckbox, ConfidenceCheck,
ComprehensionGate, EffortLog, Reflection. Most are covered indirectly
via `self-assessment.spec.ts` or `proving-chapter.spec.ts`, but
isolated specs would surface keyboard/focus regressions earlier.

---

## Quality grades

Per the skill rubric: each category 0–20, summed → letter grade.

| Category | Score | Evidence |
|---|---|---|
| Test coverage | **15/20** | All components have unit + axe + story coverage. Gaps: no edge-case tests (long input, 50 items, special chars), no cross-tab e2e, no composition/integration tests (LearningObjectives composes InteractiveCheckbox but the composition is untested), no error-state tests (IDB failure path). |
| Design system | **14/20** | Sophie tokens used throughout; SCSS ports faithful to source. But 8 hardcoded hex values (2 real bugs, 6 fallbacks that should be promoted), 4 broken token references, `sa-` namespace shared across 4 unrelated components (no independent override), per-component override hook discipline inconsistent (only KE/MG/CC/Predict have full hooks). |
| Domain correctness | **18/20** | Content lifted faithfully from astr101-sp26 sources (verified glossary.scss → MiniGlossary CSS Module). The KeyEquation 7→2 scope correction during PR #14 demonstrates pedagogy is taken seriously. The MiniGlossary pedagogy (recognition-not-retention) preserved through to the API. No domain inaccuracies surfaced. |
| Accessibility | **12/20** | All components axe-clean. But: missing `:focus-visible` on 5 control types (WCAG 2.1 AA fail), missing live regions for hydration completion (WCAG 4.1.3), missing focus management after Predict's RevealGate fires (WCAG 2.4.3), missing Escape-to-close on CollapsibleCard (ARIA APG), no `prefers-contrast: more` support anywhere. These are real failures, not aspirational. |
| Architecture | **14/20** | `controlProps` pattern 100% uniform; `state: null` for structural components 100% uniform; schema-first 100%; ADR discipline strong. But: BroadcastChannel race condition with real data-loss potential, `audit()` stubbed in all 13 contracts (platform ships with zero invariant checks), ProfileProvider context is unreachable from MDX islands (silent fallback masks the architectural issue), InteractiveCallout title-render bug, Predict's `disabled` override pattern is correct but fragile. |
| **Total** | **73/100** | **B−** |

Grade band cutoffs (per skill rubric): 70–74 = B−, 75–79 = B, 80–84 = B+.

A 73 means: **ship-ready for current scope; not yet hardened for
production use beyond smoke.** The grade tracks the *gap between
shipped and hardened*, not the quality of what's shipped.

---

## What's working (strengths)

These are worth recording so future audits can track regression rather
than re-prove the win.

1. **`controlProps` discipline is 100%.** Every persistence-bearing
   component spreads `controlProps` on its primary control:
   - `Callout.tsx:89` (InteractiveCallout)
   - `CollapsibleCard.tsx:41` (Radix Trigger)
   - `ComprehensionGate.tsx:38` (radio inputs)
   - `ConfidenceCheck.tsx:44` (radio inputs)
   - `EffortLog.tsx:34` (radio inputs)
   - `InteractiveCheckbox.tsx:42` (checkbox)
   - `LearningObjectives.tsx` (via composed InteractiveCheckbox)
   - `Predict.tsx:110, 146` (textareas + reveal button)
   - `Reflection.tsx:32` (textarea)

   PR #8's hydration-race lesson has fully propagated. Zero
   hydration-race bugs detected anywhere.

2. **Component-contract uniformity.** Every component dir has the
   exact same 6-file shape: `<Name>.tsx`, `<Name>.contract.ts`,
   `<Name>.schema.ts`, `<Name>.test.tsx`, `<Name>.stories.tsx`,
   `<Name>.module.css`, `index.ts`. (MiniGlossary adds an extra
   `slugifyTerm.ts`+test pair because the slug logic is non-trivial.)
   Zero structural drift.

3. **`state: null` correctly applied to all 4 structural components.**
   Callout, Figure, KeyEquation, MiniGlossary all use
   `ComponentContract<Props, null>` and `serialize` returns
   `state: null`. No structural component accidentally claims state.

4. **Schema-as-source-of-truth.** All 13 components infer TS types
   from Zod schemas (`z.infer<typeof ...Schema>`). Zero hand-written
   `interface` declarations that could drift from the schema.

5. **`useId()` rule-of-hooks compliance.** Every `useId()` call is at
   component root, never conditional. `useId()` vs `props.id`
   separation (internal labelledby wiring vs author-controlled hash
   anchor) consistent across KeyEquation, MiniGlossary,
   InteractiveCheckbox.

6. **Stable persistence keys.** Every component uses author-supplied
   `id` props composed into stable, prefixed IDB keys
   (`callout:${id}:reviewed`, `predict:${id}:${promptId}:answer`,
   etc.). No keys derived from render order. No accidental collisions
   in the smoke chapter.

7. **Dark mode via scheme-aware tokens.** Zero
   `[data-theme="dark"]` selectors anywhere; all components rely on
   Sophie's scheme-aware token system. Matches ADR 0005.

8. **SCSS ports are honest about scope.** Callout, CollapsibleCard,
   and MiniGlossary ports each have a documented "what's deferred"
   list (tier indicators, alternate accents, icon-glyph fonts).
   Strategic, not accidental.

---

## P1 — Critical (hardening sprint must-fix)

These are real bugs or WCAG failures with concrete file:line citations
and concrete fixes. Estimated total effort: **~10 hours**.

### P1-1. InteractiveCallout renders empty `<p>` when `title` is omitted

**Severity**: Bug (DOM divergence from static Callout)
**File**: `packages/components/src/components/Callout/Callout.tsx:50`
**Effort**: 5 min

Static Callout (line 26) correctly guards: `{title !== undefined && <p
className={styles.title}>{accessibleTitle}</p>}`. InteractiveCallout
(line 50) is identical *except* it omits the guard, so it always
renders `<p className={styles.title}>{accessibleTitle}</p>` — which
falls back to `variantTitles[variant]` when `title` is absent.

This isn't strictly empty (the fallback provides text), but it means
InteractiveCallout's DOM diverges from Callout's whenever `title` is
omitted, breaking the assumption that the only difference between the
two is the persistence row.

**Fix**: Mirror line 26's guard at line 50.

### P1-2. Hardcoded `#0f1115` in `box-shadow` mix calls

**Severity**: Token violation (visual regression in dark mode)
**Files**:
- `packages/components/src/components/CollapsibleCard/CollapsibleCard.module.css:15`
- `packages/components/src/components/KeyEquation/KeyEquation.module.css:17`

**Effort**: 15 min (after picking the replacement token)

```css
box-shadow: 0 1px 3px color-mix(in oklch, #0f1115 4%, transparent);
```

In light mode the hardcoded dark mixed into transparent gives a
plausible faint shadow. In dark mode the page background is *already*
near `#0f1115`, so the shadow becomes invisible. Sophie's tokens are
scheme-aware; the shadow color should be too.

**Fix options** (pick one):

```css
/* Option A: derive from text color (auto scheme-aware) */
box-shadow: 0 1px 3px color-mix(in oklch, var(--sophie-text) 8%, transparent);

/* Option B: introduce a dedicated token */
box-shadow: var(--sophie-shadow-card, 0 1px 3px color-mix(in oklch, var(--sophie-text) 8%, transparent));
```

Recommend Option B (promote to a token in `@sophie/theme`) so all
future surface-level shadows share a single source.

### P1-3. Four references to non-existent CSS tokens

**Severity**: Silent fallback masks broken intent
**Files**:
- `packages/components/src/components/InteractiveCheckbox/InteractiveCheckbox.module.css:30` — `var(--color-text-muted, inherit)`
- `packages/components/src/components/LearningObjectives/LearningObjectives.module.css:5` — `var(--color-accent, #4c7e9b)`
- `packages/components/src/components/LearningObjectives/LearningObjectives.module.css:6` — `var(--color-surface-alt, rgb(0 0 0 / 0.03))`
- `packages/components/src/components/LearningObjectives/LearningObjectives.module.css:55` — `var(--color-text-muted, inherit)`

**Effort**: 10 min

None of `--color-text-muted`, `--color-accent`, `--color-surface-alt`
exist in the Sophie theme. They silently fall through to the inner
fallback (`inherit`, `#4c7e9b`, `rgb(0 0 0 / 0.03)`). The fallback
*happens* to look OK so the bug never visually manifests, but the
intent was clearly to read a token that doesn't exist.

**Fix**: Replace with real tokens:
- `--color-text-muted` → `--sophie-text-muted`
- `--color-accent` → `--sophie-accent`
- `--color-surface-alt` → `--sophie-surface-2`

### P1-4. Missing `:focus-visible` on radios and checkboxes (WCAG 2.1 AA)

**Severity**: WCAG 2.1 § 2.4.7 (Focus Visible)
**Files**:
- `ComprehensionGate.module.css` `.radio` (lines 47–50)
- `ConfidenceCheck.module.css` `.radio` (lines 31–39)
- `EffortLog.module.css` `.radio` (lines 44–52)
- `InteractiveCheckbox.module.css` `.checkbox` (lines 8–18)
- `LearningObjectives.module.css` `.checkbox` (lines 32–42)

**Effort**: 30 min (pattern already exists in Callout.module.css:131–134; copy it)

`Callout.module.css` does this correctly:
```css
.reviewedRow input[type="checkbox"]:focus-visible {
  outline: var(--sophie-focus-width) solid var(--sophie-focus-color);
  outline-offset: 2px;
}
```

The five other components rely on the browser's default focus ring,
which is inconsistent across browsers and absent on some user agents.
A keyboard user tabbing through a chapter's self-assessment widgets
gets no visible affordance for which control has focus.

**Note**: axe-core does not flag this. Browser-default focus styles
satisfy axe's structural check but not WCAG's user-experience intent.

### P1-5. BroadcastChannel race condition (potential silent data loss)

**Severity**: Data integrity (real user-facing risk)
**File**: `packages/components/src/runtime/useInteractive.ts` (lines ~150–171, full review needed)
**Effort**: 4 hours (design + impl + dual-tab e2e test)

The current sequence on `setValue(next)`:
1. Local state set immediately (instant UI).
2. Async IDB write begins.
3. On IDB write success, BroadcastChannel post.

With two tabs holding the same `(course, chapter, id)`, Tab A and Tab
B can both call `setValue` concurrently. Whichever tab's IDB write
lands last "wins" the persisted state; both tabs then receive the
*other* tab's broadcast and silently overwrite their own local state.
The user's most recent interaction can disappear from the very tab
that made it.

The hydration guard prevented this *during* hydration (controlProps
disabled the control until ready). It does nothing once both tabs are
hydrated and steady.

**Fix sketch**:
- Add `version: number` to the persisted shape.
- `IndexedDBResponseStore.set` accepts an `expectedVersion` parameter;
  conditionally writes only if the on-disk version matches.
- On version mismatch, return `{ success: false, current }` so the
  hook can decide whether to apply the remote value, retry, or expose
  a "conflict" status.

This is the most architectural finding in the audit and may warrant
its own ADR before implementation. ADR slot: **0029 (proposed) —
last-write-wins with versioned IDB writes**.

### P1-6. Predict's `disabled` override pattern is fragile

**Severity**: Maintainability time-bomb
**File**: `packages/components/src/components/Predict/Predict.tsx:139–146`
**Effort**: 15 min

```tsx
const gatedDisabled = controlProps.disabled || !enabled;
// ...
<button
  type='button'
  {...controlProps}
  disabled={gatedDisabled}      // ← overrides controlProps.disabled
  onClick={() => setRevealed(true)}
>
```

The current code is *correct* (explicit props after spread win). But a
maintainer who reorders the JSX attributes — say, alphabetizing them —
will reintroduce the hydration-race bug silently. The defensive
pattern PR #8 codified is being subverted by a spread + explicit
override.

**Fix**: Eliminate the spread on this specific button; thread
`aria-busy` and `disabled` explicitly:

```tsx
<button
  type='button'
  aria-busy={controlProps['aria-busy']}
  disabled={gatedDisabled}
  onClick={() => setRevealed(true)}
  className={styles.revealButton}
>
```

Cite the rationale in a comment so the next reader knows why the
spread is intentionally absent here.

### P1-7. Add focus management after Predict's RevealGate fires (WCAG 2.4.3)

**Severity**: WCAG 2.1 § 2.4.3 (Focus Order)
**File**: `packages/components/src/components/Predict/Predict.tsx` (conditional reveal block)
**Effort**: 1 hour (impl + unit test)

When `revealed` flips to `true`, the gated content appears below the
button. Focus stays on the now-disabled button. A keyboard-only user
hits Tab to move into the revealed content — which works — but a
screen-reader user has no announcement that anything appeared.

**Fix**: Move focus to the revealed container (with `tabIndex={-1}` so
it's programmatically focusable) and let the focused-element
announcement carry the news.

### P1-8. Document static vs. interactive component boundary

**Severity**: Knowledge gap (every future chapter author hits this)
**File**: new, `docs/website/authoring/chapter-components.md`
**Effort**: 1 hour

`spoiler-alerts.mdx` uses both `<Callout>` (via static map, no
`client:load`) and `<InteractiveCallout client:load>`. Nothing in the
codebase documents *why* or *which to use when*. New chapter authors
will guess wrong, and the failure mode (static component imported
with `client:load` → wasted hydration, or interactive component
through the static map → broken state) is not obviously diagnosable.

**Fix**: One-page guide listing every component, its category
(static / interactive), whether it needs `client:load`, and the
import pattern. Link from CLAUDE.md.

---

## P2 — Important (next sprint)

These are real concerns that don't have to ship this sprint but should
not pile up.

### P2-1. Implement `audit()` for components with real invariants

**File**: `packages/components/src/components/*/*.contract.ts`
**Effort**: 2 hours

Every contract has `audit: () => []`. The platform's `audit()` API
exists but ships with zero invariant checks. Real invariants to
encode:

- `Callout`: `forbidsContaining` declares no nested Callouts, but
  nothing enforces it. `audit()` should walk children.
- `LearningObjectives`: objective ids must be unique within an
  instance. `audit()` should detect collisions.
- `Predict`: prompt ids must be unique. Same check.
- `ConfidenceCheck`: scale ∈ {5, 7}. (Schema enforces this via Zod;
  audit could mirror.)
- `MiniGlossary`: per-term slug collisions are dedupe-handled, but
  `audit()` could surface a warning if two terms slug to the same
  base (since dedupe changes anchor URLs unpredictably).

### P2-2. Live-region announcements for hydration completion

**File**: pattern across all persistence-bearing components
**Effort**: 2–3 hours (shared `<HydrationAnnouncer>` or per-component)

WCAG 4.1.3 (Status Messages): when `controlProps['aria-busy']` flips
false, screen-reader users currently get no signal that the control is
now interactive. Pattern: per-component `role="status" aria-live="polite"`
sibling that announces "ready" on hydration.

Worth weighing per-component vs page-level: per-component is more
informative; page-level is less noisy.

### P2-3. Escape-to-close on CollapsibleCard

**File**: `packages/components/src/components/CollapsibleCard/CollapsibleCard.tsx`
**Effort**: 1 hour

Radix Collapsible does not bind Escape by default. ARIA APG recommends
it for disclosure widgets. Add `onKeyDown` handler that closes on
Escape (matching native `<details>` behavior).

### P2-4. Six hardcoded hex fallbacks in nested `var()` chains

**Files** (all CSS Modules):
- `ComprehensionGate.module.css:6` (`#4c7e9b`)
- `ConfidenceCheck.module.css:6` (`#7c5bc2`)
- `EffortLog.module.css:6` (`#4c9b8c`)
- `Predict.module.css:5` (`#c25b7c`)
- `Reflection.module.css:6` (`#c25b7c`)
- `LearningObjectives.module.css:5` (`#4c7e9b`)

**Effort**: 30 min

Each is the innermost fallback in a three-level `var()` chain. In
practice the outer Sophie tokens are always defined, so these never
trigger. But they encode design intent in hex literals scattered
across the codebase. Promote each to a Sophie token (already a
de-facto token — `#7c5bc2` *is* `--sophie-brand-violet`).

### P2-5. `useInteractive` status surface is unused

**Files**: `Reflection.tsx`, `Predict.tsx`, others with async writes.
**Effort**: 2 hours

`useInteractive` returns a `status` (loading / ready / error). No
component renders it. A "Saving…" / "Saved" affordance after a
textarea blur would improve confidence (both UX and SR), with zero
backend changes — the data is already in the hook return.

### P2-6. ProfileProvider context unreachable from MDX islands

**File**: `packages/components/src/runtime/useProfile.ts`
**Effort**: 30 min (documentation) or 2 hours (full prop-threading
migration)

The context never propagates into MDX-rendered React islands (each
island is its own server render). `useProfile()` silently falls back
to `"student"`. Phase 0 works because every user is `student`; Phase 5
plans require profile branching and *will* break.

Short-term fix: add a `console.warn` + JSDoc on `useProfile()`.
Long-term fix: thread `profile` as a per-component prop (deferred).

### P2-7. Naming inconsistency: `title` vs `heading` vs `prompt`

**Files**: schemas across components.
**Effort**: 1 hour (rename + migration in smoke chapter)

- `title`: Callout, CollapsibleCard, KeyEquation, MiniGlossary
- `heading`: LearningObjectives
- `prompt`: ComprehensionGate, EffortLog, Reflection, Predict (per-prompt)

The split is *kind of* semantic (display heading vs. eliciting prompt)
but inconsistent enough to surprise authors. Recommend: `title` for
display labels on structural blocks; `prompt` for elicitation widgets;
rename `LearningObjectives.heading` → `LearningObjectives.title`.

### P2-8. Self-assessment `sa-` token namespace is shared

**Files**: ComprehensionGate, ConfidenceCheck, EffortLog, Reflection.
**Effort**: 1 hour

All four use `--color-sa-*` / `--space-sa-*` override hooks. A
chapter that wants to retheme only ComprehensionGate can't, because
overriding `--color-sa-accent` would hit ConfidenceCheck too.

Migrate to per-component prefixes (`--color-cg-*`, `--color-cc-*`,
`--color-el-*`, `--color-refl-*`) matching the established pattern in
CollapsibleCard / KeyEquation / MiniGlossary / Predict.

### P2-9. No edge-case tests anywhere

**Files**: all `*.test.tsx`
**Effort**: 3–4 hours

Tests use happy-path strings (5–10 words, ASCII, small arrays). No
tests for: very long input (1000+ chars), special characters in ids
(quotes, angle brackets, leading colons), very many items (50
objectives), empty edge of `.min(1)` boundaries. The Figure union
discriminator has only a partial rejection test.

---

## P3 — Polish

### P3-1. Adopt `:target` pulse on CollapsibleCard + Figure

KeyEquation and MiniGlossary both implement the `:target` outline
pulse. CollapsibleCard and Figure are also hash-anchorable but don't
emit a `:target` style. Consistent treatment (~20 min per component).

### P3-2. Flatten three-level `var()` fallbacks to two

Once P1-3 + P2-4 land, every CSS Module's `var()` calls collapse
naturally to two levels (component-override-hook → sophie-token).

### P3-3. Register jest-axe custom matcher

`test-setup.ts` does not register `expect(...).toHaveNoViolations()`.
Tests use `expect((await axe(container)).violations).toEqual([])`,
which works but is less readable. Adding `import
"jest-axe/extend-expect"` to setup unlocks the cleaner form across all
test files (gradual migration).

### P3-4. Arrow-key navigation on radio groups

Native radio groups support Tab + Space; ARIA APG recommends Arrow
keys too. ComprehensionGate, ConfidenceCheck, EffortLog could
implement `onKeyDown` for ArrowUp/ArrowDown/ArrowLeft/ArrowRight to
move between options.

### P3-5. `prefers-contrast: more` support

Zero components opt into high-contrast mode. Self-assessment widgets
that rely on color for state distinction (checked, selected, focused)
are the highest-value candidates.

### P3-6. Second chapter in smoke

`spoiler-alerts.mdx` is the only proving ground. A second chapter
would stress-test per-chapter persistence isolation (do two
`LearningObjectives` with `id="lo"` in different chapters collide?
— shouldn't, but no test enforces it) and cross-chapter navigation.

---

## P4 — Open questions for Anna

Decisions before doing the P1/P2 work:

1. **Shadow tokens**: introduce `--sophie-shadow-card` (Option B in
   P1-2) or derive from `--sophie-text` inline (Option A)?
2. **Live-region pattern**: per-component announcer or page-level
   shared announcer (P2-2)?
3. **`useProfile()` future**: short-term warn-and-fallback, or
   commit to prop-threading now (P2-6)? The longer this waits the
   more components need to change.
4. **`audit()` priority**: Are these blocking for v1 or can they ship
   in Phase 2 with the dashboard work?
5. **BroadcastChannel ADR**: should I draft ADR 0029 before
   implementing P1-5, or are we comfortable making the design
   decision in the PR itself?

---

## Recommended sprint shape

A focused 1-2 day hardening sprint can close most of P1:

**Day 1** (~4 hours):
- P1-1 (InteractiveCallout title) — 5 min
- P1-3 (broken token refs) — 10 min
- P1-2 (hardcoded shadow hex) — 15 min, depends on Q4-1
- P1-4 (focus-visible) — 30 min
- P1-6 (Predict pattern) — 15 min
- P1-8 (component-boundary doc) — 1 hour
- P2-4 (hex fallbacks) — 30 min
- P2-7 (heading→title rename) — 1 hour

**Day 2** (~5 hours):
- P1-7 (focus management) — 1 hour
- P1-5 (BroadcastChannel LWW) — 4 hours, possibly preceded by ADR 0029

P2 items (audit() impl, live regions, Escape-to-close,
prefers-contrast, second smoke chapter) flow into a second sprint or
fold into Trio 4 work as components are touched.

---

## Files I'd expect to change

If the recommended P1 sprint shape is adopted:

| File | Change | P-item |
|---|---|---|
| `packages/components/src/components/Callout/Callout.tsx` | Guard title render in InteractiveCallout | P1-1 |
| `packages/components/src/components/CollapsibleCard/CollapsibleCard.module.css` | Replace `#0f1115` in shadow | P1-2 |
| `packages/components/src/components/KeyEquation/KeyEquation.module.css` | Same | P1-2 |
| `packages/theme/src/tokens.ts` | Add `--sophie-shadow-card` token | P1-2 |
| `packages/components/src/components/InteractiveCheckbox/InteractiveCheckbox.module.css` | Fix broken token refs + add focus-visible | P1-3, P1-4 |
| `packages/components/src/components/LearningObjectives/LearningObjectives.module.css` | Fix broken token refs + add focus-visible | P1-3, P1-4 |
| `packages/components/src/components/ComprehensionGate/ComprehensionGate.module.css` | Add focus-visible + remove hex fallback | P1-4, P2-4 |
| `packages/components/src/components/ConfidenceCheck/ConfidenceCheck.module.css` | Same | P1-4, P2-4 |
| `packages/components/src/components/EffortLog/EffortLog.module.css` | Same | P1-4, P2-4 |
| `packages/components/src/components/Predict/Predict.tsx` | Remove `controlProps` spread on reveal button; add focus management | P1-6, P1-7 |
| `packages/components/src/runtime/useInteractive.ts` | LWW versioning | P1-5 |
| `packages/components/src/runtime/IndexedDBResponseStore.ts` | LWW versioning | P1-5 |
| `docs/website/decisions/0029-last-write-wins-broadcast.md` | New ADR | P1-5 |
| `docs/website/authoring/chapter-components.md` | New doc | P1-8 |

Expected delta: ~12 files modified + 2 created, ~150 lines net.

---

## References

- ADR 0004 — component contract; axe-core mandatory.
- ADR 0005 — theming three layers (tokens.ts → CSS vars → CSS Modules).
- ADR 0007 — IndexedDB + ResponseStore + BroadcastChannel.
- ADR 0019 — Radix UI for a11y primitives.
- ADR 0027 — static vs persistence-bearing render boundary.
- ADR 0028 — Storybook test-runner axe-only posture.
- `docs/website/contributing/coding-standards.md` § Persistence-bearing controls MUST spread `controlProps`.
- PR #8 (hydration guard codified).
- PR #13, #14, #15 (Trio 3 components).

---

**Methodology note**: This audit was generated by spawning three
parallel deep-read agents (architecture, CSS, accessibility +
runtime), then spot-verifying the most surprising claims against
`file:line`. Three claims were independently confirmed against the
source: the `#0f1115` box-shadow hex, the four broken token
references, and the InteractiveCallout title-render divergence. The
BroadcastChannel race condition was reasoned about from the code
shape; an actual two-tab Playwright repro should accompany the P1-5
fix.
