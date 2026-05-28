# Proposal: pedagogy-audit build artifact + build-done trigger (audit P2.4)

**Status:** design approved in-thread (Anna, 2026-05-28) — all five open
questions resolved (see "Resolved decisions"). Next: promote to **ADR 0088**
+ implement (see execution plan). The LOC `cohesive` exemption is a
**separate** track (ADR 0061 amendment), not part of this work.
**Date:** 2026-05-28
**Origin:** platform-hardening audit P2.4
(`docs/reviews/2026-05-28-platform-hardening-audit.md`).
**Relates to:** ADR 0038 (pedagogy-index pattern), ADR 0045 (`dist/.sophie/*`
build-artifact contract), ADR 0082 (integration-injected build surface),
ADR 0061 (focused-files / file routing).

## Context — what's true today (verified)

The build-time pedagogy audit is **correct and runs in production** (the
audit's headline finding — the feared "tests-only" gap does not exist). But
two properties are sub-SoTA for a distributable platform:

1. **Layout-coupled trigger.** The audit fires from
   `TextbookLayout.astro:216-220` via `runAuditOncePerProcess`
   (`audit-cache.ts:54-72`), gated once-per-process on
   `globalThis.__sophiePedagogyAuditDone`. A build that renders **no chapter
   page** (e.g. a course-info/landing-only projection) never triggers the
   audit at all — the corpus-wide check silently no-ops.
2. **`console.log`-only output.** `formatAuditReport` (`format.ts:56-77`) is
   printed to stdout — and worse, *concatenated into a page's render stream*
   (`…index.htmlPedagogy audit:`). There is no machine-readable artifact for
   CI gates, `sophie diff`, dashboards, or the instructor view to consume.

**Strong precedent already in the tree.** `writePedagogyIndexJson`
(`pagefind-postbuild.ts:28-36`) already emits
`dist/.sophie/pedagogy-index.json` from the integration's **existing**
`astro:build:done` hook (`integration.ts:272`, ADR 0045 Artifact 2). The
hook reads the fully-populated `indexAccumulator.asPedagogyIndex()` —
proving the index is complete at build-done time. The audit JSON is a
near-exact sibling artifact.

**Boundary check.** The audit runner lives in `@sophie/astro`
(`lib/pedagogy-audit/runner.ts`), imports only `@sophie/core/schema` + local
invariants, no `astro:*`. The integration (same package) can call it
directly — no ADR 0001 framework-purity violation.

## Proposed decision

### 1. Emit `dist/.sophie/pedagogy-audit.json` at build-done

Add `writePedagogyAuditJson(distPath, report)` beside
`writePedagogyIndexJson`, called from the existing `astro:build:done` hook.
Reuse the canonical `AuditFinding` Zod shape (`@sophie/core/schema/audit.ts`)
inside a small versioned envelope:

```jsonc
{
  "artifact_version": "0.1",
  "summary": { "errors": 0, "warnings": 17, "infos": 9 },
  "errors":   [ /* AuditFinding[] */ ],
  "warnings": [ /* AuditFinding[] */ ],
  "infos":    [ /* AuditFinding[] */ ]
}
```

(`AuditFinding = { severity, code, message, location?: { unit?, anchor?, path? } }`
— already schema'd and stable.) The artifact is emitted **before** any
error-gating throw, so CI can inspect it even on a failing build.

### 2. Move the *prod* trigger to build-done; keep *dev* layout feedback

Mode-split, mirroring `audit-cache.ts`'s existing prod/dev philosophy:

- **Prod build** → the integration's `astro:build:done` hook is the single
  authoritative trigger: run the audit once over the complete corpus, emit
  the JSON artifact, then apply the error-gate (throw → non-zero exit). This
  decouples the corpus-wide audit from whether any chapter page rendered, and
  build-done is the architecturally correct place for a whole-corpus check
  (all chapters guaranteed parsed). `TextbookLayout` stops calling the audit
  in prod.
- **Dev** → `TextbookLayout` keeps its per-render `console.log` audit
  (fresh HMR feedback as the author edits — the reason `audit-cache.ts`
  re-runs in dev). No artifact in dev; no behavior change for authors.

This preserves the dev DX, adds the prod artifact, and fixes the
spec-only-build no-op.

### 3. Gating semantics unchanged in substance

Errors → build fails (non-zero exit). Warnings/infos → recorded in the
artifact + logged. The throw moves from mid-render (arbitrary "first chapter
page") to end-of-build (after all pages + artifact emit) — a *more* correct
location for a corpus-wide gate.

## Resolved decisions (2026-05-28, with Anna)

1. **Trigger architecture → Option B (mode-split).** Prod = the integration's
   `astro:build:done` hook is the single authoritative trigger (emit artifact,
   then gate); dev = `TextbookLayout` keeps its per-render console audit for
   HMR feedback. Fixes the spec-only-build no-op; preserves dev DX.
2. **ADR home → new ADR 0088** (not an amendment to 0045): the
   trigger-relocation + gating-semantics shift is a distinct architectural
   decision; 0045 stays narrowly the `sophie diff` artifact contract. Cites
   0045 + 0038 + 0082. (Also: document the long-standing **0050 gap as
   intentionally unassigned** in the decisions index — numbers are stable
   chronological IDs; we do not backfill.)
3. **Dev-mode artifact → no.** Prod-build-only, mirroring
   `pedagogy-index.json`. Dev keeps console-only feedback.
4. **Envelope metadata → deterministic, no timestamp.** Keep
   `artifact_version`; omit `generatedAt` so the artifact is byte-identical
   for a given corpus (reproducible, diff-clean). "When" comes from the build
   system / file mtime, not baked-in content.
5. **CLI consumer → defer.** Ship artifact + trigger only; the prod build's
   error-gate already enforces in CI via its exit code. A future `sophie
   audit` command will be designed against a concrete caller and
   **validated against the `../astr201/` consumer** (see Out of scope).

## Implementation sketch (post-approval)

- `packages/astro/src/lib/pedagogy-audit/emit.ts` — `writePedagogyAuditJson`
  + the envelope type (small, focused file; mirrors the pagefind-postbuild
  emit helper).
- `integration.ts` `astro:build:done` — run the audit over
  `indexAccumulator.asPedagogyIndex()` (+ the same `AuditExtras` TextbookLayout
  assembles: `draftUnitIds`, `repoRoot`, `notationRegistry`, contract
  validations), emit JSON, gate.
- `TextbookLayout.astro` — guard the audit call to **dev only**
  (`import.meta.env.DEV`); prod path removed.
- `audit-cache.ts` — the once-per-process cache is now only needed for dev
  (build-done fires exactly once); simplify or scope its comment accordingly.
- Tests: unit-test `writePedagogyAuditJson` shape; an integration assertion
  that a prod build emits `dist/.sophie/pedagogy-audit.json` with the right
  counts; confirm a spec-only build now audits (the bug this fixes).
- Docs: the new/amended ADR; update audit P2.4 status; regen `validation.md`
  if an ADR `validation:` block changes.

## Verification (success criteria)

- `dist/.sophie/pedagogy-audit.json` present after a smoke/packed-smoke prod
  build, with counts matching the console summary.
- A course-info/landing-only build (no chapter page) now produces the audit
  artifact (today it silently skips).
- Error-gate still fails the build on an `ERROR`-severity finding, *after*
  emitting the artifact.
- Dev `astro dev` still prints the per-render audit (no DX regression).
- biome / typecheck / test:unit / MyST gates green.

## Out of scope

- `sophie audit` CLI command (defer to a concrete consumer). When built, it
  is **validated against the `../astr201/` consumer repo** as the real-world
  test target.
- Wiring the artifact into the instructor view / SoTL telemetry (roadmap).
- Changing any invariant logic — this is emit/trigger only, not *what* the
  audit checks.
- The LOC `cohesive` exemption + ADR 0061 amendment — a separate, unrelated
  governance change (its own small PR).
