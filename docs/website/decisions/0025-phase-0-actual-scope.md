---
date: 2026-05-10T00:00:00.000Z
tags:
  - phase-0
  - scope
  - calendar
  - retrospective
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0025: Phase 0 actual scope (lean-but-realistic)

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[ADR 0023](./0023-vertical-slice-build-order.md) set Phase 0 at
~1 week with a vertical-slice-first build order. The reality of the
build, captured across 10 numbered steps, was ~2–2.5 weeks. Phase 1
estimation depends on an honest baseline; this ADR documents what
actually shipped, the reasons for the calendar drift, and which parts
of ADR 0023's plan held.

The build-order question is also up for review: did
vertical-slice-first work in practice, or should Phase 1 try a
different shape?

## Decision

Document Phase 0's actual ten-step shape and ~2–2.5 week calendar.

The build-order from ADR 0023 (vertical-slice-first) is
**reconfirmed** and validated by experience — supersede only the
calendar of ADR 0023, not its build-order.

## Rationale

### What shipped (ten steps)

| # | Step | What |
|---|---|---|
| 1 | Repo bootstrap | License placeholder, README, `.gitignore`, basic structure |
| 2 | Workspace + tooling foundation | pnpm workspace, Biome, Turborepo, `.nvmrc`, root scripts |
| 3 | `@sophie/core` skeleton | Schema (Zod), audit utilities, CLI binary scaffold |
| 4 | `@sophie/theme` | Muted spectral minimalism: tokens, palettes (light + dark), Tailwind v4 CSS-first integration |
| 5 | `@sophie/components` | `<Callout>` + `<Figure>` + `useInteractive` runtime, axe-core tests, fake-IndexedDB persistence |
| 6 | `@sophie/astro` integration | Astro 6 + MDX wrapper, `<SophieChapter>`, framework-purity boundary |
| 7 | Vertical-slice acceptance + step-5/6 amendments | Real ASTR 201 chapter rendering end-to-end; ADR 0027 architectural correction (per-instance hydration) |
| 8 | Test stack | Vitest + Playwright + axe-core wired through Turborepo; coverage reporting |
| 9 | CI pipeline | GitHub Actions (lint/typecheck/unit/build/e2e) + Dependabot |
| 10 | Done-criteria + handoff | This ADR cluster + roadmap update + Phase 1 handoff doc + done-criteria checklist |

### Why it grew

Three mid-build expansions account for most of the calendar drift:

1. **Test stack got its own step.** Originally bundled into the
   components step (step 5), it expanded enough — Playwright +
   axe-core + Turborepo cache wiring + coverage — to warrant
   isolation. The separation was right: it gave the e2e + a11y
   integration room to breathe, and the test infrastructure became
   reusable across packages.

2. **Step 7's architectural correction (ADR 0027).** The vertical
   slice surfaced a bug in the assumed component contract: MDX-rendered
   React components are isolated SSR roots, so persistence-bearing
   components needed per-instance `client:load` hydration with
   props-threaded chapter context. Fixing this required revisions to
   steps 5 and 6 and an ADR. This is exactly the kind of issue
   vertical-slice-first is *designed* to surface; calendar cost was
   ~2 days, but the alternative (discovering it in Phase 1 across
   multiple components) would have been worse.

3. **CI got its own step.** Originally squeezed into step 8's
   done-criteria, it expanded to a full step once we recognized
   GitHub Actions setup, branch protection, Dependabot, and
   verification cycles each warranted attention.

### What didn't grow

All ADR-0023 deferrals held in practice:

- No Storybook (waiting for component count to justify isolation).
- No visual regression (waiting for stable design system).
- No Changesets (deferred until second consumer exists).
- No Lefthook / Commitlint (deferred until contributors arrive).
- No CodeQL or supply-chain hardening (Phase 1+).
- No remote Turborepo cache (Phase 1+ optimization).
- No Codecov (artifact-only coverage upload was sufficient).
- No `apps/docs/` self-hosted Sophie docs (indefinitely deferred).
- No `@sophie/renderer-contract` package (only matters with second renderer).
- No Cosmic Playground (Phase 1+ when first `<Demo>` lands).

### Build-order vindicated

Vertical-slice-first surfaced ADR 0027's per-instance hydration
constraint at step 7 — much earlier than a horizontal-build approach
would have. With horizontal builds, the bug would have shown up only
when the second persistence-bearing component was added (likely
mid-Phase 1), at which point fixing it would have required revising
multiple already-shipped components. The vertical slice cost ~2 days
and protected ~1+ week of Phase 1 rework.

## Alternatives considered

- **Stick with ADR 0023's 1-week calendar; declare overruns as
  Phase 0.5.** Rejected: the work was Phase 0 work in shape and
  intent; calling it Phase 0.5 would muddy phase boundaries for no
  benefit.

- **Migrate to a horizontal build now to "catch up."** Rejected:
  vertical-slice-first proved its value (point above); switching
  would lose the validation already done.

- **Skip ADR 0025 and just update the roadmap.** Rejected: the
  calendar shift affects Phase 1 estimates and future-Anna
  planning; an ADR creates a discoverable record rather than burying
  the change in roadmap diff history.

## Consequences

**Easier:**

- Honest Phase 1 baseline: future phase estimates use 2–2.5x
  ADR-0023-style raw estimates as a working model.
- Vertical-slice pattern reusable for Phase 1 (the first new
  component goes through the same end-to-end loop before the next
  one starts).

**Harder:**

- Phase 1 calendar shifts ~1.5 weeks later than ADR 0023's
  implicit baseline.
- More steps means more handoff overhead between sessions.

**Triggers:**

- `status/roadmap.md` updated with the actual ten-step decomposition.
- `status/phase-1-plan.md` written with realistic week estimates.
- ADR 0023 remains accepted but its calendar is superseded by this
  ADR (its build-order is reconfirmed).

## References

- [ADR 0023: Vertical-slice build order](./0023-vertical-slice-build-order.md) —
  the build-order this ADR reconfirms; the calendar this ADR supersedes.
- [ADR 0027: MDX render boundary](./0027-mdx-render-boundary-prop-threading.md) —
  the mid-step architectural correction that drove ~2 days of
  scope expansion.
- `~/.claude/plans/read-all-of-the-sharded-sky.md` — the parent
  Phase 0 plan that defined the ten steps.
