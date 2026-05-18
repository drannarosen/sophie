---
title: Overview
short_title: Overview
description: Sophie's big-picture vision and current state — what the platform is, who it serves, how it's built, what's shipped, what's next. Maintained as a living source of truth.
tags: [overview, vision, current-state]
---

# Overview

Sophie is a **schema-driven, AI-authorable platform for interactive
scientific textbooks, course websites, slide decks, and LMS exports**
— built from a single MDX source. Sophie ships as a standalone,
distributable platform under the `@sophie/*` namespace; consumer
courses live in their own separate repositories and depend on
`@sophie/*` from npm. Pedagogy components carry interactivity,
persistence, and audit invariants as first-class schema entities
rather than rendering conventions.

This page is **the current-state source of truth** for Sophie's
big-picture vision. It's kept up to date as the platform evolves;
the [roadmap](status/roadmap.md) tracks per-phase shipping detail,
the [decision records](decisions/template.md) capture the audit
trail of why each load-bearing choice was made, and the
[architecture explanation](explanation/architecture.md) walks the
implementation. This page is upstream of all three — when this page
and a downstream doc disagree, the downstream doc updates.

## 1. Audience and authoring model

Sophie serves **two human audiences** in priority order:

1. **Anna + her students** — Anna authors; students learn. Sophie's
   pedagogy components earn their keep on real ASTR 201 + COMP 521
   cohorts at SDSU.
2. **Anna + future external instructors** — open-source from day one.
   Sophie publishes as `@sophie/*` packages with API discipline
   (`@stable` / `@experimental` / `@internal`) and a
   `sophie create textbook` scaffolder so other instructors can
   adopt without forking.

The AI is **not an audience**. It is Sophie's **co-author and
resident expert**, in four load-bearing roles codified by
[ADR 0030](decisions/0030-audience-and-ai-author-model.md):

1. **Primary author** — drafts chapter prose, fills templates,
   sketches examples, drafts code. The instructor does not write the
   first draft.
2. **STEM pedagogy expert** — coaches the instructor on
   evidence-based pedagogy (retrieval, spacing, interleaving,
   elaboration, dual coding, productive failure, worked examples,
   cognitive-load management) with citations, not assertions.
3. **Domain expert** — carries deep STEM domain knowledge
   (astrophysics, computational science, the specific subject) and
   produces citation-ready content the instructor verifies.
4. **Brainstorming partner and design-doc writer** — drives Socratic
   refinement, synthesizes outlines, drafts the scaffolding
   (CourseSpec, module skeleton, learning-arc map, pedagogy
   philosophy) that keeps subsequent authoring coherent.

The instructor remains **supervisor, decider, and final authority**
at every handoff. **HITL is structural, not advisory** — chapters do
not ship without instructor review, and the platform's audit pipeline,
contributor agreements, schema validation, and visible revision
history encode that supervision into the architecture rather than
leaving it to discretion. The same HITL discipline that governs
Sophie's own development applies to Sophie's authoring product.

What this authoring model is **not**:

- Not autonomous AI authoring; chapters do not ship without review.
- Not AI-only; manual authoring is fully supported and first-class.
- Not "Anna only"; open-source from day one is real, not aspirational.
- Not "the AI is always right"; the instructor's judgment overrides
  the AI on any disagreement.

## 2. Success criteria for v1 (fall 2026)

Sophie v1 is successful if all four of the following are true, with
a fifth as bonus:

- **A — Time/productivity.** Anna authors textbook chapters in
  roughly 1/3 the time the equivalent chapter would have taken in
  Quarto.
- **B — AI/human ratio.** The AI handles ~80% of the drafting; the
  instructor handles supervision, refinement, and approval.
- **C — Pedagogy effectiveness.** Students engage with the
  interactive components (predictions, reflections, comprehension
  gates) in ways Quarto's callouts never produced. Persistence is
  reliable across cohorts and across tabs.
- **D — Quality bar.** Every chapter passes `sophie audit` cleanly
  before it ships; no chapter requires re-drafting after deploy.
- **E (bonus) — Open-source momentum.** By spring 2027, ≥1 external
  instructor is actively using Sophie or in serious adoption
  discussion.

A chapter that passes audit but isn't pedagogically sound is a failed
chapter. The audit catches *deterministic* issues; pedagogy quality
is the instructor's + the pedagogy-expert skill's responsibility.

## 3. Domain scope: STEM college + graduate-level

