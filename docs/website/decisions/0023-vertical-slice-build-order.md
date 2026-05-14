---
date: 2026-05-09
tags: [build-order, phase-0, scope, philosophy, foundation]
---

# ADR 0023: Vertical-slice-first build order for Phase 0 and beyond

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

The Phase 0 scope as documented in
[`status/roadmap.md`](../status/roadmap.md) was expanded earlier this
design session under a "build the best now, plan ahead" mandate aimed
at making Sophie open-source-adoption-ready from day one. The expanded
Phase 0 includes 8 published packages, full test stack (Storybook +
Vitest + Playwright + axe-core + visual regression), Changesets,
Lefthook, Commitlint, Renovate, dogfooded `apps/docs/`, reference
`apps/example-textbook/`, the `@sophie/renderer-contract` adapter
interface package, and the full `sophie` CLI surface — all before
the first chapter renders. Estimated 3–4 weeks.

A late-session honesty check (May 2026) re-examined this with a
different framing: Anna is committed to the full vision but is
**building for her own courses first**, not optimizing for external
adoption on day one. Under that framing, "infrastructure before first
value" is a different optimization than "ship the smallest thing that
lets me edit a chapter" and refactor outward.

The choice changes scope and order — not architecture. The 22
prior ADRs (0001–0022) remain correct; what changes is **how much
of the platform shape is built up front vs. earned.**

## Decision

**Vertical-slice-first build order.** Phase 0 ships the minimum
viable scaffolding required to render one ASTR 201 chapter with
HMR. Packages, test infrastructure, and developer-experience
tooling are added as they earn their keep — not pre-built.

Phase 0 (revised):

- pnpm workspace, TypeScript, Astro 5, MDX, React 19 configured.
- A *minimal* `@sophie/core` package combining what would have been
  `@sophie/schema`, `@sophie/audit`, and `@sophie/cli`. (Splits later
  when natural seams appear.)
- `@sophie/components` package (genuinely distinct consumer needs).
- `@sophie/theme` package (genuinely distinct).
- `@sophie/astro` package (the integration point).
- One ASTR 201 chapter rendering through `@sophie/astro` with HMR.
- Vitest + Playwright + axe-core + Biome + Turborepo wired in CI.
- Git repo initialized at `drannarosen/sophie`.

**Deferred from Phase 0** (added as they earn their keep, not
abandoned):

- `@sophie/renderer-contract` package (only matters when a second
  renderer is real).
- `@sophie/cosmic-playground` package (Phase 1+ when the first
  `<Demo>` lands).
- `apps/docs/` self-hosted Sophie docs (MyST docs at
  `docs/website/` work; migration is no longer a near-term goal —
  see Consequences).
- `apps/example-textbook/` reference textbook (ASTR 201 chapters
  in the consumer course repo serve the same role).
- Storybook (Phase 1, around the third component when isolation
  pays off).
- Visual regression (Phase 1+, once a stable design system exists
  to regress against).
- Changesets (Phase 2+, when there's a real second consumer that
  pins versions).
- Lefthook + Commitlint (discipline-via-contributor-guidelines
  carries solo dev; add hooks when contributors arrive).
- Renovate (manual dep updates for v1; add when CI volume
  justifies it).
- `sophie eval`, `sophie create`, `sophie upgrade` CLI subcommands
  (Phase 2+ when they earn their keep — `sophie audit` and
  `sophie dev` are the v1-critical commands).
- Plugin architecture as **public** API. The internal hooks
  (`registerComponent`, etc.) still exist; they're marked
  `@experimental` or `@internal` until a real third-party
  consumer materializes.

## Rationale

- **First-chapter-render arrives weeks earlier**, which means
  feedback on the *real* design happens before further infrastructure
  gets baked in around assumptions that may turn out wrong.
- **Solo development pacing**. Each package added is a maintenance
  surface. Starting with fewer packages and splitting outward as
  natural seams appear keeps the maintenance load proportional to
  the value delivered.
- **The architecture stays the same.** The 22 prior ADRs document
  the *shape*; this ADR documents the *order*. Vertical-slice-first
  reaches the same end-state as discipline-first — just with the
  infrastructure earned rather than pre-built.
- **Aligns with "build the best now, plan ahead" honestly.** "The
  best" is the long-term-correct architecture; "plan ahead" doesn't
  require building everything ahead. The architecture *is* planned
  ahead in 22 ADRs; the implementation can be vertical-slice without
  contradicting the ahead-planning.
