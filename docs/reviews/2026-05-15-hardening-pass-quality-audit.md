# Project Review: LDS Foundation Hardening Pass — Quality Audit

**Date:** 2026-05-15
**Scope:** Critical re-read of the eight new ADRs + four reference docs + three cross-cutting amendments shipped in the 12-commit hardening pass (commits e2bad73 → 0083dc7).
**Commits reviewed:** e2bad73, 3735e32, 6770c14, c8e1e9d, 0083dc7
**Trigger:** Anna asked "should we make any improvements or fixes?" after the implementation phase completed.
**Status:** Open — eight BLOCKING and ~22 IMPORTANT issues surfaced; fix-up commits recommended before exposing the foundation to ASTR 201 Module 1 migration.

---

## Section 1: What Changed

The 12-commit hardening pass shipped three artifact classes. This audit re-reads the second-half work (Commits 8–12) since Commits 1–7 already passed individual review at commit time.

### Eight new ADRs

| ADR | Title | Concern | Pages | Verdict |
|---|---|---|---|---|
| 0047 | Empirical Validation Plan | S2 | docs-only | **3 issues, 1 BLOCKING** |
| 0048 | Sophie LDS Content Plugin System | S3 | docs-only | **5 issues, 2 BLOCKING** |
| 0049 | `sophie refactor` CLI Family | S4 | docs-only | **5 issues, 2 BLOCKING** |
| 0051 | Chapter Status + Course Versioning | CS / CV | docs-only | **5 issues, 0 BLOCKING** |
| 0052 | Scheduled Publication & Visibility Windows | SP / Missing-2 | docs-only | **5 issues, 1 BLOCKING** |
| 0053 | Conformance Failure Modes | Missing-2 | docs-only | **5 issues, 0 BLOCKING** |
| 0054 | Course Schedule + Calendar Page | SC | docs-only | **6 issues, 1 BLOCKING** |

### Four reference docs

- `reference/sophie-metrics-cli.md` — paired with ADR 0047.
- `reference/sophie-plugin-system.md` — paired with ADR 0048.
- `reference/sophie-refactor-cli.md` — paired with ADR 0049.
- `reference/sophie-publish-schedule-cli.md` — paired with ADR 0052.
- `reference/course-schedule.md` — paired with ADR 0054.

(Five total; ADRs 0051 + 0053 have no companion reference doc — likely correct since both are spec-only.)

### Three cross-cutting amendments

- `decisions/0030-audience-and-ai-author-model.md` — new "AI-Primary by Design, Not by Accident" H2 section + Revisions entry.
- `decisions/0007-persistence-indexeddb.md` — new Revisions entry formalizing IndexedDB + BroadcastChannel runtime fallbacks.
- `explanation/audit-and-ai-authoring.md` — new "What the audit does and doesn't do" subsection; updated §2 to graduate `sophie refactor` from "not in CLI" to v1.

### Integration

- `vision/features/backlog.md` — new B8 (Semester Journal) + B9 (Learning Telemetry) entries.
- `status/roadmap.md` — new "Foundation hardening + cross-cutting ADRs (2026-05-15)" subsection + S6 milestone in Phase 4 Done When.
- `myst.yml` — wired all eight ADRs + four reference docs.

---

## Section 2: Build Verification (substitute for Test Metrics)

Sophie is docs-only at this stage; the test-metrics table doesn't apply. The build-verification table substitutes:

| Check | Result |
|---|---|
| `npx mystmd build --html` per commit | Clean × 5 commits |
| New HTML files emitted | 12 / 12 |
| Forward-ref cross-ADR markdown links | Resolve (relative-file links, not MyST cross-refs) |
| `RepIntuition` live usage in source | 0 hits (all 6 hits are revision-note descriptions of removal) |
| `drafted_by:` binary usage in source | 0 hits (replaced by `ai_workflow.generation_share`) |
| Pre-existing build warnings | Unchanged: frontmatter `status` extras, one cross-ref-not-found for `artifact-4-...`, `astrojs/mdx` citation label |

