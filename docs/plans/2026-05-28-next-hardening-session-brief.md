# Next hardening session brief — push Sophie to A+ (items 1–5)

**Date:** 2026-05-28
**Status:** session brief / handoff prompt. Pick up in a fresh session.
**Predecessor:** the 2026-05-28 hardening sprint shipped PRs #216
(Plot bundling + `@sophie/components/figures` subpath), #217 (cohesive LOC
exemption), #218 (pedagogy-audit build-done artifact) + ADRs 0088 / 0061
Amendment 1 / 0022 Amendment 1. Sophie is now ~**A− (88–90)**.

This brief is the source for the next session. The paste-able launcher
prompt lives at the bottom; the detail is here.

## READ FIRST (orient before doing anything)

- `AGENTS.md` — HITL mandate, W1–W4, conventions. HITL is non-negotiable:
  for any design/ADR decision, propose → explicit in-thread approval → THEN
  implement. Cite ADRs by number. Brainstorming is a CONVERSATION (one
  question at a time, recommendation + pros/cons), NOT `AskUserQuestion`
  popups.
- `docs/reviews/2026-05-28-platform-hardening-audit.md` — the canonical
  backlog (P1–P5) + per-category grades + status annotations on what
  shipped. **This is the source of truth for the items below; re-verify line
  numbers (they drift).**
- ADRs from last sprint: **0088** (pedagogy-audit build-done artifact),
  **0061 Amendment 1** (cohesive LOC exemption), **0022 Amendment 1**
  (externalization/bundling policy + figures subpath).

## Grade math (why these items)

A+ = lift the lowest categories: **Accessibility (16/20, lowest)**, **Tests**
(flake-tax capped), **Code quality (17/20)**, **Docs** (cleanup tail). Items
1, 3, 4 bank cheap quality gains + a trustworthy CI; item 2 is the single
biggest grade lever; item 5 is the strategic capability capstone.
**Recommended order: 1 → 3 → 4 → 2 → 5.**

## ITEM 1 (do first) — Kill the CI flake tax — audit P3.2 + P3.5

- **Why:** every merge is currently a manual re-run train because CI flakes
  under parallel load. Last sprint a unit test
  (`sophie-auto-imports.test.ts`) timed out at 5s under contention; the local
  fix (`beforeAll` hoist) shipped, but the ROOT cause — no vitest worker caps
  + an all-parallel axe-heavy suite — is unaddressed. Plus RolldownError
  noise from V8 coverage globbing `__fixtures__/*.yaml`.
- **Scope:** add `poolOptions` worker caps (or `pool:"forks"`) to the
  per-package vitest configs; split a `fullyParallel:false` axe Playwright
  project; exclude `.worktrees/**` + `**/__fixtures__/**` from coverage.
  CI stays authoritative.
- **Brainstorm:** worker-cap value (cpu-relative?); threads vs forks; which
  specs go in the serial axe project.
- **Done:** full `test:unit` + e2e green locally AND on CI first-try;
  RolldownError noise gone. Low-risk, config-level.

## ITEM 2 (headline; BRAINSTORM before code) — Accessibility: LaTeX→speech — audit P5.1, issue #210

- **Why:** Accessibility is the lowest category (16/20) = biggest single
  grade gain, AND the one standing axe `label`-rule-disable (MathML
  accessible-name). Spoken math differentiates accessible STEM + strengthens
  the SoTL/tenure story.
- **Needs:** a new dependency (speech-rule-engine vs MathJax SRE) + its OWN
  ADR + HITL approval before install. Integrate across equations (KaTeX),
  prose math, formative choices.
- **Brainstorm:** which SRE library; build-time pre-rendered speech vs
  runtime; scope (equations-only first vs prose+choices); composition with
  the existing KaTeX/`InlineMath` path. Write an ADR-shaped proposal to
  `docs/plans/`, get approval, then implement. The deep-design item.

## ITEM 3 — Code-quality cleanup — audit P3.1, P3.3, P3.4