- **Reduces Phase 0 risk.** The roadmap's biggest risk (Phase 0
  expansion eating Phase 1 calendar; v1 slipping into spring 2027
  if time budget halves) is materially smaller with a 1–2 week
  Phase 0 than a 3–4 week one.

## Alternatives considered

- **Discipline-first** (the prior plan): full Phase 0 scaffolding
  before first chapter renders. Pros: platform is shaped correctly
  from the start; no retrofit later. Cons: 2–3 weeks of
  infrastructure-before-value; less feedback from real chapters
  before commitments harden. Rejected for solo-dev /
  own-vision framing; remains a defensible choice if external
  adoption becomes the optimization later.
- **Maximum minimal** (only `@sophie/components` + `@sophie/astro`
  in Phase 0; defer everything else including `@sophie/theme` and
  schema package). Pros: even leaner. Cons: defers genuinely
  load-bearing pieces; the chapter render needs theme tokens and
  schema validation. Rejected — too lean.
- **Pause Sophie; use Quarto for fall 2026; revisit.** Honestly
  considered; rejected by Anna because the vision is hers and
  worth the time, even at solo-dev pace.

## Consequences

**Easier:**

- First-chapter-render in Phase 0 instead of Phase 1.
- Smaller maintenance surface in v1; packages split as patterns
  appear, not speculatively.
- Phase 0 calendar shrinks to ~1–2 weeks; Phase 1 picks up the
  deferred items as the chapter authoring process exposes the need
  for each.
- Less risk of building infrastructure for use cases that don't
  materialize.

**Harder:**

- Refactoring packages out of `@sophie/core` later requires care
  (rename history, version bumps). Mitigated by the small initial
  package count and the fact that code-level boundaries can be
  enforced *within* `@sophie/core` from day one (separate
  directories, internal imports, lint rules) so the eventual split
  is mechanical.
- Some discipline (Storybook stories, Changesets release notes)
  arrives later than ideal. Mitigated by `axe-core` + Vitest +
  Playwright still being in CI from Phase 0; the safety net isn't
  abandoned, just trimmed.
- The `apps/docs/` migration (this MyST site → Sophie-self-hosted)
  goes from "Phase 4–5 commitment" to "**indefinitely deferred**".
  See [ADR 0010](0010-myst-for-design-docs.md) — the rationale
  there still holds, but the timeline footnote is no longer
  load-bearing.

**Triggers / commitments:**

- Phase 0 deliverables list in
  [`status/roadmap.md`](../status/roadmap.md) is rewritten to
  match this ADR.
- The package list in `@sophie/core` is documented in
  [contributing/coding-standards.md](../contributing/coding-standards.md)
  with a note: "These directories will become separate packages
  later; treat them as if they already are (separate imports, no
  cross-directory internal helpers without a public API)."
- The handoff prompt for the next Claude Code session reflects
  this ADR explicitly (the next session designs the lean Phase 0
  step-by-step).
- ADRs 0011–0022 still apply — same architecture, leaner build
  order.

## What's *not* changed by this ADR

- The architectural commitments in ADRs 0001–0022 are unchanged.
- The renderer (Astro+MDX), schema source (Zod), persistence model
  (IndexedDB + ResponseStore), theming approach, slides adapter,
  Cosmic Playground protocol, all tooling choices (pnpm, uv, Biome,
  Turborepo, CodeMirror, Radix, Shiki, Observable Plot, tsup) — all
  unchanged.
- The HITL mandate in CLAUDE.md is unchanged and applies to lean
  Phase 0 implementation just as it did to the larger one.

## References

- Late-session honesty check (May 2026): "is this the best way to
  go?" Anna's commitment to the full vision but for-her-own-courses
  framing.
- [ADR 0001](0001-platform-not-monorepo.md) — standalone-platform
  shape; still holds.
- [ADR 0010](0010-myst-for-design-docs.md) — MyST docs; migration
  to `apps/docs/` deferred indefinitely under this ADR.
- [`status/roadmap.md`](../status/roadmap.md) — Phase 0
  deliverables list to be rewritten.
- [`feedback_design_ambition.md`](file:///Users/anna/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_design_ambition.md)
  — "build the best now, plan ahead" feedback memory; this ADR
  reconciles it with vertical-slice pacing.