Build verification passes. **The issues surfaced by this audit are content/semantic, not build-time detectable.**

---

## Section 3: Quality Grade

### Score table

| Category | Score | Notes |
|----------|------:|-------|
| **Internal consistency (ADR ↔ reference)** | **9 / 20** | Reference docs are making architecture decisions the ADRs didn't commit to — esp. ADR 0048 / sophie-plugin-system.md (override grammar, taxonomic_stance) and ADR 0047 / sophie-metrics-cli.md (M2 trailer format). The pattern is systemic, not one-off. |
| **Cross-ADR consistency** | **13 / 20** | Bidirectional rules (CS-over-SP, SP3-not-overridable) are stated consistently. But ADR 0048's reference to "ADR 0053's audit_overrides surface" mis-states what audit_overrides does (suppresses, doesn't declare). Forward-refs from 0047–0049 to 0051–0054 are too generic. |
| **Argument quality (Rationale)** | **13 / 20** | Strong rationale: ADR 0047's "Two papers, not one"; ADR 0048's "Field-specific over monolithic." Weaker: ADR 0049's polymorphic-alternative straw-mans; multiple Rationale sub-sections restate the Decision in different words. |
| **Practical implementability** | **10 / 20** | Multiple ADRs leave critical implementation questions unspecified: ADR 0049 doesn't say what happens to LaTeX glyphs in `<KeyEquation>` when a concept is renamed; ADR 0051 names `stale_review_days` as configurable but doesn't declare the field; ADR 0053 CF3 detection mechanic unspecified; ADR 0054 multi-month grid layout hand-waved. |
| **Prose quality** | **14 / 20** | Tighter than initial drafts, but template-prose and "load-bearing" overuse across all four 0051-0054 ADRs. Anna's biographical context bleeds into ADR 0047's Rationale where it doesn't belong. |

**Total: 59 / 100 → C+**

### What earns the grade

- The hardening pass shipped 12 commits of substantial content in one session; the *scope* of coverage is appropriate to the foundation review's identified gaps.
- Build verification clean across every commit.
- Cross-ADR directional rules (CS-over-SP, SP3-not-overridable, plugins-cannot-impose-ERRORs) are stated in multiple places consistently.
- The audit-as-presence framing in `audit-and-ai-authoring.md` is a real intellectual contribution — naming gameability-by-design honestly.

### What keeps it from higher

- **Reference docs quietly extend the ADRs** (BLOCKING pattern): ADR 0048's reference doc invents `_add` / `_remove` operators, a `taxonomic_stance` field, and a per-field override granularity that the ADR did not commit to. ADR 0047's reference invents a `Refs: TDR-14` commit-trailer format. ADR 0049's reference invents a pre-PR hook. The reference doc is the *specification* of the contract; the ADR is the contract. The drift means future readers don't know which document binds.
- **Several BLOCKING semantic errors**: ADR 0047's M2 substrate cites ADR 0045's "intentional-change tagging" — but ADR 0045's hardening *replaced* opt-in commit annotation with automatic TDR-based demotion. M2 has no defined substrate. ADR 0049's auto-generated TDR seed uses `evidence_type: forward_hypothesis` which per ADR 0040 means "trying something new" — wrong for a mechanical rename.
- **One in-file contradiction**: `audit-and-ai-authoring.md` §2 graduates `sophie refactor` to v1 CLI, but §6 (Subagents) still lists `refactor-agent` as the AI subagent for cross-chapter slug refactoring. Same file tells readers two incompatible things.
- **The four-ADR bundle (0051-0054) shows template-prose drift**: "Anna's lock", "the brainstorm started with", "load-bearing" appear in all four with similar shape. Reads as one-sitting draft.

---

## Section 4: Backlog — Prioritized Improvements

