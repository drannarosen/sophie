---
date: 2026-05-14T00:00:00.000Z
tags:
  - pedagogy
  - decisions
  - audit
  - overrides
  - failure-modes
  - runtime
  - lds
status: accepted-design
validation:
  status: in-progress
  last_validated_date: "2026-05-18"
  evidence:
    - kind: test
      ref: packages/components/src/runtime/FallbackResponseStore.test.ts
      date: "2026-05-18"
      notes: "CF5 runtime fallback contract implemented + tested. `FallbackResponseStore` wraps `IndexedDBResponseStore` + `MemoryResponseStore`; engages session-only fallback on IDB failure with one-time console.warn and persistence-mode subscriber notification. 13 test cases."
    - kind: test
      ref: packages/components/src/runtime/useInteractive.test.tsx
      date: "2026-05-18"
      notes: "`UseInteractiveResult.persistence: 'persistent' | 'session'` field threaded through hook; happy-path test pins `persistent` mode on IDB-healthy paths."
    - kind: review
      ref: docs/reviews/2026-05-18-codex-sophie-codebase-architecture-docs-audit.md
      date: "2026-05-18"
      notes: "Codex adversarial review caught the prior CF5 implementation gap (ADRs cited validation evidence that did not actually exercise IDB unavailability). E1 PR closes the gap; this ADR moves to `in-progress` until CF1–CF4 also carry implementation evidence."
---

# ADR 0053: Conformance Failure Modes

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

The seven LDS conformance foundation ADRs (0040–0046) established
a structural-audit floor: chapters declare contracts; the audit
verifies cross-references; CI gates ERRORs. The foundation
review's Missing-2 systemic concern named the question the
foundation did **not** answer: **what does Sophie do when the
audit machinery itself fails, or when a course legitimately
needs to opt out of a specific invariant, or when runtime
persistence is unavailable?**

Five concrete failure-mode questions:

1. **Audit-time invariant override.** A consumer chapter has a
   legitimate reason to fail MG3 (e.g., a misconception is
   declared course-wide but addressed in a *different chapter*,
   not this one). Today: the chapter fails MG3 every audit,
   forcing the author to either restructure or live with red
   CI.

2. **Override granularity.** When override is needed, is it at
   the invariant level (suppress all MG3), the anchor level
   (suppress MG3 for misconception `flux-vs-luminosity` only),
   or somewhere in between?

3. **Override provenance.** How do overrides connect to TDRs
   (the audit-trail discipline that should explain *why* an
   exception exists)?

4. **Audit-tooling failure.** What does the build do if `sophie
   audit` itself errors (CLI bug, malformed YAML, etc.)?

