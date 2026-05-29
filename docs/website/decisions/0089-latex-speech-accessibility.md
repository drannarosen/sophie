---
date: 2026-05-28T00:00:00.000Z
tags:
  - accessibility
  - math-rendering
  - speech-rule-engine
  - build
  - audit
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-28"
  evidence:
    - kind: test
      ref: packages/astro/src/lib/math-render/speech-engine.test.ts
      date: "2026-05-28"
      notes: "`speechFromMathml(mathml)` returns SRE ClearSpeak speech (`R^2` → contains \"squared\", not MathSpeak's \"superscript\"); empty/non-MathML/parse-fail → `\"\"` (never throws, mirroring KaTeX `throwOnError: false`); the engine memoizes setup once per process via the explicit `json` mathmaps path."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-index/transforms/katex-speech-a11y.test.ts
      date: "2026-05-28"
      notes: "`rehypeKatexSpeech` stamps a content `aria-label` + `role=\"math\"` on each `.katex` container and `aria-hidden` on its `.katex-mathml` child; idempotent (skips a node that already carries a non-empty `aria-label`); records each expression into the math-speech coverage collector."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-index/transforms/choice-speech-a11y.test.ts
      date: "2026-05-28"
      notes: "`rehypeChoiceSpeech` reads the speech `rehypeKatexSpeech` already computed for a math-only formative choice and writes it as `aria-label` on the choice `<input>` (selected by the `data-choice-input` marker), closing the axe `label` blind-spot without re-invoking SRE."
    - kind: test
      ref: packages/astro/src/lib/math-render/enrich-equations-speech.test.ts
      date: "2026-05-28"
      notes: "`enrichEquationsWithSpeech` populates `entry.speech` from the PRIMARY `tex` of each registry equation via `speechFromMathml(renderMath(tex).mathml)`; idempotent (skips entries already carrying speech, so the per-page + build:done double-run records each entry exactly once); empty results are not assigned (the `NonEmptyString` field stays absent and the audit reports the gap)."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit/invariants/math-speech.test.ts
      date: "2026-05-28"
      notes: "`checkMathSpeech` emits MA-1 WARNING (non-fatal, v1) aggregating every build-time math surface — mdx/choice/registry — that produced empty SRE speech, with per-kind counts + failure details; MA-2 INFO coverage summary; MA-3 INFO runtime tail; MA-4 INFO deferred registry tail."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit/math-speech-coverage.test.ts
      date: "2026-05-28"
      notes: "The build-scoped coverage collector increments `total` always, `labeled` on success, and pushes a `{ kind, detail }` failure record otherwise; `getMathSpeechCoverage` returns a defensive copy; `resetMathSpeechCoverage` exists for test isolation only."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit/emit.test.ts
      date: "2026-05-28"
      notes: "`dist/.sophie/pedagogy-audit.json` gains a `mathA11y` section carrying the coverage snapshot; `artifact_version` bumped 0.1 → 0.2 (amends ADR 0088)."
    - kind: test
      ref: examples/smoke/e2e/math-speech.spec.ts
      date: "2026-05-28"
      notes: "Build-level Playwright + axe gate: display + inline + choice math carry non-empty `aria-label`s on the real built pages; the raw `.katex-mathml` is `aria-hidden`; the `.katex-display` scroll-region's generic group label coexists with the content `aria-label` without double-speak (resolved-decision 2)."
    - kind: test
      ref: examples/smoke/e2e/formative-render.spec.ts
      date: "2026-05-28"
      notes: "The lone `.disableRules([\"label\"])` is removed — the practice + reading pages run axe with the `label` rule STRICT and stay clean, proving math-only formative choices now carry an explicit accessible name (closes ADR 0087 §\"Two accessibility decisions (a)\")."
  notes: |
    Shipped in PR-B of the unified-math-rendering / LaTeX-speech sprint
    (plan: docs/plans/2026-05-28-latex-speech-a11y-implementation.md),
    built on ADR 0090's `renderMath`. The `math-speech` invariant (MA-1) is
    WARNING (non-fatal) for v1 per resolved-decision 1 — the deferred
    runtime/registry tail (MathText children-math, BlackbodyExplorer dynamic
    math, registry `rearranged_forms`/`constants`) means a zero-failure build
    is not yet guaranteed corpus-wide. ADR 0089 graduates MA-1 to ERROR once
    coverage of the build-time surfaces is stable; the validation status is
    `validated` for the WARNING contract that ships here.
