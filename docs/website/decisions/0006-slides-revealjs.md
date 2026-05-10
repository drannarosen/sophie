---
status: accepted
date: 2026-05-09
deciders: [anna]
supersedes: ~
superseded-by: ~
tags: [slides, revealjs, lecture]
---

# ADR 0006: Reveal.js + thin Astro adapter for slides

## Context

The component contract has `slide` as an optional render mode per
component, which presupposes a slide *framework* wraps everything.
The original draft named Reveal.js as default but said the
MDX→Reveal layer needs to be sketched.

Sophie needs:

- Authors write slides in MDX, ideally the *same* MDX as the chapter
  (lecture is generated from the textbook, not maintained
  separately).
- Section boundaries map to slides (`h2` by default; explicit
  override via `<SlideBreak />`).
- Components render in `slide` mode (`<Prediction>` is "commit-then-
  reveal"; predictions don't write to localStorage during a lecture).
- Presenter mode: speaker notes, timer, current+next slide preview.
  This is where amateur slide tools fall over.
- PDF export for handouts/archival.
- Math, code, figures, demos all render correctly.
- Keyboard + remote navigation.

## Decision

**Reveal.js + a thin adapter inside `@sophie/astro`.** Same MDX as the
chapter; `h2` is the default slide boundary; three slide-specific
components: `<SlideBreak />`, `<SlideAppear>`, `<SpeakerNotes>`.
Reveal version pinned in `@sophie/astro`; the adapter is replaceable.

## Rationale

- **Mature presenter mode** with speaker notes, timer,
  current+next preview. Battle-tested for actual lecturing — the
  hardest thing for a homemade slide tool to get right.
- **Mature PDF export** via `?print-pdf` query param + Reveal's
  native print stylesheet → Chrome headless to PDF.
- **Keyboard / remote navigation done.** Plugins for math
  (KaTeX/MathJax), Mermaid, syntax highlighting, multiplex.
- **Independent of React versioning.** Reveal owns its global
  namespace; React islands hydrate inside Reveal sections without
  fighting it.
- **Author/audience familiarity.** Reveal output looks and behaves
  like slide decks people have seen; lecture-equipment pairing
  (HDMI dongle, classroom tech) is more likely to have been tested
  with Reveal output than with novel React presentation libraries.

## Alternatives considered

- **Spectacle (FormidableLabs).** Pros: native React, MDX-first,
  modern. Cons: smaller community than Reveal; presenter mode less
  battle-tested; less classroom-equipment coverage. Rejected for v1:
  the classroom-tested track record matters more than the modern API
  for a tool used in real lectures. **Keep on radar as the natural
  future revisit** — if Reveal.js's API quirks (initialization
  timing with React islands, fragments, plugin compatibility)
  become a chronic friction point, Spectacle is the in-ecosystem
  escape hatch we'd evaluate first. The slide adapter sits inside
  `@sophie/astro` as a thin wrapper, so swapping the underlying
  presentation library later means rewriting one package, not the
  authoring surface.

- **Custom slide renderer on the component tree.** Pros: total
  control, no external dep, smallest bundle, can integrate with
  platform features (e.g., live calibration overlay during polling).
  Cons: presenter mode is genuinely hard; cost is in details
  (mirror displays, two-window pairing, off-screen timers, remote-
  control protocols). Rejected: would reinvent Reveal poorly.

- **Sli.dev.** Vue-based; doesn't fit Astro/React ecosystem.
  Rejected.

- **Marp.** Markdown-first but limited presenter features.
  Rejected.

- **Defer slides entirely.** Pros: simpler v1. Cons: dual-source-of-
  truth risk (slides drift from chapter); can't test the `slide`
  render mode of components; pedagogy-component-on-slide stays
  theoretical. Rejected: slides are too central to the lecture-less
  goal.

## Consequences

**Easier:**

- Lecture decks generate from chapter MDX automatically; no parallel
  authoring.
- Components in `slide` mode are tested through actual deck usage.
- PDF export "for free" via Reveal's print stylesheet.
- Authors who already use Reveal anywhere have transferable
  knowledge.

**Harder:**

- Reveal's API quirks (initialization timing with hydrated React
  inside, fragments, vertical slide stacking) need careful handling
  in the adapter.
- Live in-class polling deferred to v3 (requires backend); v1
  audience-side predictions accrue calibration data via the student's
  own device, not via slide deck.

**Triggers:**

- `<SpeakerNotes>`, `<SlideBreak />`, `<SlideAppear>` ship in
  `@sophie/components`.
- Slide-route generator in `@sophie/astro`: `/slides/<chapter-id>`
  walks the chapter's MDX AST, partitions on `h2`, wraps each in
  Reveal `<section>`.
- Slide stylesheet consumes `@sophie/theme` tokens.
- Reveal plugin set chosen during Phase 2 (math integration, syntax
  highlighting, Mermaid).
- The slide adapter is documented as a *replaceable seam* in
  `@sophie/astro` — implementations can swap to Spectacle (or any
  other React-native presentation library) without touching the
  authoring MDX or the slide-specific components.

## References

- Brainstorming session, slides Q (May 2026).
- [Reveal.js documentation](https://revealjs.com).
- [reference/component-contract.md §3](../reference/component-contract.md)
  — `slide` render mode.
