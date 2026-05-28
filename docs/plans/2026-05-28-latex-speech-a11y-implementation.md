# Unified Math Rendering + LaTeX→Speech Accessibility — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task (fresh subagent per task + code review between tasks). This is the approved design from the 2026-05-28 ITEM 2 brainstorm. **HITL: confirm execution-time sub-decisions (below) with Anna; get explicit per-merge text confirmation for each PR.**

**Goal:** (1) Unify all *build-time-knowable* math onto a single build-time renderer so components stop owning KaTeX, then (2) add build-time SRE speech labels across every build-rendered surface so screen readers read the actual expression and axe's `label` rule is re-enabled platform-wide.

**Architecture:** One shared `renderMath(latex) → { html, mathml, speech }` in `@sophie/astro` (build layer; the *only* KaTeX + SRE site). Build-time consumers (rehype for MDX `$…$`, compound-expand for choices, registry/index prerender for `KeyEquation`/`EquationRef`/`Search`) bake `{html[, speech]}` into their data; components render that prerendered data as plain strings and **drop their `katex` import**. Genuinely-runtime math (`MathText` component-children inline math; `BlackbodyExplorer` live-value math) stays runtime and is *reported* (not labeled) by the audit invariant. `@sophie/components` never imports SRE (framework purity, ADR 0001).

**Tech Stack:** TypeScript, KaTeX `^0.16`, `speech-rule-engine` (SRE, PR-B only), `rehype-katex`, `remark-math`, `unist-util-visit`, hast/mdast, Vitest, Playwright + `@axe-core/playwright`, the equation/notation registry (ADR 0043) + pedagogy-audit cluster (ADR 0088).

**PR structure (Anna, minimize CI cycles + reviewability):**
- **PR-A** — unified build-time math rendering (ADR 0090). Rendering only; no speech. Must be independently green (VR snapshots stable, all components render prerendered html).
- **PR-B** — SRE speech layer + audit invariant (ADR 0089), built on PR-A's `renderMath`.

**Resolved decisions (Anna, 2026-05-28):**
1. Invariant severity = **WARNING for v1**; ADR 0089 documents graduation to ERROR once coverage is stable.
2. `.katex-display` scroll-region keeps its generic `"Equation, scrollable"` group label alongside the new content `aria-label` (e2e validates no double-speak).
3. Cover `EquationRef`/`KeyEquation`/`Search` math (registry/index-backed → prerendered).
4. **Scope line:** `MathText` children-math + `BlackbodyExplorer` dynamic math **stay runtime** (no component-children prerender pass); the invariant reports them as the deferred tail.

**Non-goals:** parallel `SophieEquation`/plot/animation schemas (EquationBiography + ADR 0058 own equation semantics), autofix, new CLI surface, pa11y/Lighthouse/eslint-jsx-a11y, the component-children `$…$` prerender pass, runtime SRE.

---

## Open execution-time sub-decisions (confirm with Anna early)

- **A. `<KeyEquation tex="literal">` (non-registry) handling.** Registry-backed `KeyEquation`/`EquationRef` consume prerendered html (drop runtime KaTeX). The *literal* `tex` prop is the same hard case as MathText. Verify usage first (`grep -rn 'KeyEquation tex=' ../*/src` across consumers). Then either **(a)** keep literal-tex on a runtime KaTeX path (KeyEquation dual-mode, retains a `katex` import for literals only), or **(b)** deprecate literal-tex → registry refs (fully drop the import; SoTA single-source, but a content migration). Recommend (b) if literal usage is near-zero, else (a).
- **B. VR stability.** Prerendered html must be byte-identical to today's runtime output (same KaTeX version + options) so visual-regression snapshots don't diff. If they diff, review intentionally + `pnpm test:vr` update only if the diff is correct.

---

# PR-A — Unified build-time math rendering (ADR 0090)

Branch/worktree: `feat/unified-math-rendering` at `.worktrees/feat-unified-math-rendering` (REQUIRED SUB-SKILL: superpowers:using-git-worktrees).

## Phase A1: Shared `renderMath` helper

**Files:**
- Create: `packages/astro/src/lib/math-render/render-math.ts`
- Create: `packages/astro/src/lib/math-render/katex-options.ts` (the single shared KaTeX config — extract the options currently duplicated across `KeyEquation`/`EquationRef`/`Search/ResultCard`/`render-text-with-math`)
- Test: `packages/astro/src/lib/math-render/render-math.test.ts`

**Behavior (PR-A scope):** `renderMath(latex: string) => { html: string; mathml: string }`. Uses the shared `katex-options`. (PR-B adds `speech`.) Memoized by latex (module-level Map; R8 HMR header comment).