### Priority 1 — BLOCKING semantic errors (fix before any code PR or ASTR 201 Module 1 migration)

| Item | Location | Effort | Notes |
|---|---|---|---|
| **P1.1 — Fix M2 substrate fabrication** | ADR 0047 lines 80, 378-380; sophie-metrics-cli.md lines 113-126 | 30 min | M2 currently cites ADR 0045's "intentional-change tagging" (`Refs: TDR-14` trailer). ADR 0045 has NO such tagging — it replaced opt-in trailers with automatic TDR `affects_anchors` demotion. M2 must be redefined against the actual ADR 0045 surface, or M2 should be dropped from the headline-four. |
| **P1.2 — Fix ADR 0049 TDR-seed `evidence_type` default** | ADR 0049 lines 185-194; sophie-refactor-cli.md lines 186-188 | 15 min | Default `forward_hypothesis` is wrong per ADR 0040's definition ("trying something new, no prior evidence"). A mechanical rename is not a forward hypothesis. Leave `evidence_type` empty in the seed; require the author to set it. |
| **P1.3 — Fix `audit-and-ai-authoring.md` §6 refactor-agent contradiction** | audit-and-ai-authoring.md line 295, line 313 | 15 min | §6 Subagents still names `refactor-agent` doing "cross-chapter refactoring (e.g., rename a concept across all ASTR 201 chapters)." §2 update graduated this work to deterministic CLI per ADR 0049. Narrow the subagent description to AI-judgment-required cases, or remove the entry. |
| **P1.4 — Fix ADR 0048 ↔ sophie-plugin-system override granularity contradiction** | ADR 0048 lines 163-176; sophie-plugin-system.md lines 208-218 | 45 min | ADR says "entry level"; reference says "per-entry, per-field." Different. ADR says one operator (`_add:`); reference says three (`<field>:`, `_add:`, `_remove:`). Decide one (recommended: per-field with three operators — more flexible) and align both docs. |
| **P1.5 — Fix ADR 0048 cross-ref to "ADR 0053's audit_overrides surface"** | ADR 0048 lines 188-190, 476-479 | 15 min | Current text says "a course can declare an ERROR against itself (per ADR 0053's audit_overrides surface)" — wrong. `audit_overrides` *suppresses* findings; it does NOT *declare* new ERRORs. Reword to "consumer courses retain ERROR authority via foundation ADRs themselves; plugins cannot." |
| **P1.6 — Fix ADR 0048 v1-empty-package self-contradiction** | sophie-plugin-system.md lines 60-62 | 10 min | Reference says "plugin contributing nothing is rejected with a CLI warning"; ADR 0048 lines 204-208 mandate v1 packages ship empty. Reference's rule rejects the ADR's v1 packages. Either exempt v1 explicitly or change the rule to "WARNING on empty production package; v1 sentinel packages exempt." |
| **P1.7 — Fix `webcal://` URI scheme handling in `<ScheduleICal>`** | ADR 0054 + course-schedule.md line 171 | 30 min | `format="subscribe"` emits `webcal://` which is non-standard and not honored by all calendar apps (older Outlook in particular). Emit both `webcal://` and HTTPS `.ics` link, or document compat matrix. |
| **P1.8 — Fix roadmap.md "Addresses" column ADR 0052 + 0053 both → Missing-2** | roadmap.md line 91, 92 | 10 min | Two ADRs mapping to same concern label reads as a typo. Add one-sentence explanation of how they divide responsibility, or relabel (0052 → "Scheduled-publish gap"; 0053 → "Missing-2 conformance failure modes"). |

**P1 total effort: ~3 hours.** All can land in one fix-up commit.

### Priority 2 — IMPORTANT implementation gaps (fix before code PRs land for affected ADRs)

