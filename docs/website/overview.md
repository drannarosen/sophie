---
title: Overview
short_title: Overview
description: Sophie's audience, authoring model, north star, and design priorities. Big-picture context that every other doc derives from.
tags: [overview, vision, audience, authoring-model, design-notes]
status: draft (live document — built incrementally during the 2026-05-11 big-picture brainstorm)
---

# Overview

> **Status (2026-05-11):** This page captures Sophie's *big-picture
> design intent* as it's pinned down through brainstorming with Anna.
> Each section corresponds to a brainstorm question; the answers
> drive every downstream doc (architecture, schema, ADRs, sprint
> plans). When this page is stable, downstream docs that contradict
> it must update — this page is upstream of them.

## 1. Audience, partnership, and authoring model

### Who Sophie serves

Sophie serves **two human audiences** in priority order:

1. **Anna + her students** (Anna authors, students learn). Anna's
   ASTR 201 and COMP 521 students are the proof. Pedagogy components
   earn their keep on real cohorts.
2. **Anna + future external instructors** (open-source from day
   one). Sophie is published as `@sophie/*` packages with API
   discipline (`@stable` / `@experimental` / `@internal`),
   migration guides, and the `sophie create textbook` scaffolder
   so other instructors can adopt without forking the platform.

The AI is **not** an audience — Sophie is not built *for* the AI.
The AI is Sophie's **co-author and resident expert**. That role,
not a third audience slot, is the load-bearing relationship.

### Sophie's authoring model: AI is the primary author and resident expert; instructor is the supervisor

> **The defining principle of Sophie — the source of truth for
> every content-development workflow:** the AI is the *primary
> author* and the instructor is the *supervisor and final
> decider*. Sophie ships the scaffolding for the supervision
> workflow itself — brainstorming, planning, drafting, auditing,
> iteration — so an instructor can produce high-quality
> scientific pedagogy at speeds and volumes a solo human author
> cannot match.

The AI plays **four load-bearing roles** in Sophie. The platform's
schema, audit, templates, skill ecosystem, and docs all exist to
make these roles effective:

1. **Primary author.** The AI writes chapter prose, fills templates,
   drafts examples, drafts equations, drafts code. The instructor
   does not write the first draft.
2. **STEM pedagogy expert.** The AI coaches the instructor on
   evidence-based pedagogy — retrieval practice, spaced practice,
   interleaving, elaboration, dual coding, concrete examples,
   metacognition, productive failure / desirable difficulty,
   worked examples with faded prompts, and cognitive-load
   management. It surfaces the relevant research, recommends
   which Sophie components fit a given pedagogical goal, and
   pushes back on choices that contradict the literature (with
   citations, not assertions).
3. **Domain expert.** The AI carries deep STEM domain knowledge —
   astrophysics, computational science, and the specific subject
   area of the textbook in question — and produces correct,
   citation-ready content the instructor verifies and corrects.
   Sophie targets STEM college + graduate-level pedagogy
   (§7 below); the AI's domain hat is what makes that scope
   possible without exhausting the instructor.
4. **Brainstorming partner and design-doc writer.** The AI drives
   Socratic brainstorming, synthesizes brainstorm answers into
   outlines and design docs, drafts plans for the instructor to
   refine, and produces the scaffolding (CourseSpec, module
   skeleton, learning-arc map, pedagogy-philosophy doc, see §10)
   that keeps subsequent authoring coherent. This is the same
   pattern Sophie's own development uses (the `superpowers:*`
   skill family); Sophie's authoring kit adapts it for chapters.

The instructor remains the **supervisor, decider, and final
authority** at every handoff. The AI proposes; the instructor
decides; the AI implements; the instructor reviews. HITL is
**structural, not advisory** — chapters do not ship without
instructor review. The same HITL mandate that governs Sophie's
own development applies to Sophie's authoring product.

This is a directive, not a description of a feature. It cascades
through every other Sophie design choice:

- **Schema** must be deeply machine-readable (Zod source of truth
  per [ADR 0003](../decisions/0003-zod-as-source-of-truth.md);
  introspectable shapes; deterministic JSON Schema).
- **Audit** must be a fast, structured, AI-loop-friendly check.
  Findings are programmatic, not just human-readable. Tier 3
  AI-driven quality checks become first-class earlier than the
  Phase 3 placement implied.
- **Templates** must be AI-fillable. The minimal-example template
  (per the textbook brainstorm) is not just for human authors — it's
  the *pattern-match anchor* for AI drafting.
- **Documentation** is dual-purpose: reference docs for humans, and
  ingestible context for AI. Reference docs that are accurate and
  consistent feed AI quality directly.
- **Sophie skills** (the AI authoring kit per
  [audit-and-AI-authoring.md](../explanation/audit-and-ai-authoring.md))
  are not a Phase 3 polish — they are *the platform's user
  interface for authors*. Building Sophie without first-class AI
  workflow scaffolding is building Quarto-but-different, not
  Sophie.
- **Workflow primitives** that already work for code (brainstorm →
  plan → execute → review, per the `superpowers:*` skill family
  used in this project) get adapted into Sophie's authoring
  workflow at a first-class level.
- **Structured pedagogy components** (Aside, KeyEquation, Figure,
  Callout, Predict, LearningObjectives, …) are the AI-author
  surface; the build-time pedagogy index pattern
  ([ADR 0038](../decisions/0038-pedagogy-index-pattern.md)) turns
  AI-authored structure into navigation surfaces (glossaries,
  cross-refs, audit invariants) for free.

### What this directive does NOT mean

- **Not autonomous AI authoring.** The instructor is the
  supervisor; chapters do not ship without instructor review. The
  HITL mandate that governs Sophie's own development applies to
  Sophie's authoring product as well.
- **Not AI-only.** Manual authoring is fully supported and
  first-class. The AI is the *expected* author, not the *required*
  one. Anna can write a chapter by hand and Sophie should not
  punish her for it.
