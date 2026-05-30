# A+ Hardening Sprint (Path B — substance to 95) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task. Per-PR merge model:
> branch → PR → self-review → Anna approves → `gh pr merge --auto --squash`
> (per `feedback_merge_model_auto_after_review`). **Confirm with Anna before
> every push / PR-open / merge.** `main` is branch-protected (9 required checks).

**Goal:** Move Sophie engineering from **A (90)** to **A+ (95)** by fixing the
two genuinely-real debts (the un-centralized `dangerouslySetInnerHTML` trust
surface and the undocumented prerender/globalThis doctrine), graduating the
epistemic contract from declared-to-read, and clearing the LOC-warning files —
without chasing cheaper grade-points that leave real debt in place.

**Architecture:** Four work items across **1 direct-to-main docs commit + 3 PRs**.
Path B (chosen 2026-05-29): `B1 + H4 + S1 + H2`. Skips the coverage ratchet (H3)
and a11y contrast pass (H5) — both deferred, defensible (2,847 tests already
strong; a11y 18/20 already strong; H5 is a design-iteration rabbit-hole below
ASTR-201-shipping priority).

**Tech Stack:** TypeScript monorepo (pnpm + Turborepo), React framework-pure
components (ADR 0001), Zod schema (ADR 0003), Astro integration, Vitest + axe-core,
Biome, MyST docs. Lint-rule scripts are `tsx scripts/lint-*.ts` wired into the CI
`lint` job (`.github/workflows/ci.yml`).

---

## Honest framing (read before starting)

**This sprint sits *below* shipping ASTR 201 for tenure leverage** — five audits
running say so. A (90) is already strong. This is deliberate, time-boxed polish.
If ASTR 201 work surfaces mid-sprint, **it preempts**: park after whichever PR is
mid-flight (each PR is independently mergeable and banks its own rubric delta).

## Rubric math (the target)

Current **90** = Test 17 · Schema 19 · A11y 18 · Arch 17 · Build 19.

| Item | Category | Δ | Lands |
|---|---|---|---|
| **B1** doctrine reference doc | Build 19→20 | +1 | direct-to-main |
| **H4** split 4 LOC-warning files | Arch (the −1) | +1 | PR 1 |
| **S1** per-chapter role-coverage invariant | Schema 19→20 | +1 | PR 2 |
| **H2** `BuildTimeHtml` primitive + R14 lint | Arch (the −2) | +2 | PR 3 |

**Post-sprint:** Build 20 · Arch 20 · Schema 20 · Test 17 · A11y 18 = **95 (A+)**.
(Architecture maxes because H4 clears the −1 LOC *and* H2 clears the −2 innerHTML.)

## Ordering rationale

`B1 → H4 → S1 → H2`. Cheap/safe/independent first to bank points with minimal PR
overhead; the big migration (H2) last so its ADR 0093 can cite B1's doctrine doc
and so a mid-sprint ASTR-201 preemption loses the least in-flight work.

## Decisions locked with Anna (2026-05-29)

- **H2 enforcement = primitive + lint rule** (not convention-only). New review
  rule **R14** + `scripts/lint-no-raw-inner-html.ts` wired into CI `lint`.
- **S1 depth = per-chapter join** (not thin-static, not full-index-threaded).
  Join existing per-chapter component inventory → static component→role registry.
- **H2 ADR** = new short **ADR 0093**. **S1 ADR** = **ADR 0058 amendment**.

---

## Work Item 0 — B1: prerender/globalThis doctrine reference doc

**Lands directly on `main`** (pure docs, per `feedback_branch_pr_scope`). No PR.

**Why it's +1 (Build 19→20):** the standing Build −1 is "residual essential
complexity (externalized-prerender `import.meta.env` doctrine; globalThis
singletons) — undocumented." The lesson is scattered across ADRs 0022/0092,
`coding-standards.md`, and memory (`project_smoke_gate_catches_packaging_class`,
`feedback_always_register_virtual_module`, `feedback_pedagogy_store_doctrine`).
Consolidating it into one citable reference doc closes the −1.

