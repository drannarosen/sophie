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
2026-05-23 (Wedge B-followup W4b) is:

```text
Pedagogy audit: 0 errors, 14 warnings, 8 infos
```

Breakdown:

| Code | Count | Severity | Rationale |
|---|---:|---|---|
| `D5` | 12 | WARNING | Orphan definitions in the `spoiler-alerts` fixture — intentionally seed many terms to exercise the D5 invariant without each one being a `<GlossaryTerm>` target in the smoke set. |
| `O2` | 2 | WARNING | `misconception-fixture` + `logarithms-skill` chapters have zero learning objectives. The bridge-room unit `logarithms-skill` (W4b smoke fixture) was added with no `<LearningObjectives>`, exercising O2 on a Unit[type=skill] surface in addition to the existing chapter-level fixture. |
| `PRA-1` (Unit-aware, ERROR) | 0 | ERROR | `spectra-and-composition` Unit declares `prereqs: ["exponents", "logarithms"]`; W4b's smoke `<SkillReview target="topic:exponents#power-laws" />` + `<SkillReview target="topic:logarithms#product-rule" />` self-closing callsites cover both prereqs (per ADR 0079's fragment-strip coverage rule). Severity graduated WARN → ERROR per ADR 0079 (W4b); baseline stays at 0 ERRORs because the covering callsites land in the same PR. Pre-W4b baseline fired 1 WARN for the missing `logarithms` coverage. |
| `PRA-2` (topic frontmatter↔body) | 0 | ERROR | New invariant per ADR 0079 (W4b); honors `audit_overrides` on `TopicEntry` per ADR 0053 (W4c graduation; opt-out applies in both directions — body→frontmatter via the topic extractor and frontmatter→body via `topic-consistency.ts`). Smoke topics `topics/math/exponents.mdx` + `topics/math/logarithms.mdx` are well-formed (frontmatter `cards: []` matches body `<SkillReview.Card id="…">` blocks 1:1). |
| `PRA-2-grain` (grain-1 override attempt) | 0 | WARNING | New invariant per W4c Batch 2b. Fires when a `PRA-2` `audit_overrides` entry on a `TopicEntry` omits the `anchor` field (Grain 1 / topic-wide overrides are unsupported per W4c D5 — overrides must name a specific card anchor). Smoke topics carry no overrides, so this stays quiet. |
| `KI-slug-unique` (KeyInsight slug collisions) | 0 | ERROR | New invariant per W4c Batch 2 Task 2.2. Fires when two `KeyInsightEntry` slugs collide across units (slug derived from `title` when present, else `<unit>-<anchor>` per W4c D4). Smoke fixtures have no slug collisions. |
| `Misconception-slug-unique` (Misconception slug collisions) | 0 | ERROR | New invariant per W4c Batch 1b. Mirrors `KI-slug-unique`: fires when two `MisconceptionEntry` slugs collide across units. Smoke fixtures have no slug collisions. |
| `BR-1` (bridge slug uniqueness) | 0 | ERROR | New invariant per ADR 0079 + 0068 (W4b). Smoke has one bridge `Section[type=bridge]` with slug `math-fundamentals`; doesn't collide with any other Section slug, Unit id, or reserved Library path. Opt-in invariant — courses without bridge rooms produce zero BR-1 findings. |
| `K1` | 4 | INFO | Chapters without key-insights. `logarithms-skill` (W4b bridge fixture) joins `measuring-the-sky`, `misconception-fixture`, `stellar-evolution`. |
| `NR2` | 2 | INFO | Unreferenced notation-registry concepts — exercises NR2. |
| `MG4` | 1 | INFO | Course-level depth-coverage summary (single-finding table per ADR 0044 §D3). |
| `RET-1` | 1 | INFO | `misconception-fixture` chapter carries pedagogy content but no `<RetrievalPrompt>`/`<SpacedReview>`/`<SkillReview>` surface — Wedge B1 retrieval-coverage nudge. |

**Wedge B-followup (W1) graduation status:**

| Code | Count | Status |
|---|---:|---|
| `PRA-1` (Unit-aware) | 0 | Graduated to ERROR severity in W4b (see below); previously fired 1 WARN on the missing `logarithms` coverage. |
| `SR-1` (section-validity) | 0 | Quiet — `stellar-evolution.mdx` has `<SpacedReview section="stars">` and `stars` resolves to a known `SectionEntry.slug`. Inverting to an unknown slug would emit SR-1 ERROR + fail the build; the fixture stays valid by design. |