- **Not "Anna only."** Open-source from day one is real, not
  aspirational. API discipline starts now.
- **Not "the AI is always right."** The AI's pedagogy and domain
  expertise are real but bounded. Citations are required for
  research claims; the instructor's judgment overrides the AI on
  any disagreement; "the AI suggested it" is never a justification
  on its own.

### How this maps to existing roadmap phases

The roadmap (per [roadmap §1](../status/roadmap.md)) names AI
authoring in Phase 3 ("Audit + AI authoring + CodeCell"). Under
this authoring-model answer, that placement is **roughly correct
but understated** — Phase 3 is the public landing of the AI authoring
kit, but **every phase from Phase 2 onward must hold the line on
"AI-as-author-friendly"**. Schema designs, audit shapes, template
shapes, documentation conventions — none of these can be
AI-hostile, even if Phase 3 is when the AI surface itself ships.

## 2. Workflow ecosystem (not a monolithic AI)

Sophie does **not** ship a single "AI writes the textbook" entry
point. Sophie ships a **skill ecosystem** — multiple specialized,
composable workflows that mirror the actual authoring process: a
human author and an AI partner moving together from rough idea to
polished chapter through clearly-named handoff steps.

This is the **superpowers pattern applied to textbook authoring.**
The same workflow primitives that work for code in Claude Code
(`superpowers:brainstorming`, `superpowers:writing-plans`,
`superpowers:test-driven-development`,
`superpowers:verification-before-completion`,
`superpowers:requesting-code-review`, etc.) get adapted into Sophie's
authoring kit for *chapters*. Each Sophie skill has one job, done
well; skills compose into authoring sessions; the instructor is in
the loop at every handoff.

### Why an ecosystem instead of a single skill

A monolithic "draft this textbook on X" prompt is the wrong shape
for three reasons:

1. **Pedagogy is multi-step.** A good chapter requires brainstorming
   (what's the misconception we're targeting?), planning (what's the
   sequence?), pedagogy design (which components fit?), drafting
   (the prose), reviewing (does it cohere?), and polishing (does it
   pass audit?). One prompt cannot do all of these well.
2. **Supervision needs handoffs.** The instructor reviews at each
   step's natural boundary, not after a black-box draft. Skills
   give review the boundaries it needs.
3. **AI is a pedagogy expert, design partner, planner, and writer
   all at once.** Different roles want different prompt shapes,
   different context, different output formats. A skill per role
   keeps each one focused and audit-able.

### What this implies for the design

- **Sophie ships its own skill family**, analogous to
  `superpowers:*`. Each skill is a `SKILL.md` file with system
  prompt + tools + checklists.
- **CLI subcommands and slash commands** are the *invocation
  surface* for skills, not stand-alone features. `sophie chapter
  brainstorm` and `/sophie-chapter-brainstorm` may both invoke the
  same underlying skill.
- **Schema and audit are skill-grade quality**: skills consume the
  schema for context; the audit feeds back into the polishing skill;
  Tier 3 AI checks are themselves a skill.
- **Documentation is dual-purpose**: human-readable AND
  AI-ingestible. Reference docs become skill context.
- **The skill ecosystem is itself a versioned product** with its own
  release cadence, changelog, and contributing guidelines. External
  instructors (the second human audience) get the same skills Anna
  uses.

### The exact set of v1 skills

To be pinned down in question 3 of this brainstorm. Candidates
include:

- `chapter-brainstormer` — refines a rough chapter idea (topic +
  learning objectives) into a chapter spec via Socratic dialogue
- `chapter-planner` — turns a spec into a section-by-section outline
  with component recommendations
- `chapter-pedagogy-expert` — recommends which Sophie components fit
  a given pedagogical goal (Predict for misconception elicitation,
  Reflection for synthesis, etc.)
- `chapter-drafter` — writes the prose for a planned outline
- `chapter-reviewer` — reviews a chapter against pedagogy, voice,
  and audit; produces structured feedback
- `chapter-polisher` — applies audit-driven fixes
- `chapter-migrator` — Quarto / MyST / Markdown / Jupyter → Sophie
- `module-brainstormer` — same shape, at module scope
- `mission-generator` — drafts pedagogy missions (Phase 6
  innovation per [roadmap §3 Phase 6](../status/roadmap.md))
- `transcript-curator` — manages lecture-video transcripts (Phase 6)

The actual set, scoping, and priority order is the next brainstorm
question.

## 3. Success criteria for v1 (end of fall 2026)

Sophie v1 is "successful" if **all four of the following are true,
with the fifth as bonus**:

1. **Time/productivity (A).** Anna authors textbook chapters in
   roughly the time 1/3 of them would have taken in Quarto. Drafting
   throughput is high; iteration loops are tight; templates fill
   fast. *Implies:* AI workflow scaffolding earns its keep on
   wall-clock time, not just "AI did something."

2. **AI/human ratio (B).** The AI handles ~80% of the drafting work;
   the instructor handles supervision, refinement, and approval.
   *Implies:* the skill ecosystem is the user interface; supervision
   UX (review tooling, structured feedback, audit fast-loops) is
   first-class.

3. **Pedagogy effectiveness (C).** Students engage with the
   interactive components — predictions, reflections, comprehension
   gates — in ways Quarto's callouts never produced. The persistence
   layer (per
   [ADR 0007](../decisions/0007-persistence-indexeddb.md)) holds up
   across cohorts. *Implies:* component depth, persistence
   reliability, cross-tab sync, and analyzability of student
   responses are all required, not nice-to-have.

4. **Quality bar (D).** Every chapter passes `sophie audit` cleanly
   before it ships; no chapter requires re-drafting after deploy;
   students don't surface obvious bugs the audit could have caught.
   *Implies:* audit coverage is wide and tight; AI loop iteration is
   fast enough that audit-fail-then-fix is cheap; Tier 3 AI quality
   checks land before fall.

