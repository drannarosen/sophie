# Compound-Island Children Transform — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Full Sophie discipline per AGENTS.md (W1–W4, R6–R12, zero biome warnings, axe-on-render). HITL before every push / PR / merge. **Task 1 is a feasibility spike — do NOT write the generalized transform or convert components until Task 1's smoke build + Playwright check prove the mechanism.**

**Goal:** Make Sophie's interactive compound components (`<MCQ>`, `<MultiSelect>`, `<FillBlank>`, `<Tabs>`) actually render in the Astro build by replacing the broken "parent React island introspects its children" pattern with a compile-time expansion into **static structural HTML + a thin childless controller island**, preserving full hydration of any nested interactive components.

**Architecture:** A remark plugin expands `<MCQ><MCQChoice correct>…</MCQChoice></MCQ>` at MDX-compile time into static native form markup (`<fieldset>` / `<label>` / `<input type="radio">`) with each choice **body kept as live MDX content** (so nested islands like `<GlossaryTerm>` hydrate normally), plus a **childless** `<MCQController client:load>` island that restores/persists selection via `useInteractive` and stamps reveal/correct affordances by operating on the static DOM. This is Astro's native "static HTML + islands of interactivity" model. Same pattern fixes the latently-broken shipped `<Tabs>`.

**Tech Stack:** remark/mdast (`mdast-util-mdx-jsx`, `unist-util-visit`), Astro 6 islands + `@astrojs/react` (`client:load`), native HTML form controls, `useInteractive` (IndexedDB) per ADR 0007, Vitest + jest-axe, Playwright (build-level render assertion).

---

## Context — why this work (condensed root-cause record)

PR α (formative parents bundle) built five components TDD-green at the unit level, but **MCQ / MultiSelect / FillBlank render empty in the real Astro build** (SSR *and* post-hydration; confirmed via smoke-build HTML + Playwright on the preview server). Root cause, proven:

> When an Astro `client:load` React island has **component children**, Astro renders each child into its own nested island inside a `<template data-astro-template>` and passes the parent **no introspectable children** at SSR. So `Children.toArray(children).filter(c => c.type === Child)` finds nothing → the parent renders empty.

The shipped `<Tabs>` uses the identical pattern and renders an **empty `<div role="tablist">`** — it is **latently broken** (no test asserted its triggers render). There is no working precedent in Sophie for "interactive parent composing declarative children."

Rejected fixes (with evidence): runtime introspection (the bug), React Context (provider not an ancestor across islands — PR-4 `FormativeContext` finding), `cloneElement` injection (parent never sees real children), serialize-bodies-to-HTML-prop (flattens → nested islands lose hydration), `experimentalReactChildren` (breaks KaTeX/HTML `style` strings site-wide), `client:only` (no SSR). **Decision (Anna, 2026-05-27): static-structure + controller-island, implemented correctly with full nested hydration. New ADR. Fix Tabs in this effort. Attempt FillBlank inline slots. Land inside PR α.**

The unit tests missed this because `@testing-library/react` has no Astro island boundary. **This plan adds a build-level Playwright render assertion (Task 9) — the check that would have caught it.**

---

## Architecture detail

### The expansion transform (remark, runs LAST)

A new remark plugin `sophieCompoundExpandRemarkPlugin` at
`packages/astro/src/lib/mdx-plugins/compound-expand.ts`, registered in
`sophieMdxOptions.remarkPlugins` **after `pedagogyIndexRemarkPlugin`** (so the
formative extractor still sees the authored `<MCQ><MCQChoice>` shape — extraction
is unchanged). It:

1. `visit`s `mdxJsxFlowElement` nodes whose `name` is a registered compound
   parent (`MCQ`, `MultiSelect`, `Tabs`; `FillBlank` uses the inline-slot
   variant, §FillBlank).
2. Reads the parent's `course`/`unit`/`id` (string-literal attrs; reuse
   `readStringAttr`-style helpers).
3. Collects the registered declarative-child elements (`MCQChoice` etc.),
   reading each child's attrs (`correct` boolean-presence, optional `id`) and
   keeping its **body children** (live mdast nodes).
4. **Replaces** the parent node with a static subtree (all lowercase JSX = DOM
   elements, so no import needed): a labelled `<section>` → `<fieldset>` →
   one `<label><input type="radio" name={id} value={slug} data-correct?/>{body}</label>`
   per choice (the `{body}` is the moved live mdast — nested islands intact) →
   plus a **childless** `<MCQController course unit id itemsJson="[…]"/>` element.
   `itemsJson` carries `[{slug, correct}]` (serializable: slugs + booleans only,
   **no bodies**) for the controller's persistence + correct-marking.
5. Injects the controller's import + `client:load` itself (reuse the
   `buildImportEsmNode` + boolean-attr helpers from `sophie-auto-imports.ts`,
   extracted to a shared util), because the auto-imports plugin already ran
   earlier in the chain.