**Files:**
- Create: `docs/website/reference/prerender-runtime-doctrine.md`
- Modify: `docs/website/reference/` MyST TOC (`myst.yml` or the reference index)
  to list the new doc
- Cross-link from: ADR 0022 (tsup builds), ADR 0092 (base-path), and
  `docs/website/contributing/coding-standards.md` — add a one-line "see also"
  pointer in each (docs-drift discipline: same-commit).

**Content (the doctrine, drawn from the recurring bug-class lessons):**
1. **Externalized-prerender boundary.** Why `@sophie/astro` externalizes certain
   imports at prerender; why `.astro`→`lib` value-imports need tsup entries
   (ADR 0091 dynamic discovery); the `import.meta.env` access pattern at
   prerender time and why bare-Node contexts (`ERR_UNKNOWN_URL_SCHEME` on
   `virtual:sophie/*`) break naive imports.
2. **globalThis-singleton doctrine.** Why cross-chunk state must live on
   `globalThis` (tsup `splitting:false` duplicates modules otherwise); the
   pedagogy-store SSR-setter + script-tag hydration pattern
   (`feedback_pedagogy_store_doctrine`); the always-register virtual-module
   pattern + R12 dispatcher narrowing (`feedback_always_register_virtual_module`).
3. **What the smoke/packed-smoke gates catch** that unit tests don't
   (`project_smoke_gate_catches_packaging_class`).
4. **Author checklist:** the 4–5 rules a contributor follows to not reintroduce
   the packaging-bug-class.

**W4 success criteria:**
- [ ] `docs/website/reference/prerender-runtime-doctrine.md` exists, ≥4 sections above.
- [ ] Listed in the MyST reference TOC (renders in nav).
- [ ] ADR 0022, ADR 0092, `coding-standards.md` each cross-link it.
- [ ] `npx mystmd build --html` → `grep -c "⚠"` returns **0** (no broken xrefs;
      MyST anchor-slug links per R6, not `#L\d+`).
- [ ] Commit on `main`: `docs(reference): prerender/globalThis runtime doctrine (B1)`.

**Risks:** none material (docs-only). Verify xref slugs resolve (R6).

---

## PR 1 — H4: split the 4 LOC-warning source files

**Branch:** `chore/h4-split-loc-warning-files`

**Why it's +1 (Arch, clears the −1):** ADR 0061 Rule 1 (focused files; 300 info /
500 warn / 800 err source budget). Clears all 4 `lint:loc` warnings; improves
AI-authorability. Pure structural hygiene — **no behavior change**, so the
existing tests are the safety net (W4: tests stay green, byte-identical behavior).

**The 4 files + split boundaries:**

### 1a. `compound-expand.ts` (638 → ~2 files)
- Modify: `packages/astro/src/lib/mdx-plugins/compound-expand.ts`
- Create: `packages/astro/src/lib/mdx-plugins/compound-expand.islands.ts`
- **Extract** the per-island expanders to the sibling: `expandFillBlank`
  (343–418), `expandTabs` (419–511), `rewriteSlots` (298–342),
  `injectControllerImports` (512–550), and the `FILL_BLANK`/`TABS` config consts
  (138–161). **Keep** in main: `CompoundIsland` interface, `COMPOUND_ISLANDS`
  registry, `REGISTRY_BY_PARENT`, `isFlow`/`isJsxEl` guards, `expandIsland`
  dispatch, `ExpansionMatch`, `expandCompoundIslands`, the remark plugin export.
- The sibling exports its expanders; main imports them.

### 1b. `compound-expand.test.ts` (940 → splits with source, ADR 0061)
- Modify: `packages/astro/src/lib/mdx-plugins/compound-expand.test.ts`
- Create: `packages/astro/src/lib/mdx-plugins/compound-expand.islands.test.ts`
- Move the FillBlank/Tabs-expander-specific test blocks to the new sibling test;
  keep registry/dispatch/plugin tests in the main test.

