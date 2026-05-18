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

- **Platform repo (current location)**: `drannarosen/sophie` on GitHub.
  May move to a more official org later; treat the current location as
  authoritative for now.
- **Packages**: `@sophie/*`.
- **CLI binary**: `sophie`.
- **Sub-brands**: Sophie Astro (astronomy textbooks), Sophie Compute
  (CS textbooks).
- **Originally named Sophia**; renamed Sophie May 2026 (ADR 0017).

## Where things live

| What | Where |
|---|---|
| Design docs (canonical) | `docs/website/` (MyST site) |
| ADRs (decision audit trail) | `docs/website/decisions/` |
| Chapter-author component reference | `docs/website/reference/chapter-components.md` |
| Roadmap | `docs/website/status/roadmap.md` |
| Pre-conversion historical docs | `_archive/` (read-only; do **not** edit) |
| Implementation plan (most recent) | `~/.claude/plans/read-all-of-the-sharded-sky.md` |
| Project memory | `~/.claude/projects/-Users-anna-Teaching-sophie/memory/` |

To run the docs site:

```bash
cd docs/website
npx mystmd start          # serves locally on http://localhost:3000
npx mystmd build --html   # static build → _build/html/
```

## Locked decisions — ADRs 0001–0060

Read the relevant ADR before proposing changes that touch its area.
This table is a load-bearing-decisions index, not a complete listing —
not every ADR appears here. Browse `docs/website/decisions/` for the
full set (0001–0060 at last count).