**Key correctness property:** the choice bodies are never serialized — they stay
live MDX, so `<GlossaryTerm>`/`<EquationRef>`/etc. inside a choice hydrate as
normal page islands. The controller is **childless** → no introspection problem.

### The controller island

`packages/components/src/components/MCQ/MCQController.tsx` — a `client:load`
React island with NO children. On mount it:
- reads `itemsJson` (slugs + correct flags),
- finds its native radios via a stable wrapper ref / `name={id}`,
- restores the persisted selection from `useInteractive<string>(course, unit, `mcq:${id}:selected`, "")` and writes back on `change`,
- (reveal-only) stamps `data-correct` styling hooks; no auto-grading in v1.

Native `<input type="radio" name>` provides roving focus + arrow-key nav +
single-select + a11y from the browser — so we **drop `@radix-ui/react-radio-group`
and `@radix-ui/react-checkbox`** (added earlier in PR α). MultiSelect → native
checkboxes. Tabs → an ARIA tab-controller island over static panels. FillBlank →
native text inputs inline + a persistence controller.

### Per-component mapping

| Authored | Expands to (static) | Controller island | Native control |
|---|---|---|---|
| `<MCQ>`/`<MCQChoice>` | `<fieldset role=radiogroup>` + labels | `<MCQController>` | `input[type=radio]` |
| `<MultiSelect>`/`<MultiSelectChoice>` | `<fieldset>` + labels | `<MultiSelectController>` | `input[type=checkbox]` |
| `<FillBlank>` + inline `<FillBlankSlot>` | prompt prose with inline `<input>` at slot sites | `<FillBlankController>` | `input[type=text]` |
| `<Tabs>`/`<Tab>` | `<div role=tablist>` buttons + `<div role=tabpanel>` panels | `<TabsController>` | ARIA tabs |

### Stage-ordering invariant (critical)

`remarkPlugins: [gfm, frontmatter, sophieAutoImports, remark-math, skillReview,
pedagogyIndex, **sophieCompoundExpand**]`. Expansion is LAST: extractor sees
authored shape; expansion self-handles controller import + `client:load`.

---

## Task 1 — Feasibility spike (MCQ only): prove the mechanism end-to-end

**Goal:** prove a remark expansion can turn `<MCQ><MCQChoice>` into static
`<fieldset>` + a hydrating childless `<MCQController>` island, with a nested
island in a choice body ALSO hydrating — verified in the real smoke build +
Playwright. **No generalization until this passes.**

**Files:**
- Create: `packages/astro/src/lib/mdx-plugins/compound-expand.ts` (MCQ-only, minimal)
- Modify: `packages/astro/src/mdx-config.ts` (append to `remarkPlugins`)
- Create: `packages/components/src/components/MCQ/MCQController.tsx`
- Modify: `packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts` (`SOPHIE_INTERACTIVE_COMPONENTS` += `MCQController`; remove `MCQ`/`MCQChoice` later)
- Modify: smoke `practice.mdx` — MCQ block includes a nested `<GlossaryTerm>` in one choice body

**Steps:**
1. Write `MCQController.tsx`: childless island; props `{course, unit, id, itemsJson}`; `useInteractive` selection; mount effect wires radios by `name={id}` within a `[data-mcq-controller={id}]` wrapper. (No test yet — spike.)
2. Write minimal `compound-expand.ts`: visit `mdxJsxFlowElement name==="MCQ"`; build `<section><fieldset>…labels…</fieldset><MCQController …/></section>`; move choice bodies into labels; inject `MCQController` import + `client:load`. Register in `mdx-config`.
3. Smoke build: `pnpm turbo run build --filter=@sophie/components --force && pnpm --filter smoke build`. Expect exit 0; practice HTML has `role="radio"` ×3 + the nested `<astro-island component-export="GlossaryTerm">` inside a choice.
4. Playwright: serve preview, navigate `/units/chrome-primitives-demo/practice`, assert `role=radio`===3, click a radio → persisted, and the nested GlossaryTerm hydrates (its trigger is interactive).
5. **Decision gate:** if green → proceed to Task 2. If the injected controller doesn't hydrate or nested island breaks → STOP, report to Anna (mechanism needs rethink).
6. Commit the spike: `git add … && git commit -m "spike: MCQ compound-expand transform + controller island (Task 1)"`.

---

## Task 2 — Generalize the transform + registry

**Files:** `compound-expand.ts` + `compound-expand.test.ts`; extract shared
import/attr helpers from `sophie-auto-imports.ts` into
`packages/astro/src/lib/mdx-plugins/_shared/jsx-attrs.ts` (R9: one canonical home).

**Steps (TDD):** write failing mdast-in/mdast-out tests for the transform
(MCQ + MultiSelect + Tabs shapes; slug derivation; `data-correct`; childless
controller injected; idempotency; non-compound nodes untouched) → implement the
generalized `COMPOUND_ISLANDS` registry + expansion → green → commit.

---

## Task 3 — MCQ component (full conversion + tests)