Sophie is **explicitly scoped to STEM college and graduate-level
courses**. Not K-12. Not humanities. Not generic e-learning. Not
corporate training. This narrows every downstream choice — math is
first-class (KaTeX, equation cross-references, worked-example
components); code is first-class (`<CodeCell>` + Pyodide, CodeMirror
6 per [ADR 0018](decisions/0018-codemirror-6-for-codecell.md));
quantitative reasoning is first-class (units, dimensions, error
analysis); citations follow academic norms (CSL JSON, ApJ for
astronomy); reproducibility matters (executable code, deterministic
figures, data provenance); and the STEM pedagogy literature applies
(misconception research, threshold concepts, productive failure,
POE, Just-in-Time Teaching, peer instruction, mastery learning).

What this scope **does not preclude**: external instructors in
adjacent STEM domains (chemistry, biology, engineering) adopting
Sophie. The platform doesn't gatekeep. The pedagogy expertise
encoded in skills reflects STEM-domain conventions; the design is
not optimized for non-STEM use cases.

## 4. Positioning

Sophie is positioned as **both**:

- **Replacement** — Sophie does what Quarto, MyST, and Pressbooks do
  for STEM pedagogy textbooks, plus AI authoring, interactive
  pedagogy with persistence, and audit. Migration is one-way (Quarto
  → Sophie); migration tooling is first-class because ASTR 201
  starts as a Quarto migration.
- **New category (longer-term framing)** — AI-supervised STEM
  textbook authoring is fundamentally different from static-textbook
  tooling. The category language matures as Sophie's track record
  grows.

For v1 (fall 2026), lead with the replacement story — the practical
positioning Anna lives daily and external instructors can evaluate
against their current Quarto/MyST setup. Lead with the new-category
framing in Phase 7+, once there's a track record.

### Sophie vs ClassBuild