**Wedge B-followup (W4b) graduation status:**

W4b shipped three audit changes per [ADR 0079](../decisions/0079-topic-registry-and-resolution-pattern.md):

| Code | Migration | Status |
|---|---|---|
| `PRA-1` | Severity WARN → ERROR. Coverage check unchanged (fragment-strip means `topic:X#card` covers a prereq of `X`). Honors `audit_overrides` per ADR 0053 (Unit frontmatter declares `{ invariant: PRA-1, anchor: <topic>, tdr: <TDR-ID>, reason: "..." }` to opt out per-callsite). | Quiet — smoke fixture's covering self-closing callsites + the new topic content collection clear the previously-failing `logarithms` prereq. |
| `PRA-2` (NEW) | Topic frontmatter↔body card consistency. Split detection: topic extractor catches body→frontmatter orphan cards (emitted via `extractorFindings`); `topic-consistency.ts` catches frontmatter→body orphans (frontmatter declares a card with no matching `<SkillReview.Card>` block). Both directions ERROR; same code so authors learn a single concept. | Quiet — smoke topics are well-formed. |
| `BR-1` (NEW) | Bridge slug uniqueness across Sections (bridge + regular) + Unit ids + reserved Library structural paths (`library`, `sections`, `units`, `topics`). Opt-in via authoring a `Section[type=bridge]`. | Quiet — smoke's `math-fundamentals` bridge slug doesn't collide. |

**Wedge B-followup (W2) graduation status:**

W2 was a *structural* migration — the audit baseline counts are
unchanged (0/14/7); the underlying invariants now iterate
`index.units` instead of `index.chapters`, and they read `u.id` +
`u.framing` + `u.status` instead of the deleted `ChapterEntry`'s
`slug` + `framing` + `status` fields. Per W2/D4 1:1 convention,
those strings coincide, so per-finding `location.chapter` strings
also stay identical. The smoke build shape on disk graduated to
ADR 0067's `sections/<sec>/units/<unit>/reading.mdx` file layout
per W2/D1 (Path A).

| Code | Migration | Status |
|---|---|---|
| `CT-1` / `CT-2` | iterate `index.units`; `u.section_id` replaces `ch.module` | Quiet (no fixture-side chapter-title collisions) |
| `K1` | iterate `index.units`; `u.id` replaces `ch.slug` | 3 INFOs — same fixtures, same counts |
| `MG2` | `index.units[u.id]` order map replaces `index.chapters[ch.slug]` | Quiet |
| `O2` | iterate `index.units` | 1 WARN (misconception-fixture) — same finding |
| `OF-2` | `u.framing` replaces `ch.framing`; iterate `index.units` | Quiet (OMI-framed units have ≥1 OMIFlow) |
| `CS2` | `units.filter(u => u.status === 'draft').map(u => u.id)` populates `extras.draftChapterSlugs` from W2 TextbookLayout | Quiet (no draft units in fixture) |
| `C1` | `ctx.chapterSlugs = new Set(index.units.map(u => u.id))` | Quiet (smoke `<ChapterRef chapter>` callsites resolve cleanly via the W2 prop rename) |

Net W2 change: **zero findings added or removed**. Counts hold;
shape graduated.

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
- Net at W1: −2 warnings, −2 infos.

Changes from the 2026-05-22 baseline at W1 (14 warnings, 7 infos) to
the 2026-05-23 W4b baseline (14 warnings, 8 infos):

- PRA-1 cleared (1 → 0): smoke's W4b self-closing callsites cover
  both prereqs (`exponents` + `logarithms`).
- O2 added (1 → 2): bridge-room Unit `logarithms-skill` has no
  `<LearningObjectives>` — fixture exercises O2 on Unit[type=skill].
- K1 added (3 → 4): same bridge-room unit has no `<KeyInsight>`s.
- PRA-2 (0) + BR-1 (0) added but stay quiet — smoke fixtures are
  intentionally clean for both invariants.
- Net at W4b: warnings unchanged (12 D5 + 2 O2 = 14), infos +1 (one
  more K1).

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