| Item | Location | Effort |
|---|---|---|
| **P2.1** — ADR 0047 M3 schema overlap (`errors`/`warnings`/`info` at both top level AND `by_family`); M5 denominator/histogram conflation | sophie-metrics-cli.md lines 56-66, 160-162 | 1 hr |
| **P2.2** — ADR 0049 `delete --force` is functionally useless under audit-revert | ADR 0049 + sophie-refactor-cli.md lines 273-278 | 30 min |
| **P2.3** — ADR 0049 `concept` rename doesn't address LaTeX glyphs in `<KeyEquation>` math | ADR 0049 + sophie-refactor-cli.md lines 33-35 | 1 hr |
| **P2.4** — ADR 0051 `stale_review_days` field referenced but not declared in `course_version` schema | ADR 0051 lines 144-156, 177 | 15 min |
| **P2.5** — ADR 0051 heading/body contradiction on default status | ADR 0051 lines 107-108 | 5 min |
| **P2.6** — ADR 0051 reproducibility claim ("exactly as students saw it") overstates: omits build clock + env vars | ADR 0051 lines 222-229 | 30 min |
| **P2.7** — ADR 0052 timezone handling silent on DST transitions for recurring lectures | ADR 0052 lines 363-366 + ADR 0054 | 1 hr |
| **P2.8** — ADR 0052 `--check` exit code semantics circular in recommended workflow | sophie-publish-schedule-cli.md lines 71-76 vs 235 | 30 min |
| **P2.9** — ADR 0052 6-hour cron + iCal subscriber refresh latency hand-waved | ADR 0052 lines 248-260 + ADR 0054 lines 362-367 | 30 min |
| **P2.10** — ADR 0053 CF3 detection mechanic (must evaluate invariants override-free to compute "no longer fires") unspecified | ADR 0053 §CF3 | 1 hr |
| **P2.11** — ADR 0053 CF2 ERROR + refactor auto-TDR loophole (author can refactor, take auto-TDR, write override post-hoc) | ADR 0053 §CF2 | 30 min |
| **P2.12** — ADR 0054 `<ExamKey>` `publishes_at` direction much softer than SP3 — asymmetric severity for symmetric concern | ADR 0054 lines 132-138 | 45 min |
| **P2.13** — ADR 0054 `<ScheduleCalendar month="course">` multi-month layout unspecified | course-schedule.md lines 209-211 | 30 min |
| **P2.14** — `audit-and-ai-authoring.md` "§5" cross-ref wrong (Tier 3 prompts are in §3 + §9) + "empirical outcomes" overstates ADR 0047 | audit-and-ai-authoring.md lines 110, 112 | 15 min |
| **P2.15** — ADR 0048 `taxonomic_stance` field is normative in ref doc but absent from ADR | ADR 0048 + sophie-plugin-system.md lines 39, 69-72 | 20 min |
| **P2.16** — backlog "Missing-1"/"Missing-3" labels inconsistent with roadmap's "Missing-2 + 2 missing" | backlog.md B8 + B9 + roadmap.md | 15 min |

**P2 total effort: ~9 hours.** Reasonable to spread across 2-3 follow-up commits.

### Priority 3 — POLISH / style consistency

