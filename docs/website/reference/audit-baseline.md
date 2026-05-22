---
title: Audit-clean baseline
short_title: Audit baseline
description: What "passes `sophie audit` cleanly" means in concrete terms — the production-chapter bar, the smoke-fixture expected baseline, and the severity → CI exit-code mapping.
tags:
  - reference
  - audit
  - quality
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# Audit-clean baseline

The Sophie audit (`runPedagogyAudit`, surfaced via the smoke build's
"Pedagogy audit: N errors, M warnings, K infos" summary line) emits
findings in three severity levels per the audit invariant catalog:

| Severity | Build effect | Definition |
|---|---|---|
| **ERROR** | Non-zero exit; CI fails. | A contract or structural-integrity violation. The chapter as-authored is broken. |
| **WARNING** | Printed; build continues. | Coverage gap or authoring nudge. The chapter would ship, but the author should know. |
| **INFO** | Verbose-only. | Informational signal — not a defect. |

This page defines what `sophie audit` cleanliness means for two
distinct contexts: **production chapters** and the **smoke fixture**.

## Production chapter — the v1 ship bar

[`docs/website/overview.md`](../overview.md) declares the v1 success
criterion: "Every chapter passes `sophie audit` cleanly before it
ships." Cleanly means:

- **0 ERRORs** (mandatory). Any ERROR finding blocks shipment until
  resolved. The chapter has a broken cross-reference, undefined
  registry target, cycle in misconception graph, schema violation,
  or similar — the audit catalog lists each ERROR code in its
  invariant family.
- **0 WARNINGs of types that indicate the chapter is incomplete**.
  WARNINGs split into two interpretations:

  - **Authoring incompleteness in this chapter** (must clear before
    ship): `O2` chapter-with-zero-objectives; `MG3` orphan
    misconception within a chapter that should pair it with an
    intervention; `D5` orphan definitions IF this is the chapter
    that defines them and no other chapter references them.
  - **Authoring gap elsewhere in the course** (clearable
    cross-chapter): `D5` on a chapter that ships definitions
    expected to be referenced later; `R2` orphan registry equation
    when registry is in-flight; `I1` unresolved-misconception-ref in
    a chapter under active authoring.

- **0 chapter-specific INFOs that surface a structural defect**.
  Most INFOs (`K1` zero key-insights, `MR4` alt-text-doesn't-mention-concept,
  `E7/E9` biography-completion-nudge) are advisory and may ship.

The bar is **the human author's judgment**, applied to the smoke
build's per-chapter audit output. The audit catches deterministic
issues; pedagogical soundness is the instructor's responsibility.

## Smoke fixture — expected baseline

The repo's smoke build at `examples/smoke/` is a fixture, not a
production course. Its purpose is to exercise the full audit
pipeline across every invariant family. The baseline at
2026-05-22 (Wedge B-followup W1) is:

```text
Pedagogy audit: 0 errors, 14 warnings, 7 infos
```

Breakdown:

| Code | Count | Severity | Rationale |
|---|---:|---|---|
| `D5` | 12 | WARNING | Orphan definitions in the `spoiler-alerts` fixture — intentionally seed many terms to exercise the D5 invariant without each one being a `<GlossaryTerm>` target in the smoke set. |
| `O2` | 1 | WARNING | `misconception-fixture` chapter has zero learning objectives — fixture exercises O2 detection. |
| `PRA-1` (Unit-aware) | 1 | WARNING | `spectra-and-composition` Unit declares `prereqs: ["exponents", "logarithms"]`; `exponents` is covered by `spoiler-alerts`'s `<SkillReview target="topic:exponents">` (prior Section, no WARN), but `logarithms` has no covering SkillReview anywhere — fires the W1-graduated Unit-aware path. Exercises both halves: "covered prereq → no WARN" + "uncovered prereq → WARN". |
| `K1` | 3 | INFO | Chapters without key-insights — fixture has chapters intentionally lacking K1 content. |
| `NR2` | 2 | INFO | Unreferenced notation-registry concepts — exercises NR2. |
| `MG4` | 1 | INFO | Course-level depth-coverage summary (single-finding table per ADR 0044 §D3). |
| `RET-1` | 1 | INFO | `misconception-fixture` chapter carries pedagogy content but no `<RetrievalPrompt>`/`<SpacedReview>`/`<SkillReview>` surface — Wedge B1 retrieval-coverage nudge. |

**Wedge B-followup (W1) graduation status:**

| Code | Count | Status |
|---|---:|---|
| `PRA-1` (Unit-aware) | 1 | Active — `spectra-and-composition` Unit's `["exponents", "logarithms"]` prereqs exercise BOTH the covered (no-WARN) + uncovered (WARN) paths in a single fixture. Verifies the graduated logic surfaces in production builds, not just unit tests. |
| `SR-1` (section-validity) | 0 | Quiet — `stellar-evolution.mdx` has `<SpacedReview section="stars">` and `stars` resolves to a known `SectionEntry.slug`. Inverting to an unknown slug would emit SR-1 ERROR + fail the build; the fixture stays valid by design. |

The smoke build IS "audit clean" by the v1 ship bar definition
because no ERRORs fire and every WARNING / INFO is an intentional
exercise of an invariant. **The 14-warnings / 7-infos count is the
expected baseline, not a defect.** Any regression (e.g., +1
warnings, or WARNINGs of unexpected codes) is a signal the audit
picked up something new — that's the intended behavior.

Changes from the 2026-05-19 baseline (16 warnings, 9 infos):

- D5 dropped from 13 → 12 (one definition reference resolved during
  Wedge B1 smoke chapter edits).
- R2 (1) + I1 (1) + MR4 (2) + E9 (1) findings retired by intervening
  PRs (Wedge A + A.5 + B1 smoke fixture edits).
- RET-1 (1) added (Wedge B1 introduced the invariant).
- PRA-1 (1) added (Wedge B-followup W1 graduation; the smoke fixture
  intentionally exercises the WARN path so the integration canary
  proves the new audit logic surfaces in production builds).
- Net: −2 warnings, −2 infos.

## CI exit-code mapping

`auditExitCode(report)` (in [`lib/pedagogy-audit/format.ts`](../../../packages/astro/src/lib/pedagogy-audit/format.ts))
maps:

```
errors.length > 0  →  exit 1  →  CI fails
errors.length = 0  →  exit 0  →  CI passes (regardless of WARNING/INFO count)
```

This intentional choice keeps the build green when the chapter
ships honest authoring gaps + course-level coverage signals. The
human supervisor (instructor) reviews WARNINGs + INFOs before
shipping a real course.

## See also

- [validation-tracker.md](validation-tracker.md) — the V*-prefixed
  contract-validation invariants (ADR 0056), distinct from the
  D/E/F/M/O/K/R/MG/I/NR/MR pedagogy-audit invariants documented in
  the runner doc-comment at `packages/astro/src/lib/pedagogy-audit/runner.ts`.
- [ADR 0056](../decisions/0056-validation-tracker.md) — validation-tracker design.
- [`lib/pedagogy-audit/`](../../../packages/astro/src/lib/pedagogy-audit/) —
  the audit cluster split per ADR 0061 C2.
