---
date: 2026-05-28T00:00:00.000Z
tags:
  - pedagogy-audit
  - build
  - integration
  - artifact
  - ci
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-28"
  evidence:
    - kind: deployment
      ref: packages/astro/src/integration.ts
      date: "2026-05-28"
      notes: "The `astro:build:done` hook runs the corpus-wide audit (accumulator-reading + contract extraction here, once), emits `dist/.sophie/pedagogy-audit.json` via writePedagogyAuditJson, then gates (throw on ERROR). TextbookLayout's audit is dev-only (import.meta.env.DEV-guarded)."
    - kind: deployment
      ref: packages/astro/src/lib/pedagogy-audit/emit.ts
      date: "2026-05-28"
      notes: "Deterministic artifact envelope { artifact_version, summary, errors, warnings, infos } — no timestamp; byte-identical for a given corpus."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit/emit.test.ts
      date: "2026-05-28"
      notes: "Unit tests assert the envelope mapping (counts + arrays), the empty/no-corpus case, and determinism (stable key order, no time-varying fields)."
    - kind: test
      ref: examples/packed-smoke/e2e/pedagogy-audit-artifact.spec.ts
      date: "2026-05-28"
      notes: "Integration proof: a packed-tarball consumer's prod build emits dist/.sophie/pedagogy-audit.json with the versioned envelope + summary counts matching the build log."
  notes: |
    Shipped: build-done trigger + artifact + dev-only layout guard.
    Implemented via the accumulator-reading approach (the integration reads
    the already-populated index pagefind-style, extracts contract validations
    once at build-done). Originating audit item: P2.4
    (docs/reviews/2026-05-28-platform-hardening-audit.md).
---

# ADR 0088: pedagogy-audit build artifact + build-done trigger

:::{admonition} ADR metadata

- **Status**: shipped
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
   `runAuditOncePerProcess` (`audit-cache.ts`) — the corpus-wide gate is a
   *side-effect of rendering a chapter page* rather than a defined build
   step. (A build with no chapter page also skips it, but such a build has
   no pedagogy corpus to audit, so that case is moot — see Consequences.)
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
   gate location, and the architecturally correct home for a whole-corpus
   check. Contract validations are extracted **here** (once) rather than
   per-chapter-page in the layout. Implemented via the **accumulator-reading**
   approach: the hook reads the already-populated index (pagefind-style — every
   route has pre-rendered by build-done, so the layout's setters have run), not
   by re-deriving the corpus via Astro's content API (unavailable in the
   integration hook). Dev keeps `TextbookLayout`'s per-render `console.log`
   audit for live HMR feedback.
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
  runs the audit twice in prod, two sources of truth, and keeps the gate
  coupled to page render.
- **Amend ADR 0045 instead of a new ADR.** Rejected — 0045 is narrowly the
  `sophie diff` artifact contract; the trigger relocation + gating-semantics
  shift is a distinct architectural decision that would bloat 0045 past its
  single responsibility. (This ADR cites 0045's artifact pattern instead.)

## Consequences

**Easier:** CI and future tooling consume a stable, machine-readable JSON
artifact; the corpus-wide gate is a defined build step (not a chapter-render
side-effect), living where the corpus is guaranteed complete; contract
validations are extracted once instead of per chapter page; dev feedback is
unchanged.

**Harder:** two trigger paths (dev-layout + prod-build-done); the build-done
audit relies on the layout's accumulator setters having run during page
renders (true for any build with chapter pages — and a build with none has
no corpus to audit). Truly render-independent auditing would require Astro's
content API in the integration hook (unavailable; out of scope). A failing
build now aborts at end-of-build rather than mid-render (marginally later,
architecturally correct).

**Scope honesty:** the layout-coupling motivation is about *gate placement*,
not a "silent skip" bug — a no-chapter build has nothing to audit, and the
accumulator-reading approach doesn't independently re-derive the corpus.

## Amendments

### Amendment 1 — `mathA11y` artifact section (2026-05-28)

[ADR 0089](./0089-latex-speech-accessibility.md) (LaTeX→speech
accessibility) adds a build-scoped LaTeX→speech coverage section to the
artifact. `dist/.sophie/pedagogy-audit.json` gains a top-level
`mathA11y` key carrying the math-speech coverage snapshot
(`{ total, labeled, failures[] }`) the `math-speech` invariant reads.
`artifact_version` is bumped **0.1 → 0.2**; the 0.1 envelope had no
`mathA11y` key. The envelope stays deterministic (no timestamp) per the
original Decision 3. See
[`packages/astro/src/lib/pedagogy-audit/emit.ts`](../../../packages/astro/src/lib/pedagogy-audit/emit.ts)
and its `emit.test.ts`.

## References

- [Proposal + resolved decisions](../../plans/2026-05-28-pedagogy-audit-artifact-proposal.md).
- [Platform-hardening audit P2.4](../../reviews/2026-05-28-platform-hardening-audit.md).
- [ADR 0045](./0045-pedagogical-diff-curriculum-ci.md) — the
  `dist/.sophie/*.json` artifact pattern this parallels.
