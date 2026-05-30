# Sophie — Project Instructions for Claude Code

This file is loaded automatically when working in the
`/Users/anna/Teaching/sophie/` directory. Read it before doing
anything else in this project.

## ⚠️ HUMAN-IN-THE-LOOP MANDATE — read this first

**Anna is the supervisor and collaborator on Sophie. Not a customer.**

**Before implementing any new code, design decision, or substantive
change: revisit and confirm the relevant ADR(s) and design choices with
Anna in-thread.** Do not assume alignment from prior conversation.
Verify, propose, get explicit approval, *then* implement.

This applies to:

- Adding new components (verify the contract pattern still applies).
- Writing new ADRs (propose first; don't write without approval).
- Code structure / file layout (verify it matches discussed shape).
- Adding dependencies (don't install libraries without confirmation).
- Refactors (revisit the original decision before changing it).
- Cross-cutting moves (renames, restructures, build changes).

What this looks like in practice:

- Lead with: "Here's what I'm about to do; here's why; does this still
  match what we agreed on? [reference ADR XXXX]"
- Use `AskUserQuestion` for choices, not implicit assumptions.
- Cite ADRs by number when proposing.
- Pause for confirmation at every architectural decision point.
- After completing each substantive step, summarize what changed and
  what's next; wait for the next direction.

Anna's saved feedback preference: **"build the best now, plan ahead —
not what's simple now causing more work later."** Combine with the HITL
mandate: "the best" is decided collaboratively, not autonomously.

When in doubt: **stop and ask**. The platform is being built carefully
on purpose; speed is not the goal — correctness, long-term shape, and
documented rationale are.

## Working principles

Four rules layered on top of the HITL mandate. Numbered for
citability — reviewers can write "W3 violation" in a PR comment
and reference the exact standard. These apply to every task,
including ones the user calls "quick" or "simple."

- **W1 — Don't assume. Don't hide confusion. Surface tradeoffs.**
  When something is ambiguous, say so out loud. When you face a
  real tradeoff, name both sides and pick the one you'd recommend;
  don't paper over uncertainty with confident-sounding prose.
  Hidden confusion ships as bugs, scope creep, or wasted iterations.

- **W2 — Minimum code that solves the problem. Nothing speculative.**
  W2 governs *amount of code*, not architectural shape. SoTA-over-
  simple (below) and "build the best now, plan ahead" still win on
  *structural* decisions (which dependency, which data model, which
  component pattern, which abstraction layer). W2 says: once you've
  picked the SoTA shape, write only the code that satisfies the
  stated requirement — no abstractions for hypothetical second
  callers, no flags toggling features that don't exist yet, no
  error-handling for branches the code cannot reach, no
  "while-I'm-here" cleanups in unrelated files.

  Order of precedence: **SoTA shape (always) > W2 (within that
  shape) > YAGNI (within that code).** If W2 ever seems to argue
  for a simpler-but-worse architectural choice, you are misreading
  W2. Sophie is built future-forward; W2 is a code-volume
  discipline, not a shape-conservatism discipline.

- **W3 — Touch only what you must. Clean up only your own mess.**
  Scope discipline at the change level: the diff is the minimum set
  of files that satisfies the goal. Unrelated cleanups go in their
  own commit. Pre-existing issues are not yours to fix unless they
  block the current change. Conversely, *your own* mess — debug
  prints, scratch files, half-finished commits, dead branches — is
  yours to clean before declaring done.

- **W4 — Define success criteria. Loop until verified.**
  Before starting non-trivial work, write down what "done" looks
  like (test passes, build green, axe-core clean, specific behavior
  observable, etc.). After implementation, loop: verify against the
  criteria, fix what fails, re-verify. "I think it works" is not
  verification. Evidence beats assertion.

## What Sophie is

Sophie is a schema-driven, AI-authorable platform for interactive
scientific textbooks, course websites, slide decks, and LMS exports.
Standalone, distributable platform modeled on MyST and Quarto.

Sophie is also a **Scientific Reasoning OS**: its component contract,
schema, and authoring model encode the epistemic structure of
scientific reasoning (Observable / Model / Inference / Assumption /
Approximation / Uncertainty / Numerical / Misconception). This is
the *vertical STEM specialization* of Sophie's horizontal Learning
Design System positioning — LDS describes what Sophie does for any
discipline; Reasoning OS describes what Sophie becomes when an LDS
is optimized for scientific reasoning. The eight-role taxonomy is
locked by ADR 0058. See [`docs/website/vision/reasoning-os/`](docs/website/vision/reasoning-os/index.md)
for the thesis and [`docs/website/explanation/scientific-reasoning-os.md`](docs/website/explanation/scientific-reasoning-os.md)
for the author-facing how-to.

**Scope and origin (honest framing).** Sophie is **teaching
infrastructure** that grew from Anna's multi-course authoring needs
(ASTR 201, ASTR 101, COMP 521). Astrophysics remains her primary
research output; Sophie supports the tenure case through teaching
effectiveness and 1–2 SoTL papers, not as a DBER pivot. Full version:
[`strategy/positioning.md` § origin and scope](docs/website/strategy/positioning.md#origin-and-scope).

- **Platform repo (current location)**: `drannarosen/sophie` on GitHub.
- **Packages**: `@sophie/*`. **CLI binary**: `sophie`.

## Where things live

| What | Where |
|---|---|
| Design docs (canonical) | `docs/website/` (MyST site) |
| ADRs (decision audit trail) | `docs/website/decisions/` |
| Chapter-author component reference | `docs/website/reference/chapter-components.md` |
| Accessibility reference (WCAG 2.1 AA) | `docs/website/reference/wcag-21-aa.md` |
| Competitive landscape + scope discipline | `docs/website/strategy/landscape/` |
| Strategic positioning + origin/scope | `docs/website/strategy/positioning.md` |
| Roadmap | `docs/website/status/roadmap.md` |
| Implementation plans (per session) | `~/.claude/plans/` |
| Project memory | `~/.claude/projects/-Users-anna-Teaching-sophie/memory/` |

To run the docs site:

```bash
cd docs/website
npx mystmd start          # serves locally on http://localhost:3000
npx mystmd build --html   # static build → _build/html/
```

## Consumer course migrations

Courses are separate repos per ADR 0001. Cross-repo migration work
happens in the per-course directories, not here.

| Course                        | Source                                        | Status                                            |
| ----------------------------- | --------------------------------------------- | ------------------------------------------------- |
| ASTR 201 (Intro Astrophysics) | `/Users/anna/Teaching/astr201-sp26/modules/`  | Quarto `.qmd`; migration to Sophie `.mdx` planned |

Migration protocol locked in [ADR 0064](docs/website/decisions/0064-chapter-migration-playbook.md)
(six rules, seven-step protocol, structural-density rotation); the
original worked-example pilot's findings are folded into ADR 0064
itself (the smoke-example pilot is recoverable in git history). The
report at [`pilots/m2-l3-spectra-composition.md`](docs/website/pilots/m2-l3-spectra-composition.md)
now documents the M2-L3 **consumer** migration; the other
`pilots/m2-*`/`m1-*`/`m3-*` reports are the per-chapter consumer
migration records. Read ADR 0064 before scoping the next migration.

## Locked decisions — most-cited ADRs

Read the relevant ADR before proposing changes that touch its area.
The 11 below are the routine-reasoning subset; full catalog
(78 ADRs, 0001–0079 with 0050 a reserved gap) lives in
`docs/website/decisions/`.

| Concern                          | ADR  | Decision                                                                                                                  |
| -------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| Repo shape                       | 0001 | Standalone platform; courses are *separate* consumer repos                                                                |
| Schema                           | 0003 | Zod as source of truth                                                                                                    |
| Component contract               | 0004 | `serialize` separate from render; axe-core for a11y; `useInteractive` helper; composition rules                           |
| Theming                          | 0005 | TS tokens → CSS vars + Tailwind preset; CSS Modules in components                                                         |
| A11y primitives                  | 0019 | Radix UI                                                                                                                  |
| Build order                      | 0023 | **Vertical-slice-first**: lean Phase 0, refactor outward as patterns emerge                                               |
| Audience + AI authoring          | 0030 | AI as primary author; four AI roles (author/pedagogy/domain/brainstorm); instructor as supervisor (HITL)                  |
| Pedagogy-index pattern           | 0038 | Pedagogy index serialized from MDX AST; consumed by audit, diff, AI authoring                                             |
| **Epistemic Component Contract** | 0058 | **Eight-role taxonomy** (optional, additive); amends 0003/0004/0044/0046; underwrites Reasoning-OS thesis                  |
| **AI-optimized codebase design** | 0061 | **AI is primary author of platform code, not just content**: 6 rules (focused files, Write-over-Edit, LOC budget 300/500/800, filename routing, atomic docs, tests split with source); amends 0023/0030. **Validated at scale by the 8-file course-spec v0.2-shape split in PR #199** (sibling files 20–91 LOC each; main schema 371→404 LOC within budget). |
| **Course-spec format** | 0080 | **v0.1 + Amendment 1 (discovery reshape to ADR 0067)** + **Amendment 2 (PR #199, 2026-05-26)**: clean-break removal of `assessment.grade_weights` → required top-level `grading.categories` (sum to 1.0); 7 new optional clusters (objectives, prereqs, office_hours, contact, accessibility, info_pages, landing); strict-union `info_pages.compose:`; reserved-slug refine; `landing.layout: "custom"` enum; 3 cross-refines; projection-pattern + chrome-vs-pedagogy boundary operationalized. `spec_version` stays at `"0.1"` (pre-launch zero-consumer state). |
| **Chapter migration playbook**   | 0064 | Six locked rules + seven-step protocol; fixed-template pilot report under `docs/website/pilots/`; halt on missing-component gaps (no inline workarounds); next pilot must differ in structural density |
| **Unified assessment schema (v1 = formative-with-reveal)** | 0073 | **Amendment 1 (2026-05-27)**: formative-with-reveal v1 — six MDX components (`<MCQ>` / `<MultiSelect>` / `<FillBlank>` / `<NumericQuestion>` / `<QuickCheck>` / `<PracticeProblem>`) + two reveals (`<Solution>` / `<Hint>`) + practice route + AS-1..5 audit; grading + BKT + Rubric + `<Assignment>` deferred to v2 per the locked broader ADR. PRs 3–9 of the [formative-assessment plan](docs/plans/2026-05-27-formative-assessment-implementation.md) cite this amendment as the design source. |

## Engineering principles

These are project-wide standards layered on top of the ADRs. They apply
to every PR, every design decision, every refactor.

- **SoTA over simple.** When choosing between a working-but-naive
  approach and a more robust state-of-the-art shape, choose SoTA.
  Sophie is a long-lived platform; "what's simple now" tends to
  become "what's causing more work later." Two patterns this rule
  enforces:
  - **Condition-based waiting over time-based.** Wait on actual
    state-machine signals (`expect(el).toHaveAttribute("data-state", "open")`),
    not on `{ timeout: N }` clock guesses. Naive timeouts mask real
    bugs; condition waits surface them.
  - **Structural fixes over targeted patches.** When a bug has a
    class (not a single instance), invert source-of-truth to defend
    against the whole class. Pattern, not patch.

- **Pre-launch; no backwards compatibility.** Sophie has zero
  production students. Hard renames are the right shape; drop legacy
  shapes and migrate all consumers in the same PR. No back-compat
  shims, no "if-old-then-new" branches, no deprecation cycles. When
  a schema changes, the schema changes everywhere in one commit.

- **DRY, YAGNI, clean code.** Three practical applications:
  - **DRY**: extract reusable patterns (`createPedagogyStore<T>`
    factory; `useHydrated()` hook; `indexAccumulator`) once they're
    paid for by ≥2 callers. Don't pre-abstract before the second
    caller exists.
  - **YAGNI**: don't add abstractions for hypothetical future
    requirements. Per ADR 0023 vertical-slice-first: lean Phase 0,
    refactor outward as patterns emerge. Code ships when it has
    concrete callers, not when it *might* be useful.
  - **Clean code**: zero biome warnings (per Conventions below);
    no commented-out code; no dead imports; no `TODO` without an
    issue link; descriptive identifier names; no comments that
    explain *what* the code does (the code already does that —
    comments are for non-obvious *why*).

- **Build the best now, plan ahead — not what's simple now causing
  more work later.** Anna's saved feedback preference, restated for
  emphasis. "The best" is decided collaboratively (HITL mandate);
  "now" means in this PR rather than deferred to a hypothetical
  follow-up that never lands. **W2 above governs amount of code
  *within* the SoTA shape this rule picks.** If W2 ever seems to
  argue for a simpler-but-worse architectural choice, you are
  misreading W2 — SoTA shape always wins.

- **Epistemic legibility is a first-class concern.** When designing
  any new pedagogy component, ask: what epistemic role does this
  encode (observable / model / inference / assumption / approximation
  / uncertainty / numerical / misconception)? Components that don't
  fit any of the eight are likely chrome, not pedagogy. The contract
  is optional and additive at v1 (no required migration), but new
  components should declare role where applicable. See ADR 0058 +
  `docs/website/vision/reasoning-os/`.

## Conventions

### Hard rules (one-liners)

- **Use pnpm.** Never npm or yarn. (ADR 0011)
- **Format with Biome** (`pnpm biome format --write`). Lint with
  `pnpm biome check`. (ADR 0013)
- **Run package tasks via Turborepo**: `pnpm turbo run <task>
  --filter=<package>`. (ADR 0014)
- **Python under uv**: `uv run python <script>.py`. (ADR 0012)
- **Components are framework-pure**: `@sophie/components` imports
  React, Zod, and `@sophie/*` only — never from `astro:*`. (ADR 0001)
- **Use `useInteractive`** for any persistence; never touch IndexedDB
  directly. (ADRs 0004, 0007)
- **axe-core tests are mandatory** on every component PR. (ADR 0004)
- **Cite ADRs by number** when explaining decisions or making proposals.
- **Don't touch `_archive/`** — historical record.
- **Existing course SCSS to port**, not redesign: `tokens.scss`,
  `design-tokens.scss`, `callouts.scss`, `lecture-cards.scss`,
  `nav-markers.scss`, `dashboard.scss`, `glossary.scss`,
  `collapsible-cards.scss` from `astr101-sp26/`, `astr201-sp26/`,
  `comp536-sp26/`. (ADR 0005)

### Discipline (multi-line)

- **Don't let lint warnings accumulate.** `pnpm exec biome check`
  must finish a PR with **zero warnings as well as zero errors**.
  Warnings flag a code-shape issue *Biome chose not to make a hard
  failure*; ignoring them defeats the rule. Three response paths,
  in order of preference:
  1. **Refactor to satisfy the rule.** Usually the right move —
     the warning is telling you something. (E.g., a non-null-
     assertion warning on `expect(x[0]!.field)` resolves cleanly
     with `expect(x[0]).toMatchObject(...)`, which gives better
     failure messages too.)
  2. **Suppress with a `biome-ignore` comment + reason** when the
     rule genuinely doesn't fit a specific call site. The reason
     must explain *why this case is safe*, not "the rule is
     wrong." Per-line, not file-wide.
  3. **Open an issue + adjust `biome.json`** if a rule is
     systematically wrong for Sophie. Don't bury this in a PR;
     surface it explicitly. ADRs 0013-adjacent.

  Warnings introduced by a new PR are the new PR's responsibility
  to clear, even when they fall under an existing-but-loose rule.

- **Docs don't drift from code.** Any code change that touches
  anything in `docs/website/` (ADR examples, reference doc
  snippets, MyST TOC entries, validation dashboards) updates the
  docs in the **same PR** as the code. No follow-up "docs catch-up"
  PRs — they don't land.

- **Branch and PR scope.** Code changes go through the full PR
  flow (branch + PR + squash-merge per ADR 0055). Pure docs
  changes, dated reviews, and registry updates land directly on
  `main`. When unsure which category a change falls in, default to
  PR.

- **Biome verification.** When running `pnpm exec biome check`,
  tail-only output is insufficient — a "1 file checked" line at
  the end does not mean zero warnings. Either check the exit code
  explicitly (`$?` non-zero = failure) or grep the full output for
  `"error"` / `"warning"` before declaring the run clean.

- **MyST build verification.** When running `npx mystmd build --html`,
  exit code is 0 even when MyST surfaces broken cross-references,
  unresolved citations, and implicit-heading preferences as
  `⚠️ <message>` lines. Plain `grep -cE "(error|warning)"` misses
  these because MyST uses the emoji glyph, not the word. **Verified
  gate pattern: `grep -c "⚠"`** — counts only MyST's content
  warnings (the emoji is MyST-exclusive in its output). Do NOT
  also match the words `error`/`warning` — Node emits process-level
  deprecation noise via stderr (e.g. `[DEP0169] DeprecationWarning`,
  `(node:NNNN) Warning: ...`) that this gate must not conflate with
  MyST content drift. CI-level build-error checks live at the exit-
  code level, separate from this content-warning gate. Post-W4c
  audit A1-X1 surfaced the measurement gap (16 warnings the prior
  audit cycle silently dropped); post-W4c PR 3 R+CR I1 tightened the
  grep after the broader `(error|warning|⚠)` pattern false-positived
  on Node stderr.

- **Validation-dashboard regen on ADR status change.** Any PR
  that touches an ADR's `status:` or `validation:` block must
  regenerate `docs/website/status/validation.md` in the same PR.
  Integration test I3 catches this on the unit job; catching it
  locally first is faster.

- **Standing PR-review rules (R6–R13).** Apply on every PR; cite by
  number in review comments.
  - **R6 — MyST anchor verification.** Cited ADR sections use
    MyST heading-slug, not `#L\d+` GitHub line-anchors. Catch:
    grep `docs/website/**/*.md` for `#L[0-9]+`. Originating
    finding: W4b R+CR I1.
  - **R7 — Silent-skip extractor disposition.** Every silent-skip
    filter in an extractor has either a paired audit invariant OR a
    `findings.push` at the filter site. Bare silent-skips produce
    dead-code audits. **Grep covers three filter shapes** + dotted
    property access at any depth: negation (`if (!X) return;`,
    `if (!X.Y) return;`, `if (!X.Y.Z) return;`), equality-undefined
    (`if (X === undefined) return;`), and equality-null
    (`if (X === null) return;`). Full pattern:
    `grep -rE "if \(!(\w+(\.\w+)*)\)|if \((\w+(\.\w+)*) === undefined\)|if \((\w+(\.\w+)*) === null\)" packages/astro/src/lib/pedagogy-index/extractors/`.
    Originating finding: W4b R+CR C1; pattern extended W4c Batch 0.5b
    (found 2 sites using equality-check shape the original
    negation-only grep missed); dotted-access refinement post-W4c PR 2
    R+CR M1 (`if (!el.name) return;` shape); multi-level dotted access
    via `(\.\w+)*` per post-W4c PR 3 R+CR M1 (forecloses the
    class-of-issue rather than patching one observed depth).
  - **R8 — Module-scoped MDX caches declare HMR strategy.** Any
    module-level cache (`Map`, `Set`, `WeakMap`) in the
    MDX-compile pipeline includes a header comment naming when
    it's invalidated in production builds + dev-mode HMR + the
    companion plugin/hook. Originating finding: W4b R+CR C3.
  - **R9-production — one canonical declaration per named
    interface (hard rule).** Every named interface has exactly
    one declaration in `packages/**/src/**/*.ts` excluding
    tests. Pre-merge grep gate (substitute the interface in
    question for `FindingSink`): `grep -rE "^(export )?interface FindingSink" packages/*/src/ --include='*.ts' --exclude='*.test.ts'`
    returns 1. Originating finding: W4b R+CR C2.
  - **R9-test — prefer canonical import in tests (preference).**
    Test files import the canonical type rather than
    redeclaring. Redeclare only when isolation is deliberate
    AND documented in a sibling comment. Refinement source:
    post-W4b audit A2-R9 (test-mock duplications across 6 test
    files).
  - **R10 — Landmark choice when nested under a parent landmark.**
    When a new component is designed to live inside another
    landmark (e.g., a layout that owns `<main>`), declare its
    landmark element as `<section aria-labelledby={...}>` —
    **not** `<main>` (collides), **not** `<article>` (not a
    landmark), **not** `<div>` (nothing for the screen reader
    to announce). The named-region pattern is the default;
    deviations require a sibling comment explaining why.
    Apply during component design AND review. Originating
    finding: W4c Surprise #5 (three same-root-cause landmark
    bugs surfaced by Batch 4–5 axe coverage: `LibraryCollectionShell`
    used `<main>` inside the chapter layout, `CourseObjectives`
    had a nameless `<section>`, `TopicSpecContent` used
    `<article>` instead of a landmark).
  - **R11 — axe-on-render coverage.** Every `*.test.tsx` under
    `packages/components/src/` that calls `render(` must also call
    one of `axe(`, `AxeBuilder`, or `toHaveNoViolations` — render
    without axe violates ADR 0004's "axe-core tests are mandatory
    on every component PR" mandate. Enforced by
    `scripts/lint-axe-render.ts` (run via `pnpm lint:axe-render`,
    wired into the CI `lint` job). Audit-traceable exclusions live
    in the script header: `runtime/**`, `_helpers/**`, `__mocks__/**`,
    `_template/**`, `use<Name>.test.tsx` hook tests, and
    `interactive/ParameterCursor.test.tsx` (invisible side-effect
    component asserting store state, not DOM). Originating finding:
    P3 closure audit (`docs/reviews/2026-05-25-axe-coverage-audit.md`,
    PR #185) — pre-audit coverage was 42/44 with two quiet gaps
    (`RetrievalCard.test.tsx`, `EquationRef.biography-summary.test.tsx`)
    that the coarser grep missed; the R11 wave additionally caught a
    third (`InlineMath.test.tsx` rendering real KaTeX DOM with zero
    axe calls).

  - **R12 — Virtual-module type-narrowing at dispatcher entry (for
    nullable exports).** Every dispatcher route (`.astro` file in
    `packages/astro/src/routes/`) that imports a virtual-module
    export typed `T | null` must open its frontmatter with
    `if (!<importName>) throw new Error(...)` to narrow the type.
    The throw is structurally unreachable when the integration
    null-guards route injection upstream (the architectural
    invariant), but documents the invariant in code AND defends
    against future mutations — if the injection guard is accidentally
    removed, the throw surfaces the regression at first render rather
    than as a confusing nullish-property crash deep in composition.

    **Scope clarification.** R12 applies *only* to nullable
    virtual-module exports. Currently nullable:
    `virtual:sophie/course-spec` (`CourseSpec | null`). Non-nullable
    (R12 does not apply): `virtual:sophie/figures` (always an object,
    possibly empty); `virtual:sophie/pedagogy-index`. Check shapes
    at [`packages/astro/src/virtual-modules.d.ts`](packages/astro/src/virtual-modules.d.ts).
    The deferred ScheduleSchema virtual module is the predicted
    third instance with a `T | null` shape per the always-register
    pattern memorialized in
    `feedback_always_register_virtual_module.md`.

    **Primary enforcement: TS type-checker.** Astro check + `pnpm
    typecheck` already catch unguarded property access on a
    `T | null` export — the throw is what *narrows* the type for the
    rest of the file. The grep gate below is a defense-in-depth
    check at the file level.

    **Pre-merge grep gate (multi-line tolerant):**

    ```bash
    for f in $(grep -lE 'from "virtual:sophie/course-spec"' packages/astro/src/routes/*.astro 2>/dev/null); do
      grep -q "if (!" "$f" && grep -q "throw" "$f" || echo "MISSING-R12: $f"
    done
    ```

    Returns empty when clean. Extend the pattern when a new nullable
    virtual module ships (substitute `course-spec` for the new
    module name and run both checks).

    Originating finding: course-info-projection sprint code review C1
    (`docs/reviews/2026-05-26-course-info-projection-phases-1-4.md`).
    Three dispatchers fixed pre-merge:
    `course-landing.astro`, `section-landing.astro`,
    `info-page.astro`. See
    [ADR 0080 Amendment 2](docs/website/decisions/0080-course-spec-format-v0-1.md#amendment-2-assessment-grade-weights-clean-break-course-info-projection-2026-05-26).

  - **R13 — epistemic-role declaration.** Every new pedagogy
    component dir under `packages/components/src/components/` must
    either declare an `epistemicRole` (the canonical `export const
    <NAME>_EPISTEMIC_ROLE = "<role>" as const satisfies EpistemicRole`
    pattern, one of the eight roles), bind role via composition
    (`ROLE_VIA_SLOT`: a container whose named parts carry roles —
    either anonymous slots like `OMIFlow` or self-declaring children
    like `KeyEquation`), OR be added to the `CHROME` (role-less by
    design) / `GRANDFATHERED` (genuinely contestable, pending
    adjudication) allowlist in `scripts/lint-epistemic-role.ts` with
    a per-entry one-line rationale. A new component that silently
    ships role-less and un-allowlisted → CI red. Enforced by
    `scripts/lint-epistemic-role.ts` (`pnpm lint:epistemic-role`,
    wired into the CI `lint` job after R11's `lint:axe-render`).
    Comment-stripping makes prose mentions of `epistemicRole` in
    headers/docblocks NOT count as declarations. **The domain pass
    completed 2026-05-29**: all 14 grandfathered entries resolved
    (12 → chrome, `CommonMisuse` → declare, `KeyEquation` →
    role-via-slot), so `GRANDFATHERED` is now empty (gate: 6 declare ·
    2 role-via-slot · 51 chrome · 0 grandfathered). The bucket is
    retained empty for future genuinely-contestable components — a
    contestable role lands there pending its own adjudication rather
    than being forced into a wrong role. Apply the four-way
    pointer/teaching-move/composition-root/leaf test during component
    design AND review. Originating finding: ITEM 5 / ADR 0058
    graduation
    ([R-graduation](docs/website/decisions/0058-epistemic-component-contract.md#r-graduation-epistemicrole-enforced-for-new-components-2026-05-28),
    2026-05-28) + the
    [R-domain-pass revision](docs/website/decisions/0058-epistemic-component-contract.md#r-domain-pass-the-14-grandfathered-entries-adjudicated-2026-05-29)
    (2026-05-29).

  - **R14 — no raw `dangerouslySetInnerHTML`.** Every HTML injection in
    `@sophie/*` shipped code routes through the one sanctioned chokepoint
    `<BuildTimeHtml html={…} trust={…} />`
    (`packages/components/src/runtime/BuildTimeHtml.tsx`) with a `trust`
    discriminator (`katex` / `mdx-serialized` / `extractor-body`) naming
    why the HTML is safe (author/build-authored, never runtime user
    input). Raw `dangerouslySetInnerHTML=` anywhere else under
    `packages/<pkg>/src` (tests excluded) → CI red. Enforced by
    `scripts/lint-no-raw-inner-html.ts` (`pnpm lint:no-raw-inner-html`,
    wired into the CI `lint` job after R13's `lint:epistemic-role`). The
    matcher keys on the attribute-assignment form, so prose mentions and
    the type-level `Omit<…, "dangerouslySetInnerHTML">` exclusion stay
    legal. A new trusted pipeline extends the `BuildTimeHtmlTrust` union +
    [ADR 0093](docs/website/decisions/0093-build-time-html-trust-primitive.md)
    rather than re-introducing a raw site. Originating finding: A+
    hardening sprint H2 (28 sites across 11 files → one chokepoint).

  See `feedback_review_rules_r6_r10.md` (under
  `~/.claude/projects/-Users-anna-Teaching-sophie/memory/`) for origin
  story + class-of-issue patterns each rule formalizes.

## Style

- **No flattery, no hedging.** Honest assessments.
- **Lead with recommendation + rationale**; don't dump options.
- **Use `AskUserQuestion`** for choices, not free-form questions.
- **Verify before claiming.** axe-core verifies a11y; Vitest verifies
  logic; Playwright MCP lets AI inspect rendered behavior in a real
  browser.
- **Cite specific files, line numbers, and ADRs** in proposals.

## When in doubt

Stop. Ask. Don't guess. Don't proceed.

This applies especially to:

- Adding a dependency.
- Changing a file outside the immediate scope of the task.
- Touching anything in `_archive/`.
- Inferring intent from prior conversation rather than asking.
- Deciding what the "best long-term shape" is without explicit
  Anna alignment.

**The HITL mandate is not optional.** It applies even when the change
seems small, even when prior conversations seem to authorize it, even
when speed feels valuable. Pause and verify.
