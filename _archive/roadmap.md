# Implementation Plan & Roadmap

How Sophia gets built, in what order, with what milestones.

This is a living document. Calendar dates are projections, not
commitments. Phase boundaries are decision points where we pause to
reassess before continuing.

This doc covers:

1. Goals and success criteria
2. Definitions: v1, v2, v3
3. Phases with concrete deliverables
4. Calendar projection
5. Critical path
6. Decision / checkpoint points
7. Risk register
8. Out-of-scope for v1
9. Open questions for the author

---

## 1. Goals and success criteria

### Primary goal

A working textbook + course-website system that serves Anna's
courses and does it *better* than the current Quarto + MyST setups
across these dimensions:

- **Textbook + course-site separation**: canonical content stable
  across semesters; semester instances are thin shells that link
  into textbooks.
- **Authoring speed**: with AI-assisted authoring, drafting a chapter
  is faster than in current Quarto.
- **Pedagogical contract**: structured components and the audit
  ensure consistency the current setup can't enforce.
- **Single source of truth**: chapters, slides, Canvas exports, and
  instructor notes all generated from one MDX source.
- **Dual-profile**: solutions and teaching notes live inline (a thing
  the existing Quarto YAMLs make possible but Anna never used).

### v1 scope (fall 2026 launch)

- **ASTR 201 textbook + course site (fa26)** — migration from Quarto.
- **COMP 521 textbook + course site (fa26)** — greenfield "Scientific
  Computing with Python."
- **COMP 536 stays on Quarto** for one more semester; migration is v2.

### Secondary goal

Produce a system that other instructors can adopt — open-source
release after the platform proves itself across three real courses.

### Success criteria

**v1 (end of Phase 4)** — Sophia is shipping two courses publicly
in fall 2026:

- ASTR 201 textbook + course-fa26 sites at
  `astrobytes-edu.github.io/astr201-textbook/` and `/astr201-fa26/`.
- COMP 521 textbook + course-fa26 sites at
  `astrobytes-edu.github.io/comp521-textbook/` and `/comp521-fa26/`.
- All ASTR 201 chapters migrated from Quarto.
- COMP 521 textbook authored greenfield (cap at ~8 chapters for v1).
- ~18 Cosmic Playground demos integrated into ASTR 201.
- Pyodide CodeCell working in COMP 521 chapters (Python execution
  in-browser).
- Lecture videos embedded with basic prompts.
- Glossary, concept maps, dashboards working.
- Dark/light mode, Pagefind search.
- WCAG 2.1 AA verified by axe-core in CI.
- `sophia audit` passes on every chapter.
- Anna can author a new chapter in less time than the same chapter
  would take in Quarto.

**v2 (during/after fall 2026)** — Dual-profile + COMP 536 + Tier 3:

