---
date: 2026-05-09T00:00:00.000Z
tags:
  - syntax-highlighting
  - shiki
  - code
  - mdx
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0020: Shiki (via rehype-pretty-code) for syntax highlighting

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie's chapters contain code blocks — illustrative Python in COMP
chapters, MDX examples in the docs themselves, JSX/TS examples in
component-contract reference. The `<CodeCell>` component
([ADR 0018](0018-codemirror-6-for-codecell.md)) handles editable
code; static code blocks are a different surface and need their
own syntax highlighter.

The choice affects: rendered fidelity (does it match VS Code's
highlighting?), bundle weight (are themes embedded?), build
performance, theme integration (does it honor Sophie's design
tokens / dark mode?).

## Decision

**Shiki** is the syntax highlighter for static code blocks in
chapters and these design docs. Integrated via
**`rehype-pretty-code`** for the MDX/markdown pipeline. Themes come
from Sophie's design system —
[`@sophie/theme`](../decisions/0005-theming-three-layers.md)
generates Shiki-compatible theme JSON keyed off design tokens.

Used in:

- All chapter code blocks (Python, TypeScript, JSON, YAML, MDX,
  Astro, etc.).
- These design docs (matching the editor experience contributors
  see in VS Code).
- The `<CodeCell>` *static preview* (the un-hydrated server-rendered
  view before Pyodide loads).

Not used in:

- The active CodeMirror 6 editor inside `<CodeCell>` —
  CodeMirror has its own highlighter (Lezer-based). See
  [ADR 0018](0018-codemirror-6-for-codecell.md).

## Rationale

- **VS Code parity.** Shiki uses VS Code's TextMate grammars and
  themes. Code rendered in chapters looks identical to what
  contributors see in their editor. This matters for COMP courses
  where students copy code between Sophie and their own
  environment.
- **Build-time rendering.** Shiki runs at build time; the
  rendered HTML ships with the page; **no runtime JS for syntax
  highlighting**. Aligns with
  [ADR 0002](0002-renderer-astro-mdx.md)'s
  static-first philosophy.
- **Astro's official choice.** Astro ships Shiki by default; the
  ecosystem is well-tuned (cache, theme handling, performance).
  Less custom integration work.
- **Theme matches Sophie's design system.** Shiki themes are JSON;
  a small build script produces a Shiki theme from
  [`@sophie/theme`](../decisions/0005-theming-three-layers.md)
  tokens, ensuring code blocks use the same color palette as the
  rest of the platform. Dark mode follows `data-theme`.
- **`rehype-pretty-code`** is the modern remark/rehype integration
  — handles line highlighting, line numbers, file titles, multi-
  language code blocks, all via standard MDX syntax.

## Alternatives considered

- **highlight.js.** Pros: longest history; many themes. Cons:
  regex-based grammars don't match VS Code's accuracy; older API.
  Rejected — Shiki's TextMate-grammar fidelity is meaningfully
  better for code-heavy chapters.
- **Prism.js.** Pros: lightweight; widely adopted in older docs
  sites. Cons: similar accuracy issues to highlight.js; less
  modern integration story. Rejected.
- **Bright** (a Rust+wasm Shiki alternative). Pros: faster build.
  Cons: less battle-tested; smaller ecosystem. Rejected for v1;
  reconsider if Shiki's build performance becomes a bottleneck.
- **Custom Lezer-based highlighter.** Pros: shared with CodeMirror.
  Cons: missing language coverage; reinvents what Shiki gives us
  for static blocks. Rejected — different tools for different
  surfaces.
- **No syntax highlighting** (plain `<pre><code>`). Rejected — code
  is core to COMP chapters; readability isn't optional.

## Consequences

**Easier:**

- Code blocks render with VS Code-grade fidelity.
- Static rendering means zero runtime JS cost for highlighting.
- Theme follows
  [`@sophie/theme`](../decisions/0005-theming-three-layers.md)
  automatically; dark mode matches the rest of the page.
- `rehype-pretty-code` features (line highlighting, file titles)
  available via standard MDX without custom plugins.

**Harder:**

- Build-time cost: Shiki loads grammars and themes at build start.
  Mitigated by `rehype-pretty-code`'s caching.
- Some edge cases (very large code blocks, exotic languages) need
  fine-tuning per chapter. Acceptable.
- Theme generation script is one more piece of infrastructure to
  maintain. The script is small (~50 LoC) and lives in
  `@sophie/theme/build/shiki-theme.ts`.

**Triggers:**

- `@sophie/astro` configures `rehype-pretty-code` as a remark
  plugin in the MDX pipeline.
- `@sophie/theme` ships a build script that emits a Shiki-compatible
  theme JSON keyed off tokens.
- Chapter authoring conventions: code blocks specify a language
  (per
  [docs style guide](../contributing/docs-style-guide.md)); empty
  lang means plain text (no highlighting).
- The `<CodeCell>` un-hydrated server preview uses Shiki for the
  initial static render before CodeMirror takes over (improves
  perceived load: no flash of unstyled code).

## References

- [Shiki documentation](https://shiki.style/).
- [`rehype-pretty-code` documentation](https://rehype-pretty.pages.dev/).
- [Astro's Shiki integration](https://docs.astro.build/en/guides/syntax-highlighting/).
- [ADR 0018](0018-codemirror-6-for-codecell.md) — CodeMirror's
  highlighter for *editable* code (different surface).
- [ADR 0005](0005-theming-three-layers.md) — design tokens that
  drive the Shiki theme.