- **Why:** finishes what #217 started + closes a hard-rule R9 violation.
- **Scope:** (a) reclassify deliberately-cohesive files
  `GRANDFATHERED → COHESIVE` (the new empty allowlist in
  `scripts/loc-budget.ts`) — `accumulator.ts` (1188) +
  `BlackbodyExplorer.tsx` already carry cohesion rationale in their
  grandfathered notes; judge each on merits (no auto-reclassify). (b) extend
  the LOC gate to scan `.astro` (blind to `TextbookLayout.astro` ~540). (c)
  extract the duplicated `VitePluginLike` interface
  (`figures-virtual-module.ts` + `course-spec-virtual-module.ts`) to a shared
  local type (R9-production hard rule). Low-risk.

## ITEM 4 — Cleanup tail — audit P3.6, P4.1–P4.4

- **Why:** the last A−→A+ polish; trivial individually, real as a batch.
- **Scope:** fix broken ADR cross-ref filenames in `chapter-components.md` +
  `formative-assessment-authoring.md` (R6); prune stale merged worktree
  `.worktrees/formative-parents-bundle/` (confirm before `git worktree
  remove`); wrap async-state-update `act()` warnings (SpacedReview /
  BlackbodyExplorer / Dropdown / LearningObjectives / HydrationAnnouncer
  tests); add an issue link to the `integration.ts` `noExternal` TODO; fix
  the stale "Coming in PR 5" note in `formative-assessment-authoring.md`.
  Fast, low-risk sweep.

## ITEM 5 (strategic capstone; BRAINSTORM before code) — Reasoning-OS contract: optional → enforced

- **Why:** ADR 0058's eight-role epistemic contract is currently
  optional/additive. Graduating it to required-for-NEW pedagogy components
  makes "Reasoning OS" structurally true rather than conventional — the
  thesis the vision docs sell (`docs/website/vision/reasoning-os/`). Highest
  strategic payoff for the tenure case.
- **Needs:** an ADR amendment + a design conversation on migration posture.
- **Brainstorm:** enforce for NEW components only (grandfather existing)?; the
  escape hatch for genuine chrome; which audit invariant enforces it + at
  what severity; interaction with
  `makeStaticComponents`/`makeChromeComponents`. Propose first, approve, then
  implement.

## Conventions + gotchas (learned the hard way)

- pnpm + turbo only; biome must finish a PR with **zero warnings** (grep full
  output, not tail). MyST content-warning gate = `grep -c "⚠"` (emoji only;
  don't match the words error/warning — Node stderr false-positives).
- Any PR touching an ADR `status:`/`validation:` block MUST regen
  `docs/website/status/validation.md` via `pnpm tsx
  scripts/regenerate-validation-index.mts` (build `@sophie/core` first). The
  I3 unit test catches drift.
- packed-smoke verify cycle: `cd examples/packed-smoke && pnpm sync && pnpm
  build && pnpm test:e2e`. **PORT GOTCHA:** a concurrent astr201 `astro dev`
  squats :4321/:4322 and Playwright's `reuseExistingServer` would hijack it →
  false results. Run e2e on an isolated port (e.g. 4410) via a throwaway
  playwright config with `reuseExistingServer:false`, then delete it (W3).
- Code changes → branch + PR + squash-merge (ADR 0055). Pure docs / dated
  reviews / registry updates can land directly on main. Worktrees live at
  `.worktrees/<branch>/`, never sibling dirs.
- CI flakes under load (this is literally ITEM 1); auto-merge is DISABLED and
  branch protection requires up-to-date-with-main → merges are a sequential
  train (update-branch → CI re-run → merge). **MERGING NEEDS EXPLICIT
  PER-MERGE TEXT CONFIRMATION each time** (the safety classifier enforces
  this) — never assume a prior "merge when green" carries to a new PR.
- DO NOT edit the `../astr201/` consumer repo from the Sophie session. Its
  optimizeDeps cleanup + `pnpm sync:sophie` is a follow-up THERE.

## How to proceed

Start with ITEM 1 (cheap, high-leverage, unblocks a clean merge train). Then
3 + 4 (quick quality batch). Then ITEM 2 as the headline — open it as a
brainstorm + ADR-shaped proposal, get approval before installing any
dependency or writing code. ITEM 5 last, also brainstorm-first. Each code
item = its own branch + PR; verify locally (typecheck, biome, test:unit,
packed-smoke where relevant, MyST) before push. Use the
`superpowers:brainstorming` skill for items 2 and 5; keep it conversational.
