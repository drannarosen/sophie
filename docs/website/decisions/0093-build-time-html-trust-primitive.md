---
date: 2026-05-30T00:00:00.000Z
tags:
  - components
  - security
  - structural-defense
  - accessibility
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-30"
  evidence:
    - kind: deployment
      ref: packages/components/src/runtime/BuildTimeHtml.tsx
      date: "2026-05-30"
      notes: "The single sanctioned `dangerouslySetInnerHTML` chokepoint. Polymorphic `as` host element; required `trust` discriminator (`katex` / `mdx-serialized` / `extractor-body`) that documents WHY the HTML is safe and makes the whole trust surface enumerable via the type. `trust` is destructured out so it never reaches the DOM. One `biome-ignore` carries the trust-boundary rationale for the entire platform."
    - kind: test
      ref: packages/components/src/runtime/BuildTimeHtml.test.tsx
      date: "2026-05-30"
      notes: "5 cases: injects into default `<span>`; renders the `as` element + forwards rest props; empty element on `undefined` html; never leaks `trust` to the DOM; axe-clean for every trust value. The 28 migrated call sites keep their existing per-component axe + behaviour tests (945 `@sophie/components` tests green), which prove the emitted DOM is byte-identical to the pre-migration raw-injection shape."
    - kind: test
      ref: scripts/lint-no-raw-inner-html.ts
      date: "2026-05-30"
      notes: "R14 gate (CI `lint` job, after R13 `lint:epistemic-role`): no `.ts`/`.tsx` under any `packages/<pkg>/src` (excluding tests) may use the `dangerouslySetInnerHTML=` attribute except the allowlisted chokepoint. Matches the attribute-assignment form, so prose mentions + the type-level `Omit<…, \"dangerouslySetInnerHTML\">` exclusion stay legal. Verified to pass clean AND bite on a re-introduced raw site."
  notes: |
    Shipped in the A+ hardening sprint (Path B, H2). Collapses the 28
    `dangerouslySetInnerHTML` sites across 11 component files into one
    documented chokepoint with a required, typed trust discriminator,
    closing the standing Architecture −2 ("un-centralized trust
    surface"). R14 is the structural defense that keeps it collapsed —
    a 29th raw site fails CI. Pairs with ADR 0004 (component contract)
    and 0030 (author-trust boundary).
---

# ADR 0093: Build-time HTML trust primitive (`BuildTimeHtml`)

:::{admonition} ADR metadata
- **Status**: shipped
- **Deciders**: anna
:::

## Context

Sophie components inject pre-rendered HTML in 28 places across 11 files:
KaTeX markup from the equation/search registry (ADR 0090) and from
`renderTextWithMath` / `katex.renderToString`; author MDX serialized by
`renderChildrenToHtml`; and extractor/remark output (glossary bodies,
equation-biography cards). Each site carried its **own**
`dangerouslySetInnerHTML` plus a bespoke `biome-ignore` re-arguing why
that particular string is safe.

That is a 28-way XSS-reasoning surface. Every site is individually
correct, but the trust argument is **re-derived per site**, there is no
single place to audit "where does Sophie inject HTML and why is it
safe," and nothing structurally prevents a 29th site from shipping with
a copy-pasted ignore comment and a subtly weaker argument. The platform-
quality audits flagged it as the standing Architecture −2.

## Decision

**One sanctioned chokepoint** — `BuildTimeHtml`
(`packages/components/src/runtime/BuildTimeHtml.tsx`) — owns the only
`dangerouslySetInnerHTML` in `@sophie/*` shipped code. It renders trusted
HTML into a polymorphic `as` host element and forwards the rest of the
props. All 28 sites route through it; their per-site `biome-ignore`
comments are deleted.

**A required `trust` discriminator** names *why* the HTML is safe. The
trust property is **"the source content is author/build-authored, never
runtime user/student input"** — a timing-agnostic safety argument, which
is why the three values are by *pipeline*, not by *when* it runs:

| `trust` | Safety argument | Example sites |
|---|---|---|
| `katex` | KaTeX markup from non-user LaTeX — registry html, `renderTextWithMath`, or `katex.renderToString` on author-internal figure constants. KaTeX output is structurally safe; the LaTeX is never user-supplied. | `EquationRef`, `Search`, `KeyEquation` math, `MathText`, `InlineMath` |
| `mdx-serialized` | `renderChildrenToHtml` — authored MDX children serialized to HTML at build time. | `OMIFlow`, `RepVerbal`, `Objective` bodies |
| `extractor-body` | pre-rendered HTML from a build-time extractor / remark plugin (mdast → hast → html). | `KeyEquation` biography (×7), `GlossaryTerm` (×2) |

The discriminator is **required**, so every author declares provenance,
and the `BuildTimeHtmlTrust` type enumerates the entire trust surface.
It is documentation only — destructured out so it never reaches the DOM.

**R14 enforces it.** `scripts/lint-no-raw-inner-html.ts` (CI `lint` job)
fails on any `dangerouslySetInnerHTML=` attribute under
`packages/<pkg>/src` outside the allowlisted chokepoint (tests excluded;
the matcher keys on the assignment form so prose + the type-level `Omit`
exclusion stay legal). This is the difference between "centralized by
convention" and "centralized, enforced" — the same structural-defense
shape as R11 (axe) and R13 (epistemic-role).

### Why three values and not more

An earlier sketch split KaTeX into registry-vs-text. Routing the one
*runtime*-rendered site (`<InlineMath>`, `katex.renderToString` in a
figure) through the chokepoint showed the unifying property is **input
trust, not render timing** — all KaTeX flavors share one safety class.
Three values by pipeline is the honest minimum; adding a fourth would
encode implementation detail, not a distinct safety argument. A genuinely
new trusted pipeline extends the union here rather than re-introducing a
raw site.

## Rationale

- **Enumerable trust surface.** `grep BuildTimeHtml` (or the
  `BuildTimeHtmlTrust` type) lists every injection and its provenance —
  the "epistemic legibility" ethos applied to security. One
  `biome-ignore` to audit, not 28.
- **Structural, not cosmetic.** R14 forecloses the *class* (a new raw
  site), not just the 28 observed instances — pattern, not patch.
- **DOM-preserving.** `BuildTimeHtml` emits exactly `<Tag {...rest}
  dangerouslySetInnerHTML={{ __html }} />`; the 945 component tests
  (incl. axe on every migrated component) prove byte-identical output.

## Consequences

- **Positive.** Architecture −2 closed; one trust chokepoint; new
  injections are a typed, reviewed, enumerable decision; R14 blocks
  regressions in CI.
- **Cost.** Forwarding `as`-polymorphic props through a second
  `as`-polymorphic component (`MathText` → `BuildTimeHtml`) hits a known
  TS limitation (generic `Omit` over an unresolved `E` is not provably
  assignable). Resolved with a single documented assertion at that one
  boundary — not `as any`; the shape is provably correct. No other site
  needs it.
- **Boundary.** `BuildTimeHtml` is for author/build-authored HTML. It is
  NOT an escape hatch for runtime user/student input — there is no
  Sophie surface that injects such input, and adding one would need its
  own trust analysis, not a fourth enum value.

## References

- [ADR 0004 — Component contract revisions](./0004-component-contract-revisions.md)
  — `serialize`/render split + a11y mandate this primitive sits within.
- [ADR 0030 — AI authoring + author-trust boundary](./0030-audience-and-ai-author-model.md)
  — author content (not user input) is the trust boundary.
- [ADR 0090 — unified build-time math rendering](./0090-unified-build-time-math-rendering.md)
  — the `katex`-trust registry source.
- [ADR 0061 — AI-optimized codebase](./0061-ai-optimized-codebase-design.md)
  — focused files + structural lint gates (R11/R13/R14).
- `packages/components/src/runtime/BuildTimeHtml.tsx` — the chokepoint.
- `scripts/lint-no-raw-inner-html.ts` — the R14 gate.
