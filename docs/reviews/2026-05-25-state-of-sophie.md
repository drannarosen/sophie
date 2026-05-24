---
title: State of Sophie — Honest Assessment
date: 2026-05-25
type: state-of-platform
authors:
  - Claude (audit)
  - Anna Rosen (prompt)
scope: full platform after PR #168 + Course Spec design
---

## What I'm reviewing

Anna asked: *Is Sophie well-designed? Over-engineered? Getting closer to completion? What is it now? What's TBD? Is it SoTA and unique? Is it useful at all?*

This document gives the honest answer. The grading rubric at the end is in the standard 5-category form; the substantive assessment is the prose section that follows it.

## What we've done — concrete inventory

**Code that exists today on `main` at commit `5c55f5c`:**

- 5 npm packages — `@sophie/core`, `@sophie/components`, `@sophie/astro`, `@sophie/theme`, `@sophie/cli`
- ~29,600 LOC TypeScript across `packages/*/src/`
- 37 components in `@sophie/components/src/components/` — 4 chrome (Card / Grid / Tabs / Dropdown, shipped today in PR #168) plus 33 pedagogical / epistemic primitives
- One reference application — `examples/smoke/` — builds to 130 pages
- One MyST docs site — `docs/website/` — builds clean (0 ⚠ warnings)
- 79 ADRs covering every architectural decision since 2026-03 (0050 is a reserved gap)
- 35 Playwright e2e specs
- 24 memory files capturing instructor preferences + project state
- 7 CI gates (build / lint / typecheck / unit / e2e / storybook / visual-regression) on every PR

**Test counts:**

| Package | Test files | Tests | Notes |
|---|---|---|---|
| `@sophie/components` | 86 | 745 | Per-component vitest + axe-core + Storybook |
| `@sophie/astro` | 87 | 922 | Container + pedagogy-index + extractor tests |
| `@sophie/core` | 33 | 481 | Schema + audit invariant tests |
| **Total** | **206** | **2,148** | |

**Today's session shipped:**

1. PR #168 — Card, Grid, Tabs, Dropdown chrome primitives; CollapsibleCard hard-renamed to Dropdown; 32 new files; 16 R+CR-resolved issues; all 7 gates green.
2. `docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md` — brainstorm-validated design for Sophie's spec-driven authoring layer, with the complete ASTR 201 Course Spec draft.

**Cumulative deltas from the last 14 days** (368 commits):

| Concern | Then | Now |
|---|---|---|
| Components | ~29 | 37 (+4 chrome, +Dropdown rename) |
| MyST warnings | 16 | 0 |
| Audit invariants | 13 | 14 (post-W4c added OF-3) |
| Standing review rules | R6–R9 | R6–R10 |
| R7 silent-skip violations | 3 | 0 |
| R9 dual-decl collisions | 1 | 0 |
| Typecheck hints | 3 | 0 |
| Lockfile drift | recurring | clean |

## Quality grade (per the reviewing-project-quality rubric)

| Category | Score | Evidence |
|---|---|---|
| Test coverage | 18/20 | 2,148 tests across 206 files; axe-core mandatory on every component PR (ADR 0004); 7-gate CI on every change; Visual-regression baselines tracked. -2 because some pedagogy-index extractors have audit invariants without paired integration tests at the component-usage level. |
| Design system | 18/20 | Chrome / epistemic split is exemplary and was just demonstrated by PR #168. Token pipeline (TS → CSS vars → Tailwind preset + CSS Modules, ADR 0005) is consistent. -2 because chrome primitives only just landed; their use in real chapters is unvalidated. |
| Scientific correctness (was: Physics) | 15/20 | 14 audit invariants tied to extractors; R6–R10 standing review rules emerged from real findings; OMI Flow + Equation Biography + Multi-Representation patterns codified. -5 because the audit is rich on extractor-level discipline but unproven at chapter-scale — only one validated pilot (m2-l3-spectra-composition) so far. |
| Accessibility | 18/20 | axe-core mandatory; R10 landmark rules formalized after three same-root-cause bugs; W4c sweep across 21 specs with `.withTags()` ensuring `landmark-unique` + `landmark-one-main` checked. -2 because three components shipped today have axe coverage but no chapter-level a11y audit yet (multi-component compositions can surface issues axe-on-individual-components misses). |
| Architecture | 16/20 | 79-ADR audit trail; 5 packages with clean dep graph (`package-deps.test.ts` enforces); MDX → AST → pedagogy-index pipeline is the SoTA shape; ADR 0061 (AI-optimized codebase design) made file-size discipline explicit. -4 because the ADR count is high (~3.5/day average), some are reactive rather than principled, and platform coverage outpaces real-world adoption — 37 components for 1 reference application and 1 partial pilot is generous capacity. |

**Total: 85/100 → A−**

## Substantive assessment

The rubric grade is honest but not the most useful frame. Anna asked seven distinct questions; here are direct answers.

### Is it well-designed?

**Yes, structurally. The architectural decisions are principled and mostly correct.**

The chrome / epistemic split that PR #168 just made concrete is exactly the right shape. Sophie's components have well-defined contracts (`ComponentContract<TProps>` with `serialize` separate from render); the pedagogy index is serialized from MDX AST rather than hand-authored YAML, which means one source of truth derived from content; the 8-role epistemic taxonomy (ADR 0058) is sharper than ChatGPT's generic 16-noun-and-verb list and maps to actual scientific reasoning moves.

The MDX → AST → pedagogy index → audit pipeline is the load-bearing architectural pattern. It is not present in MyST, Quarto, or any commercial LMS. It is the right pattern for AI-supervised content authoring because the AI generates MDX and the pipeline extracts the structure for audit — neither human nor AI has to hand-fill a parallel YAML.

Where the design wobbles: the ADR count (79 in roughly two months) is high enough that some decisions look reactive rather than principled. The "build the best now" rule has paid off on structural decisions (Radix-backed Tabs over custom, Accordion swap for Dropdown to support future multi-item, chrome / epistemic split) but the platform also has components that have only ever been used in smoke fixtures. Coverage runs ahead of adoption.

### Is it over-engineered?

**Partially yes, but not in the dangerous way.**

The over-engineering signals are real:
- 37 components for one reference application is a lot.
- 79 ADRs in two months indicates the decision-trail is doing more work than the code is.
- Five packages might be over-modularized for the current size (debatable — the dep graph is clean and the boundaries serve AI authoring per ADR 0061).
- Several "partial" components (multi-representation links, retrieval practice, intervention) exist as schemas + minimal implementations awaiting real chapter use.

The over-engineering is NOT dangerous because:
- Every component traces to a concrete pedagogical role validated against Anna's actual courses (ASTR 201's reading frontmatter, the 4 modules' content patterns).
- The chrome / epistemic split keeps the visual layer flexible — adding new visual treatments doesn't require touching the epistemic layer.
- AI-author-first (ADR 0030) inverts the usual "engineer-builds-API-for-humans" framing — many components exist because the AI needs structured slots to compose, not because a human will hand-author them.

The biggest YAGNI risk is the audit invariants for components that haven't been used at scale. If `MultiRep` never gets used in a real chapter, its audit invariants are dead code. Mitigation: the ASTR 201 migration (the next concrete step) will surface which components matter and which don't.

### Getting closer to completion?

**Wrong frame. The right question is: closer to being usable by a second person.**

Platform primitives: ~70% of what's needed for v1 exists.
AI authoring layer: 0% — designed today, zero code.
Spec-driven workflow: 0% — designed today, zero code.
ASTR 201 migration: ~5% (one pilot chapter complete).
COMP 521 greenfield: 0% — not started.
Onboarding docs for new instructors: ~30%.

So: the platform is much further along than its adoption. A second instructor cannot pick up Sophie today and be productive in under a week. The gap is the authoring experience, not the components.

Today's design doc (Course Spec + spec-driven layer) closes the architecture gap. The implementation gap is a multi-PR sprint (schema → validator → discovery → audit → iterate → implement → scope-down → constitution-from-conversation, in that order per the design doc). Realistically that is 2–4 weeks of focused work.

The ASTR 201 migration itself is independent and probably 3–6 weeks of content work even with strong AI assistance.

### What is Sophie now?

A working, schema-first, MDX-based content compiler for STEM textbooks, with:

- 37 pedagogy-aware React components covering 7 of the 8 epistemic roles (ADR 0058) plus chrome.
- A pedagogy index that extracts structural data from authored MDX (definitions, key insights, OMI flows, misconception alerts, equation biographies, multi-representation links).
- 14 audit invariants that check pedagogical correctness (assessment alignment, prerequisite mapping, misconception repair, landmark choice, etc.).
- A consistent design system on a TS-token → CSS-var pipeline (ADR 0005).
- 7-gate CI catching regressions across build, lint, typecheck, unit, e2e, Storybook, and visual regression.
- One reference application (`examples/smoke`) and one validated migration pilot (`m2-l3-spectra-composition`).
- A brainstorm-validated design for the AI authoring layer (Course Spec + 7-stage workflow).

What it is NOT yet:
- An AI authoring system end-to-end (designed only).
- A spec-driven workflow runtime (designed only).
- A second-instructor-validated platform.
- A complete ASTR 201 migration.

### What's still TBD

**Near-term (next 1–2 sprints):**
- Course Spec Zod schema + validator (the design doc's step 1).
- `sophie discover` walks consumer repo against discovery rules.
- `/sophie.audit` runs invariants against discovered artifacts, produces persisted audit reports.
- `/sophie.iterate` consumes audit + redlines, produces v2 MDX.
- ASTR 201 second pilot chapter (per ADR 0064 structural-density-rotation rule, must differ from m2-l3).

**Medium-term (next quarter):**
- `/sophie.implement` drafts new MDX from task spec — depends on AI context-pack design.
- Full ASTR 201 migration (4 modules, 25 lectures, 9 HW, 3 exams).
- COMP 521 greenfield authoring as the second-instructor validation surface.
- Authoring docs for new instructors (capabilities tour, your-first-chapter, library rooms).

**Architecture-locking ADRs needed:**
- "Three-layer plurality: chrome flexible, epistemic stable, courses extensible" — locks Sophie's positioning against the LDS-platform drift ChatGPT initially proposed.
- "Pedagogy patterns as a registered taxonomy" — formalizes the `pedagogy.pattern:` field's extensibility (OMI v1; named additions later).
- "Course Spec format v0.1" — locks the 8-section format from today's design.

### Is this SoTA?

**Among open-source pedagogy tooling: yes, by combination if not by individual piece.**

Comparison table:

| Tool | Pedagogy index | Epistemic roles | AI-author commitment | Audit invariants | MDX-first |
|---|---|---|---|---|---|
| Quarto | No | No | No | No | Yes |
| MyST | No | No | No | No | Yes |
| GitBook | No | No | No | No | Markdown |
| Notion EDU | No | No | No | No | Block model |
| Moodle / Canvas (LMS) | No | No | No | No | Web forms |
| spec-kit | No | No | Yes (software) | No (mechanical) | Markdown |
| autospec | No | No | Yes (software) | No (mechanical) | YAML |
| **Sophie** | **Yes** | **Yes (8 roles)** | **Yes (ADR 0030)** | **Yes (14)** | **Yes** |

No other tool combines all five. spec-kit + autospec adapted for pedagogy is what Sophie's spec-driven layer (designed today) becomes. The pedagogy-index pattern is, as far as I can tell from the comparison, novel.

The epistemic-role taxonomy (Observable / Model / Inference / Assumption / Approximation / Uncertainty / Numerical / Misconception) is also distinctive — most platforms either ignore pedagogy entirely or impose a single rigid template. Sophie names the reasoning moves and lets visual style vary.

Caveats on SoTA:
- The comparison above includes well-known tools but is not exhaustive. There may be academic prototypes I don't know about.
- "SoTA" matters less than "useful." A novel architecture that nobody uses is just architecture.
- Sophie has not been validated by a second instructor or by a DBER paper. The SoTA claim is intrinsic-design, not adoption-proven.

### Is this useful at all?

**For Anna: very. For a second instructor: not yet. For the field: uncertain.**

For Anna directly, Sophie reduces friction across three courses (ASTR 201, ASTR 101, COMP 521), supports the tenure case through teaching infrastructure and potential SoTL output, and gives her AI-assisted authoring that respects her pedagogical voice. The investment is concrete and the returns compound across years of teaching.

For a hypothetical second instructor today, Sophie is hard to adopt: the authoring loop requires manual MDX, the pedagogy index is unfamiliar, the audit invariants are undocumented for outsiders, and the schema-first conventions need explanation. The ASTR 201 migration plus the spec-driven layer (designed today, built next) closes most of this gap, but adoption needs about another quarter of work.

For the field of STEM pedagogy infrastructure, Sophie is positioned to be genuinely useful IF:
- The eight-role epistemic taxonomy gets validated across disciplines (chemistry, biology, CS, math) — COMP 521 is the first test outside astronomy.
- A second instructor actually adopts it and reports their experience (gives the SoTL paper concrete data).
- The AI authoring loop reduces per-chapter authoring cost from days to hours.

Sophie's biggest risk is not being wrong — it is being right but unadopted. The architecture is sound; the marketing problem is real. Anna's tenure case + Cottrell + CAREER applications give Sophie its early-stage budget; sustainable adoption depends on the next 12 months of authoring tooling + onboarding work.

## Backlog (prioritized)

**P1 — Blocks next milestone:**
1. Course Spec Zod schema + validator (`@sophie/schemas/course-spec@0.1`).
2. ASTR 201 `course.sophie.yaml` authored from today's design draft.
3. `/sophie.audit` minimal MVP — schema validation only, no pedagogy-index yet.

**P2 — High value, near-term:**
4. ASTR 201 second pilot chapter (must differ in structural density from m2-l3 per ADR 0064).
5. New ADR: Three-layer plurality (chrome / epistemic / course-repos).
6. `voices/anna-rosen.yaml` authored.
7. `/sophie.iterate` MVP — consume audit findings + author redlines, produce v2.

**P3 — Architecture-locking:**
8. New ADR: Pedagogy patterns as a registered taxonomy.
9. New ADR: Course Spec format v0.1.
10. Validation levels labeled (`valid` → `teaching-ready` → `excellent` → `research-grade`).

**P4 — Quality of life:**
11. Authoring docs for new instructors (capabilities tour, first-chapter, library rooms).
12. Audit report visualization in `docs/website/`.
13. Coverage trend dashboard (chapter quality over time).

**P5 — Long horizon:**
14. COMP 521 Course Spec drafted (greenfield validation surface).
15. `/sophie.implement` design + AI context pack format.
16. Cross-course shared registries (equations, figures).
17. Second-instructor onboarding pilot.

## Files changed this session

| File | Type | Notes |
|---|---|---|
| `packages/components/src/components/Card/*` (8 files) | new | Chrome primitive (PR #168) |
| `packages/components/src/components/Grid/*` (8 files) | new | Chrome primitive (PR #168) |
| `packages/components/src/components/Tabs/*` (8 files) | new | Chrome primitive (PR #168) |
| `packages/components/src/components/Dropdown/*` (8 files) | new | Chrome primitive (PR #168) — replaces CollapsibleCard |
| `packages/components/src/components/CollapsibleCard/*` (8 files) | deleted | Hard-renamed to Dropdown (PR #168) |
| `examples/smoke/src/content/sections/foundations/units/chrome-primitives-demo/reading.mdx` | new | Smoke fixture exercising all 4 chrome primitives |
| `packages/components/src/index.ts` | modified | Barrel re-exports for new primitives |
| `docs/website/reference/chapter-components.md` | modified | New sections for Card / Grid / Tabs; CollapsibleCard → Dropdown |
| 4 e2e specs + 5 docs (live) | modified | CollapsibleCard rename consumers |
| `~/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_brainstorming_style.md` | modified | Added strict "one question per turn" rule |
| `docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md` | new | Spec-driven layer design |
| `docs/reviews/2026-05-25-state-of-sophie.md` | new | This document |

## Recommended next steps

1. **Pause to ratify today's two architectural locks** before building: (a) the chrome / epistemic / course-repos three-layer split, (b) the Course Spec format v0.1. Both deserve ADRs.
2. **Build P1 items in a single small PR** — Course Spec schema + validator + ASTR 201 `course.sophie.yaml` drafted from today's design. Validates the format on a real artifact.
3. **Pick the second ASTR 201 pilot chapter** (must differ in structural density from m2-l3). Use the migration to find what the spec-driven layer actually needs.
4. **Defer COMP 521 greenfield work** until ASTR 201 migration has validated the spec-driven loop. The second course should test, not invent.