[ClassBuild](https://github.com/jtangen/classbuild) is the closest
existing tool in spirit; the contrast clarifies Sophie's commitments.

| Dimension | ClassBuild | Sophie |
|---|---|---|
| **Core flow** | One-shot pipeline (topic → complete course) | Iterative collaboration through composable skills |
| **Instructor role** | Sets preferences upfront; reviews outputs before export | Load-bearing input at every skill handoff; decides every design choice |
| **AI role** | Generates everything | Implements + coaches; never autonomous |
| **Pedagogy science** | Five principles applied automatically | Pedagogy principles surfaced as instructor *choices*; instructor + AI co-design what fits |
| **Output** | Multi-modal kit per chapter (HTML, slides, audiobook, infographic, teaching pack) | Canonical textbook (chapters + modules); other artifacts grow as their own skill families later |
| **Customization** | Constrained by template | Unconstrained: instructor expertise + creativity drive design |
| **Migration** | Greenfield only | First-class migration tooling for existing Quarto/MyST/Jupyter content |
| **Schema** | Implicit / per-template | Explicit Zod-as-source-of-truth; AI introspects schema |
| **Component depth** | Interactive widgets | Persistence-bearing pedagogy components with cross-tab sync, audit, dual-profile (Phase 5) |

Sophie inherits ClassBuild's **insight that pedagogy science belongs
in the tooling**. Sophie *rejects* ClassBuild's **prescription —
that the AI should apply the principles automatically**. The
instructor's expertise, creativity, and design choices are the lead
author; the AI scaffolds and accelerates work the instructor was
already going to do.

## 5. Architecture at a glance

Sophie is a **TypeScript monorepo orchestrated by Turborepo**
([ADR 0014](decisions/0014-turborepo-for-monorepo.md)) with
**pnpm** ([ADR 0011](decisions/0011-pnpm-not-npm-or-yarn.md)) as the
package manager and **Biome** ([ADR 0013](decisions/0013-biome-replaces-eslint-prettier.md))
for lint + format. The renderer is **Astro + MDX** with **React 19**
islands ([ADR 0002](decisions/0002-renderer-astro-mdx.md)).
**Zod** is the single source of truth for content schemas
([ADR 0003](decisions/0003-zod-as-source-of-truth.md)). **Persistence
runs through `useInteractive` and a `ResponseStore` repository over
IndexedDB**, with `MemoryResponseStore` as the runtime fallback and
**BroadcastChannel** for last-writer-wins cross-tab sync
([ADR 0007](decisions/0007-persistence-indexeddb.md),
[ADR 0029](decisions/0029-broadcastchannel-lww-timestamps.md)).
**axe-core tests are mandatory** on every component PR
([ADR 0004](decisions/0004-component-contract.md)).

The package layout:

| Package | Role |
|---|---|
| `@sophie/core` | Zod schemas, CLI binary (`sophie`), platform-agnostic logic |
| `@sophie/components` | React-pure pedagogy components (no `astro:*` imports) |
| `@sophie/astro` | Renderer + chrome primitives + the pedagogy-index extractor |
| `@sophie/theme` | TS tokens → CSS vars + Tailwind preset (`@media print` forced-light tokens included) |

The load-bearing platform pattern is the **pedagogy-index**
([ADR 0038](decisions/0038-pedagogy-index-pattern.md)) — a
build-time index of every definition, equation, key insight, figure,
misconception, and learning objective in the textbook, populated by
six pure mdast extractors and consumed by the audit pipeline, the
search facet, eight rollup components (Chapter\* and Course\*), and
the chapter-end navigation surfaces. The pattern is the spine that
makes audit invariants, cross-references, glossary roll-ups, and
faceted search uniform across the textbook.

## 6. The Sophie LDS conformance foundation

The **Sophie Learning Design System (LDS) conformance foundation**
is the spine of Sophie's pedagogical architecture. The foundation
shipped as a single docs-only tranche on 2026-05-14 and was hardened
across 2026-05-15. Code implementation follows in Phase 3.

The foundation answers a load-bearing question: *what makes a
course "Sophie-LDS-compliant" beyond passing build-time validation?*
Seven contracts plus their audit-invariant families:

| ADR | Contract | What it adds |
|---|---|---|
| [0040](decisions/0040-teaching-decision-records.md) | **Teaching Decision Records (TDRs)** | ADR-shaped per-chapter teaching log, folder-scoped 3-digit numbering, lives in consumer repos. The curriculum-side audit trail. |
| [0041](decisions/0041-teaching-move-library.md) | **Teaching Move Library** | 18 named moves across 7 families (elicit prior knowledge, confront misconceptions, worked examples + fading, representations + comparison, metacognition + retrieval, diagnostics, Sophie-native). Centralized `move-index.ts`. |
| [0042](decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md) | **Pedagogy Contract + AI Contribution Ledger** | Course-level `pedagogy-contract.yaml` + per-chapter `ai_contribution` frontmatter (with `ai_workflow.generation_share` block + `tdr_traceability` block). Public-facing accountability layer. Invariants PC1, AC1, AC2. |
| [0043](decisions/0043-notation-registry-multirep-alignment-audit.md) | **Notation Registry + `<MultiRep>` + Alignment Audit** | `notation-registry.yaml` declares canonical symbols/units/aliases per concept; `<MultiRep>` binds one concept across modes (verbal/equation/figure/code/intuition). Invariants NR1–NR4 + MR1–MR4. Opt-in. |
| [0044](decisions/0044-misconception-graph-and-intervention-library.md) | **Misconception Graph + Intervention Library** | Extends the misconception schema with graph fields (prerequisite/related misconceptions + concept refs); 12 canonical interventions in 4 families; `<Intervention>` component. Invariants MG1–MG3 + I1–I3. |
| [0045](decisions/0045-pedagogical-diff-curriculum-ci.md) | **Pedagogical Diff + Curriculum CI** | `sophie diff <ref>` CLI + persisted `dist/.sophie/pedagogy-index.json` build artifact + two-axis change taxonomy (granularity × severity) + three formatters. Observable across revisions. |
| [0046](decisions/0046-equation-biography.md) | **Equation Biography** | Children-mode extension to `<KeyEquation>` (six biography children: `<Observable>`, `<Assumption>`, `<Units>`, `<BreaksWhen>`, `<CommonMisuse>`). Three rendering surfaces. Universal scope; per-equation opt-in. Invariants E7–E9. |

A 2026-05-15 hardening pass added seven cross-cutting ADRs to close
systemic gaps surfaced by independent review:

| ADR | Concern |
|---|---|
| [0047](decisions/0047-empirical-validation-plan.md) | Two-paper SoTL strategy; eight metrics (M1–M8) derived from existing structured data; `sophie audit --metrics` + `sophie metrics history`. |
| [0048](decisions/0048-sophie-lds-content-plugins.md) | LDS content plugin granularity (`@sophie/commons-universal` + `@sophie/discipline-*`); three autonomy guarantees: no plugin required; per-entry override always allowed; plugins cannot impose ERROR invariants. |
| [0049](decisions/0049-sophie-refactor-cli.md) | `sophie refactor` CLI family (`misconception` / `concept` / `equation` × `rename` / `split` / `merge` / `delete`); dry-run default; atomic apply via in-memory staging; audit-revert-on-new-ERRORs; auto-generated TDR-seed stubs. |
| [0051](decisions/0051-chapter-status-course-versioning.md) | Chapter `status: draft` / `review` / `stable`; course-level semver via git tags; `course_version` block in pedagogy contract. Five invariants CS1–CS3 + CV1–CV2. |
| [0052](decisions/0052-scheduled-publication-visibility.md) | Build-time gating for time-sensitive content; chapter `publishes_at` / `unpublishes_at`; `<Solution>` / `<ExamKey>` / `<ScheduledReveal>` components. Four invariants SP1–SP4. |
| [0053](decisions/0053-conformance-failure-modes.md) | Five-failure-mode taxonomy; `audit_overrides` chapter frontmatter with three-grain control + required TDR-ref (CF2 ERROR); runtime fallbacks for IndexedDB + BroadcastChannel formalized (CF5). |
| [0054](decisions/0054-course-schedule-calendar.md) | `schedule.yaml` + four schedule components + `/schedule.ics` RFC 5545 feed; bidirectional auto-extraction from ADR 0052 timestamps. Four invariants SC1–SC4. |

ADR-editing discipline is **state-dependent**: pre-implementation
ADRs are freely editable in place; post-implementation ADRs land
substantive changes as Revisions sections. See
[contributing/adr-process.md](contributing/adr-process.md).

## 7. The Sophie skill ecosystem

Sophie does **not** ship a single "AI writes the textbook" entry
point. It ships a **skill ecosystem** — composable specialized
workflows that mirror the actual authoring process, with the
instructor in the loop at every handoff. This is the
[superpowers](https://github.com/obra/superpowers) pattern applied
to textbook authoring: the same workflow primitives that work for
code in Claude Code (`superpowers:brainstorming`,
`superpowers:writing-plans`, `superpowers:test-driven-development`,
`superpowers:verification-before-completion`,
`superpowers:requesting-code-review`) adapted into Sophie's
authoring kit for *chapters*. Each skill has one job; skills compose
into authoring sessions; the instructor reviews at each step's
natural boundary.

The v1 skill kit is organized in **six groups**, all required for
v1:

| Group | Skills | Purpose |
|---|---|---|
| **A** | `chapter-brainstormer`, `chapter-planner`, `chapter-drafter`, `chapter-reviewer`, `chapter-polisher` | Core chapter authoring loop (happy path) |
| **B** | `chapter-pedagogy-expert`, `objective-writer`, plus evidence-based pedagogy practice skills (§8) | Pedagogy expertise |
| **C** | `chapter-migrator`, `module-migrator` | Migration tooling (required because ASTR 201 is Quarto migration, not greenfield) |
| **D** | `module-brainstormer`, `module-planner` | Module-level workflows (modules are first-class) |
| **E** | `figure-generator`, `glossary-curator`, `citation-helper`, `transcript-curator` | Auxiliary content force-multipliers |
| **F** | `course-brainstormer`, `course-planner`, `course-pedagogy-designer`, `learning-arc-designer`, `course-spec-writer` | Course-level workflows (the front door — see §10) |

The skill ecosystem is itself a **versioned product** with its own
release cadence, changelog, and contributing guidelines. External
instructors get the same skills Anna uses. Distribution is by
**MCP server + per-editor plugin marketplace bundles** (see §9).

**Current status**: the skill ecosystem is the Phase 3 deliverable.
None of the skills above ship yet; the audit + pedagogy-index
foundation that supports them does.

## 8. Evidence-based pedagogy as a first-class skill family

Pedagogy expertise (group B) is **not** "AI knows good prose." It's
a family of skills that encode the actual science of learning and
surface it as choices the instructor makes during authoring. The
intended effect: the instructor isn't just writing a chapter; she's
*designing for measurable learning outcomes*, with the AI as a coach
that knows the research literature.

The principles to encode include:

- **Retrieval practice** — active recall over re-reading; structured
  via `<Predict>`, `<ComprehensionGate>`, low-stakes prompts.
- **Spaced practice** — distributing recall across time; a future
  cross-chapter review-prompt component pattern.
- **Interleaving** — mixing related topics in practice rather than
  blocking; surfaced as a chapter-planner suggestion.
- **Elaboration** — encoded in `<Reflection>` prompts and "explain
  your reasoning" hooks.
- **Dual coding** — pairing words with visuals; surfaced as a
  pedagogy-expert recommendation when prose is dense and no figures
  are referenced.
- **Concrete examples** — multiple examples spanning contexts.
- **Metacognition** — calibration via `<ConfidenceCheck>` and
  reflection prompts that ask students to predict their own
  performance.
- **Productive failure / desirable difficulty** — exercises that
  feel hard but produce durable learning; surfaced via `<Predict>`.
- **Worked examples + faded prompts** — gradual release of cognitive
  scaffolding; future `<WorkedExample>` component pattern.
- **Cognitive-load management** — split attention, redundancy, and
  expertise-reversal effects; the audit can flag dense passages
  without scaffolding.

These belong as **named skills** (e.g., `pedagogy-interleaving-coach`,
`pedagogy-spacing-reviewer`, `pedagogy-retrieval-design`) so each is
a focused expert the `chapter-pedagogy-expert` can dispatch to.

## 9. Distribution and developer experience

Sophie is **a package an instructor installs to develop independent
course material in their editor of choice** ([ADR 0001](decisions/0001-platform-not-monorepo.md)).
The install-and-use flow:

```bash
# Fresh machine, first time installing Sophie:
pnpm create sophie textbook my-stem-course
cd my-stem-course
pnpm install
code .                          # or `cursor .`, `zed .`, etc.
# → Claude Code / Codex / Cursor picks up the repo
sophie dev                      # live preview at localhost:4321
sophie audit                    # structured findings on chapter content
sophie build                    # production build
```

The consumer repo is independent: it depends only on `@sophie/*`
packages from npm. The instructor authors in their editor of choice;
the `sophie` CLI handles build/preview/audit/refactor; the AI editor
extension provides the AI authoring workflows.

### Editor and AI-runtime neutrality

Sophie does not assume Claude Code. The supported editor matrix for
v1:

- **Primary** — Claude Code (Anna's daily driver; first-class plugin
  with slash commands and skill discovery).
- **Secondary** — Codex (OpenAI's editor); same MCP-based
  capabilities, different invocation surface.
- **Plausible** — Cursor, Continue, Zed AI, any future MCP-compatible
  editor; tools available via MCP, no special integration needed
  beyond MCP client support.

The shared substrate is **Model Context Protocol** (Anthropic's MCP,
multi-vendor since late 2025). Sophie ships an MCP server that
exposes its skills as tools any MCP-compatible editor can invoke.
The Claude Code plugin is a layer on top of the MCP server, not a
replacement — it adds slash commands and tighter skill UX for Claude
Code specifically.

### Distribution surface, layered

| Layer | Package | Distributed via |
|---|---|---|
| Platform code | `@sophie/core`, `@sophie/components`, `@sophie/astro`, `@sophie/theme` | npm |
| CLI binary | `@sophie/core` (`bin: { sophie }`) | npm |
| Skill ecosystem (canonical) | `sophie/skills/*` in the platform repo | Build pipeline emits per-marketplace bundles |
| Capabilities (tools) | `@sophie/mcp` (MCP server) | npm + MCP client config |
| Editor plugin bundles | Published to N AI-editor plugin marketplaces | Per-marketplace publish |
| Templates | `create-sophie` | npm-create |

## 10. Course-design starts at the course level

The **starting state for Sophie's authoring workflow is the
course-level design**, not the chapter level. An author sits down to
design the *whole course* — its scope, its arc, its pedagogy
approach, its module breakdown, its materials inventory — *before*
any individual chapter exists. Course design is the entry door;
modules and chapters are downstream.

The AI in this phase is an **active probe**, not a passive responder
— it asks Socratic questions, surfaces design choices the instructor
might not have considered, highlights pedagogy literature relevant
to the goals, and pushes back on choices that contradict
STEM-pedagogy research (with citations, not assertions).

When the course-design phase ends and module-level work begins,
seven artifacts are persisted to the textbook repo:

| Artifact | File | Role |
|---|---|---|
| A. `CourseSchema` metadata | `src/content/course.mdx` | Zod-validated frontmatter (scope-IN, scope-OUT, audience, prerequisites, module sequence) + MDX body. Single source of truth consumed by every downstream skill. |
| B. Module skeleton | `modules/<slug>.mdx` stubs | Title + tentative LOs + week range; module-level skills start here. |
| C. Pedagogy philosophy | `docs/pedagogy.md` | Framework (POE / inquiry / worked-example-heavy / mastery), evidence-based principles emphasized, instructor's authoring voice. |
| D. Learning arc | `arc.json` + interactive React Flow render (deferred to v2+ per [ADR 0016](decisions/0016-react-flow-for-concept-maps.md)) | Concept-dependency graph; interleaving + spacing pattern. |
| E. Assessment plan | `assessment.mdx` | Formative/summative mix, mastery thresholds, grading philosophy. |
| F. Forward-looking artifact inventory | `docs/artifacts.md` | Sketch list (~14 chapters, ~12 slide decks, ~18 demos). Sets Phase 4+ targets; prevents goalpost-drift. |
| G. Course design rationale | `docs/design-rationale.md` | Long-form prose: WHY this scope, WHY this pedagogy, WHY these modules; future-instructor onboarding + teaching-portfolio artifact. |

These produce four new top-level Zod schemas (`CourseSchema`,
`PedagogyPhilosophySchema`, `AssessmentPlanSchema`, plus a v2+
`ArcSchema`). The audit pipeline walks these artifacts and enforces
cross-artifact invariants (module sequence ↔ real modules; every
chapter covers ≥1 declared LO; learning-arc dependencies form a
DAG; assessment items cover ≥1 LO).

## 11. Front-end + layout (shipped)

Sophie's v1 site shell is **MyST-book-theme-style three-column
default** with three user-toggleable view modes that progressively
trade chrome for canvas:

| Mode | Sidebar | In-page ToC | Margin asides | Content width | Use case |
|---|---|---|---|---|---|
| **Default** | Visible (toggleable) | Visible top of right column (collapsible) | Right margin | ~75ch (comfortable reading) | Typical chapter reading |
| **Focused** | Hidden | Hidden (reachable via Cmd-K) | Inline collapsibles | ~85ch | Deep-dive long-form reading |
| **Wide** | Hidden | Hidden | Inline collapsibles | ~100–110ch | Figure-heavy chapters, code walkthroughs, classroom projection |

All three modes shipped in Bucket B PR 10 (2026-05-15) alongside
`@media print` forced-light tokens, chrome reset, view-mode-Wide
print override, page-break protection, and interactive-to-static
expansion. Sidebar visibility, ToC visibility, theme, and view mode
all persist via `localStorage` ([ADR 0032](decisions/0032-localstorage-for-preferences.md));
cross-tab sync is via the `storage` event.

The aesthetic ports Anna's existing course design tokens
(`_design_tokens.scss` / `_tokens_generated.scss` across
`astr101-sp26/`, `astr201-sp26/`, `comp536-sp26/`) into
`@sophie/theme` per [ADR 0005](decisions/0005-theming-three-layers.md).

### Reader-facing features shipped in v1

- **Pagefind search** ([PR #41](https://github.com/drannarosen/sophie/pull/41))
  — Cmd-K modal with 7-entity-type facets (page, definition,
  equation, key-insight, figure, misconception, objective).
- **Theme toggle** — light/dark with system-aware default.
- **Glossary popovers** — hover/tap glossary term → definition;
  first-use inline footnote via remark-plugin extension (PR 10).
- **Cross-reference previews** — hover chapter/figure/equation link
  → preview popover (`<ChapterRef>`, `<EquationRef>`, `<FigureRef>`).
- **Reading-position indicator** — scroll-position bar; descriptive,
  not normative.
- **Persistent prev/next navigation** — always visible at chapter
  bottom; respects module boundaries.
- **Mobile-responsive collapse** — sidebar → hamburger; in-page ToC
  → top-of-chapter disclosure.
- **Print stylesheet** — hides interactive controls, expands
  interactive components to submitted state, preserves equations and
  figures (PR 10).
- **Code copy + line numbers** — Shiki via rehype-pretty-code
  ([ADR 0020](decisions/0020-shiki-syntax-highlighting.md)).
- **Math equation numbering + cross-refs** — KaTeX with `\tag{}` and
  clickable references.
- **Footnote popovers** — hover footnote marker → text without
  scrolling.
- **Margin asides (`<Aside>`)** — Tufte-style; right margin on
  desktop, inline on mobile.
- **Textbook overview page** — `/overview` route auto-generated from
  modules + chapters; the "what's the shape of the whole course"
  poster view; print stylesheet renders this as the printed ToC.

### Deferred reader-facing features

- **Concept map / mind map** (Cluster 5, React Flow) — deferred to
  v2+ per ADR 0016.
- **Cosmic Playground demos** ([ADR 0008](decisions/0008-cosmic-playground-protocol.md))
  — `<Demo>` component manifest + iframe + postMessage; not yet
  shipped.
- **`<CodeCell>` + Pyodide** — drives COMP 521 deploy; not yet
  shipped (Phase 3).
- **Observable Plot** ([ADR 0021](decisions/0021-observable-plot-data-viz.md))
  — inline scientific data viz; not yet shipped.
- **Retrieval / interleaving / spacing components** — realize the
  evidence-based pedagogy from §8; not yet shipped.
- **`sophie export pdf`** — Pandoc-based PDF export for handouts;
  not yet shipped.

### Interactive figures as pedagogical elements (next design conversation)

Sophie's `<Figure>` and `<MultiRep>` components today carry static
images, equations, and code; they do not yet carry **animation,
direct manipulation, or scrubbable parameter sweeps** as
pedagogical surfaces. Interactive figures — where a student drags a
slider to vary an orbital parameter and watches the orbit redraw,
or scrubs a timeline of stellar evolution, or rotates a 3D
spectroscopy diagram — are the next major pedagogical-component
surface Sophie should address.

**Animation/interaction library candidate**: [Motion](https://motion.dev)
(formerly Framer Motion; Motion's standalone React + vanilla split as
of 2025). Motion ships declarative animation primitives that compose
cleanly with React 19, supports gesture and drag interactions
out-of-the-box, and has a path to scroll-linked + scroll-triggered
animation that fits Sophie's textbook-reading flow.

**Open design questions** for the upcoming brainstorm (not yet
decided):

- Component shape — is interactivity a prop on `<Figure>`, a new
  `<InteractiveFigure>` sibling, or a generalization of `<MultiRep>`?
- Authoring surface — how does an AI-coauthored chapter declare an
  interactive figure without hand-rolled React per figure?
- Persistence semantics — does a student's "where they parked the
  slider" survive across sessions like `<Predict>` answers do?
- Print + dual-profile behavior — interactive figures collapse to
  what static rendering in print and in the future instructor build?
- Audit invariants — what does the audit check about an interactive
  figure (label coverage, accessible alternatives, keyboard
  reachability, performance budgets)?
- Reduced-motion + a11y posture — how does the platform respect
  `prefers-reduced-motion` while keeping the interactive
  pedagogical signal intact?

This is the brainstorm topic Anna has flagged for the next design
session; once that conversation settles, the outcome lands as an
ADR (likely the next available number) and this subsection becomes
the entry point for the shipped surface.

## 12. Textbook lifecycle and privacy

Sophie v1 ships as **one-way authoring**: instructor + AI design and
write; students consume; persistence is **local-only (IndexedDB,
per [ADR 0007](decisions/0007-persistence-indexeddb.md)) and never
leaves the student's browser**. Pedagogy revisions are
instructor-driven from classroom observation — not server-side
analytics. This matches GitHub Pages hosting for v1 (static-only
deployment) and keeps the privacy story simple (no FERPA
considerations beyond what local storage already implies).

The eventual target (v3+) is **closed-loop pedagogy**: Sophie
collects anonymized engagement data (component usage, prediction-vs-
actual, time-on-task, confidence calibration); the AI analyzes that
data and surfaces revision suggestions to the instructor before next
semester ("65% of students predicted X here; consider adding a
misconception callout"); the instructor approves; the chapter ships
in its updated form. Sophie v1's persistence architecture
**preserves this as a possibility** without prematurely shipping it
— the `ResponseStore` interface is the seam; response payloads
carry forward-compatible metadata; the schema captures enough about
each response that future analysis is meaningful. ADR 0053 §CF5
formalized the runtime-fallback behavior (`MemoryResponseStore` when
IndexedDB is unavailable; silent BroadcastChannel degradation).

## 13. Design principle: no inequitable normative affordances

> Sophie does not ship affordances that make **normative claims
> about how students should engage** — how long it "should" take to
> read, how "well" they're doing relative to peers, when they're
> "behind." Such affordances are inequitable (different students
> read at different speeds; "average" estimates create anxiety and
> comparison) and undermine the self-pacing, metacognition, and
> independent scholarship that STEM college / graduate-level
> education depends on.
>
> Sophie *does* ship **position-and-state affordances** — where am
> I in this chapter, what have I checked off for myself, what's
> linked from this term — because these are descriptive, not
> normative, and they aid scholarship rather than prescribe pace.

| Type | Example | Posture |
|---|---|---|
| **Normative** ("how you should engage") | Estimated read time, "X% complete" labels, "you're behind peers" prompts, leaderboards, streak counters, points/badges, mandatory linear navigation | **REJECTED** |
| **Descriptive** ("where you are right now") | Reading-position indicator, `<InteractiveCheckbox>` for self-attested LO completion, "viewed" markers based on the student's own browsing | **OK** |
| **Scholarly aids** | Glossary popovers, footnote popovers, cross-reference previews, equation refs, citation popovers | **OK** |

In one sentence: *Sophie augments student capacity as adult learners;
it does not surveil or nudge them through content.*

## 14. Current state (2026-05-15)

Sophie has shipped **Phases 0–2** plus **Buckets B + C** of chrome +
pedagogy-index infrastructure, plus the **LDS conformance foundation
docs**. The platform is grade **A (94/100)** at the most recent
[Bucket B + C architecture audit](reviews/2026-05-15-bucket-b-c-architecture-audit.md).

**Shipped (code):**

- 4 packages — `@sophie/core`, `@sophie/components`, `@sophie/astro`,
  `@sophie/theme`.
- 18 pedagogy components, all axe-tested (ADR 0004 mandate).
- 24 chrome primitives (TextbookLayout, TopBar, Sidebar, ToC,
  view-mode toggles, sidebar toggle, search trigger + modal, and 11
  Chapter\* + Course\* aggregator components).
- Pedagogy-index extractor + virtual module + 10 audit invariants
  (D4/D5, E1/E4/E6, F1/F2/F4, C1, O1/O2, K1).
- Pagefind faceted search across 7 entity types via converter
  registry.
- Forced-light print tokens + chrome reset + interactive-to-static
  print expansion.
- `localStorage`-based preferences (theme, sidebar, ToC, view-mode)
  with `storage`-event cross-tab sync.
- IndexedDB persistence + `MemoryResponseStore` runtime fallback +
  BroadcastChannel LWW sync.

**Shipped (docs):**

- 54 numbered ADRs covering every load-bearing decision.
- LDS conformance foundation (ADRs 0040–0046) + hardening pass
  cross-cutting ADRs (0047–0049, 0051–0054).
- Reference docs paired with foundation ADRs.
- This documentation site (MyST-built; will migrate to a
  Sophie-self-hosted `apps/docs/` site at Phase 4–5).

**Verification metrics (2026-05-15):**

- 677 unit tests across the four packages; 0 type-safety escape
  hatches (`as any`, `@ts-ignore`, `@ts-expect-error`); 0 biome
  errors, 0 biome warnings across 330 files.
- 156 e2e Playwright cases; 11 documented `test.skip` blocks
  awaiting Phase 4 real-chapter content.
- Coverage: `@sophie/astro` 91.57% lines / 88.33% functions;
  `@sophie/components` 79.88% / 69.14%; `@sophie/core` 51% (Zod
  schemas tested via integration; CLI tests pending).

**In flight:** Phase 3 LDS-foundation code implementation —
`dist/.sophie/pedagogy-index.json` build artifact (ADR 0045);
misconception graph fields (ADR 0044); chapter `status` frontmatter
(ADR 0051); `sophie diff`; `sophie refactor` (ADR 0049);
`<Solution>` / `<ExamKey>` / `<ScheduledReveal>` (ADR 0052);
`<Intervention>` (ADR 0044); `<MultiRep>` (ADR 0043); `<KeyEquation>`
biography children (ADR 0046); `sophie audit --metrics` (ADR 0047);
plugin scaffolding (ADR 0048); the AI authoring skill kit (§7).

**Deferred (post-v1 / v2+):** concept-map / mind-map React Flow
visualizations; closed-loop pedagogy telemetry; COMP 536 migration;
dual-profile (instructor) build; JAX integration; full Cluster 6
Cosmic Playground demos; `<VideoPrompt>` lecture-video components.

**v1 deployment targets (fall 2026):**

- **ASTR 201 textbook + course site** — migration from Quarto;
  ~14–18 chapters.
- **COMP 521 textbook + course site** — greenfield "Scientific
  Computing"; cap at ~8 chapters for v1.
- **COMP 536 stays on Quarto** for one more semester; migration is
  v2.

## 15. Where to go next

- **[Roadmap](status/roadmap.md)** — phase-by-phase shipping plan
  with calendar projections and risks.
- **[Architecture explanation](explanation/architecture.md)** —
  how the platform is implemented.
- **[Decisions](decisions/template.md)** — chronological ADRs with
  context, alternatives, and consequences.
- **[Reference](reference/content-schema.md)** — schemas, component
  contract, CLI surface, plugin API, glossary.
- **[Contributing](contributing/setup.md)** — setup, ADR process,
  docs style guide.
- **[Strategy](strategy/positioning.md)** — positioning, funding
  roadmap, publication plan, AGPL rationale.