### 1c. `sophie-auto-imports.ts` (615 → ~2 files)
- Modify: `packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts`
- Create: `packages/astro/src/lib/mdx-plugins/sophie-auto-imports.registry.ts`
- **Extract** the registry data + `importSourceFor`: `SOPHIE_INTERACTIVE_COMPONENTS`,
  `SOPHIE_CONTENT_AUTO_IMPORT`, `SOPHIE_AUTO_IMPORTED_COMPONENTS`,
  `SOPHIE_COMPONENT_IMPORT_SOURCE`, `importSourceFor`, `SOPHIE_FORMATIVE_PARENTS`,
  `SOPHIE_FORMATIVE_CHILDREN`, `CLIENT_DIRECTIVE_NAMES` (119–256). **Keep** in
  main: all AST-walk logic (`isJsxElement`, `readStringAttr`, `hasAttr`,
  `hasAnyClientDirective`, `visitJsxElements`, `collectUsedAutoImportComponents`,
  `injectAutoImports`, `injectImportForSource`, `injectClientLoadDirectives`,
  `threadFormativeParentProps`, `walkAndThread`, `validateAndExtractCtx`,
  `formatPosition`, `threadAttrsOnChild`, the plugin export).
- Re-export the registry symbols from main if any are part of the package's
  public surface (check `packages/astro/src/**/index.ts` / consumers first).

### 1d. `TextbookLayout.astro` (526 → extract serialization helper)
- Modify: `packages/astro/src/components/TextbookLayout.astro`
- Create: `packages/astro/src/lib/serialize-pedagogy-hydration.ts`
- **Extract** the ~15 `JSON.stringify(pedagogy.X).replace(...)` hydration-payload
  builders (284–333) into `serializePedagogyForHydration(pedagogy, figureRegistry,
  courseSpec)` returning a typed object of pre-escaped JSON strings. The `.astro`
  frontmatter calls the helper and destructures. **Bonus:** the helper is now
  unit-testable (the `.replace()` XSS-escaping of `</script>` sequences gets a
  direct test it lacked) — pairs with H2's trust-surface theme.

**W4 success criteria:**
- [ ] `pnpm lint:loc` → **0 warnings** (was 4). Grep full output, not tail (per
      `feedback_biome_verification`).