| Concern                          | ADR  | Decision                                                                                                                  |
| -------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| Repo shape                       | 0001 | Standalone platform; courses are *separate* consumer repos                                                                |
| Renderer                         | 0002 | Astro 6 + MDX (was Astro 5; see ADR 0002 revision note)                                                                   |
| Schema                           | 0003 | Zod as source of truth                                                                                                    |
| Component contract               | 0004 | `serialize` separate from render; axe-core for a11y; `useInteractive` helper; composition rules                           |
| Theming                          | 0005 | TS tokens → CSS vars + Tailwind preset; CSS Modules in components                                                         |
| Slides                           | 0006 | Reveal.js + thin Astro adapter (Spectacle on radar)                                                                       |
| Persistence                      | 0007 | IndexedDB + `ResponseStore` repository + BroadcastChannel                                                                 |
| Demos                            | 0008 | Cosmic Playground manifest + iframe + postMessage                                                                         |
| i18n                             | 0009 | `Chapter.lang` reserved; no real i18n in v1                                                                               |
| Docs site                        | 0010 | MyST for design docs (transitional → Sophie-hosted later)                                                                 |
| JS package mgr                   | 0011 | **pnpm** (never npm/yarn)                                                                                                 |
| Python                           | 0012 | **uv**                                                                                                                    |
| Lint+format                      | 0013 | **Biome** (replaces ESLint+Prettier)                                                                                      |
| Monorepo orchestration           | 0014 | **Turborepo**                                                                                                             |
| Dev preview                      | 0015 | `sophie dev` + Storybook + Playwright MCP                                                                                 |
| Concept maps                     | 0016 | React Flow (**proposed**, v2+)                                                                                            |
| Naming                           | 0017 | Renamed Sophia → Sophie                                                                                                   |
| Code editor                      | 0018 | CodeMirror 6 inside `<CodeCell>`                                                                                          |
| A11y primitives                  | 0019 | Radix UI                                                                                                                  |
| Syntax highlight                 | 0020 | Shiki via rehype-pretty-code                                                                                              |
| Data viz                         | 0021 | Observable Plot                                                                                                           |
| Library bundler                  | 0022 | tsup                                                                                                                      |
| Build order                      | 0023 | **Vertical-slice-first**: lean Phase 0, refactor outward as patterns emerge                                               |
| License                          | 0024 | AGPL — rules out paid recurring SaaS for the platform's CI gate                                                           |
| Tailwind                         | 0026 | Tailwind v4 CSS-first                                                                                                     |
| Storybook                        | 0028 | Storybook with axe-core; visual regression deferred (superseded by 0057)                                                  |
| BroadcastChannel LWW             | 0029 | Per-write `Date.now()` timestamps; `useInteractive` ignores stale incoming writes (refines ADR 0007)                      |
| Audience + AI authoring          | 0030 | AI as primary author; four AI roles (author/pedagogy/domain/brainstorm); instructor as supervisor (HITL)                  |
| Compound component primitives    | 0031 | Compound component layout primitives                                                                                      |
| Pedagogy-index pattern           | 0038 | Pedagogy index serialized from MDX AST; consumed by audit, diff, AI authoring                                             |
| Teaching Decision Records (TDRs) | 0040 | Curriculum-side audit trail in consumer repos' `teaching-decisions/`                                                      |
| Teaching Move Library            | 0041 | 18 named teaching moves across 7 families; `pedagogy_intent` declared against the library                                 |
| Pedagogy Contract + AI Ledger    | 0042 | `pedagogy-contract.yaml` at consumer repo root; AI contribution provenance public-facing by default                       |
| Notation Registry + MultiRep     | 0043 | Symbol/unit registry as external source of truth; alignment audit                                                         |
| Misconception Graph              | 0044 | Misconceptions as graph nodes with prerequisite/related edges; 12 canonical interventions in platform library             |
| Pedagogical Diff / Curriculum CI | 0045 | `sophie diff` with two-axis taxonomy (granularity × severity)                                                             |
| Equation Biography               | 0046 | Per-equation children declaring observable / assumption / units / validity-domain / common-misuse                         |
| Empirical validation             | 0047 | 2-paper SoTL plan with 8 metrics                                                                                          |
| LDS Content Plugin System        | 0048 | Plugin contract for cross-course content (concepts, misconceptions, equations)                                            |
| Conformance Failure Modes        | 0053 | 5-mode taxonomy + `audit_overrides`                                                                                       |
| Squash-merge convention          | 0055 | Squash-merge for code PRs                                                                                                 |
| Validation tracker               | 0056 | ADR frontmatter `validation:` block (status / last_validated_date / evidence)                                             |
| Visual regression baseline       | 0057 | Self-hosted `@storybook/test-runner` + Playwright; CI Linux as canonical baseline (supersedes 0028 VR deferral)           |
| **Epistemic Component Contract** | 0058 | **Eight-role taxonomy** (optional, additive); amends 0003/0004/0044/0046; underwrites Reasoning-OS thesis                  |
| **Linked-representation state**  | 0059 | **A11 graduated**: Zustand page-local store + `useLinkedParameter` + `<ParameterCursor>` + `<ParameterSlider>`             |
| **Registry ecosystem**           | 0060 | **Universal+reusable → registry; one-shot → inline (collection)**: 6 shared conventions; amends 0038/0043/0044/0046/0048    |
| **AI-optimized codebase design** | 0061 | **AI is primary author of platform code, not just content**: 6 rules (focused files, Write-over-Edit, LOC budget 300/500/800, filename routing, atomic docs, tests split with source); amends 0023/0030 |

## Engineering principles

These are project-wide standards layered on top of the ADRs. They apply
to every PR, every design decision, every refactor.

- **SoTA over simple.** When choosing between a working-but-naive
  approach and a more robust state-of-the-art shape, choose SoTA.
  Sophie is a long-lived platform; "what's simple now" tends to
  become "what's causing more work later." Recent examples:
  - **Condition-based waiting** (`expect(el).toHaveAttribute("data-state", "open")`)
    over arbitrary `{ timeout: N }` knobs in e2e tests — wait on Radix's
    actual state-machine signals, not on clock time. The naive fix
    masked a real production scroll-spy bug; the SoTA fix surfaced it.
  - **Structural fixes** over targeted patches — invert source-of-truth
    on the in-page-ToC scroll-spy (observe what's *in the ToC*, not all
    headings) so the fix defends against the whole class of "stray
    `h2[id]` in chapter content" rather than the single instance.
  - **AI-authoring-friendly source-component patterns**
    (`<Parent><Child>...</Child></Parent>`) over inline prop arrays
    (`<Parent items={[…]}/>`) — extraction is mechanical, AI scaffolding
    is reliable, and the JSX is more readable for human authors too.
    See `<LearningObjectives>` PR-C4 refactor.

