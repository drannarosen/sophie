---
date: 2026-05-28T00:00:00.000Z
tags:
  - pedagogy-audit
  - build
  - integration
  - artifact
  - ci
status: accepted-design
validation:
  status: in-progress
  last_validated_date: "2026-05-28"
  evidence:
    - kind: review
      ref: docs/plans/2026-05-28-pedagogy-audit-artifact-proposal.md
      date: "2026-05-28"
      notes: "Design approved in-thread (five decisions resolved: mode-split trigger, prod-only artifact, deterministic envelope, deferred CLI, new ADR). Implementation pending a follow-up code PR (build-done trigger + writePedagogyAuditJson + dev-only layout guard + tests)."
  notes: |
    Accepted-design: the trigger / artifact / gating decision is locked; no
    code shipped at ADR-creation time. The integration build-done
    implementation + `dist/.sophie/pedagogy-audit.json` emit land in a
    follow-up PR that flips this block to validated with deployment + test
    evidence. Originating audit item: P2.4
    (docs/reviews/2026-05-28-platform-hardening-audit.md).
---

# ADR 0088: pedagogy-audit build artifact + build-done trigger

:::{admonition} ADR metadata

- **Status**: accepted-design
- **Deciders**: anna
- **Related**: [0038](./0038-pedagogy-index-pattern.md) (index the audit
  consumes), [0045](./0045-pedagogical-diff-curriculum-ci.md) (the
  `dist/.sophie/*` artifact contract this parallels), [0082](./0082-chapter-layout-extraction.md)
  (integration-injected build surface), [0001](./0001-platform-not-monorepo.md)
  (framework purity)
:::

## Context

The build-time pedagogy audit is correct and runs in production, but its
emission is sub-SoTA for a distributable platform (audit P2.4):

1. **Layout-coupled trigger.** It fires from `TextbookLayout.astro` via
   `runAuditOncePerProcess` (`audit-cache.ts`). A build rendering **no
   chapter page** (e.g. a course-info/landing-only projection) never
   triggers the corpus-wide audit at all — it silently no-ops.
2. **`console.log`-only output.** `formatAuditReport` prints to stdout
   (concatenated into a page's render stream). There is no machine-readable
   artifact for CI gates, `sophie diff`, dashboards, or the instructor view.

A strong precedent exists: `writePedagogyIndexJson` already emits
`dist/.sophie/pedagogy-index.json` from the integration's existing
`astro:build:done` hook (ADR 0045 Artifact 2), reading the fully-populated
`indexAccumulator` — proving the index is complete at build-done time. The
audit runner lives in `@sophie/astro` (imports `@sophie/core/schema` + local
invariants only, no `astro:*`), so the integration may call it directly
without violating ADR 0001 framework purity.

## Decision

1. **Emit `dist/.sophie/pedagogy-audit.json`** from the integration's
   `astro:build:done` hook, beside `writePedagogyIndexJson`. Reuse the
   canonical `AuditFinding` Zod shape (`@sophie/core/schema/audit.ts`) inside
   a versioned envelope `{ artifact_version, summary, errors, warnings,
   infos }`. The artifact is written **before** any error-gate throw so CI
   can inspect it even on a failing build.
2. **Mode-split trigger.** Prod builds run the audit once at `astro:build:done`
   (emit artifact, then gate) — the single authoritative, layout-independent
   trigger, and the architecturally correct home for a whole-corpus check.
   Dev keeps `TextbookLayout`'s per-render `console.log` audit for live HMR
   feedback. This fixes the spec-only-build no-op while preserving the dev
   loop.
3. **Deterministic envelope.** Keep `artifact_version`; **omit** any
   `generatedAt` timestamp so the artifact is byte-identical for a given
   corpus (reproducible, diff-clean), matching `pedagogy-index.json`.
   "When" is the build system's concern (CI time / file mtime).
4. **Gating semantics unchanged in substance.** Errors → build fails
   (non-zero exit); warnings/infos → recorded + logged. The throw moves from
   mid-render to end-of-build — a more correct location for a corpus-wide
   gate.
5. **Defer the CLI.** No `sophie audit` command in this work; the prod
   build's error-gate already enforces in CI via its exit code. A future
   command is designed against a concrete caller and validated against the
   `../astr201/` consumer.

## Alternatives considered

- **Move the audit entirely to build-done (drop the dev layout pass).**
  Rejected — kills dev-mode audit feedback (no `astro:build:done` in `astro
  dev`); authors wouldn't see findings until a full build.
- **Keep the layout audit in prod and also emit at build-done.** Rejected —
  runs the audit twice in prod, two sources of truth, and doesn't fix the
  spec-only-build no-op.
- **Amend ADR 0045 instead of a new ADR.** Rejected — 0045 is narrowly the
  `sophie diff` artifact contract; the trigger relocation + gating-semantics
  shift is a distinct architectural decision that would bloat 0045 past its
  single responsibility. (This ADR cites 0045's artifact pattern instead.)

## Consequences

**Easier:** a course-info-only build now audits (the bug this fixes); CI and
future tooling consume a stable JSON artifact; the corpus-wide gate lives
where the corpus is guaranteed complete; dev feedback is unchanged.

**Harder:** two trigger paths (dev-layout + prod-build-done); the
integration must assemble the same `AuditExtras` (`draftUnitIds`,
`repoRoot`, `notationRegistry`, contract validations) `TextbookLayout`
assembles today; a failing build now aborts at end-of-build rather than
mid-render (marginally later, architecturally correct).

## References

- [Proposal + resolved decisions](../../plans/2026-05-28-pedagogy-audit-artifact-proposal.md).
- [Platform-hardening audit P2.4](../../reviews/2026-05-28-platform-hardening-audit.md).
- [ADR 0045](./0045-pedagogical-diff-curriculum-ci.md) — the
  `dist/.sophie/*.json` artifact pattern this parallels.