- [ ] `pnpm turbo run test:unit --filter=@sophie/astro` → all green, **same count**
      (split moves tests, doesn't add/remove behavior).
- [ ] New `serialize-pedagogy-hydration.ts` has ≥1 test asserting `</script>`
      escaping (the security-relevant `.replace`).
- [ ] `pnpm exec biome check packages/ scripts/` → 0 errors / 0 warnings.
- [ ] `pnpm typecheck` → 11/11.
- [ ] No file in the diff exceeds 500 LOC source / 800 test.

**Risks:** Low-Med. `compound-expand` is gnarly MDX-AST mutation logic — the split
must be a pure move (no logic edits) so the existing tests fully cover it. If any
extracted function closes over module-private state, keep them together rather
than forcing the split. **Verify imports/exports compile before claiming done.**

---

## PR 2 — S1: per-chapter epistemic-role-coverage audit invariant

**Branch:** `feat/s1-role-coverage-invariant`

**Why it's +1 (Schema 19→20):** the standing Schema −1 is "no audit invariant yet
*consumes* declared roles." Today role is declared (`*_EPISTEMIC_ROLE` consts),
lint-enforced for *new* components (R13), and adjudicated (grandfathered → 0) —
but no *audit invariant reads it*. This graduates the contract from
declared-and-lint-gated to **consumed-by-the-pedagogy-audit**, underwriting the
Reasoning-OS thesis (ADR 0058) that the platform *measures* epistemic structure.

**Design (per-chapter join — locked with Anna):** build a static
component→role registry from the exported consts, join it to the audit's existing
per-chapter component inventory, emit a per-chapter role-coverage finding (which
of the 8 roles the chapter exercises). **No extractor/index-schema change** — the
join is at audit time against the static registry, keeping blast radius small.

**Files:**
- Create: `packages/components/src/epistemic-role-registry.ts` — a
  `COMPONENT_EPISTEMIC_ROLES: ReadonlyMap<string, EpistemicRole>` aggregating the
  per-component `*_EPISTEMIC_ROLE` consts (single source; DRY). Export from
  `packages/components/src/index.ts`.
- Create: `packages/astro/src/lib/pedagogy-audit/invariants/role-coverage.ts` —
  `checkRoleCoverage(ctx)`: for each chapter in the audit context, map its used
  pedagogy components → roles via the registry, emit a structured finding listing
  roles-present / roles-absent. **Severity = info/report** (coverage is
  descriptive, not a hard failure — a chapter legitimately may not use all 8).
- Create: `packages/astro/src/lib/pedagogy-audit/invariants/role-coverage.test.ts`
- Modify: `packages/astro/src/lib/pedagogy-audit/runner.ts` — import + register
  `checkRoleCoverage` (follow the existing `checkX` registration pattern, lines
  3–29).
- Modify: ADR `docs/website/decisions/0058-epistemic-component-contract.md` —
  add an `## Amendment` / `R-audit-consumes-role` section dated 2026-05-29
  documenting the graduation; update its `validation:` block if present.
- Modify: `docs/website/status/validation.md` — **regenerate** via
  `pnpm tsx scripts/regenerate-validation-index.mts` (build core first) IF the
  0058 `status:`/`validation:` block changed (per `feedback_validation_dashboard_regen`;
  I3 integration test enforces this on the unit job).
- Modify: `docs/website/reference/` epistemic/pedagogy-contract docs if they
  enumerate audit invariants (docs-drift, same PR).

**TDD order:**
1. Write `epistemic-role-registry.test.ts` asserting the registry maps a known
   component (e.g. `Observable` → `"observable"`, `CommonMisuse` → `"misconception"`).
   Run → fail. Implement registry. Run → pass.
2. Write `role-coverage.test.ts` with a fixture chapter using a known component
   set, asserting the finding lists the expected roles-present. Run → fail.
   Implement `checkRoleCoverage`. Run → pass.
3. Register in runner; add a runner-level test asserting the invariant fires.

**W4 success criteria:**
- [ ] `COMPONENT_EPISTEMIC_ROLES` registry derives from the consts (no hand-typed
      duplication — import the consts, don't re-declare strings).
- [ ] `checkRoleCoverage` emits a per-chapter finding consumed by the audit runner.
- [ ] `pnpm turbo run test:unit --filter=@sophie/astro --filter=@sophie/components`
      → green; new tests included.
- [ ] `pnpm lint:epistemic-role` → still 6 declare · 2 role-via-slot · 51 chrome ·
      0 grandfathered (the new registry must not perturb the gate).
- [ ] ADR 0058 amendment written (proposed to Anna *before* writing per HITL — see
      gate below); `validation.md` regenerated if status/validation block touched.
- [ ] R7 check: any silent-skip filter in the new invariant has a paired
      `findings.push` or audit invariant (grep gate in AGENTS.md).
- [ ] `npx mystmd build --html` → `grep -c "⚠"` = 0.

**HITL gate:** ADR 0058 is a locked, most-cited ADR. **Propose the amendment text
to Anna in-thread and get explicit approval before committing it** (AGENTS.md:
"Writing new ADRs / amendments — propose first").

**Risks:** Low-Med. Main risk is the join key — how the audit context identifies
"components used in a chapter." Verify the context already exposes per-chapter
component usage (check `context.ts` / existing `checkOrphans`,
`checkComposition`); if it doesn't, that's the boundary where S1 could grow —
**surface to Anna before expanding scope** (W1/W3).

---

## PR 3 — H2: `BuildTimeHtml` trust primitive + R14 lint rule

**Branch:** `feat/h2-buildtime-html-primitive`

**Why it's +2 (Arch, clears the −2):** the standing Arch −2 is "28
`dangerouslySetInnerHTML` across 11 files (un-centralized trust surface)."
Collapses 28 bespoke `biome-ignore` rationales to **one** sanctioned chokepoint
with a required, typed `trust` discriminator — turning a 28-way XSS-reasoning
surface into one enumerable type. The R14 lint rule makes it *enforced*, not
hoped (structural fix over targeted patch; SoTA-over-simple).

**The 3 trust-sources (all build-time, none runtime):**
| `trust` value | Provenance | Sites |
|---|---|---|
| `"katex-prerender"` | build-time KaTeX → equation/search registry (ADR 0090) | MathText, EquationRef, Search/ResultCard, KeyEquation math (×4) |
| `"mdx-serialized"` | `renderChildrenToHtml` build-time MDX AST → HTML | OMIFlow, RepVerbal, Objective bodies |
| `"extractor-body"` | build-time extractor / remark (mdast→hast→html) | KeyEquation biography (×7), GlossaryTerm (×2) |

**Design — `BuildTimeHtml`:**
```tsx
// packages/components/src/runtime/BuildTimeHtml.tsx
import type { ComponentPropsWithoutRef, ElementType, ReactElement } from "react";

/** Provenance of the HTML — every value is build-time-generated from a trusted
 *  pipeline, never runtime/user input. Adding a value = expanding the documented
 *  trust boundary (ADR 0093). */
export type BuildTimeHtmlTrust =
  | "katex-prerender"   // build-time KaTeX → registry (ADR 0090)
  | "mdx-serialized"    // renderChildrenToHtml build-time MDX serialization
  | "extractor-body";   // build-time extractor / remark mdast→hast→html

type BuildTimeHtmlProps<E extends ElementType> = {
  html: string | undefined;
  trust: BuildTimeHtmlTrust;     // REQUIRED — forces provenance declaration
  as?: E;
} & Omit<ComponentPropsWithoutRef<E>, "children" | "dangerouslySetInnerHTML" | "as">;

/** The single sanctioned `dangerouslySetInnerHTML` chokepoint. Enforced by
 *  `scripts/lint-no-raw-inner-html.ts` (R14): raw `dangerouslySetInnerHTML`
 *  anywhere else = CI red. See ADR 0093 + reference/prerender-runtime-doctrine. */
export function BuildTimeHtml<E extends ElementType = "span">({
  html, trust, as, ...rest
}: BuildTimeHtmlProps<E>): ReactElement {
  void trust; // documented + enumerable via the required prop; not read at runtime
  const Tag = (as ?? "span") as ElementType;
  // biome-ignore lint/security/noDangerouslySetInnerHtml: SINGLE sanctioned chokepoint. `html` is always build-time-generated (katex-prerender | mdx-serialized | extractor-body per the `trust` prop), never runtime input. ADR 0093.
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: html ?? "" }} />;
}
```

**Migration:** rewrite all 28 sites to `<BuildTimeHtml as={...} html={...}
trust={...} className={...} />`, deleting each site's `biome-ignore`. `MathText`
keeps its `renderTextWithMath` transform but routes the final injection through
`BuildTimeHtml trust="katex-prerender"`.

**R14 lint rule:**
- Create: `scripts/lint-no-raw-inner-html.ts` — greps `packages/*/src` for
  `dangerouslySetInnerHTML`, allowlisting only `runtime/BuildTimeHtml.tsx` (and
  its test). Any other occurrence (excluding `.test.`/comments) → non-zero exit
  with file:line. Model on `scripts/lint-axe-render.ts` structure (header
  comment with audit-traceable exclusions).
- Modify: `package.json` — add `"lint:no-raw-inner-html": "tsx scripts/lint-no-raw-inner-html.ts"`.
- Modify: `.github/workflows/ci.yml` — add a `run: pnpm lint:no-raw-inner-html`
  step in the `lint` job (next to `lint:axe-render` / `lint:epistemic-role`).
- Modify: `AGENTS.md` — add **R14** to the standing R6–R13 review-rules section
  (one-paragraph entry: rule, grep gate, originating finding "H2 / ADR 0093").

**ADR 0093:**
- Create: `docs/website/decisions/0093-build-time-html-trust-primitive.md` —
  decision: one `BuildTimeHtml` chokepoint; the 3-value `trust` taxonomy; R14
  enforcement; relationship to ADR 0004 (component contract), 0030 (author-trust
  boundary), 0090 (KaTeX prerender). Cite B1's doctrine doc.
- Modify: `docs/website/decisions/` ADR index / TOC; regenerate
  `docs/website/status/validation.md` (new ADR has a `validation:` block).
- Modify: `docs/website/reference/component-contract.md` (and
  `chapter-components.md` if it documents these components' HTML-body props) —
  same-PR docs-drift.

**axe tests (ADR 0004 mandatory, R11):**
- Create: `packages/components/src/runtime/BuildTimeHtml.test.tsx` — render with
  each `trust` value + an `as` override; assert markup + `toHaveNoViolations`.
- The 11 migrated components' existing axe tests must stay green (behavior
  unchanged — same emitted DOM).

**W4 success criteria:**
- [ ] `grep -rn "dangerouslySetInnerHTML" packages/*/src --include='*.tsx'
      --include='*.ts' | grep -v '\.test\.'` → **exactly 1** (BuildTimeHtml.tsx).
- [ ] `pnpm lint:no-raw-inner-html` → exit 0; and a deliberate re-introduction in
      a scratch file → exit non-zero (prove the gate bites, then revert).
- [ ] All 11 components' axe tests + new BuildTimeHtml axe test → green.
- [ ] `pnpm turbo run test:unit` → 2,847+ green (new tests added; **no
      regressions** — same DOM emitted by migrated components).
- [ ] `pnpm exec biome check packages/ scripts/` → 0/0 (every removed
      `biome-ignore` accounted for; the one remaining is in BuildTimeHtml.tsx).
- [ ] `pnpm typecheck` → 11/11 (polymorphic `as` generics resolve at all sites).
- [ ] e2e smoke + packed-smoke green (rebuild dist first per
      `project_smoke_dist_rebuild_required` — KaTeX/glossary HTML actually renders).
- [ ] ADR 0093 written (**proposed to Anna first** per HITL); `validation.md`
      regenerated; R14 added to AGENTS.md.
- [ ] `npx mystmd build --html` → `grep -c "⚠"` = 0.

**HITL gate:** **Propose ADR 0093 + the R14 wording to Anna and get approval
before committing.** New ADR + new review rule = architectural decision points.

**Risks:** Med. (1) Polymorphic `as` typing across heterogeneous element types
(`span`/`div`/`dd`) — verify generics don't force `as any` (would violate the
0-`as any` invariant; if they fight, prefer a small explicit overload set over
escaping the type system). (2) `KeyEquation` has 11 sites with varied
wrapping/`data-epistemic-role` attrs — migrate carefully, each keeps its
attrs via `{...rest}`. (3) Smoke gate is the real proof KaTeX/glossary bodies
still render (unit tests pass on stale dist — rebuild between fix and e2e).

---

## Cross-PR verification gates (every PR)

Run before declaring any PR done (per AGENTS.md conventions + memory):
- `pnpm exec biome check packages/ scripts/` → grep full output for
  `error`/`warning`, **0 each** (not tail-only).
- `pnpm typecheck` → 11/11.
- `pnpm lint:loc`, `lint:axe-render`, `lint:epistemic-role`
  (+ `lint:no-raw-inner-html` after PR 3) → all exit 0.
- `npx mystmd build --html` → `grep -c "⚠"` = 0 (R6 anchor slugs).
- Standing R-rules R6–R13 (+R14): self-review the diff against each.
- `pnpm install --frozen-lockfile` if any PR touches deps (none expected).
- Smoke/packed-smoke for PR 3 (component DOM changes).

## Deferred (explicitly out of scope)

- **H3** coverage ratchet — defensible skip; 2,847 tests strong; `cli` already
  has thresholds as the future seed. Reopen in a later session.
- **H5** a11y contrast / 2 axe disables — design-iteration rabbit-hole; its own
  aesthetic session, below ASTR-201 priority.

If both later land: 95 → 99. Not this sprint.
