---
date: 2026-05-09
tags: [tooling, dx, preview, hmr, storybook, playwright, ai]
---

# ADR 0015: Dev preview workflow — `sophie dev` + Storybook + Playwright MCP

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

A core Sophie design goal is **just-in-time reviewing and editing**:
authors edit a chapter, the result re-renders in <100 ms, the author
sees the change, iterates. Quarto's preview cycle was a noted pain
point — it wasn't easy to see updates in real time.

A second, equally important requirement is **AI-driven inspection
of the rendered front end**. Authors collaborate with Claude Code,
Codex, and other AI tools. Those tools should be able to *navigate
the rendered page* — not just read MDX source — so they can verify
behavior, catch runtime errors, screenshot for review, and inspect
accessibility properties post-edit.

A third requirement is **isolated component development**. Working
on `<Prediction>` itself (the slider, the submit handler, the
state-vs-response logic) shouldn't require navigating to a chapter
that contains one — that's slow and high-context.

These three concerns argue for a layered preview workflow.

## Decision

A **three-layer dev workflow**:

1. **Layer 1 — `sophie dev`** wraps `astro dev` with Sophie-specific
   conveniences:
   - Astro 5's HMR (Vite-powered, <100 ms).
   - `@sophie/audit` running in watch mode; Tier 1+2 issues surface
     in the terminal as the author types.
   - PROFILE switching mid-session (`sophie dev --profile=instructor`).
   - Pyodide kernel persistence across HMR (rebuilds don't kill
     in-flight Python state in `<CodeCell>`s).
   - LAN exposure (`sophie dev --host`) for phone/tablet preview.

2. **Layer 2 — Storybook** for component-level development:
   - Stories per component per render mode (read/slide/print).
   - axe-core runs against every story (a11y while developing,
     not at PR time).
   - Visual regression baseline lives here (Chromatic or Playwright
     screenshots).

3. **Layer 3 — Playwright MCP** for AI-driven browser inspection:
   - The Playwright MCP server (already in user's environment via
     the `mcp__plugin_playwright_*` tools) gives Claude Code and
     other AI tools a browser they can drive.
   - AI workflow: `sophie dev` running in background → Playwright
     MCP navigates the rendered front end → screenshots, clicks,
     types, reads accessibility tree, checks console.
   - **Bidirectional**: AI can see *and* interact, not just read
     pixels.

A v2 enhancement adds a **dev-mode sidebar** surfacing audit
warnings, current `ResponseStore` contents, current PROFILE, and
the parsed MDX AST — making AI inspection even richer.

## Rationale

- **HMR feedback <100 ms.** Vite's hot module replacement is the
  current SoTA for content-heavy sites. Quarto-style full-page
  reload is the prior baseline; Sophie's must beat it decisively.
- **Audit-in-watch mode.** Catching contract violations as they
  happen (not at PR time) shortens feedback loops by hours.
- **Storybook in isolation.** Working on `<Prediction>` without a
  chapter context is faster and produces better tests.
- **Accessibility tree, not pixels.** Playwright MCP's
  `browser_snapshot` returns the *accessibility tree* of the page —
  AI reads "radiogroup labeled 'If the distance to a star
  doubles...' with three options" rather than OCR'ing a screenshot.
  This is genuinely better than what most platforms expose.
- **Bidirectional AI inspection.** The AI can not only see the
  page but click, type, and verify post-interaction state. This
  enables verification workflows like "add a confidence slider
  and confirm it renders correctly" that aren't possible with
  source-only AI.
- **Already in the environment.** The Playwright MCP plugin is
  installed in Anna's Claude Code setup; this ADR formalizes the
  workflow assumption.

## Alternatives considered

- **Quarto-style preview** (full-page reload on file save). Pros:
  simple. Cons: slow; loses React state on every save; the exact
  pain point Sophie is trying to escape. Rejected.
- **Custom dev server** built on top of Vite. Pros: total control.
  Cons: reinventing what Astro already does well. Rejected — every
  Astro release brings improvements we'd otherwise have to port.
- **Screenshot-only AI feedback** (no Playwright MCP — instead, AI
  receives pre-captured screenshots). Pros: simpler. Cons:
  unidirectional (AI can't interact); loses the accessibility-tree
  semantic richness. Rejected — bidirectional inspection is the
  point.
- **Browser DevTools Protocol direct integration** (instead of
  Playwright). Pros: lower-level. Cons: more brittle; Playwright
  abstracts the cross-browser quirks. Rejected.
- **No Storybook, just chapter-level previews.** Rejected —
  component development is meaningfully harder without isolation.

## Consequences

**Easier:**

- Edit a chapter → see changes <100 ms later.
- Edit a component → see all render modes in Storybook with axe
  feedback.
- Ask Claude Code / Codex to "verify the new component renders
  correctly with keyboard navigation" → AI executes the
  verification itself via Playwright MCP.
- Phone/tablet preview during authoring (LAN exposure).
- Audit feedback in the terminal as you type.

**Harder:**

- Three running processes during development (`sophie dev`,
  Storybook, Playwright when invoked). Each is independent; mental
  load is small once internalized.
- Storybook stories are *another* artifact every component author
  maintains — see [contributing/coding-standards.md](../contributing/coding-standards.md)
  for the requirement.
- Playwright MCP is one more dependency for the AI-driven workflow;
  fortunately it's already installed in Anna's environment.

**Triggers:**

- `@sophie/cli` ships `sophie dev` from Phase 0; see
  [reference/cli.md](../reference/cli.md).
- Storybook configured in Phase 0 with `@storybook/addon-a11y` for
  axe integration.
- Playwright e2e suite + Playwright MCP both use the same browser
  binaries; install via `pnpm exec playwright install` in CI and
  locally.
- Documentation in
  [contributing/coding-standards.md](../contributing/coding-standards.md)
  explicitly requires Storybook stories for every component.
- v2 enhancement: dev-mode sidebar surfacing audit warnings,
  `ResponseStore` state, MDX AST, current PROFILE.

## References

- Brainstorming session, tooling Q (May 2026): "real-time review,
  edit, AI navigation" pinned to this three-layer workflow.
- [Astro dev server documentation](https://docs.astro.build/en/reference/cli-reference/#astro-dev).
- [Storybook documentation](https://storybook.js.org).
- [Playwright MCP server](https://github.com/microsoft/playwright-mcp).
- [ADR 0002](0002-renderer-astro-mdx.md) — the Astro+MDX renderer
  this dev workflow runs against.
- [ADR 0011](0011-pnpm-package-manager.md) — the package manager
  that orchestrates the three processes.
- [`reference/cli.md`](../reference/cli.md) — the `sophie dev`
  command surface.