5. **Open-source momentum (E, bonus).** By spring 2027, at least
   one external instructor is actively using Sophie or in serious
   adoption discussion. *Implies:* API discipline, documentation
   polish, `sophie create textbook` quality, migration playbooks,
   and CLA/community shape are real but not blocking for fall 2026.

### What success does NOT mean

- **Not "AI for the sake of AI."** If a workflow doesn't make Anna
  faster or the chapter better, it's wrong, even if it's clever.
- **Not "polish over substance."** A chapter that passes audit but
  isn't pedagogically sound is a failed chapter. The audit catches
  *deterministic* issues; pedagogy quality is on the instructor +
  the pedagogy-expert skill, not the audit.
- **Not "every chapter must use every component."** Components earn
  their keep per chapter; no quota.

## 4. The v1 skill kit (all five groups required)

All five skill groups proposed at the brainstorm question are
**required for v1**, not deferrable:

- **A. Core chapter authoring loop** — `chapter-brainstormer`,
  `chapter-planner`, `chapter-drafter`, `chapter-reviewer`,
  `chapter-polisher`. The "happy path" for new content.
- **B. Pedagogy expertise** — `chapter-pedagogy-expert`,
  `objective-writer`, plus a family of **evidence-based pedagogy
  practice skills** (see §5).
- **C. Migration tooling** — `chapter-migrator`, `module-migrator`.
  Required because ASTR 201 is migration-from-Quarto, not
  greenfield.
- **D. Module-level workflows** — `module-brainstormer`,
  `module-planner`. Modules are first-class per the textbook
  brainstorm; the AI works at module scope, not just chapter scope.
- **E. Auxiliary content** — `figure-generator`, `glossary-curator`,
  `citation-helper`, `transcript-curator`. Each is a force-multiplier
  for the kinds of content Anna otherwise does by hand.

Final naming TBD; the names above follow the `superpowers:*`
convention as placeholders.

## 5. Evidence-based pedagogy as a first-class skill family

Pedagogy expertise (group B) is **not** "AI knows good prose." It's
a family of skills that encode the actual *science of learning* and
surface it as choices the instructor makes during authoring. The
intended effect: Anna isn't just writing a chapter; she's
*designing for measurable learning outcomes*, with the AI as a
coach that knows the research literature.

The principles to encode include (non-exhaustive):

- **Retrieval practice** — active recall over re-reading; structured
  via `<Predict>`, `<ComprehensionGate>`, low-stakes quiz prompts.
- **Spaced practice** — distributing recall across time; a future
  cross-chapter "review prompt" component pattern.
- **Interleaving** — mixing related topics in practice rather than
  blocking; surfaced as a chapter-planner suggestion when adjacent
  chapters share concept overlap.
- **Elaboration** — explaining how/why; encoded in
  `<Reflection>`-style prompts and "explain your reasoning" hooks.
- **Dual coding** — pairing words with visuals; surfaced as a
  pedagogy-expert recommendation when prose is dense and no figure
  references exist.
- **Concrete examples** — multiple examples spanning contexts;
  surfaced as "before this concept lands, you've shown only one
  example — consider adding a contrasting one."
- **Metacognition** — calibration of confidence vs. accuracy via
  `<ConfidenceCheck>`; reflection prompts that ask students to
  predict their own performance.
- **Productive failure / desirable difficulty** — exercises that
  feel hard but produce durable learning; surfaced as
  pedagogy-expert input on `<Predict>` framing.
- **Worked examples + faded prompts** — gradual release of cognitive
  scaffolding; a future `<WorkedExample>` component pattern.
- **Cognitive load management** — split attention, redundancy, and
  expertise-reversal effects; the audit can flag dense passages
  without scaffolding.

These belong as **named skills** (e.g.,
`pedagogy-interleaving-coach`, `pedagogy-spacing-reviewer`,
`pedagogy-retrieval-design`) so each one is a focused expert the
chapter-pedagogy-expert can dispatch to. This mirrors how the
`superpowers:*` family decomposes large concerns into single-purpose
specialists.

## 6. Sophie vs. ClassBuild — positioning

