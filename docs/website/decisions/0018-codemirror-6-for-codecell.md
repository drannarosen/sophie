---
status: accepted
date: 2026-05-09
deciders: [anna]
supersedes: ~
superseded-by: ~
tags: [components, codecell, editor, codemirror, comp]
---

# ADR 0018: CodeMirror 6 as the editor inside `<CodeCell>`

## Context

Sophie's `<CodeCell>` component (COMP 521 and any other course
running Pyodide) needs an in-browser code editor: syntax
highlighting, autocomplete, key bindings, accessibility, theming
that consumes design tokens. The `predict-then-run` pedagogical
kind requires the editor to disable until a paired `<Prediction>`
submits. The cell shares state with other cells on the same page
(per the [content schema](../reference/content-schema.md)
`runtime.python.shareKernelAcrossCells`).

This is a Phase 3 deliverable per the
[roadmap](../status/roadmap.md). The choice of editor library is
load-bearing for student experience: it's the surface students
spend the most time on in COMP courses.

## Decision

**CodeMirror 6** (`@codemirror/*` packages) is the in-browser
editor inside `<CodeCell>`. Configured with the Python language
pack (`@codemirror/lang-python`), the Sophie theme (CSS variables
from [`@sophie/theme`](../decisions/0005-theming-three-layers.md)),
and Sophie-specific extensions for the `predict-then-run` lock and
inter-cell kernel awareness.

## Rationale

- **Modular and lightweight.** CodeMirror 6 is composed of small
  packages — only the needed extensions ship to the browser.
  Editor-only bundle is well under 100 KB before language pack.
- **Accessible by design.** Built-in screen-reader announcements,
  ARIA roles, full keyboard navigation. Aligns with
  [ADR 0004](../decisions/0004-component-contract-revisions.md)'s
  axe-core mandate.
- **Mature.** Used by Pyodide-notebook examples, Jupyter Lab
  successors, Obsidian, JSFiddle, CodeSandbox. The current SoTA for
  in-browser editors that aren't IDE-heavy.
- **Themeable via CSS.** Editor theme is CSS rules; consumes our
  [design tokens](../decisions/0005-theming-three-layers.md)
  cleanly. Light/dark mode follows `data-theme` automatically.
- **Extensible.** Custom extensions are first-class — the
  `predict-then-run` lock is a small extension that disables input
  until the paired Prediction submits. Other extensions: syntax
  highlighting matched to chapter content, error squiggles from
  Pyodide tracebacks, gutter for cell-shared kernel state.
- **Composable with Pyodide.** No special integration required;
  CodeMirror gives us the source string and we hand it to Pyodide.

## Alternatives considered

- **Monaco Editor** (VS Code's editor). Pros: full-featured;
  IntelliSense; IDE-grade. Cons: huge bundle (5+ MB compressed);
  designed for desktop IDE use; overkill for chapter cells; bundle
  weight conflicts with [ADR 0002](../decisions/0002-renderer-astro-mdx.md)'s
  per-island hydration discipline. Rejected — the size cost is
  unjustifiable for the affordances students need in chapter cells.
- **Ace Editor.** Pros: long history. Cons: legacy architecture,
  no module-per-feature, less ergonomic in modern React. Rejected
  — superseded by CodeMirror 6.
- **Plain `<textarea>` with syntax-highlight overlay.** Pros:
  smallest possible. Cons: loses keyboard editing affordances
  (multi-cursor, structured selection); poor a11y story; loses
  the affordances students need to actually write code. Rejected.
- **Custom editor.** Rejected — building a code editor from scratch
  is a research project; CodeMirror is what people who tried that
  ended up with.

## Consequences

**Easier:**

- Students get a real code-editing experience with predictable
  keyboard behavior.
- Themed editor matches Sophie's design system without custom
  styling work per cell.
- Pyodide error tracebacks render inline as squiggles via a
  CodeMirror extension.
- Future `fill-in-blank` and `parameter-sweep` cell kinds extend
  via CodeMirror's extension API rather than special-casing.
- Accessibility (keyboard, screen reader, focus management) is
  handled at the editor level.

**Harder:**

- CodeMirror's modular packaging means `@sophie/components` declares
  several `@codemirror/*` peer deps; consumer course repos need to
  install them. Mitigated by re-exporting a curated bundle from
  `@sophie/components/codecell`.
- CodeMirror extensions (`predict-then-run` lock, kernel-state
  gutter, traceback squiggles) are component-author code that
  must be tested. Each extension gets unit tests and Storybook
  stories.
- Visual regression testing against editor output can be brittle
  (token positions shift slightly across CodeMirror versions);
  use tolerant comparisons.

**Triggers:**

- `<CodeCell>` ships with CodeMirror 6 in Phase 3 per the
  [roadmap](../status/roadmap.md).
- `@sophie/components` declares `@codemirror/state`,
  `@codemirror/view`, `@codemirror/lang-python`,
  `@codemirror/commands`, `@codemirror/autocomplete` as peer deps.
- Sophie-specific CodeMirror extensions live in
  `@sophie/components/src/CodeCell/extensions/`:
  - `predict-then-run-lock.ts` — disables editing until paired
    Prediction submits.
  - `kernel-state-gutter.ts` — surfaces inter-cell shared state.
  - `pyodide-traceback.ts` — renders Pyodide errors as squiggles.
- Editor theme lives at
  `@sophie/components/src/CodeCell/theme.ts`; consumes
  [`@sophie/theme`](../decisions/0005-theming-three-layers.md)
  tokens.

## References

- [CodeMirror 6 documentation](https://codemirror.net/).
- [Pyodide notebook examples](https://pyodide.org/en/stable/usage/quickstart.html)
  using CodeMirror.
- [ADR 0004](../decisions/0004-component-contract-revisions.md) —
  component-contract requirements (axe-core tests, etc.) that
  CodeMirror integration must satisfy.
- [ADR 0005](../decisions/0005-theming-three-layers.md) — design
  tokens the editor theme consumes.
- [Roadmap → Phase 3](../status/roadmap.md) — when CodeCell
  earns its keep.