5. **Runtime persistence failure.** What does the student-facing
   build do when IndexedDB is unavailable (private browsing,
   Safari edge cases) or BroadcastChannel is unavailable (older
   browsers, cross-origin embedding)? This was partly addressed
   partly addressed in
   [ADR 0007's runtime-fallback-semantics section](./0007-persistence-indexeddb.md);
   this ADR formalizes the failure mode in the broader taxonomy.

The 2026-05-14 brainstorm locked: **five named failure modes**,
**`audit_overrides` frontmatter with three-grain support**
(per-invariant + per-anchor + TDR-ref required), **five new CF
audit invariants**, and **runtime-fallback documentation**
linking back to ADR 0007.

## Decision

Sophie ships a **`audit_overrides` chapter frontmatter surface**
with **three-grain control** (invariant + anchor + TDR ref),
**five CF audit invariants**, and **formalized runtime fallbacks**
for IndexedDB + BroadcastChannel.

### Five conformance failure modes

The taxonomy. Each gets a CF-prefix audit invariant or named
runtime behavior.

| Mode | Surface | Resolution |
|---|---|---|
| **CF1 — legitimate audit-invariant exception** | `audit_overrides` chapter frontmatter | Author declares override with TDR-ref provenance. |
| **CF2 — silenced override without provenance** | CF2 audit invariant (ERROR) | Override without `tdr:` field fails CI. |
| **CF3 — orphaned override** | CF3 audit invariant (WARNING) | Override references an invariant + anchor that no longer fires. |
| **CF4 — audit-tooling failure** | Build pipeline | Build fails with explicit error; no silent degradation. |
| **CF5 — runtime persistence/sync unavailable** | Component runtime (ADR 0007) | Graceful fallback (MemoryResponseStore + silent BroadcastChannel degradation); session-only persistence surfaced via `useInteractive`. |

(audit_overrides-chapter-frontmatter)=
### `audit_overrides` chapter frontmatter

A chapter's MDX frontmatter can declare overrides:

```yaml
---
title: Flux, Luminosity, Distance
status: stable
audit_overrides:
  - invariant: MG3
    anchor: misc-flux-vs-luminosity
    tdr: TDR-23
    reason: |
      Misconception is addressed in chapter:luminosity-distance
      (a downstream chapter); this chapter introduces the
      misconception but defers the intervention. TDR-23 documents
      the deliberate split.
  - invariant: SP4
    anchor: solution-q1
    tdr: TDR-31
    reason: |
      Solution unlock timestamp is intentionally tz-implicit
      because the chapter is used as a fixture in test suites
      that mock the build clock.
---
```

### Three-grain override semantics

#### Grain 1 — per-invariant (whole-invariant suppression in this chapter)

```yaml
audit_overrides:
  - invariant: MG3
    tdr: TDR-23
    reason: |
      [course-wide architectural reason]
```

Suppresses all MG3 firings within this chapter. Use sparingly;
typically only when the audit's per-chapter scope misaligns with
the pedagogical reality.

#### Grain 2 — per-anchor (specific entity within an invariant)

```yaml
audit_overrides:
  - invariant: MG3
    anchor: misc-flux-vs-luminosity
    tdr: TDR-23
    reason: |
      [why this specific misconception's MG3 firing is intended]
```

Suppresses MG3 only for the specified anchor. The more common
case; surgical exception that does not blanket-suppress.

#### Grain 3 — TDR-referenced (required for any override)

Every override **must** include a `tdr: <TDR-NNN>` field.
Overrides without TDR reference fail CF2 (ERROR). The TDR is
the audit-trail anchor: an override exists because a TDR
explained why.

The TDR may be either an existing TDR (referenced by number) or
a fresh TDR created alongside the override commit. Per ADR 0049,
`sophie refactor` can auto-generate TDR seeds; manual overrides
require the author to draft the TDR.

### CF1–CF3: audit invariants

| ID | Level | Fires when |
|---|---|---|
| **CF1** | INFO | Chapter has `audit_overrides:` entries. Surfaces in audit report so review can see which exceptions are in effect. |
| **CF2** | ERROR | `audit_overrides` entry lacks `tdr:` field. Provenance is mandatory. |
| **CF3** | WARNING | `audit_overrides` entry references an `(invariant, anchor)` pair that does not match any current finding. The exception is stale and should be removed or updated. |

### CF4–CF5: not audit invariants

CF4 and CF5 are part of the conformance-failure taxonomy but are
**not** audit invariants in the CF1–CF3 sense — they describe
failure modes at different surfaces.

| ID | Surface | Behavior |
|---|---|---|
| **CF4** | Build pipeline | Audit tooling itself fails (CLI exit code 2+ from internal errors, malformed YAML in pedagogy-contract, schema validation errors before invariants run). Pipeline fails explicitly; no silent degradation. |
| **CF5** | Component runtime | IndexedDB or BroadcastChannel unavailable in the student's browser. Per ADR 0007, `ResponseStore` swaps in `MemoryResponseStore` (session-scoped fallback); BroadcastChannel degrades silently. |

CF4's home is the build pipeline (see *CF4 — Audit-tooling
failure* below); CF5's home is the persistence-layer runtime
(see *CF5 — Runtime fallback* below + ADR 0007). They appear in
the table above for taxonomic completeness, but
`runPedagogyAudit(index)` does not emit CF4 or CF5 findings.

CF1 is INFO because overrides are legitimate (with TDR
provenance); the audit surfaces them but does not warn.

CF2 is ERROR because an override without provenance is
indistinguishable from a "make my CI green" hack — the very
behavior the audit-trail discipline is designed to prevent.