TDD: test that `renderMath("R^2").html` contains KaTeX markup + `.mathml` contains `<math>`; same options as the current component call sites (compare against a snapshot of today's `KeyEquation` output to guarantee VR stability). Implement; pass; commit `feat(astro): shared build-time renderMath + katex-options`.

## Phase A2: Bake prerendered html into the registry/index

**Files:**
- `@sophie/core/schema` equation entry type: add optional `html?: string` (and `mathml?: string`) — `packages/core/src/schema/` equation entry.
- The build-time loader/extractor that populates equation entries (`packages/astro/src/lib/notation-registry-loader.ts` + the equation virtual-module/index path) calls `renderMath(entry.tex)` and stores `html`.
- The search-index build (Pagefind converter / `meta.tex` capture) stores prerendered `html` for `ResultCard`.

TDD per touchpoint: loaded entry gains `html`; implement; pass; commit `feat: prerender equation html into registry + search index`.

## Phase A3: Components consume prerendered html (drop `katex`)

**Files (each: component + its `.test.tsx`, R11 axe-on-render):**
- `packages/components/src/components/KeyEquation/KeyEquation.tsx` — render `entry.html` (registry) via `dangerouslySetInnerHTML`; remove `katex.renderToString` for registry forms. Handle literal `tex` per sub-decision A.
- `packages/components/src/components/EquationRef/EquationRef.tsx` — render `entry.html`; drop `katex` import.
- `packages/components/src/components/Search/ResultCard.tsx` — render `result.meta.html`; drop `katex` import.

TDD per component: test renders the prerendered html prop (no `renderToString` call) + jest-axe clean; confirm the component no longer imports `katex`; run `pnpm test:vr` (expect stable). Commit per component: `refactor(components): <X> consumes prerendered math html`.

> After this phase, `grep -rn "katex" packages/components/src --include=*.tsx | grep -v test | grep -v stories` should show ONLY `render-text-with-math.ts` + `BlackbodyExplorer/InlineMath.tsx` (the runtime tail) and possibly KeyEquation literal-mode (sub-decision A).

## Phase A4: ADR 0090 + amendments + gate

- Create `docs/website/decisions/0090-unified-build-time-math-rendering.md` (decision: single `renderMath`, components consume prerendered data, runtime tail = MathText + dynamic figures; amends ADR 0004 contract + ADR 0038/0043 registry).
- Amend ADR 0004 (component contract): math-bearing components consume prerendered html, not runtime KaTeX, for build-time-knowable math.
- Regen `docs/website/status/validation.md` (`pnpm tsx scripts/regenerate-validation-index.mts`, build `@sophie/core` first).
- **Full gate:** biome 0-warn · typecheck 11/11 · `turbo run test:unit` green + 0 RolldownError · `pnpm test:vr` stable · `pnpm lint:axe-render` · `pnpm lint:loc` exit 0 · smoke build + e2e on isolated port · MyST 0 ⚠.
- Open PR-A. **Get Anna's explicit merge confirmation; merge (squash, ADR 0055); sync main.**

---

# PR-B — LaTeX→speech accessibility (ADR 0089)

Branch off updated main after PR-A merges: `feat/latex-speech-a11y`.

## Phase B0: Add SRE

`pnpm --filter @sophie/astro add speech-rule-engine`; `pnpm install --frozen-lockfile` (no drift); commit `build(astro): add speech-rule-engine`.

## Phase B1: SRE engine + extend `renderMath` with speech

**Files:**
- Create `packages/astro/src/lib/math-render/speech-engine.ts` — memoized async SRE setup: `SRE.setupEngine({ locale:"en", domain:"clearspeak", style:"default" })` then `SRE.toSpeech(mathml)`. R8 HMR header comment. (If tests need it, set `process.env.SRE_JSON_PATH` to `node_modules/speech-rule-engine/lib/mathmaps` in `packages/astro/test-setup.ts` — add only if a "mathmaps not found" error surfaces.)
- Extend `render-math.ts`: `renderMath` becomes async, returns `{ html, mathml, speech }` (speech = `await speechFromMathml(mathml)`, ClearSpeak, "" on failure).

TDD: `(await renderMath("R^2")).speech` contains "squared"; empty/parse-fail → `speech === ""`. Commit `feat(astro): renderMath emits SRE ClearSpeak speech`.

## Phase B2: Rehype speech for MDX display + inline math

**Files:** Create `packages/astro/src/lib/pedagogy-index/transforms/katex-speech-a11y.ts` (sibling to `katex-display-a11y.ts`); wire into `mdx-config.ts:91` rehype chain AFTER `rehypeKatex` (`[rehypeKatex, rehypeKatexSpeech, rehypeKatexDisplayA11y]`).

Async rehype plugin: collect `.katex` nodes (sync `visit`), then `await Promise.all` → for each, read its `.katex-mathml` `<math>` (serialize via `hast-util-to-html`), `speechFromMathml`, set `aria-label` + `role="math"` on the `.katex` container, set `aria-hidden` on the `.katex-mathml` child. Idempotent (skip if `aria-label` already non-empty). TDD against a `katex.renderToString` fixture. Commit `feat(astro): rehypeKatexSpeech — aria-labels on inline+display math`.

## Phase B3: Formative choices + re-enable axe `label`

**Files:** `packages/astro/src/lib/mdx-plugins/compound-expand.ts` (~`:200-218`); `examples/smoke/e2e/formative-render.spec.ts`; new `examples/smoke/e2e/math-speech.spec.ts` (tag `{ tag: "@axe" }`).

- Choice inputs whose content is math: compute speech (`renderMath`/`speechFromLatex`) at build, add `aria-label` to the `<input>`. Make the choice path async (gather LaTeX → `await Promise.all` → assign); confirm unified transformer can be async.
- Remove `.disableRules(["label"])` from the practice axe test.
- New e2e: assert non-empty `aria-label`s on display + inline + choice math; condition-based waits.

TDD + e2e on isolated port. Commits: `feat(astro): SRE aria-labels on math-only formative choices`; `test(smoke): re-enable axe label rule (closes the lone disable)`.

## Phase B4: Speech on prerendered registry/index math

**Files:** the registry/search prerender (Phase A2 path) now also stores `speech` (renderMath already returns it); `KeyEquation`/`EquationRef`/`Search/ResultCard` set `aria-label={entry.speech}` + `aria-hidden` the inner MathML. TDD per component (aria-label from prop + jest-axe). Commit `feat(components): aria-label equations from build-time speech`.

## Phase B5: Audit invariant + artifact coverage

**Files:**
- Create `packages/astro/src/lib/pedagogy-audit/invariants/math-speech.ts` (+ test); register in `index.ts`/runner. WARNING (decision 1) for any build-time math without speech, AND report the runtime tail (MathText/dynamic-figure/literal-tex) as INFO so the gap is visible. Mirror `invariants/equation-registry.ts` + `FindingSink`.
- Record `{ total, labeled, failures[], runtimeUnspoken[] }` into the accumulator (artifact-scoped, ADR 0038 A3) from the transforms/prerender; the invariant reads it.
- `packages/astro/src/lib/pedagogy-audit/emit.ts`: add `mathA11y` section to `dist/.sophie/pedagogy-audit.json` (+ test).

Commit `feat(astro): math-speech coverage invariant + pedagogy-audit.json section`.

## Phase B6: ADR 0089 + amendments + gate

- Create `docs/website/decisions/0089-latex-speech-accessibility.md`: SRE-standalone-vs-MathJax decision (the C-vs-B trade), build-time-over-runtime, ClearSpeak, surfaces + runtime tail, EquationBiography complementarity (syntactic speech vs semantic narration), MathJax-Explorer future opt-in, **v1-WARNING → future-ERROR migration** + the deferred gaps (MathText children-math, dynamic-figure, literal-tex).
- Amend ADR 0088 (artifact gains `mathA11y`); amend ADR 0087 §"Two accessibility decisions (a)" (label-disable closed); update `docs/website/reference/wcag-21-aa.md` (`:166/:318/:446` roadmap rows → shipped via SRE; `label` now strict).
- Regen `validation.md`; full gate (as PR-A); open PR-B; **explicit merge confirmation**; merge; sync main.

---

## Success criteria (Definition of Done)

**PR-A:** single `renderMath` is the only static-math KaTeX site; `KeyEquation`/`EquationRef`/`Search` consume prerendered html and (per sub-decision A) drop `katex`; VR stable; ADR 0090 + 0004 amendment; all gates green.
**PR-B:** axe `label` re-enabled (practice page axe-clean); display + inline + choice + registry math carry SRE `aria-label`s (e2e); raw MathML `aria-hidden`; `pedagogy-audit.json` `mathA11y` coverage with the runtime tail reported; ADR 0089 + 0088/0087 amendments + wcag ref + validation.md; all gates green on CI.
**Both:** `@sophie/components` never imports SRE; biome 0-warn, typecheck 11/11, test:unit green + 0 RolldownError, MyST 0 ⚠.

## Conventions (apply throughout)

pnpm + turbo only; biome 0-warn (grep full output); MyST gate `grep -c "⚠"`; validation.md regen on any ADR status/validation change (I3 catches it); ADR 0055 branch+PR+squash; worktrees at `.worktrees/<branch>/`; e2e on an isolated port (throwaway config, `reuseExistingServer:false`, then delete — PORT GOTCHA); **per-merge explicit text confirmation each time**; R6–R12 review rules; HITL on every contract/ADR decision.
