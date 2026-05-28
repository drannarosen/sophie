---
date: 2026-05-28T00:00:00.000Z
tags:
  - math-rendering
  - katex
  - components
  - build
  - accessibility
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-28"
  evidence:
    - kind: test
      ref: packages/astro/src/lib/math-render/render-math.test.ts
      date: "2026-05-28"
      notes: "The single shared `renderMath(latex, { displayMode })` returns `{ html, mathml }`: `.html` contains KaTeX `output: \"html\"` markup, `.mathml` contains a `<math>` element. Asserts the shared `katex-options` config and that html is byte-stable for a fixed (latex, displayMode) so VR snapshots don't diff."
    - kind: test
      ref: packages/core/src/schema/equation-registry.test.ts
      date: "2026-05-28"
      notes: "Equation registry entry schema accepts the optional prerendered `html?` (and `mathml?`) field; rejection cases hold for the rest of the entry shape."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-index/extractors/equation-registry.test.ts
      date: "2026-05-28"
      notes: "The build-time equation extractor populates `html` on each registry entry via `renderMath(entry.tex)`, baking prerendered markup into the pedagogy index / registry data."
    - kind: test
      ref: packages/astro/src/lib/pagefind-converters/equations.test.ts
      date: "2026-05-28"
      notes: "The search-index converter stores prerendered `html` on equation results so `Search/ResultCard` renders a plain string instead of calling KaTeX at runtime."
    - kind: test
      ref: packages/components/src/components/KeyEquation/KeyEquation.test.tsx
      date: "2026-05-28"
      notes: "KeyEquation renders the prerendered `html` via `dangerouslySetInnerHTML` and no longer imports `katex` (full-drop); jest-axe clean (R11)."
    - kind: test
      ref: packages/components/src/components/EquationRef/EquationRef.test.tsx
      date: "2026-05-28"
      notes: "EquationRef consumes prerendered registry `html`; `katex` import dropped; jest-axe clean (R11)."
    - kind: test
      ref: packages/components/src/components/Search/ResultCard.test.tsx
      date: "2026-05-28"
      notes: "ResultCard consumes prerendered search-result `html`; `katex` import dropped; jest-axe clean (R11)."
    - kind: test
      ref: packages/core/src/runtime/format-unit-tex.test.ts
      date: "2026-05-28"
      notes: "`formatUnitTex` hoisted to `@sophie/core/runtime` as a single-source pure util (was duplicated); behavior pinned across unit-bearing call sites."
  notes: |
    Shipped in PR-A of the unified-math-rendering / LaTeX-speech sprint
    (plan: docs/plans/2026-05-28-latex-speech-a11y-implementation.md).
    Enforceable invariant — the only build-time KaTeX site is `renderMath`;
    `grep -rn katex packages/components/src --include='*.tsx' --include='*.ts'
    | grep -v test | grep -v stories` resolves to ONLY the two runtime-tail
    files (render-text-with-math.ts, BlackbodyExplorer/InlineMath.tsx) plus
    the `katex/dist/katex.min.css` type declaration in css-modules.d.ts.
    PR-B (ADR 0089) extends `renderMath` with an SRE `speech` field and the
    coverage invariant; in-progress at time of this ADR.
---

# ADR 0090: Unified build-time math rendering

:::{admonition} ADR metadata
- **Status**: shipped
- **Deciders**: anna
- **Amends**: [0004](./0004-component-contract-revisions.md) (math-bearing
  components consume prerendered html, not runtime KaTeX, for
  build-time-knowable math)
- **Related**: [0001](./0001-platform-not-monorepo.md) (framework purity —
  `@sophie/components` owns no build tooling), [0038](./0038-pedagogy-index-pattern.md)
  + [0043](./0043-notation-registry-multirep-alignment-audit.md) (the index /
  registry now carry prerendered html). ADR 0089 (PR-B, not yet authored)
  will build the SRE speech layer on top of `renderMath`.
:::

## Context

Math rendering was duplicated across N call sites, each owning its own
`katex.renderToString` invocation with **divergent options**:
`KeyEquation`, `EquationRef`, and `Search/ResultCard` passed `output:
"html"`; `render-text-with-math` and `BlackbodyExplorer/InlineMath` used
KaTeX's default `output: "htmlAndMathml"`. Five copies of the config, no
single source of truth — exactly the "what's simple now causing more work
later" shape the engineering principles warn against.

Two forces made this worth a decision *now*:

1. **Components owning rendering blocks build-time speech.** The
   LaTeX→speech accessibility work (ADR 0089 / PR-B) needs a single
   build-time site that emits MathML alongside html so a MathML→speech
   engine can label every build-rendered expression once. While each
   component re-renders KaTeX at its own layer (some client-side), there
   is no chokepoint to bake speech into.
2. **SoTA single-source-of-truth.** A long-lived platform should render
   each build-time-knowable expression exactly once, in one place, with
   one config — not re-derive it per component with drifting options.