---

# ADR 0089: LaTeX→speech accessibility (build-time SRE labels)

:::{admonition} ADR metadata

- **Status**: shipped
- **Deciders**: anna
- **Builds on**: [0090](./0090-unified-build-time-math-rendering.md) (the
  shared `renderMath` chokepoint emits the MathML this layer feeds to SRE)
- **Amends**: [0088](./0088-pedagogy-audit-build-artifact.md) (the
  `pedagogy-audit.json` artifact gains a `mathA11y` section;
  `artifact_version` 0.1 → 0.2), [0087](./0087-compound-island-transform.md)
  (the axe `label` disable from §"Two accessibility decisions (a)" is now
  CLOSED — re-enabled platform-wide via build-time `aria-label`s)
- **Related**: [0001](./0001-platform-not-monorepo.md) (framework purity —
  `@sophie/components` never imports SRE; speech is computed in the build
  layer and consumed as a plain string),
  [0038](./0038-pedagogy-index-pattern.md) (the sync remark extractor that
  forced the async-at-seams shape below),
  [0058](./0058-epistemic-component-contract.md) +
  [0046](./0046-equation-biography.md) (EquationBiography's
  *semantic* narration, complementary to SRE's *syntactic* speech)
:::

## Context

[ADR 0090](./0090-unified-build-time-math-rendering.md) made a single
`renderMath(latex, { displayMode }) => { html, mathml }` the only
build-time KaTeX site and deliberately carried `mathml` alongside `html`
even though PR-A consumed only the html. That MathML is the input this
work needed: a chokepoint where every build-rendered expression can be
converted to screen-reader speech exactly once.

Before this work, math was inaccessible in two distinct ways:

1. **Raw KaTeX MathML reads poorly.** `rehype-katex` emits each
   expression as a `<span class="katex">` containing a `.katex-mathml`
   (`<math>` for assistive technology) and a `.katex-html` (visual
   glyphs). Screen readers either read the MathML element-by-element
   ("R superscript 2 baseline") or, where MathML support is patchy,
   read nothing useful.
2. **axe could not name math-only formative choices.** ADR 0087 lowered
   `<MCQ.Choice>` / `<MultiSelect.Choice>` to `<label><input>…</label>`;
   when the choice content is math, axe's `label` rule reports the radio
   as nameless because axe does not implement accessible-name
   computation over presentation MathML. ADR 0087 §"Two accessibility
   decisions (a)" disabled the `label` rule on that one call site as a
   tooling blind-spot, leaving the rule off platform-wide in that spec.

Most build-time-knowable math is addressable at build: MDX `$…$` (via
`rehype-katex`), registry equations (ADR 0043), and formative choices.
The genuine exceptions are *runtime* — `MathText` component-children
inline math and `BlackbodyExplorer`'s live-value math — which change per
render and cannot be build-spoken.

## Decision

**Generate SRE ClearSpeak speech at build time for every build-rendered
math surface, expose it as an `aria-label`, hide the raw MathML from the
accessibility tree, and re-enable the axe `label` rule platform-wide.**
Built on ADR 0090's `renderMath`.

### Speech is a separate async function, not a field on `renderMath`

`renderMath` stays **synchronous** (`{ html, mathml }`) because the
registry prerender runs inside Astro's *synchronous* remark transformer
(ADR 0038) — making `renderMath` async would force a refactor of the
whole pedagogy-index pipeline. Speech is therefore a *separate* async
helper, `speechFromMathml(mathml)` in
[`packages/astro/src/lib/math-render/speech-engine.ts`](../../../packages/astro/src/lib/math-render/speech-engine.ts),
that consumes the `mathml` `renderMath` already returns. It is awaited at
**async seams** rather than inside the sync transformer.

### Three labeled build-time surfaces (the async seams)

1. **MDX inline + display math** — an async rehype plugin
   [`rehypeKatexSpeech`](../../../packages/astro/src/lib/pedagogy-index/transforms/katex-speech-a11y.ts),
   wired after `rehypeKatex` in the MDX rehype chain
   (`[rehypeKatex, rehypeKatexSpeech, rehypeKatexDisplayA11y]`). It
   collects `.katex` nodes synchronously, resolves speech for all of
   them via `Promise.all`, sets the speech as `aria-label` + `role="math"`
   on the `.katex` container, and marks the `.katex-mathml` child
   `aria-hidden` so the label is read once. It composes with
   `rehypeKatexDisplayA11y`: the two touch different elements — this one
   labels the inner container; the display plugin labels the outer
   `.katex-display` scroll region with the generic "Equation,
   scrollable" group label. Both coexist (resolved-decision 2; the e2e
   validates no double-speak).