**What CF2 does NOT detect** (the manufactured-TDR pattern):
an author can — in principle — run `sophie refactor`, get an
auto-generated TDR seed, fill it minimally to satisfy the
schema, promote it to a real TDR, and then write
`audit_overrides:` referencing that just-created TDR. The
override technically has a TDR-ref; CF2 passes; but the TDR
was manufactured to silence the audit. This is **gameable by
design** — Sophie's audit-as-presence framing (per
`audit-and-ai-authoring.md`) explicitly accepts that quality
lives outside the structural audit. The friction-chain that
makes the loophole expensive — visible `TDR:` trailer in the
commit, empty `evidence_type` field plus guidance block in the
seed forcing author engagement, deliberate fabrication of
evidence-type and rationale prose, PR diff visibility of all
the above — does most of the heavy lifting, but the
structural floor cannot catch the pattern. Only PR-review can.

The mitigation is human review of suspect patterns: a PR
adding both a new TDR *and* an `audit_overrides:` entry
referencing that same TDR is a reviewable signal.

CF3 is WARNING because stale overrides accumulate technical
debt but don't break correctness.

**CF3 detection mechanic.** Detecting "no longer fires" requires
the audit to evaluate every invariant *as if no overrides were
present*, then compare against the override-applied result. The
implementation:

1. `runPedagogyAudit(index)` runs first with `audit_overrides: []`
   substituted into every chapter frontmatter, producing the
   *raw finding set*.
2. The same audit runs with the real `audit_overrides:`,
   producing the *suppressed finding set*.
3. CF3 fires for each entry in `audit_overrides:` whose
   `(invariant, anchor)` does not appear in the raw finding set.

The double-evaluation cost is bounded — the audit is purely
read-only over the PedagogyIndex, so the marginal cost is
linear in the number of override entries (typically <20 per
course). Performance budget: the override-free pass amortizes
across all CF3 evaluations; cached if the working tree is
unchanged between two `sophie audit` runs.

### CF4 — Audit-tooling failure: explicit build failure, no silent degradation

If `sophie audit` itself errors — CLI crash, malformed
pedagogy-contract.yaml that fails to parse, schema validation
exception before any invariant runs — the build pipeline:

1. **Surfaces the error explicitly.** Stack trace + error
   message visible in CI logs.
2. **Exits non-zero.** CI fails.
3. **Does NOT proceed** with a partial audit. A half-audit is
   worse than no audit; partial audit reports give false
   confidence.

The build pipeline does not silently degrade to "skip audit; ship
the build anyway." This is named explicitly because it is exactly
the kind of degradation that erodes the conformance discipline.

**One exception** (and only one): the `--no-audit` CLI flag on
`sophie build`. Used for local-dev rapid iteration where the
author knows the audit is broken-but-not-blocking. CI never
passes `--no-audit`.

### CF5 — Runtime fallback: graceful, surfaced, session-only

Per [ADR 0007](./0007-persistence-indexeddb.md)'s
*Runtime fallback semantics* section under Consequences:

- **IndexedDB unavailable** → `MemoryResponseStore` in-memory
  fallback. Persistence is session-scoped (lost on tab close).
  `useInteractive` returns `persistence: 'session'` so chapter UI
  can optionally surface a banner. Production fallback; not
  testing-only.
- **BroadcastChannel unavailable** → silent degradation;
  single-tab function preserved; cross-tab sync degrades until
  next page load.