- COMP 536 migrated from Quarto.
- Dual-profile builds activated.
- Instructor sites behind Cloudflare Access.
- JAX strategy documented and applied (for COMP 536's JAX content).
- Tier 3 audit prompt files generated.
- Additional Sophia skills (figure-annotator, quality-reviewer,
  misconception-researcher).

**v3 (spring 2027)** — Innovations + course expansion:

- Confidence-calibrated predictions deployed.
- Predict-the-plot deployed.
- Time-machine videos deployed.
- COMP 521 expanded to full 12–15 chapters.
- One innovation in real-cohort use to validate the design (probably
  calibration, since it's lowest-risk).

**Open-source (end of Phase 7)** — Public, adoptable:

- Public docs site (self-hosted on Sophia).
- `create-sophia-textbook` CLI scaffolder.
- Plugin extension API documented.
- License chosen.
- ≥1 external instructor pilot.

---

## 2. Definitions: v1 / v2 / v3

To prevent scope creep, each version has explicit inclusion criteria.

### v1 (ship by fall 2026)

**Platform repo (`astrobytes-edu/sophia`) ships:**

- `@sophia/schema` — Zod-as-source-of-truth content schemas.
- `@sophia/components` — all 15 v1 pedagogy components from
  `component-contract.md` (OMI, PMI, Prediction, UnitCheck,
  Assumption, ModelLimit, FigureReading, Example, CheckYourself,
  MoreYouKnow, SolutionKey, InstructorNote, Figure, Demo, Video) plus
  `<CodeCell>`. Framework-pure React + Zod + CSS Modules. Includes
  `useInteractive` runtime helper and `IndexedDBResponseStore`.
- `@sophia/theme` — TS tokens canonical → CSS vars + Tailwind preset.
  Ports the existing SCSS design system.
- `@sophia/audit` — Tier 1 + Tier 2 deterministic checks; Tier 3
  prompt-file emitter.
- `@sophia/cli` — `sophia` command: `build`, `audit`, `eval`,
  `validate`, `fmt`, `create`, `upgrade`.
- `@sophia/renderer-contract` — `SophiaRendererAdapter` interface.
- `@sophia/astro` — the single Astro-coupled package. Provides
  `ProfileContext`, content-collection wiring, MDX setup with
  `remark-math` / `rehype-katex` / `rehype-citation`, build-time
  audit hook, dual-profile build mechanism, slide-route generator.
- `@sophia/cosmic-playground` — Demo manifest schema, postMessage
  protocol, `<Demo>` component.
- `apps/docs/` — Sophia docs site self-hosted on Sophia.
- `apps/example-textbook/` — 4-chapter reference textbook for e2e
  tests.
- `templates/starter-textbook/` and `templates/starter-course/` —
  scaffolds for `sophia create`.
- Storybook + Vitest + Playwright + axe-core + visual regression in
  CI from Phase 0.
- Changesets for SemVer + release notes.
- Public API discipline via `@stable` / `@experimental` /
  `@internal` JSDoc tags.
- Plugin architecture as v1 public API (`registerComponent`,
  `registerAuditCheck`, `registerPromptTemplate`,
  `extendChapterSchema`, theme-token namespacing).
- One Sophia skill (chapter-author) + 2–3 slash commands.

**Consumer course repos (separate, e.g. `astrobytes-edu/astr201`,
`astrobytes-edu/comp521`):**

- ASTR 201 textbook fully migrated from Quarto. ~14–18 chapters.
- COMP 521 textbook authored greenfield (cap at ~8 chapters).
- Each repo holds both textbook content (canonical, semester-stable)
  and a course shell (`courses/fa26/`: syllabus, schedule, weekly
  modules linking to textbook chapters).
- ~18 Cosmic Playground demos integrated via the manifest +
  postMessage protocol.
- Lecture videos embedded (basic YouTube embeds; VideoPrompt
  deferred to v3).
- Single-profile build (student-facing only); dual-profile authoring
  patterns in source but `<SolutionKey>` / `<InstructorNote>` render
  to null at the `@sophia/astro` integration level.
- GitHub Pages hosting.

**Excludes (deferred to v2 or later):**

- COMP 536 (stays on Quarto for fall 2026; migration is v2).
- Dual-profile builds activated (authored for, but not deployed).
- Cloudflare Pages + Access.
- Tier 3 AI audits beyond emitting prompt files.
- Multi-skill AI authoring kit beyond chapter-author.
- Innovations from `pedagogical-innovations.md`.
- Course-site features beyond minimal: no homework manager, no
  gradebook integration, no announcement system.
- Full COMP 521 chapter set (cap at ~8 in v1; expand in v3).
- JAX-specific content (defer to COMP 536 migration in v2).
- Cross-device response sync (v3; the seam in `ResponseStore` is
  designed but `SyncedResponseStore` isn't shipped).

### v2 (during/after fall 2026, ship by early 2027)

**Adds to v1:**

- COMP 536 migration from Quarto.
- Dual-profile builds activated (`<SolutionKey>`, `<InstructorNote>`
  start rendering in instructor build).
- Cloudflare Pages + Access for instructor build.
- JAX strategy implemented (pre-render at build + Colab links for
  COMP 536's JAX content).
- Tier 3 audit prompt files generated.
- Additional Sophia skills (figure-annotator, quality-reviewer,
  misconception-researcher).
- Richer course-site features (homework integration, dashboards).

### v3 (spring–summer 2027)

**Adds to v2:**

- COMP 521 expanded to full chapter set (~12–15 chapters total).
- Confidence-calibrated predictions (`<Prediction enableConfidence>`).
- Predict-the-plot component.
- Time-machine VideoPrompts.
- Concept Latency visualization (if data quality is sufficient).
- Mission Generator skill.
- Transcript Curator skill.

### Open-source release (spring 2027 or later)

**Adds:**

- `create-sophia-textbook` scaffolder.
- Public docs site self-hosted on Sophia.
- Plugin extension API for third-party components and skills.
- Pilot with ≥1 external instructor.
- License decision.

---

## 3. Phases with concrete deliverables

Each phase ends with a working, testable artifact. No phase is
"infrastructure only" — every phase delivers something the author
can actually use.

### Phase 0 — Foundation (~3-4 weeks, expanded scope)

**Goal:** Platform repo set up with the architecture commitments wired
in, dogfood docs site online, hello-world reference chapter compiles
through `@sophia/astro`.

**Deliverables:**

- `astrobytes-edu/sophia` GitHub repo with monorepo structure (pnpm
  workspaces).
- TypeScript, Astro 5, MDX, React 19 configured.
- **Package skeletons** (each with `package.json`, `tsconfig.json`,
  README, public-API discipline via JSDoc tags):
  - `@sophia/schema/`
  - `@sophia/components/` (with `runtime/` for `useInteractive`,
    `ResponseStore` interface, `ProfileContext`,
    `registerComponent`)
  - `@sophia/theme/`
  - `@sophia/audit/`
  - `@sophia/cli/`
  - `@sophia/renderer-contract/`
  - `@sophia/astro/`
  - `@sophia/cosmic-playground/`
- **App skeletons**:
  - `apps/docs/` — Sophia docs site, self-hosted on Sophia (will grow
    through Phase 1+ as the platform's own public docs).
  - `apps/example-textbook/` — 4-chapter reference textbook used by
    e2e tests and as the design playground.
- **Templates**:
  - `templates/starter-textbook/` — what `sophia create textbook`
    scaffolds.
  - `templates/starter-course/` — what `sophia create course`
    scaffolds.
- A "hello world" MDX chapter in `apps/example-textbook/` that
  compiles via `@sophia/astro` integration through
  `astro build`.
- **Test stack** wired in CI from day one:
  - Storybook for component stories.
  - Vitest for unit tests.
  - Playwright for end-to-end tests against `apps/example-textbook/`.
  - axe-core integrated into both Storybook and Playwright.
  - Visual regression via Chromatic or Playwright screenshots.
- **Changesets** configured for SemVer + automated release notes.
- GitHub Actions CI running `astro check` + `tsc --noEmit` +
  `pnpm test` + axe checks + visual regression diff.
- Initial `CONTRIBUTING.md`, `README.md`, `LICENSE` placeholder.
- Migrate `platform-design/` docs into the repo as `docs/design/`.

**Done when:**

- `pnpm --filter @sophia/docs dev` serves the Sophia docs site at
  `localhost:4321`.
- `pnpm --filter example-textbook dev` shows the hello-world chapter
  with the expected layout shell.
- `pnpm test` passes (unit + axe + visual baseline).
- A `pnpm changeset` invocation works and produces a changelog entry.

### Phase 1 — Core schema + components (~5 weeks)

**Goal:** Author one ASTR 201 chapter and one COMP 521 chapter
end-to-end using Sophia components, validating both framings. The
chapters live in *consumer course repos*, not in the platform repo.

**Deliverables:**

- `@sophia/schema`: Zod schemas (source of truth) for Chapter,
  Mission, MediaAsset, Concept, Skill, Misconception, Course,
  Profile. Inferred TS types via `z.infer`. Generated JSON Schema for
  VSCode YAML autocomplete.
- `@sophia/components`: OMI, **PMI** (new for COMP), Prediction,
  UnitCheck, Assumption, ModelLimit, FigureReading, Example,
  CheckYourself, MoreYouKnow, SolutionKey, InstructorNote (the last
  two rendering to null in v1). Each ships with Storybook stories +
  Vitest unit tests + axe-core checks.
- `@sophia/components/runtime`: `useInteractive` hook,
  `IndexedDBResponseStore`, `BroadcastChannel` cross-tab sync,
  `ProfileContext`, `registerComponent` registry.
- `@sophia/theme`: `tokens.ts` extracted from existing
  `tokens.scss` + `design-tokens.scss`. Build emits `theme.css` (CSS
  custom properties) and Tailwind preset. Light/dark via
  `data-theme`. Reduced-motion + high-contrast via `@media`
  overrides.
- Port `callouts.scss` → `<Callout>` component module. Port
  `lecture-cards.scss` → `<LectureCard>` component module. Each port
  matches existing visual; no creative redesign.
- **Consumer course repos created**:
  - `astrobytes-edu/astr201` (greenfield repo for migration).
  - `astrobytes-edu/comp521` (greenfield repo for new course).
  - Each consumes `@sophia/*` packages via pnpm; each has its own
    `astro.config.mjs` invoking the `@sophia/astro` integration.
- One ASTR 201 chapter authored in `astr201/src/content/textbook/`
  (`flux-luminosity-distance` recommended — well-bounded, mappable
  to Cosmic Playground demo).
- One COMP 521 chapter authored in `comp521/src/content/textbook/`
  (recommend the introduction or first Python fundamentals
  chapter — without `<CodeCell>` yet, just illustrative code blocks).

**Done when:** both chapters render, look at parity (or better) with
current Quarto/Markdown versions, components validate against the
schema, and the chapters are authored against `@sophia/*` packages
imported from npm-published or workspace-linked builds.

### Phase 2 — Multi-site build pipeline + deploy (~3 weeks)

**Goal:** All four sites deployable to GitHub Pages.

**Deliverables:**

- `sophia` CLI v0.1: `build`, `preview`, `validate`, `fmt`. Accepts
  `--app <name>` to target a specific textbook or course site.
- GitHub Actions workflow building and deploying *all four* apps to
  GH Pages (one workflow, four deploy targets).
- Cross-site linking utilities (course site → textbook chapter URLs
  resolved at build time).
- Pagefind search integration per site (each textbook gets its own
  search index).
- Dark/light mode toggle with persistence.
- 404 page, sitemap per site.
- Lighthouse audit passes (>90 on each axis).
- axe-core accessibility tests in CI.

**Done when:** all four URLs are live with placeholder/early content,
cross-site links resolve correctly, and CI deploys on every push to
main.

### Phase 3 — Audit + AI authoring + CodeCell (~5 weeks)

**Goal:** Tier 1 + Tier 2 audits work; one Sophia skill drives chapter
authoring; Pyodide-based `<CodeCell>` works in COMP 521 chapters.

**Deliverables:**

- `sophia audit` CLI: Tier 1 + Tier 2 checks for all v1 components.
- Prompt file format finalized (with worked examples).
- `sophia-chapter-author` skill (`SKILL.md` + system prompt + tools).
- `/sophia-audit` and `/sophia-scaffold-chapter` slash commands.
- Cowork plugin manifest (`sophia.plugin/manifest.json`) — even if
  not yet published, structured correctly.
- `<CodeCell>` component (Pyodide integration, lazy-loaded,
  `predict-then-run` pedagogical kind).
- Service worker caching for Pyodide bundle.
- One COMP 521 chapter using `<CodeCell>` end-to-end (intro to
  NumPy or similar).
- At least 2 additional chapters authored using the AI flow.

**Done when:** running `/sophia-scaffold-chapter` in Claude Code
produces a chapter draft that passes `sophia audit` after author
review; the COMP 521 chapter with `<CodeCell>` actually executes
Python in-browser.

### Phase 4 — Parallel content authoring (~10 weeks, summer 2026)

**Goal:** ASTR 201 textbook fully migrated, COMP 521 textbook
authored greenfield, both course shells populated for fall 2026 —
all inside the two consumer course repos.

This is the **biggest phase** — the bulk of v1 calendar time. Note
that "course site" in earlier drafts meant a separate Astro app;
under the locked architecture, textbook content and the semester
shell live as separate content collections under different routes
within *one* course repo.

**Deliverables:**

In `astrobytes-edu/astr201` (one repo, two content collections):

`src/content/textbook/` (migration):

- All ASTR 201 chapters migrated (~14–18 chapters).
- All ~18 Cosmic Playground demos integrated via `<Demo>` and the
  manifest + postMessage protocol.
- Lecture videos embedded (basic YouTube embeds; VideoPrompt
  deferred to v3).
- Glossary, concept maps, dashboard.

`src/content/courses/fa26/` (semester shell):

- Syllabus.
- Schedule with absolute dates.
- 14 weekly modules linking to textbook chapters.
- Assignment shells (links out to Canvas).

In `astrobytes-edu/comp521` (one repo, two content collections):

`src/content/textbook/` (greenfield, cap at ~8 chapters in v1):

- Python fundamentals (1–2 chapters).
- NumPy + arrays (1 chapter).
- Matplotlib + plotting (1 chapter).
- Pandas + data wrangling (1 chapter).
- Functions + modules + scientific software practice (1 chapter).
- One scientific computation case study (1 chapter).
- One inference / statistics chapter (1 chapter).
- Each chapter with `<CodeCell>` interactive code where appropriate.

`src/content/courses/fa26/`: same structure as ASTR 201.

Cross-cutting:

- Print-mode CSS for handouts.
- Final accessibility audit passes WCAG 2.1 AA.
- All `sophia audit` warnings resolved or explicitly accepted.

**Done when:**

- `astrobytes-edu.github.io/astr201/` is the URL Anna gives ASTR 201
  students; routes `/textbook/...` and `/courses/fa26/...` resolve.
- `astrobytes-edu.github.io/comp521/` is the URL Anna gives COMP 521
  students; same route structure.

### Phase 5 — Dual-profile v2 + COMP 536 (~8 weeks, fall 2026 → early 2027)

**Goal:** Instructor builds deployable, COMP 536 migrated, Tier 3
audit prompts in use.

**Deliverables:**

- MDX components (`<SolutionKey>`, `<InstructorNote>`,
  `<MisconceptionGuide>`) flipped from always-null to
  PROFILE-conditional.
- `sophia build:both`, `sophia preview:instructor`.
- Cloudflare Pages + Cloudflare Access set up for each instructor URL
  (4 instructor sites: 2 textbooks + 2 courses).
- Custom domain (e.g., `instructor.astrobytes.edu`).
- COMP 536 migrated from Quarto (textbook + course site for sp27).
- JAX strategy implemented (pre-render at build + Colab links for
  COMP 536's JAX content).
- Tier 3 audit prompt files generated; flow validated by running them
  through Claude Code.
- More Sophia skills: `sophia-figure-annotator`,
  `sophia-quality-reviewer`, `sophia-misconception-researcher`.

**Done when:** COMP 536 is on Sophia, dual-profile works on all
sites, Anna can read instructor notes from her phone via Cloudflare
Access, and Tier 3 audits surface useful suggestions in real chapters.

### Phase 6 — Innovations + COMP 521 expansion (~10 weeks, spring 2027)

**Goal:** v3 innovations validated; COMP 521 expanded beyond v1's
8-chapter cap.

**Deliverables:**

- COMP 521 expanded to full chapter set (additional 4–7 chapters
  beyond v1 cap, taking it to ~12–15 chapters total).
- Confidence-calibrated predictions deployed; calibration curve
  visible to students.
- `<PredictThePlot>` component (sketch + AI shape comparison).
- `<VideoPrompt>` component (time-machine pauses).
- Concept Latency tracking (instrumentation + indicator UI).
- Mission Generator skill.
- Transcript Curator skill.
- Cohort-level analysis (anonymized) for instructor view.

**Done when:** at least one v3 innovation has measurable pedagogical
effect with real students (likely calibration, since lowest-risk).

### Phase 7 — Open-source release (~3-4 weeks, spring 2027) — shrunk

**Goal:** Public release; pilots with external instructors.

Most of what previous drafts deferred to Phase 7 has *already shipped
in Phase 0–1* under the build-the-best-now mandate: public API
discipline (JSDoc stability tags, Changesets), plugin architecture
(`registerComponent`, etc.), schema versioning + `sophia upgrade`,
self-hosted docs site (`apps/docs/`), `sophia create` scaffolder,
test stack. Phase 7 becomes a release-engineering phase, not a
re-architecture.

**Deliverables:**

- License chosen and applied. **Recommended**: Apache 2.0 for the
  platform code; CC BY 4.0 for textbook content.
- `npm publish` workflow for `@sophia/*` packages (or
  `@astrobytes-edu/sophia-*` if `@sophia` is taken).
- Tutorial chapter on the docs site ("Build your first Sophia
  textbook"), exercising `sophia create textbook` end-to-end.
- Migration guides (from Quarto, from MyST).
- `CONTRIBUTING.md` for external contributors with the public API
  surface enumerated.
- Code of conduct.
- Issue templates, PR templates.
- ≥1 external instructor pilot, with feedback collected.

**Done when:** announced publicly, repo accessible to outsiders, at
least one third-party adoption attempt completed (success or honest
post-mortem).

---

## 4. Calendar projection

Working assumption: Anna has 10–15 hours/week for Sophia work
during semester, 25–35 hours/week during summer. AI assistance
(Claude Code, Codex) compresses some tasks by 2–3×; doesn't help
with judgment-heavy work.

| Phase | Weeks | Calendar window | Concurrent course load |
|---|---|---|---|
| 0 | ~3-4 weeks | mid-May – mid-June 2026 | end of spring semester (expanded scope: full test stack, docs site, all packages) |
| 1 | ~5 weeks | mid-June – late July 2026 | summer break |
| 2 | ~3 weeks | late July – mid-Aug 2026 | summer break |
| 3 | ~5 weeks | mid-Aug – late Sept 2026 | early fall; CodeCell + first AI skill |
| 4 | ~10 weeks | late Sept – early Dec 2026 | parallel ASTR 201 + COMP 521; teaching during this phase |
| 5 | ~8 weeks | Dec 2026 – Feb 2027 | end fall / start spring |
| 6 | ~10 weeks | Feb – Apr 2027 | spring semester |
| 7 | ~3-4 weeks | Apr – May 2027 | spring semester (shrunk: most ships earlier) |

This is **aggressive given the doubled v1 scope** (two textbooks +
two course sites in parallel). The calendar slips most likely at
Phase 4 (the bulk of content authoring) and Phase 5 (during fall
teaching).

**Honest range:**

- v1 (ASTR 201 + COMP 521 deployed) by **late October 2026** is the
  core ambition. This is ~3–4 weeks into the fall semester, which
  means *the first 3–4 weeks of fall classes use staging or partial
  rollout*; not ideal but realistic given the scope.
- A more conservative target: v1 partial release by start of fall
  (early September), then in-semester completion. Acceptable if the
  course sites and first ~4 chapters of each textbook are ready by
  start-of-classes; the rest can ship as students work through them.
- Open-source release (Phase 7) by **mid-2027** instead of spring
  2027, given the larger v1.
- v3 innovations (Phase 6) are the most likely to slip, since
  they're the most novel and the most experimental.

**Reality check:** if the time budget is half what's assumed
(see open question 9.6), the calendar roughly doubles, putting v1
deployment in spring 2027 instead of fall 2026. That would mean
running ASTR 201 on Quarto and COMP 521 in some interim form (raw
markdown? simple Astro? early Sophia partial?) for fall 2026.
This is the single most important risk to track.

---

## 5. Critical path

The path that must work for ASTR 201 to ship in fall 2026:

```
Phase 0 (repo) →
Phase 1 (schema + components + theme) →
Phase 2 (build + deploy) →
Phase 3 (audit + first skill) →
Phase 4 (ASTR 201 migration)
```

Each phase depends on the previous. There is no parallelism in
v1 — this is solo development.

Phases 5–7 can be parallelized somewhat:

- Phase 5 (dual-profile + COMP 536) and parts of Phase 6 (innovation
  components) can happen in parallel.
- Phase 7 (open-source prep) must wait until v2 is stable but can
  proceed alongside Phase 6 polish.

**The riskiest critical-path items:**

1. **Theme port** (Phase 1). The existing SCSS may have
   gnarly inheritance that doesn't map cleanly to Tailwind tokens.
   Mitigation: timebox to one week; if stuck, ship raw CSS and
   refactor later.
2. **Cosmic Playground integration** (Phase 4). The integration
   pattern between `<Demo>` and `astro-demos/` isn't designed yet.
   Mitigation: design this in early Phase 4 before deep migration;
   may require changes to `astro-demos`.
3. **First chapter migration** (Phase 1). The first end-to-end
   chapter takes ~3× longer than subsequent ones; budget for it.
   Mitigation: pick a well-bounded chapter; document patterns as
   they're discovered.
4. **Audit scope** (Phase 3). Tier 2 checks are easy to over-engineer.
   Mitigation: start with the 5 highest-value checks; add others as
   patterns emerge.

---

## 6. Decision / checkpoint points

After each phase, pause to reassess. Specific checkpoints:

### After Phase 2

**Question:** Is Sophia faster to author in than current Quarto?

If yes: continue to Phase 3.
If no: investigate. The whole project's premise depends on this. May
require rethinking the component contract or the authoring tools.

### After Phase 4

**Question:** Did ASTR 201 migration succeed? Any pedagogy components
you added but never used? Any you needed but couldn't author cleanly?

If migration succeeded: pause for 1–2 weeks before Phase 5. Update
component-contract.md with lessons learned.

If migration struggled: don't start COMP 536 yet. Identify what's
slowing authoring. Potentially defer Phase 5 until issues are
resolved.

### After Phase 5

**Question:** Does dual-profile reduce friction enough to justify
the complexity?

If yes: continue to Phase 6.
If no: consider rolling back to single-build for v3 and shipping
solutions through Canvas only.

### After Phase 6

**Question:** Did the v3 innovations earn their keep with real
students? Calibration data show engagement? Time-machine videos
improve completion rates?

If yes: continue to open-source.
If no: keep them as research, don't ship them in the public release.

---

## 7. Risk register

Per-phase risks and mitigations.

### Cross-cutting risks

**Time slippage (highest probability).**
- Cause: research deadlines, teaching prep, life.
- Mitigation: each phase has a "minimum viable" cutoff (deploy what
  exists at the deadline; defer the rest). Phase boundaries are
  natural pause points.

**Astro / MDX evolution breaks setup.**
- Cause: Astro 5+ is recent; APIs may shift.
- Mitigation: pin major versions in `package.json`; treat major
  upgrades as scheduled work, not surprises.

**Pyodide harder than expected.**
- Cause: package availability, bundle size, kernel state.
- Mitigation: keep Pyodide as v2 (Phase 5), not v1. Have a fallback
  plan: if Pyodide doesn't fit, COMP chapters use pre-rendered
  outputs + Colab links exclusively.

**AI tool drift.**
- Cause: Claude Code or Codex changes APIs/behaviors.
- Mitigation: prompt file format is provider-agnostic; skills can
  be regenerated. Don't depend on tool-specific quirks.

### Phase-specific risks

**Phase 1: theme port complexity.** Already noted. Mitigation:
timebox, ship simple, refactor later.

**Phase 4: Cosmic Playground breaks during migration.** Mitigation:
keep `astro-demos` repo separate; Sophia integrates via stable URLs
or iframe embeds, not deep imports.

**Phase 5: Cloudflare setup more painful than expected.** Mitigation:
local-only instructor build is the fallback; cloud is an enhancement,
not a requirement.

**Phase 6: innovations don't pan out pedagogically.** Mitigation:
they're explicitly experimental; failures are data, not setbacks.
Predict-the-plot and Misconception NPCs especially are unproven; if
either fails, drop without regret.

**Phase 7: open-source release lands flat.** Mitigation: don't
optimize for adoption; optimize for the platform serving Anna's
courses well. Adoption is a bonus, not the goal.

---

## 8. Out of scope for v1

To prevent scope creep, explicit non-goals:

- **No LMS replacement.** Canvas integration is via export only.
- **No student accounts or auth in v1.** localStorage only.
- **No real-time collaboration.** Authoring is solo + AI.
- **No mobile apps.** Web only.
- **No LTI integration.** Defer indefinitely.
- **No server-side rendering of student work.** All AI happens in
  authoring; student-facing AI tutor is v3 at earliest.
- **No misconception NPCs in v1 or v2.** This is the most
  experimental innovation; defer to v3, drop without regret if it
  doesn't work.
- **No automatic transcript generation in v1.** Manual or
  Whisper-via-Claude-Code-skill in v2.
- **No cross-course shared misconception database in v1 or v2.** Per-course
  in v2; cross-course is v3.
- **No public open-source release before three courses run.** Phase 7
  trigger is course completion, not calendar date.

---

## 9. Open questions for the author

Things to decide before or during Phase 0:

### 9.1 Confirmed scope

Decision (per author, May 2026): v1 covers **ASTR 201 + COMP 521**
in parallel for fall 2026. COMP 536 stays on Quarto for one more
semester; migration is v2.

### 9.2 What stays on Quarto for fall 2026

ASTR 101 and COMP 536 stay on Quarto. Acceptable as confirmed.
Migration of COMP 536 is v2 (deferred to spring 2027 or later).
ASTR 101 not in current scope at all.

### 9.3 Open-source timing

Phase 7 says spring 2027 (after v3). Alternatives:

- Earlier: announce as "early access" after Phase 4 (v1). Risks:
  rough edges visible to early adopters; maintenance burden hits
  before Sophia is mature.
- Later: announce only after Phase 6 (v3) plus a semester of
  stabilization. Safer; slower.

The plan defaults to spring 2027. This is the stretch goal; the
core ambition is Anna's courses, not adoption.

### 9.4 License

When Phase 7 lands, Sophia will need a license. Options:

- **MIT**: maximum permissiveness; anyone can fork and commercialize.
- **Apache 2.0**: similar but with explicit patent grant; preferred
  for academic open-source.
- **AGPL-3.0**: copyleft; forks must remain open. Slower adoption,
  but ensures public benefit.

Default recommendation: **Apache 2.0** for the platform code; **CC
BY 4.0** for textbook content. These are the standards in scientific
computing and open educational resources, respectively.

### 9.5 Naming the open-source release

Will the public release stay "Sophia," or get a different brand
(e.g., "Sophia Open" / "Sophia Press")? The platform name and the
public-release name don't have to match.

### 9.6 Time budget honesty

The calendar projection assumes 10–15 hours/week during semester
and 25–35 hours/week during summer. Is this realistic given:

- Research deadlines (papers, grants).
- Service obligations (committees, reviewing).
- Mentoring (students, postdocs).
- Personal life.

If the realistic number is half this, the calendar doubles. Better
to know now than to slip silently.

---

## 10. Definition of done for this roadmap

This document is "done" (not the project — the document) when:

- All open questions in section 9 have working answers.
- Phase 0 has actually started.
- The first concrete deliverable (a hello-world chapter) compiles.

After that, this doc becomes a living reference. Update it when
phases close, when scope shifts, when reality forces re-planning.

The roadmap is a tool, not a contract. Reality wins.