Convert `MCQ` from a Radix island to: the transform owns structure;
`MCQController` owns behavior. Delete `MCQ.tsx`'s `Children`/Radix code.
**Files:** `MCQ/MCQController.tsx` (+ `.test.tsx` with render+axe, R11),
`MCQ/MCQ.schema.ts` (controller props), `MCQ/MCQ.module.css` (native-radio
styling), `MCQ/index.ts`, barrel. Remove `@radix-ui/react-radio-group` usage.
TDD: controller restores persisted selection; marks `data-correct`; axe-clean.

---

## Task 4 — MultiSelect (native checkboxes + controller)

Mirror Task 3 with `input[type=checkbox]` + `MultiSelectController` (multi-value
`useInteractive<string[]>`). Remove `@radix-ui/react-checkbox` usage. TDD + axe.

---

## Task 5 — FillBlank (inline-slot variant)

Transform renders `<FillBlank.Prompt>` prose with each `<FillBlankSlot id correct/>`
replaced by an inline `<input type="text" data-fb-slot data-slot-id=…>`; bodies/
prose around slots stay live. `<FillBlankController course unit id>` (childless)
wires each `[data-fb-slot]` input to `useInteractive(`fillblank:${id}:${slotId}:value`)`.
TDD + axe + duplicate-slot-id throw (in the transform).

---

## Task 6 — Tabs fix (same mechanism)

Transform `<Tabs>`/`<Tab>` → `role=tablist` buttons + `role=tabpanel` panels
(panels keep live `<Tab>` bodies → nested islands hydrate) + `<TabsController>`
(ARIA selected-state, no persistence needed unless desired). Add the **regression
test** that asserts triggers render (the missing test that hid the bug). TDD + axe.

---

## Task 7 — Extractor / audit reconcile

Confirm the formative extractor + AS-1..5 still operate on the **authored**
`<MCQ><MCQChoice>` shape (expansion runs after extraction — verify ordering test).
Update extractor child-name reads to the standalone `MCQChoice`/`MultiSelectChoice`/
`FillBlankSlot` names (done partially in PR α). Re-run extractor/audit unit suites.

---

## Task 8 — Smoke fixtures + clean author surface

Finalize `practice.mdx`: one clean callsite per component (no imports, no
`client:load`, no `course`/`unit`/`parentId` on reveals), incl. one nested
interactive component in a choice body (hydration proof), + AS-2/AS-3 WARN
fixtures inline + AS-1/4/5 ERROR fixtures in `practice-audit-errors.mdx.disabled`
+ meta-test (per original plan Task α.V.2).

---

## Task 9 — Build-level render assertion (the gap-closer)

**Files:** `examples/smoke/e2e/formative-render.spec.ts`. Playwright: build smoke,
load `/units/chrome-primitives-demo/practice`, assert MCQ `role=radio`===N,
MultiSelect `role=checkbox`===N, FillBlank `input[type=text]`===N, Tabs
`role=tab`===N, AND a nested-in-choice island hydrates. Wire into CI e2e. This is
a standing guard for all compound islands.

---

## Task 10 — ADR + docs + validation

- New ADR (next free number): "Compile-time expansion for interactive compound
  islands (static structure + controller island)." Cross-link from ADR 0004
  (component contract) + ADR 0073 Amendment 1. Document the native-controls
  decision + dropping the two Radix deps + the standing render-assertion rule.
- Update `chapter-components.md` + `formative-assessment-authoring.md`.
- Backfill ADR 0073 A1 `validation.evidence`; regen `validation.md`.
- File the `<Tabs>`-was-broken bug note in the ADR's context.

---

## Task 11 — Full gate + HITL ship

`pnpm exec biome check` (0) · `pnpm turbo run typecheck` · unit suites ·
`pnpm lint:axe-render` · `pnpm --filter smoke build` (component-rebuild first) ·
`npx mystmd build --html` → `grep -c "⚠"` 0 · `pnpm install --frozen-lockfile`
(deps removed) · `pnpm test:e2e` incl. the new render-assert spec · R6/R7/R9/R10/
R11 spot-checks. Then **HITL** → push → PR (bundles PR α + this transform) → VR
baseline dance (new stories) → CI → squash-merge → cleanup → v2 issue.

---

## Verification — what "done" looks like

1. `/units/<unit>/practice` renders working MCQ radios, MultiSelect checkboxes,
   FillBlank inputs, and (Tabs page) real tab triggers — verified by Playwright,
   not just unit tests.
2. A nested interactive component inside a choice body **hydrates** (the
   correctness bar that ruled out serialization).
3. `<Tabs>` renders triggers (regression test green) — latent bug fixed.
4. AS-1..5 fire on the authored shape; QuickCheck + NumericQuestion still work.
5. Two Radix deps removed; lockfile clean. Zero biome warnings; R6–R12 clean;
   axe-on-render + build-level render-assert both green.
6. New ADR + docs landed in the same PR.