2. **Math-only formative choices** — an async rehype plugin
   [`rehypeChoiceSpeech`](../../../packages/astro/src/lib/pedagogy-index/transforms/choice-speech-a11y.ts)
   reads the speech `rehypeKatexSpeech` *already computed* for the
   `.katex` subtree inside a choice label and writes it as `aria-label`
   on the choice `<input>` (selected via the `data-choice-input` marker
   ADR 0087 emits). One SRE computation per expression; the choice's
   accessible name stays byte-identical to the inline math's. This is
   what closes ADR 0087's `label` disable.
3. **Registry equations** — an idempotent async helper
   [`enrichEquationsWithSpeech`](../../../packages/astro/src/lib/math-render/enrich-equations-speech.ts)
   computes speech for the PRIMARY `tex` of each registry entry and
   writes `entry.speech` in place. It is awaited at two seams:
   `TextbookLayout` frontmatter (so the client store payload carries
   speech) and the `astro:build:done` hook (before the Pagefind
   converter, so search results carry speech too). The sync remark
   extractor is untouched. `KeyEquation` / `EquationRef` /
   `Search/ResultCard` set `aria-label={entry.speech}` and
   `aria-hidden` their inner MathML.

### Build-scoped coverage collector + WARNING invariant

A **build-scoped** collector
([`math-speech-coverage.ts`](../../../packages/astro/src/lib/pedagogy-audit/math-speech-coverage.ts))
records `{ total, labeled, failures[] }` — NOT the artifact-scoped
accumulator (ADR 0038 A3), because rehype transforms receive only
`(tree)`: no artifact id, no accumulator handle. Each of the three
surfaces calls `recordMathSurface` once per expression. The
[`math-speech` invariant](../../../packages/astro/src/lib/pedagogy-audit/invariants/math-speech.ts)
reads the snapshot at `astro:build:done` and emits **MA-1 WARNING**
(non-fatal, v1) for any build-time math surface with empty speech, plus
**MA-2/3/4 INFO** for the coverage summary, the runtime tail, and the
deferred registry tail. The artifact gains a `mathA11y` section
(`artifact_version` 0.1 → 0.2; amends ADR 0088).

### SRE configuration