[ClassBuild](https://github.com/jtangen/classbuild) is the closest
existing tool in spirit and a useful contrast.

| Dimension | ClassBuild | Sophie |
| --- | --- | --- |
| **Core flow** | One-shot pipeline (topic → complete course) | Iterative collaboration through composable skills |
| **Instructor role** | Sets preferences upfront; reviews outputs before export | Load-bearing input at every skill handoff; decides every design choice |
| **AI role** | Generates everything (chapters, slides, audiobook, infographic, teaching pack) | Implements + coaches; never autonomous |
| **Pedagogy science** | Five principles applied automatically | Pedagogy principles surfaced as instructor *choices*; instructor + AI co-design what fits |
| **Output** | Multi-modal kit per chapter (HTML, slides, audiobook, etc.) | Canonical textbook (chapters + modules); other artifacts grow as their own skill families later |
| **Customization** | Constrained by the five-principle template | Unconstrained: instructor expertise + creativity drive design |
| **Migration** | Greenfield only | First-class migration tooling for existing Quarto/MyST/Jupyter content |
| **Schema** | Implicit / per-template | Explicit Zod-as-source-of-truth; AI introspects schema |
| **Component depth** | Interactive widgets | Persistence-bearing pedagogy components with cross-tab sync, audit, dual-profile (Phase 5) |

Sophie inherits ClassBuild's **insight that pedagogy science belongs
in the tooling**. Sophie *rejects* ClassBuild's **prescription — that
the AI should apply the principles automatically.** The instructor's
expertise, creativity, and design choices are the lead author;
the AI scaffolds and accelerates the work the instructor was
already going to do.

## 7. Domain scope: STEM college + graduate-level courses

Sophie is **explicitly scoped to STEM college and graduate-level
courses.** Not K-12. Not humanities. Not generic e-learning. Not
corporate training. This narrows every downstream choice:

- **Math is first-class.** KaTeX rendering matters. Equation
  cross-references matter. Worked-example components matter.
- **Code is first-class.** `<CodeCell>` (Pyodide) and CodeMirror 6
  matter (per [ADR 0018](../decisions/0018-codemirror-6-for-codecell.md)).
- **Quantitative reasoning is first-class.** Units, dimensions,
  significant figures, error analysis, dimensional analysis as
  pedagogy patterns.
- **Citations follow academic norms.** CSL JSON; ApJ for astronomy;
  field-appropriate styles (per
  [ADR 0002](../decisions/0002-renderer-astro-mdx.md)).
- **Reproducibility matters.** Executable code; deterministic
  figures from scripts; data files with provenance.
- **STEM pedagogy literature applies.** Misconception research,
  expert-novice differences, threshold concepts, productive failure,
  POE, Just-in-Time Teaching, peer instruction, mastery learning.

What this scope **does not preclude**: external instructors in
adjacent STEM domains (chemistry, biology, engineering) adopting
Sophie. The platform doesn't gatekeep — but the pedagogy expertise
encoded in skills (e.g., concrete examples drawn from physics,
worked-example patterns from CS) reflects STEM-domain conventions,
and the design is not optimized for non-STEM use cases.

What this scope **does preclude as v1 design considerations**:

- K-12 alignment (state standards, age-appropriate language)
- Humanities pedagogy (literary analysis, source criticism, etc.)
- Generic LMS replacement (corporate training, MOOCs at-scale)
- Compliance frameworks beyond academic standards (HIPAA, FERPA
  beyond what's already implied for student data)

## 8. The course-design starting state (and the course-level skill group)

The **starting state for Sophie's authoring workflow is the
course-level design**, not the chapter level. An author sits down
to design the *whole course* — its scope, its arc, its pedagogy
approach, its module breakdown, its materials inventory — *before*
any individual chapter exists. Course design is the entry door;
modules and chapters are downstream.

This contradicts the answer to question 4 above (which framed
chapter-level starting states as the entry points). Question 4's
states A–F are still real — they're entry points *to chapter-level
work* once the course is designed. But the **front door of Sophie
is course-level**.

### New skill group: F. Course-level workflows

Adding to the v1 skill kit (which now has six groups, not five):

- `course-brainstormer` — Socratic dialogue with the instructor to
  pin scope (what's IN, what's OUT), audience level, prerequisites,
  semester duration, breadth vs. depth trade-offs, course
  philosophy.
- `course-planner` — given a scope, proposes module breakdown
  (count, titles, sequence) and tentative learning objectives at
  module scope.
- `course-pedagogy-designer` — given the course shape, recommends
  pedagogy framework (POE, inquiry-based, worked-example-heavy,
  mastery-based, etc.), surfaces evidence-based principles
  appropriate to this course, drafts the assessment philosophy.
- `learning-arc-designer` — sequences modules to build dependencies;
  flags prerequisite gaps; proposes interleaving and spacing
  patterns at the course scale.
- `course-spec-writer` — synthesizes the brainstormed answers into
  a `CourseSpec` artifact (canonical course metadata + module
  skeleton + pedagogy philosophy + assessment plan + forward-looking
  artifact inventory).

### AI as active probe (not passive responder)

Sophie's AI does **not** wait for the instructor to drive the
conversation. The AI structurally probes:

- Asks Socratic questions to elicit instructor expertise.
- Surfaces design choices the instructor might not have considered.
- Highlights pedagogy literature relevant to the instructor's
  goals.
- Pushes back on choices that contradict known STEM-pedagogy
  research (with citations, not assertions).
- Maintains the dialogue until the instructor is satisfied with the
  design — not just the prompt.

This matches the pattern of `superpowers:brainstorming` — one-question-
at-a-time Socratic refinement. Sophie's skills inherit and extend
that pattern. **Probing is a skill responsibility**, not a passive
prompt template.

### What the course-design phase produces

(To be pinned by the next brainstorm question. Candidates: a
`CourseSchema` metadata file, a module skeleton, a pedagogy
philosophy doc, a learning arc map, an assessment plan, a
forward-looking artifact list.)

## 9. Sophie as an installable package — the developer experience

Sophie is **a package an instructor installs to develop independent
course material in their editor of choice.** This is not new — it
matches [ADR 0001](../decisions/0001-platform-not-monorepo.md) and
the npm-distribution shape baked in from Phase 0 — but stating it
explicitly anchors what the developer experience looks like.

### The install-and-use flow

```bash
# Fresh machine, instructor installing Sophie for the first time:
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
the `sophie` CLI handles build/preview/audit operations; the AI
editor extension provides the AI authoring workflows.

This matches the developer-experience pattern of:

- **Astro / Next.js / Vite projects** — install via npm, use via the
  bundled CLI, AI integration via a separate extension.
- **MyST / Quarto** — install via Python/conda, use via CLI, prose
  authoring in any editor.

Sophie adds a layer those tools don't: **the Sophie skill ecosystem
that travels with the package.**

### Editor and AI-runtime neutrality

Sophie does not assume Claude Code. The supported editor matrix for
v1:

- **Primary:** Claude Code (Anna's daily driver; first-class plugin
  with slash commands and skill discovery).
- **Secondary:** Codex (OpenAI's editor) — same MCP-based
  capabilities, different invocation surface.
- **Plausible:** Cursor, Continue, Zed AI, any future MCP-compatible
  editor — Sophie tools available via MCP, no special integration
  needed beyond MCP client support.

The shared substrate that makes this work is the **Model Context
Protocol** (Anthropic's MCP, now multi-vendor as of late 2025).
Sophie ships an MCP server that exposes its skills as tools any
MCP-compatible editor can invoke. The Claude Code plugin is a
*layer on top* of the MCP server, not a replacement — it adds slash
commands and tighter skill UX for Claude Code specifically.

### Distribution architecture

Sophie's distribution surface, layered:

| Layer | Package | Distributed via | Consumer interaction |
| --- | --- | --- | --- |
| Platform code | `@sophie/core`, `@sophie/components`, `@sophie/astro`, `@sophie/theme` | npm | `pnpm install` |
| CLI binary | `@sophie/core` (already has `bin: { sophie }`) | npm | `sophie <command>` |
| Skill ecosystem (canonical source) | `sophie/skills/*` directory in the platform repo | Build pipeline emits per-marketplace bundles | Editor's plugin install command |
| Capabilities (tools) | `@sophie/mcp` (MCP server) | npm + MCP client config | Editor's MCP-discovery; tools surface in chat |
| Editor plugin distributions | published to N AI-editor plugin marketplaces | Per-marketplace publish | One install command per editor |
| Templates | `create-sophie` (npm-create script) | npm-create | `pnpm create sophie textbook ...` |

### How AI-editor plugin marketplaces actually work in 2026

The seven currently-active AI-editor plugin marketplaces:

| Editor | Marketplace | Install command (example) |
| --- | --- | --- |
| Claude Code | claude-plugins-official + community | `/plugin install sophie@claude-plugins-official` |
| Codex CLI / App | OpenAI plugins (`github.com/openai/plugins`) | search + install from marketplace |
| Cursor | Cursor agent plugin registry | `/add-plugin sophie` |
| Factory Droid | Factory marketplace | `droid plugin install sophie@<marketplace>` |
| Gemini CLI | extensions install | `gemini extensions install <repo>` |
| OpenCode | Custom install procedure | (per-project markdown instructions) |
| GitHub Copilot CLI | Copilot plugin marketplace | `copilot plugin install sophie@<marketplace>` |

The reference `obra/superpowers` ships to all seven from one
canonical `/skills` directory; per-marketplace publishing handles
the format details. **Sophie can adopt the same model.** This means:

- One canonical skill source in the Sophie platform repo.
- A build / publish pipeline that bundles for each target
  marketplace.
- Consumer install is a single per-editor command; once installed,
  Sophie's skills are discovered automatically by the editor's
  plugin system.
- Skills carry mandatory-trigger conventions (the
  `<skill-checking-reminder>` hook style — "if a skill applies to
  this task, you MUST use it") so they fire at the right moments
  across all editors.

This corrects the prior framing in §6 above — Sophie does **not**
need to write per-editor `AGENTS.md` shims; the editor plugin
marketplaces themselves are the cross-editor distribution mechanism.

## 10. The course-design phase produces seven persistent artifacts

When the course-design phase ends and module-level work begins,
Sophie's AI + the instructor have produced and saved to the textbook
repo:

- **A. `CourseSchema` metadata file** — `src/content/course.mdx`.
  Zod-validated frontmatter (title, audience level, prerequisites,
  scope-IN, scope-OUT, modulesSequence) + MDX body for course-overview
  prose. **Single source of truth** consumed by every downstream skill.
- **B. Module skeleton** — stub `modules/<slug>.mdx` files for every
  planned module (title + tentative learning objectives + week
  range; MDX body empty or "TBD"). Gives module-level skills
  somewhere to start.
- **C. Pedagogy philosophy doc** — `docs/pedagogy.md` declaring
  framework (POE / inquiry / worked-example-heavy / mastery),
  evidence-based principles emphasized, instructor's authoring
  voice. Read by every skill as authoring constraint.
- **D. Learning arc map** — concept dependency graph (module M
  teaches concepts {C1,C2}, depends on {C0}); interleaving + spacing
  pattern. Authored as data (`arc.json` / `arc.mdx`) AND **rendered
  interactively via React Flow** (per
  [ADR 0016](../decisions/0016-react-flow-for-concept-maps.md)) so
  the instructor can edit the graph visually. ADR 0016's "v2+"
  placement gets promoted to "v1" because the learning arc is too
  central to defer.
- **E. Assessment plan** — `assessment.mdx` declaring
  formative/summative mix, mastery thresholds, grading philosophy.
  Course-shell consumes for per-semester assignment generation.
- **F. Forward-looking artifact inventory** — sketch list (~14
  chapters, ~12 slide decks, ~18 demos, ~8 projects, ~1 final exam).
  Not built; just enumerated. Sets Phase 4+ deliverable targets;
  prevents goalpost-drift.
- **G. Course design rationale** — `docs/design-rationale.md`. Long-
  form prose: WHY this scope, WHY this pedagogy, WHY these modules,
  what was considered and rejected. Future-instructor onboarding +
  instructor's own future reference + teaching-portfolio artifact.

### Schema implications

Adding three new top-level Zod schemas to `@sophie/core/schema`:
`CourseSchema` (artifact A), `PedagogyPhilosophySchema` (C),
`AssessmentPlanSchema` (E). Plus an `ArcSchema` (D) for the learning-
arc graph data, with React Flow as the rendering surface. The
`ModuleSchema` (already brainstormed) gets a parent ref to course
slug.

### Audit invariants for course-design artifacts

The audit walks course-design artifacts and enforces:

- Course modulesSequence references real module entries.
- Every module's chapters cover at least one of the module's
  declared learning objectives.
- Learning arc concept dependencies form a DAG (no cycles); every
  prerequisite concept is taught before it's required.
- Assessment plan items cover at least one learning objective.
- Forward-looking artifact inventory is internally consistent
  (counted artifacts match collection sizes after build).

These run at Tier 1 (deterministic, fast) and feed back into the
chapter-polisher skill when a downstream chapter introduces a
concept-dependency violation.

## 11. Textbook lifecycle: one-way for v1, closed-loop eventually

Sophie v1 ships as **one-way authoring**: instructor + AI design and
write the textbook; students consume it; persistence is local-only
(IndexedDB per
[ADR 0007](../decisions/0007-persistence-indexeddb.md)) and never
leaves the student's browser. Pedagogy revisions are
instructor-driven from classroom observation — not from server-side
analytics.

This matches the **GitHub Pages hosting decision** for v1 (static-
only deployment; no server-side state possible without external
services). It also keeps the privacy story simple — no FERPA
considerations beyond what local storage already implies.

### Future state (v3+): closed-loop AI authoring

The eventual target is **closed-loop pedagogy**: Sophie collects
anonymized engagement data (component usage, prediction-vs-actual,
time-on-task, confidence calibration); the AI analyzes that data
and surfaces revision suggestions to the instructor before next
semester ("65% of students predicted X here; consider adding a
misconception callout"); the instructor approves changes; the
chapter ships in its updated form.

This is the v3-ish target named in
[roadmap §1 v3 scope](../status/roadmap.md) (Concept Latency
visualization; cohort-level analysis). Sophie v1's persistence
architecture must **preserve this as a possibility** without
prematurely shipping it. Concretely:

- The `ResponseStore` interface (per ADR 0007) is the seam where
  cross-device and cross-cohort sync eventually layers in. v1 ships
  `IndexedDBResponseStore`; future ships `SyncedResponseStore`.
- Response payloads carry forward-compatible metadata (timestamps,
  schema versions, optional consent flags).
- The schema captures *enough* about each response that future
  analysis is meaningful (not just "answered" / "not answered").

### Architectural and ethical implications

- **Privacy posture for v1:** local-only; no instructor visibility
  into individual student data; opt-in is moot because there's
  nothing to opt out of.
- **For v3+:** opt-in, anonymized, FERPA-shaped. Closed-loop AI
  revisions are *suggestions*, not auto-applied. Instructor judgment
  remains load-bearing.
- **Hosting in v1:** GitHub Pages — works for static; matches the
  one-way model perfectly. Cloudflare Pages + Access (per the
  roadmap) becomes relevant only for the dual-profile instructor
  build (Phase 5) and the eventual closed-loop layer.
- **Instructor visibility in v1:** classroom observation is the
  signal. Anna sees engagement in lecture; the textbook design
  succeeds when students engage with components in ways Quarto
  callouts didn't produce — *observable*, not *measured*.

## 12. Sophie positioning vs. existing tools

Sophie is positioned as **A + D** — both:

- **A. Sophie REPLACES Quarto / MyST / Pressbooks for STEM
  pedagogy textbooks.** It does what they do, plus AI authoring,
  interactive pedagogy, and persistence-bearing components.
  Migration is one-way (Quarto → Sophie); migration tooling is
  first-class.
- **D. Sophie defines a NEW CATEGORY** (longer-term framing) —
  AI-supervised STEM textbook authoring is fundamentally different
  from static-textbook tooling. The category language matures as
  Sophie's track record grows.

For v1 (fall 2026), **lead with A** — the practical replacement
story Anna lives daily and external instructors can evaluate
against their current Quarto/MyST setup. **Lead with D in Phase 7+**
when there's a track record and the category narrative writes
itself. Marketing language, migration playbooks, and the README
all use A's framing for v1.

## 13. v1 deliverable scope vs. long-term vision

> **Important reframing (2026-05-11):** Sections 1–11 above describe
> the **long-term Sophie vision** — AI as primary author, instructor
> as supervisor, multi-skill ecosystem, evidence-based pedagogy
> coaching, course-design phase, etc. That is the *aspirational
> shape* the platform builds toward over multiple phases.
>
> **v1 (fall 2026) is the platform itself**: the front-end, the
> capabilities, the features that make Sophie a working textbook
> system. AI workflow scaffolding rides *on top of* a working
> platform; it does not precede it. The roadmap already encodes
> this phasing — Phase 2 is platform + deploy; Phase 3 is when
> AI authoring lands; Phase 4 is content; Phase 5+ adds dual-profile,
> innovations, open-source.
>
> **Sections 14+ of this document drill into v1 platform scope** —
> what ships by fall 2026 and what's deferred. The sections before
> this one stay as recorded long-term intent; they don't
> re-litigate.

### What this means for the rest of the brainstorm

Rather than continuing to pin AI workflow details, the remaining
brainstorm questions focus on:

- **Front end** — what students and instructors see and interact
  with: layout, navigation, theme, search, accessibility, mobile.
- **Capabilities** — what the platform can do at runtime: schema
  validation, persistence, cross-tab sync, audit, build, deploy.
- **Features** — specific deliverables for v1: which components,
  which content kinds, which integrations, which exports.

Once that's pinned, Phase 3+ work (AI workflow scaffolding) builds
on a defined platform rather than a moving target.

## 14. Front-end pattern: book-theme with collapsible in-page ToC

The v1 site shell follows the **book-theme pattern**:

- **Top bar** — logo + course title + search + theme toggle.
- **Always-visible left sidebar** — module/chapter tree with
  collapsible/expandable sections; click any chapter to navigate.
- **Center column** — chapter content; comfortable reading width.
- **Right margin** — collapsible in-page ToC (open by default on
  desktop; collapsed on smaller viewports). Toggleable by the
  reader.

This matches the pattern established by Astro Starlight, MyST
book-theme, GitBook, and Quarto book — familiar to Anna's
audience (academic STEM readers).

The aesthetic inherits from Anna's existing course design tokens
(`assets/theme/_design_tokens.scss` and `_tokens_generated.scss`
across `astr101-sp26/`, `astr201-sp26/`, `comp536-sp26/`) ported
to `@sophie/theme` per
[ADR 0005](../decisions/0005-theming-three-layers.md).

## 15. v1 design principle: no inequitable normative affordances

Anna's authoring principle, refined to its precise form:

> Sophie does not ship affordances that make **normative claims
> about how students should engage** — how long it "should" take
> to read, how "well" they're doing relative to peers, when they're
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

This distinction matters and shapes every reader-facing affordance:

| Type | Example | v1 posture |
| --- | --- | --- |
| **Normative ("how you should engage")** | Estimated read time, "X% complete" labels relative to expected pace, "you're behind peers" prompts, leaderboards, streak counters, points/badges, mandatory linear navigation | **REJECTED** |
| **Descriptive ("where you are right now")** | Reading-position indicator (scroll progress through current chapter), `<InteractiveCheckbox>` for self-attested LO completion, "viewed" markers based on the student's own browsing | **OK** |
| **Scholarly aids** | Glossary popovers, footnote popovers, cross-reference previews, math equation refs, citation popovers | **OK** |

The principle in one sentence: *Sophie augments student capacity
as adult learners; it does not surveil or nudge them through
content.*

## 16. v1 front-end feature inventory

Confirmed v1 front-end features (per Q10 and follow-up):

- **A. Pagefind search UI** — Cmd-K + visible search bar in top
  nav. Full-text across modules + chapters; instant results;
  keyboard navigation.
- **B. Theme toggle** — light/dark with system-aware default;
  preference persistence per ADR 0032 (localStorage; no
  IndexedDB).
- **C. Glossary popovers** — hover/tap glossary term inline →
  definition tooltip. Scholarly aid.
- **D. Cross-reference previews** — hover chapter/figure/equation
  link → preview popover.
- **E. Reading-position indicator** — scroll-position bar (descriptive,
  not normative). NOT a "% complete" or "X minutes left" claim.
- **G. Persistent prev/next navigation** — always-visible at chapter
  bottom; respects module boundaries.
- **H. Mobile-responsive collapse** — sidebar becomes hamburger; in-
  page ToC moves to top of chapter.
- **I. Print stylesheet** — `@media print` hides interactive controls,
  collapses persistence-bearing components to submitted state,
  preserves equations and figures. Per existing component contract.
- **J. Code copy button + line numbers** — Shiki via rehype-pretty-code
  per [ADR 0020](../decisions/0020-shiki-syntax-highlighting.md).
  Especially required for COMP 521 / Python content.
- **K. Math equation numbering + cross-refs** — KaTeX with `\tag{}` and
  clickable equation references. Academic STEM citation standard.
- **L. Footnote popovers** — hover footnote marker → text without
  scrolling. Scholarly aid.
- **M. Margin notes / asides** (NEW per Q11 follow-up) — Tufte-style
  short asides rendered in the right margin (or inline on small
  viewports). MyST has a long convention for this; Sophie inherits.
  `<Aside>` component renders to the margin column. Layout
  implication is in §16.1 below.

Rejected (no inequitable normative affordances):

- **F. Estimated read time** — REJECTED. "Students take it
  literally; slow readers feel inadequate." Confirms the §15
  principle. Sophie does not pretend to know how long reading
  *should* take.

### 16.1 Layout impact of margin notes

Margin notes compete with the collapsible in-page ToC (Q9 follow-up)
for the right column. Three layout resolutions:

| | Resolution | Trade-offs |
| --- | --- | --- |
| 1 | Keep ToC right; asides inline with hover-expand | ToC stays sticky; asides feel less prominent |
| 2 | ToC moves to top of chapter; right column reserved for margin asides (MyST book-theme default) | Tufte-strict reading; ToC less always-available |
| 3 | Three-column layout (sidebar nav \| content \| right column shared between ToC and asides) | Most rich; widest viewport requirement; harder mobile collapse |

To be picked in the next brainstorm round (Q12 candidate).

## 17. v1 component / capability inventory and release phasing

### Time-budget recalibration

The original cluster-week estimates assumed solo-human implementation
time. Sophie's actual implementation runs with **AI coding under
Anna's supervision** (the same model Sophie itself ships, applied
to Sophie's own development). At that throughput, ~1 week of
human-coded work compresses to ~1 day of AI-coded work
(experienced ratio over Phase 0–1).

The complete v1 inventory budgets at ~4–6 weeks of AI-coded work
total — well within fall 2026's calendar even with substantial
contingency, content-authoring time, and audit-deepening work
budgeted in.

### Locked: phased v1 release (Option B)

**v1.0 (fall 2026 — alongside ASTR 201 deployment) — ~2 weeks AI:**

- **Cluster 2:** Cross-references — `<ChapterRef>`, `<EqRef>`,
  `<FigureRef>`, `<ConceptRef>` resolving against build-time graph;
  broken refs fail audit.
- **Cluster 3:** Citations — `rehype-citation` + CSL JSON; ApJ style
  for ASTR; inline citation with hover preview.
- **Cluster 4:** Glossary system — `glossary` content collection +
  `<GlossaryTerm>` component + hover popovers.
- **Cluster 5:** Concept map + Mind map — shared React Flow runtime,
  two distinct components (concept map = networked + labeled edges;
  mind map = radial + center node). Course-design arc + chapter
  embedding both.
- **Cluster 6:** Cosmic Playground demos — `<Demo>` per ADR 0008;
  iframe + postMessage manifest.
- **Cluster 11:** Print/PDF export — print stylesheet (matches
  existing component contract) + `sophie export pdf` via Pandoc for
  handouts.
- **Cluster 12:** Margin notes — `<Aside>` Tufte-style; right
  margin layout on desktop; inline on mobile.

**v1.5 (rolling fall 2026 → spring 2027) — ~2 weeks AI:**

- **Cluster 1:** CodeCell + Pyodide — drives COMP 521 deploy;
  predict-then-run + modify-and-explain pedagogical kinds.
- **Cluster 7:** Observable Plot — inline scientific data viz
  separate from registry-based `<Figure>`.
- **Cluster 8:** WorkedExample with faded prompts — gradual release
  of cognitive scaffolding (major STEM pedagogy pattern).
- **Cluster 9:** Retrieval / interleaving / spacing components —
  `<RetrievalReview>`, `<InterleavedPractice>`, `<SpacedReview>`.
  Realizes the evidence-based pedagogy from §5.

**v2+ (post-v1):**

- **Cluster 10:** `<VideoPrompt>` (lecture video with mid-stream
  prompts) — Anna's call: "will be a while." Roadmap Phase 6
  placement remains valid.

### Concept map vs. mind map (within Cluster 5)

Same React Flow infrastructure, two distinct components with
different schemas + invariants:

| | `<ConceptMap>` | `<MindMap>` |
| --- | --- | --- |
| Structure | Network / DAG | Radial tree |
| Center | None (or root concept at top) | One central topic; branches radiate |
| Edges | **Labeled** (relationship verbs); audit requires labels | **Unlabeled** by default; label optional |
| Layout | Hierarchical or networked | Force-directed radial |
| Pedagogy | Represent conceptual understanding; assessment-grade | Brainstorming, note-taking, ideation |
| Sophie use | Course-design arc; chapter-internal concept relationships; "draw the concept map" assessment | Pre-reading "what do you already know"; AI brainstorming visualization; student personal study aid |

Splitting matters because the pedagogy differs — labeled
relationships are the whole point of concept-map assessment;
mind-map's value is the associative free-form. Same shape with
wrong contract = wrong pedagogy.

## 18. Layout: book-theme + three view modes + toggleable chrome

Sophie's chapter layout is a **MyST-book-theme-style three-column
default** (left sidebar nav + center content + right column for
ToC and margin asides) with **three user-toggleable view modes**
that progressively trade chrome for canvas:

### View modes

| Mode | Sidebar | In-page ToC | Margin asides | Content width | Use case |
| --- | --- | --- | --- | --- | --- |
| **Default** | Visible (toggleable) | Visible at top of right column (collapsible) | Right margin | ~75ch cap (comfortable reading) | Typical chapter reading |
| **Focused** | Hidden | Hidden (reachable via search / Cmd-K) | Inline collapsibles (no margin column to dock to) | ~85ch cap (slightly wider) | Deep-dive long-form reading |
| **Wide** | Hidden | Hidden (reachable via toggle / Cmd-K) | Inline collapsibles | ~100–110ch cap (chapter fills freed space; still capped for prose readability) | Figure-heavy chapters, code-heavy walkthroughs, classroom projection, student presentations |

### Toggle controls

- View mode: top-bar control (cycle through Default / Focused / Wide)
  with keyboard shortcut.
- Sidebar visibility: independent toggle (top-bar button + keyboard
  shortcut). Default mode supports per-element toggles, so the user
  can hide the sidebar but keep the ToC, etc.
- ToC visibility: independent toggle within Default mode.
- All toggles persist via `localStorage` per the §15 principle
  (preferences are not response data; no IndexedDB; cross-tab sync
  via `storage` event).

### Layout principles inherited

- **MyST book-theme style** for Default mode — sidebar + content +
  right column; asides Tufte-positioned in margin; ToC at top of
  right column; familiar to academic STEM readers.
- **Right column is shared** between ToC (top) and margin asides
  (positioned alongside relevant prose). When asides scroll past
  the ToC, the ToC sticks (or collapses) to keep the column
  navigable.
- **Mobile** (viewport < ~768px) collapses to single column always;
  view mode toggle still available but Default and Focused render
  identically; Wide is always full-width on mobile (no chrome to
  hide); ToC moves to top of chapter as a collapsible disclosure;
  asides flow inline.

### Implementation notes

- View modes are CSS-only (data attribute on the layout root +
  Tailwind variants); no JavaScript per mode change beyond the
  toggle handler.
- Each mode preserves the same content; only chrome and content
  width change. Components render identically (no
  mode-conditional component logic).
- Print stylesheet (Q10 I) is its own mode equivalent, layered on
  top of whichever view mode the user is in (effectively forcing
  Wide-like full-content + no chrome + collapsed-interactive-state).

## 19. Textbook overview page (v1 deliverable)

In addition to the per-chapter view modes, Sophie ships a
**textbook overview page** — a separate dedicated route (e.g.,
`/overview` or `/all`) that lays out every module + chapter as a
scannable poster view of the whole textbook.

### What it shows

- All modules in `order` sequence, each with title, subtitle (if
  set), and learning objectives (truncated to fit a card)
- Within each module, every chapter as a card showing title,
  description (the 280-char `description` field), and any
  per-chapter metadata that aids orientation (estimated content
  shape — figures? code? math-heavy?)
- Optional small visualization of the learning arc (a compact
  React Flow render of the course-design arc map; chapter-embed
  scope, not the editable course-design surface)

### Why it exists

This view is the answer to "what's the shape of this whole course?"
— students glance at it to orient themselves; instructors use it to
review course coverage; AI tools introspect it to understand
context for new chapters or revisions.

It is **not** a navigation surface for daily reading — that's the
sidebar tree's job. Overview is for orientation and meta-reading.

### Generation and routing

- Auto-generated from the modules + chapters collections; no
  separate authoring required (though authors can opt into
  customizing per-module card with frontmatter).
- Lives at `/overview` (or `/all` — naming TBD) — distinct from
  the textbook home (`/`) which is shorter and more
  introduction-shaped.
- Mobile: cards stack vertically, full-width.
- Print stylesheet renders this as the textbook's printed
  table-of-contents poster page.

### Distinction from textbook home (`/`)

| | Textbook home (`/`) | Overview (`/overview`) |
| --- | --- | --- |
| Purpose | Welcome; first impression | Orient to the whole course shape |
| Length | Short (~1 screen): course title, subtitle, intro prose, "start here" link | Long (full-page): every module + every chapter laid out |
| Navigation | "Get me into the textbook" | "Show me the whole textbook at once" |
| Authoring | Hand-written MDX (hero + intro) | Auto-generated; minimal authoring |

Both ship in v1.

## 20. (next section pending)

> Brainstorming continues. Each substantive answer expands this
> document.