Most build-time-knowable math is already addressable at build: MDX `$…$`
(via `rehype-katex`), registry equations (ADR 0043), formative choices,
and the search index. The genuine exceptions are *runtime*: `MathText`'s
component-children inline `$…$` (rendered from React children, not known
at build) and `BlackbodyExplorer`'s live-value math (the LaTeX string
changes as the user drags a slider).

## Decision

A single shared `renderMath(latex, { displayMode }) => { html, mathml }`
in `@sophie/astro` is the **only build-time KaTeX site**. All
build-time-knowable math — MDX `$…$`, registry equations, formative
choices, the search index — is prerendered once and baked into data;
components render that prerendered html as plain strings
(`dangerouslySetInnerHTML`) and own **no KaTeX**.

The **runtime tail** stays runtime by design: `MathText`
component-children math (`runtime/render-text-with-math.ts`) and
`BlackbodyExplorer` dynamic-value math
(`figures/BlackbodyExplorer/InlineMath.tsx`). These are the deferred
scope for PR-B's audit invariant, which *reports* (does not label) them.

## Rationale

**Single config, single render.** `renderMath` uses one shared
`katex-options` module; every build-time-knowable expression renders
exactly once and is cached (module-level memo, R8 HMR header). Options
drift becomes structurally impossible.

**Full-drop for the three component sites.** A consumer-usage audit
found **zero** literal `tex=` usage — every `KeyEquation` / `EquationRef`
is `refId=`/registry-backed, and `ResultCard` reads search-index data.
So sub-decision A resolved to **(b) full-drop**: `KeyEquation`,
`EquationRef`, and `ResultCard` drop their `katex` import entirely rather
than retaining a dual-mode runtime path for a literal form nobody uses.
The enforceable invariant:

```
grep -rn katex packages/components/src --include='*.tsx' --include='*.ts' \
  | grep -v test | grep -v stories
```

resolves to ONLY the two runtime-tail files (plus the
`katex/dist/katex.min.css` type declaration in `css-modules.d.ts`, not a
render site). Any future drift surfaces in this grep.

**MathML carried, not discarded.** `renderMath` returns `mathml`
alongside `html` even though PR-A doesn't consume it — PR-B (ADR 0089)
feeds it to the speech-rule-engine. Carrying it now means the chokepoint
exists before the speech layer needs it (build the best now, plan ahead).

## Alternatives considered

- **Keep per-component KaTeX (status quo).**
  - Pro: no change.
  - Con: five drifting configs; no build-time chokepoint for speech;
    re-derives the same expression per component.
  - Rejected: blocks ADR 0089 and violates single-source-of-truth.

- **KeyEquation dual-mode (sub-decision A option (a)): prerendered html
  for registry refs, retained runtime KaTeX for literal `tex=`.**
  - Pro: supports a literal-tex prop.
  - Con: keeps a `katex` import alive in a component for a form with
    **zero** consumer usage; two render paths to maintain; the grep
    invariant can't be a clean "only two files."
  - Rejected: literal usage is zero, so (b) full-drop is strictly better
    (SoTA single-source). Re-introducing literal-tex later is a registry
    migration, not a KaTeX-import revival.

- **Render math at runtime everywhere (drop build-time entirely).**
  - Pro: uniform.
  - Con: ships KaTeX to the client for static content; no build-time
    speech; slower first paint.
  - Rejected: most math *is* build-time-knowable; runtime is the
    exception, not the rule.

## Consequences

**Easier:**

- One render site, one config; ADR 0089 builds speech on this chokepoint.
- Three components shed their `katex` dependency entirely.
- Each build-time-knowable expression renders once (memoized), not
  per-component.

**Harder:**

- Non-production consumers must supply html themselves: component **tests**
  pass html markers; **stories** use the `equation-stories-prerender`
  decorator (so VR baselines stay valid without a build pipeline).
- The runtime tail (`MathText` children-math, `BlackbodyExplorer`
  dynamic math) is a *second* rendering path that intentionally remains —
  ADR 0089's invariant exists precisely to keep that tail visible.

**VR byte-stability (preserved):** `renderMath` uses `output: "html"`,
byte-identical to the three explicit pre-ADR sites (`KeyEquation` /
`EquationRef` / `ResultCard` all previously passed `output: "html"`).
`ResultCard` additionally drops a CSS-hidden `.katex-mathml` block it
never displayed; the visible output is visually identical (normalization,
not a pixel change). Local Mac VR diverges from canonical CI Linux
baselines by font rasterization — CI Linux VR is authoritative.

**Triggers:**

- PR-B (ADR 0089) extends `renderMath` to `{ html, mathml, speech }` and
  adds the math-speech coverage invariant.

## References

- [Implementation plan](../../plans/2026-05-28-latex-speech-a11y-implementation.md)
  — PR-A phases A1–A4 + sub-decision A resolution.
- [ADR 0004](./0004-component-contract-revisions.md) — the component
  contract this amends (math-bearing components consume prerendered html).
- [ADR 0043](./0043-notation-registry-multirep-alignment-audit.md) +
  [ADR 0038](./0038-pedagogy-index-pattern.md) — the registry / index that
  now carry prerendered html.
- ADR 0089 (PR-B, not yet authored) — the speech layer built on
  `renderMath`.
</content>
</invoke>