SRE is **`speech-rule-engine` 4.1.4** (STABLE, pinned — *not* the
maintainer's `latest` 5.0.0-rc.1). It is a CJS UMD default-import and
requires a `globalThis.require` shim (mirroring SRE's own
`lib/require.mjs` vendor pattern) because SRE's bare `require()` is
undefined when `@sophie/astro` is bundled into Astro's ESM prerender
chunk (it is in `noExternal`). ClearSpeak loads via an explicit
`setupEngine({ json: <mathmaps path> })` — auto-resolution silently
regressed to MathSpeak under Vite/Vitest, so the path is resolved
explicitly. `speechFromMathml` degrades to `""` on any
parse/engine failure (mirroring KaTeX `throwOnError: false`), so one
malformed expression cannot break a build.

### Deferred runtime/registry tail (made explicit)

The audit *reports* but does not *label* these:

- **`MathText` component-children math**
  (`runtime/render-text-with-math.ts`) — rendered from React children,
  not known at build.
- **`BlackbodyExplorer` dynamic math** (`figures/BlackbodyExplorer/InlineMath.tsx`)
  — the LaTeX changes as the user drags a slider.
- **Registry `rearranged_forms` + `constants`** — v1 labels only the
  primary equation `tex`; the alternate forms are labeled-deferred.

`@sophie/components` **never imports SRE** (framework purity, ADR 0001):
the runtime tail computes speech client-side if at all; build-time
speech reaches components as a plain `aria-label` string.

## Rationale

### Standalone SRE over bundling MathJax or a runtime approach (the C-vs-B trade)

- **Standalone SRE (chosen, "C").** A dedicated MathML→speech engine that
  runs at build time over the MathML `renderMath` already emits. No
  client JS for speech; the `aria-label` is baked into first-paint HTML;
  the same engine powers MDX, choices, and registry from one chokepoint.
- **Bundle MathJax (the rejected "B").** MathJax includes a speech path,
  but pulling MathJax in to produce speech for math KaTeX *already
  renders* means two math stacks, a much larger dependency, and a runtime
  (client-side) assistive-technology hook. SRE is the engine MathJax's
  own a11y layer wraps — using it directly, at build time, is the
  smaller and more direct shape.
- **Runtime speech (rejected).** Computing speech in the browser ships an
  engine to every reader, delays the accessible name past first paint,
  and re-derives identical speech per page load. Build-time speech is
  computed once and cached.

**Build-time over runtime** mirrors ADR 0090's rendering decision: most
math is build-time-knowable, so speech for it should be too. The runtime
tail is the exception, reported by the invariant, not the rule.

**ClearSpeak domain.** ClearSpeak is SRE's modern, learner-oriented
English ruleset ("R squared") versus MathSpeak's verbose, literal
phrasing ("R superscript 2 baseline"). For a teaching platform the
learner-oriented reading is the correct default.

**4.1.4-stable over 5.0.0-rc.** The maintainer's `latest` tag points at
a release-candidate (5.0.0-rc.1). A long-lived platform pins the stable
release; the RC's API churn is not worth chasing for a feature whose
contract (MathML in, ClearSpeak string out) is already stable in 4.1.4.

### Complementarity with EquationBiography (not redundancy)

SRE gives **syntactic** speech — a faithful spoken transcription of the
expression's structure ("F equals G times m sub 1 times m sub 2 over r
squared"). [EquationBiography](./0046-equation-biography.md)
(ADR 0046/0058) gives **semantic** narration — what the equation *means*,
which symbols are observables vs. models, the physical story. They are
**complementary**: SRE makes the rendered glyphs readable by a screen
reader at all; EquationBiography supplies the pedagogical gloss a sighted
or unsighted learner reads alongside. Neither replaces the other, and
this ADR does not touch EquationBiography's semantic layer.

### v1 WARNING → future ERROR

MA-1 is **WARNING (non-fatal) for v1** (resolved-decision 1). It is not
ERROR yet precisely because the deferred tail above means a corpus can
legitimately contain unspoken build-time-adjacent math (MathText
children, dynamic figures) the build cannot yet label — gating ERROR on
that would block valid builds. Once the build-time surfaces are stable
and the tail is either closed or formally excluded, MA-1 graduates to
ERROR (build fails on any unspoken *build-time* expression). The artifact
section + INFO findings keep the gap visible in the meantime.

## Alternatives considered

- **Make `renderMath` async and emit `{ html, mathml, speech }`.**
  - Pro: one call returns everything.
  - Con: the registry prerender runs in Astro's *synchronous* remark
    transformer (ADR 0038); making `renderMath` async forces refactoring
    the whole pedagogy-index pipeline to async.
  - Rejected: speech as a separate `speechFromMathml` awaited at the
    async seams is strictly less invasive and keeps `renderMath` (and
    its VR-stable html) untouched.
- **Bundle MathJax for the speech path.** Rejected (see Rationale,
  C-vs-B): two math stacks, larger dependency, runtime hook.
- **Runtime SRE in `@sophie/components`.** Rejected: violates framework
  purity (ADR 0001), ships an engine to every reader, delays the
  accessible name, and re-derives identical speech per load.
- **Override the browser-computed MathML name with a raw-LaTeX
  `aria-label`.** Rejected (carried from ADR 0087): degrades real
  screen-reader output to satisfy a linter; SRE ClearSpeak is a *better*
  name than both raw LaTeX and the default MathML reading.
- **MA-1 as ERROR at v1.** Rejected: the deferred tail means a valid
  build can contain unspoken math; ERROR would block it. WARNING now,
  ERROR after the tail is closed/excluded.

## Consequences

**Easier:**

- Every build-rendered expression carries a learner-oriented accessible
  name baked into first-paint HTML; the raw MathML is hidden so it is
  read once.
- The axe `label` rule runs strict platform-wide again (ADR 0087's lone
  disable is closed); math-only formative choices are properly named.
- One speech computation per expression (memoized), reused across MDX,
  choices, and registry/search.

**Harder:**

- A `globalThis.require` shim is required for SRE under Astro's ESM
  prerender — a documented vendor pattern, but a non-obvious one.
- The async-at-seams shape (rehype plugins + `enrichEquationsWithSpeech`
  awaited in two places) is more moving parts than a single async
  `renderMath` would have been — the cost of keeping the ADR 0038 sync
  pipeline intact.
- The coverage collector is build-scoped module state rather than the
  artifact-scoped accumulator, because rehype transforms can't reach the
  accumulator. Documented (R8 header) and reset-for-tests only.

**Deferred (reported, not labeled):** the runtime tail (MathText
children-math, BlackbodyExplorer dynamic math) and the registry tail
(`rearranged_forms`, `constants`). MA-3/MA-4 keep them visible.

**Future opt-in — MathJax Explorer.** Interactive math *exploration*
(MathJax's keyboard-driven sub-expression walker) is a possible future
addition for learners who want to traverse a complex expression term by
term. It is **not v1** — v1 makes math *readable*; exploration is a
separate interactive feature, opt-in, and would be designed against a
concrete pedagogical need.

## References

- [Implementation plan](../../plans/2026-05-28-latex-speech-a11y-implementation.md)
  — PR-B phases B0–B6 + the resolved decisions.
- [ADR 0090](./0090-unified-build-time-math-rendering.md) — the shared
  `renderMath` chokepoint this speech layer builds on.
- [ADR 0088](./0088-pedagogy-audit-build-artifact.md) — the
  `pedagogy-audit.json` artifact this amends (adds `mathA11y`).
- [ADR 0087](./0087-compound-island-transform.md) — the formative
  transform whose `label`-rule disable this closes.
- [ADR 0038](./0038-pedagogy-index-pattern.md) — the synchronous remark
  extractor that forced the async-at-seams shape.
- [ADR 0001](./0001-platform-not-monorepo.md) — framework purity;
  `@sophie/components` owns no SRE.
- [ADR 0046](./0046-equation-biography.md) +
  [ADR 0058](./0058-epistemic-component-contract.md) — EquationBiography's
  semantic narration, complementary to SRE's syntactic speech.