- **Pre-launch; no backwards compatibility.** Sophie has zero
  production students. Hard renames are the right shape; drop legacy
  shapes and migrate all consumers in the same PR. No back-compat
  shims, no "if-old-then-new" branches, no deprecation cycles.
  Bucket C examples:
  - PR-C3 hard-renamed `<MiniGlossary>` to the pedagogy-index pattern;
    every consumer migrated in the same PR.
  - PR-C4 dropped `LearningObjectives.objectives[]` prop entirely;
    three smoke chapter callsites migrated to children-mode in the
    same commit.
  - Phase 1 (PR #39) unified anchor prefixes (`key-insight-N` → `ki-N`,
    `misconception-N` → `misc-N`) without a shim; production code and
    tests updated together.

- **DRY, YAGNI, clean code.** Three practical applications:
  - **DRY**: extract reusable patterns (`createPedagogyStore<T>`
    factory; `useHydrated()` hook; `indexAccumulator`) once they're
    paid for by ≥2 callers. Don't pre-abstract before the second
    caller exists.
  - **YAGNI**: don't add abstractions for hypothetical future
    requirements. Per ADR 0023 vertical-slice-first: lean Phase 0,
    refactor outward as patterns emerge. The 11 audit invariants in
    `pedagogy-audit.ts` ship because they have concrete inputs (the
    populated `PedagogyIndex`), not because they *might* be useful.
  - **Clean code**: zero biome warnings (per Conventions below);
    no commented-out code; no dead imports; no `TODO` without an
    issue link; descriptive identifier names; no comments that
    explain *what* the code does (the code already does that —
    comments are for non-obvious *why*).

- **Build the best now, plan ahead — not what's simple now causing
  more work later.** Anna's saved feedback preference, restated for
  emphasis. "The best" is decided collaboratively (HITL mandate);
  "now" means in this PR rather than deferred to a hypothetical
  follow-up that never lands.

- **Epistemic legibility is a first-class concern.** When designing
  any new pedagogy component, ask: what epistemic role does this
  encode (observable / model / inference / assumption / approximation
  / uncertainty / numerical / misconception)? Components that don't
  fit any of the eight are likely chrome, not pedagogy. Sophie's
  Scientific Reasoning OS thesis (see ADR 0058 + `docs/website/vision/reasoning-os/`)
  depends on the role contract being consistently applied; pedagogy
  components that drift from it dilute the platform's distinguishing
  claim. The contract is *optional and additive* at v1 (no required
  migration), but new components should declare role wherever
  applicable, and reviewers should ask the question on every PR.

## Conventions

- **Use pnpm.** Never npm or yarn. (ADR 0011)
- **Format with Biome** (`pnpm biome format --write`). Lint with
  `pnpm biome check`. (ADR 0013)
- **Don't let lint warnings accumulate.** `pnpm exec biome check`
  must finish a PR with **zero warnings as well as zero errors**.
  Warnings flag a code-shape issue *Biome chose not to make a hard
  failure*; ignoring them defeats the rule. Three response paths,
  in order of preference:
  1. **Refactor to satisfy the rule.** Usually the right move —
     the warning is telling you something. Example: PR #33's
     `noNonNullAssertion` warnings on `expect(result[0]!.field)`
     resolved cleanly with `expect(result[0]).toMatchObject(...)`,
     which gave better failure messages too.
  2. **Suppress with a `biome-ignore` comment + reason** when the
     rule genuinely doesn't fit a specific call site. The reason
     must explain *why this case is safe*, not "the rule is
     wrong." Per-line, not file-wide.
  3. **Open an issue + adjust `biome.json`** if a rule is
     systematically wrong for Sophie. Don't bury this in a PR;
     surface it explicitly. ADRs 0013-adjacent.

  Warnings introduced by a new PR are the new PR's responsibility
  to clear, even when they fall under an existing-but-loose rule.
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