| Item | Effort |
|---|---|
| **P3.1** — De-overuse "load-bearing" across ADRs 0051-0054 (5+ instances) | 30 min |
| **P3.2** — Replace template-prose "Anna's lock" / "the brainstorm started with" in 0051-0054 Context sections with succinct one-line references to a single brainstorm-session note | 45 min |
| **P3.3** — Move Anna's biographical context out of ADR 0047 Rationale (lines 240-249); replace with general "research-bandwidth is variable + honest claims require data" | 15 min |
| **P3.4** — ADR 0030 §AI-Primary placement: ADR template has Decision/Rationale/Alternatives/Consequences/References — promoting a new H2 between Consequences and References breaks the local convention. Either nest under Consequences or expand the Revisions entry to carry the framing | 30 min |
| **P3.5** — ADR 0007 new Revisions entry header doesn't match the established `§1 — <date> — <label>` convention used in 0040/0042/0043/0046 | 5 min |
| **P3.6** — roadmap.md "Current status (2026-05-14)" parent header contains "2026-05-15" subsection — date inversion in section hierarchy | 10 min |
| **P3.7** — roadmap.md S6 milestone sits awkwardly under Phase 4 "Done when" alongside URL deliverables (process vs deliverable mismatch) | 15 min |
| **P3.8** — myst.yml ADR 0050 gap unexplained (intentional skip? reserved?) — add YAML comment | 5 min |
| **P3.9** — backlog B9 design sketch over-specifies (cites LT1/LT2/LT3 invariant codes) for backlog tier | 15 min |
| **P3.10** — ADR 0049 polymorphic-alternative straw-mans on type-inference brittleness; real reason (matches `git` subcommand convention) is one sentence at line 333 | 20 min |
| **P3.11** — ADR 0053 CF4/CF5 wedged into "CF audit invariants" framing when they aren't audit invariants — distinct namespacing would clarify | 30 min |

**P3 total effort: ~4 hours.** Optional; ship if there's time.

### Priority 4 — Strategic / architectural

| Item | Effort |
|---|---|
| **P4.1** — Establish severity philosophy in `audit-and-ai-authoring.md` as canonical: "ERROR = catastrophic-if-deployed; WARNING = reviewable accumulator; INFO = surfaced exception." Each ADR currently re-justifies severities individually | 1 hr |
| **P4.2** — Add a section to ADR 0048 explicitly stating plugins cannot author `audit_overrides` (currently only ADR 0053 says this; future readers of 0048-only don't know) | 30 min |
| **P4.3** — Reconcile ADR 0051 "reproducibility via course tags" with ADR 0052 "publication state is a function of `now()` at build time" — the two reproducibility models collide; neither acknowledges the other | 1 hr |

**P4 total effort: ~2.5 hours.** Worth doing before ASTR 201 Module 1 migration exercises the foundation.

### Priority 5 — Future maturity (defer to post-fa26)

- Add a single referenced session-note for the 2026-05-14 brainstorm so each ADR can cite it without re-describing the brainstorm in its Context section.
- Consider whether ADRs 0051 + 0053 should have companion reference docs (every other foundation ADR has one).
- Audit the audit-as-presence framing against actual Anna usage post-fa26 — does the "gameable by design" framing hold up in practice, or do we need more structural gates?

---

## Section 5: Files Changed (this audit)

This audit document itself is the only file created. No source changes applied yet — Anna decides whether to apply P1-P4.

| File | Action | Lines |
|------|--------|------:|
| `docs/reviews/2026-05-15-hardening-pass-quality-audit.md` | Created | ~300 |
| `docs/reviews/README.md` | Modified | +1 row |

---

## Recommendation

**Apply P1 (BLOCKING) in a single fix-up commit before ASTR 201 Module 1 migration begins.** ~3 hours of focused work. Without these fixes, the hardening pass ships with semantic errors that mislead downstream readers (M2 is unimplementable as written; ADR 0048 has internal contradictions about override granularity; `audit-and-ai-authoring.md` tells two incompatible stories about who owns refactor).

**Consider P2 + P4 before the foundation gets exercised in production.** The ~12 hours of P2+P4 work tightens implementation specs and resolves architectural tensions that would otherwise surface during code-PR drafting.

**P3 polish can ship opportunistically.** Style consistency matters less than semantic correctness; happy to defer.

**The honest takeaway:** the implementation phase shipped substantial content under time pressure, and three independent reviewers found real issues across every commit. This is the value of the audit cycle — drafting + reviewing are different cognitive modes, and the review surfaces what the drafting missed. The C+ grade reflects "shipped substantial content with semantic gaps," not "the work isn't useful." Foundation refinements like these are what make platforms tractable to maintain over years.