CF5 is **runtime behavior, not an audit invariant.** The audit
does not fire on CF5 conditions (those are detected at runtime
in students' browsers, not at build time). The CF5 entry in the
failure-mode taxonomy documents the runtime contract for cross-
ADR clarity.

### Override commit conventions

Per consumer-course convention (not enforced by the platform):

- Adding an override is **one commit** that touches the
  chapter's frontmatter + (if the TDR is fresh) the new TDR
  file.
- Commit message: `audit-override(<chapter>): <invariant>/<anchor>
  per TDR-NNN`.
- Removing an override (because the underlying issue resolved)
  is **one commit** removing the frontmatter entry; the TDR
  reference remains in history.

### Interaction with plugins (ADR 0048)

Plugin entries cannot define audit_overrides for consumer
courses. Per ADR 0048's autonomy guarantees, override authority
is consumer-side only. A plugin that needs an override-friendly
content shape provides override-friendly defaults; the consumer
course decides whether to override.

### Interaction with `sophie refactor` (ADR 0049)

When `sophie refactor … --apply` produces new ERRORs that get
reverted, the suggested resolution is **NOT** auto-adding
`audit_overrides`. The audit-revert is the safety floor; adding
an override to silence the revert defeats the floor. If the
author legitimately needs an override, they author it manually
(with TDR + reason) before re-running the refactor.

### Interaction with course versioning (ADR 0051)

Overrides are NOT versioned per-chapter; they live in the chapter
frontmatter and travel with the chapter content. A course tag
captures the override state at tag time. Reverting to a past
tag restores past overrides — the audit at that tag reflects the
overrides that were active.

## Rationale

### Five failure modes over fewer

The brainstorm started with three (audit-override, audit-tool
failure, runtime failure) and grew to five after surfacing the
override-provenance and orphan-override sub-cases. Five is the
honest taxonomy:

- CF1 is the *base case* (legitimate exception with provenance).
- CF2 is the *missing-provenance* failure (silent hack).
- CF3 is the *stale-exception* failure (override that should
  have been removed).
- CF4 is the *infrastructure* failure (audit tooling broken).
- CF5 is the *runtime* failure (browser-side persistence absent).

Each addresses a distinct failure mode at a distinct surface.
Collapsing them would conflate detection mechanisms — CF2 is
build-time + audit-driven; CF4 is build-time + pre-audit; CF5
is runtime + client-driven.

### Three-grain override

Per-invariant is too coarse for the common case ("MG3 fires on
one misconception I want to defer to a different chapter, not
all 14 of them"). Per-anchor is the right surgical default.
TDR-ref is the provenance anchor.

The grains compose: an override entry has both `invariant:` and
optionally `anchor:` and always `tdr:`. Authors get to choose
the breadth; the audit-trail discipline (TDR) is non-negotiable.

### TDR-ref required (CF2 ERROR)

The single most load-bearing override-design choice. Overrides
without provenance are indistinguishable from CI-silencing
hacks; the only thing that makes "exception" defensibly
different from "hack" is the trail of *why*. CF2 ERROR is
strict by design.

The brainstorm considered CF2 as WARNING. Rejected: WARNING
overrides accumulate; ERROR overrides force authors to write
the TDR before silencing the audit. The friction is the point.

### CF3 WARNING (orphan detection)

When a chapter's content changes such that the original
override is no longer needed, the override entry becomes stale.
CF3 catches this:

- Stale overrides are misleading (audit report says "MG3
  suppressed by TDR-23" when MG3 wouldn't have fired anyway).
- Cleaning them up keeps the override surface honest.

WARNING is the right level: it's reviewable, not blocking, and
authors typically address it in the same PR that resolved the
underlying issue.

### CF4 — explicit build failure, no silent degradation

A "skip audit and ship" failure mode would let real conformance
problems leak past CI. The audit-tooling failure case is the
prototypical "this is exactly where silent degradation is most
tempting and most damaging." Explicit failure is the only
defensible posture.

`--no-audit` for local dev exists because the author *knows
they're skipping*; CI never sees `--no-audit`.

### CF5 — formalize ADR 0007's fallback rather than re-define

ADR 0007's 2026-05-15 amendment (per Commit 8 of this hardening
pass) already documented IndexedDB + BroadcastChannel fallbacks
in the persistence layer. CF5 in this ADR is the *cross-
reference* — naming the failure mode in the conformance taxonomy
and pointing at the persistence-layer details rather than
duplicating them.

This avoids two places of truth.

## Consequences

**Easier:**

- Legitimate audit exceptions have a clean, provenance-bearing
  path.
- Stale overrides surface automatically (CF3).
- Audit-tooling errors fail loudly rather than silently
  degrading.
- Runtime persistence failures don't cascade into student-facing
  breakage.

**Harder:**

- Authors writing first override have to write a TDR first
  (CF2's friction is deliberate).
- CF4's "no `--no-audit` in CI" requires consumer-course CI
  configs to honor; the platform documents the convention but
  cannot enforce remote CI behavior.
- CF3 cleanup discipline: overrides have to be removed when no
  longer needed. The WARNING is the nudge.

**Triggers:**

- v1 of this ADR ships docs-only on 2026-05-14.
- Implementation PR:
  - Schema: add `audit_overrides` array field to chapter
    frontmatter Zod.
  - Audit: implement CF1, CF2, CF3 in
    `packages/astro/src/lib/pedagogy-audit/runner.ts`. CF4 is build-
    pipeline behavior, not an audit invariant. CF5 is runtime
    behavior in `@sophie/components/runtime`.
  - Cross-reference: every other invariant family's audit
    runner checks `audit_overrides` before firing.
  - CLI: `sophie audit` surfaces CF1 (INFO listing of active
    overrides) in `--verbose` mode.

## Alternatives considered

### TDR-ref optional (CF2 WARNING)

*Rejected.* Provenance-free overrides erode the audit-trail
discipline. ERROR is the strict-and-correct posture.

### Two-grain override (invariant + anchor only; no TDR-ref)

*Rejected.* See above.

### Four-grain override (add severity-cap as fourth grain — "this
override caps the firing severity from ERROR to WARNING rather
than fully suppressing")

*Considered, deferred.* Adds expressive power for rare cases
("I want MG3 to surface as INFO instead of WARNING for this
misconception") but the use case is too speculative for v1. A
future ADR can add `severity_cap: WARNING | INFO` to the
override entry if real authoring data shows need.

### CF4 silent degradation (skip audit, ship build)

*Rejected.* See Rationale. Defeats the conformance discipline.

### CF5 as audit invariant (build-time check that the runtime
fallback exists)

*Rejected.* Runtime conditions are not build-time-detectable; an
audit invariant for browser-side IndexedDB availability is
nonsense. CF5 is named in the taxonomy + documented in ADR 0007;
that is the correct surface.

### Override at the pedagogy-contract level (course-wide
suppression)

*Rejected.* Course-wide overrides hide pedagogical patterns. If
every chapter overrides MG3, the audit isn't really running MG3;
better to either fix MG3's semantics in a foundation ADR or
override per-chapter where the exception is legible.

The exception: pedagogy-contract.yaml can declare invariant
**configuration** (per ADR 0040's TDR coverage `min_ratio`, for
example). Configuration is not override; it's parameterization
within the invariant's defined surface.

## References

- [ADR 0007 — IndexedDB + ResponseStore](./0007-persistence-indexeddb.md)
  — CF5 details live here per the 2026-05-15 amendment.
- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — TDRs are the provenance anchor that audit_overrides
  references via `tdr:` field. `affects_anchors:` connects the
  reverse direction.
- [ADR 0044 — Misconception Graph + Intervention Library](./0044-misconception-graph-and-intervention-library.md)
  — MG3 is the prototypical override candidate (whole-course
  coverage that doesn't fit per-chapter scope).
- [ADR 0045 — Pedagogical Diff + Curriculum CI](./0045-pedagogical-diff-curriculum-ci.md)
  — `intentional: TDR-NNN` tag is parallel to `audit_overrides`'s
  TDR-ref requirement; both anchor exceptions to provenance.
- [ADR 0048 — Sophie LDS Content Plugin System](./0048-sophie-lds-content-plugins.md)
  — plugin entries cannot define audit_overrides; override
  authority is consumer-side only.
- [ADR 0049 — `sophie refactor` CLI Family](./0049-sophie-refactor-cli.md)
  — audit-revert-on-new-ERRORs is the floor; audit_overrides
  cannot be used to silence revert.
- [ADR 0051 — Chapter Status + Course Versioning](./0051-chapter-status-course-versioning.md)
  — course tags capture override state transitively.
- [ADR 0052 — Scheduled Publication & Visibility Windows](./0052-scheduled-publication-visibility.md)
  — SP3 (ExamKey without unlocks_at) cannot be overridden;
  SP1/SP2/SP4 can.
- [audit-and-ai-authoring.md](../explanation/audit-and-ai-authoring.md)
  — the audit invariant families documentation references CF1–CF3
  alongside the other families.
