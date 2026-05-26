---
date: 2026-05-13T00:00:00.000Z
tags:
  - icons
  - chrome
  - components
  - adapter
  - lucide
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0039: Two-adapter Lucide icon convention (`lucide-static` for chrome, `lucide-react` for pedagogy)

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[Bucket B PR 5 (#34)](https://github.com/drannarosen/sophie/pull/34)
introduced [`lucide-static`](https://www.npmjs.com/package/lucide-static)
as the icon vocabulary for Sophie's chrome layer
([`packages/astro/src/icons/index.ts`](../../../packages/astro/src/icons/index.ts)).
`<SidebarToggle>` and `<ThemeToggle>` were refactored to consume
icons through this barrel; `<ViewModeToggle>` ships bespoke
3-icon column shapes alongside the Lucide exports.

The chrome layer is vanilla JS / Astro components per
[ADR 0032](0032-vanilla-js-chrome-state.md) — no React. The
pedagogy layer (`@sophie/components`) is React + MDX. Both layers
want Lucide as their icon vocabulary (consistency, breadth,
maintenance), but the two layers want *different runtimes*:

- Chrome wants SVG strings injectable via Astro's
  `<Fragment set:html={Icon} />` pattern. `lucide-static` ships
  exactly that surface.
- Pedagogy components want React-component imports with prop
  ergonomics (`<Sun size={16} aria-label="…" />`).
  `lucide-react` ships exactly that surface.

PR 5 shipped the chrome half. The pedagogy half (`lucide-react`
adoption in `@sophie/components`) is queued as a separate
mechanical refactor PR. This ADR codifies the two-adapter
convention so both halves land coherently.

## Decision

Sophie uses **two Lucide adapters**, chosen by package boundary:

| Package | Adapter | Import surface | Consumer pattern |
| --- | --- | --- | --- |
| `@sophie/astro` (chrome) | `lucide-static` | Re-exported from `packages/astro/src/icons/index.ts` | `<Fragment set:html={Menu} />` inside Astro components |
| `@sophie/components` (pedagogy) | `lucide-react` | Direct import inside the React component | `<Sun size={16} aria-hidden />` inside JSX |

The two adapters share the **same icon vocabulary** (Lucide's
canonical set). Cross-package consistency is a naming convention,
not a code share — the same icon (e.g. `Sun`) is imported from
`lucide-static` in chrome and from `lucide-react` in pedagogy.

Bespoke icons (icons without clean Lucide equivalents, like the
view-mode column shapes) live next to the chrome barrel
(`packages/astro/src/icons/view-mode.ts`) when chrome needs them.
If a future pedagogy component needs a bespoke icon, it gets a
parallel co-located bespoke export in `@sophie/components`.

### Import discipline

- Chrome `.astro` files import **only from `@sophie/astro/icons`**
  — never directly from `lucide-static` and never from the
  bespoke modules. The barrel is the single swap point.
- Pedagogy React components import **directly from `lucide-react`**
  — `@sophie/components` does not re-export Lucide. Tree-shaking
  works per-component; a single barrel would defeat that.

## Rationale

- **Runtime fit drives the adapter choice.** `lucide-static`
  produces SVG strings, ideal for `set:html` injection in chrome
  scripts with zero React. `lucide-react` produces React
  components, ideal for prop-driven usage inside pedagogy
  components. Forcing one adapter across both layers means either
  hydrating React for chrome (violates ADR 0032) or inlining raw
  SVG strings into React components (loses prop ergonomics +
  tree-shaking).
- **One vocabulary, two surfaces.** Authors and AI authors think
  about icons by name (`Menu`, `Sun`, `Search`), not by adapter.
  Same name across layers means the same visual identity. Lucide
  is the single design system for icons.
- **Tree-shaking stays clean.** `lucide-react` is per-component
  import; bundlers tree-shake unused icons by default.
  `lucide-static` is similar (named exports of inline SVG
  strings). Re-exporting the whole library in either package
  would defeat this.
- **Bespoke icons compose without ceremony.** Co-locating bespoke
  SVGs with the adapter barrel (chrome: `view-mode.ts` next to
  `index.ts`) keeps "icon" as one concept per package, not
  Lucide-vs-bespoke as a second concept.

## Alternatives considered

- **One adapter (`lucide-react`) across both layers.** Forces React
  hydration for chrome icons. Violates [ADR 0032](0032-vanilla-js-chrome-state.md).
  Rejected.
- **One adapter (`lucide-static`) across both layers.** Pedagogy
  components lose prop ergonomics (`size`, `color`, `aria-*` are
  cleaner as React props than as SVG-string post-processing).
  Loses idiomatic React. Rejected.
- **A shared `@sophie/icons` package wrapping both adapters.**
  Real abstraction cost (new package, separate version, build
  pipeline) for ~zero ergonomic win. The two adapters are already
  one import each; wrapping doesn't simplify the consumer side.
  Re-evaluate if a third icon-needing layer appears.
- **Heroicons / Phosphor / Tabler / Feather.** Lucide already
  spans Sophie's needs (chrome glyphs, pedagogy affordances, math
  marks, code marks). Switching costs aren't justified by feature
  parity gaps. Locked.
- **All-bespoke SVG sprites.** Maintenance cost; loses Lucide's
  community-maintained icon set. Rejected.

## Consequences

**Easier:**

- New chrome icons: add one line to `packages/astro/src/icons/index.ts`
  re-exporting from `lucide-static`. Consumers import from the
  barrel.
- New pedagogy icons: import directly from `lucide-react` in the
  component file. No coordination across packages.
- Audit / Storybook stories use the same icon names regardless of
  layer; visual consistency is automatic.

**Harder:**

- Two adapters means two installs (`lucide-static` in
  `@sophie/astro`, `lucide-react` in `@sophie/components`). Both
  ride Lucide upstream releases; version skew between them is the
  one drift surface to watch. Mitigation: both deps tracked by
  pnpm; bumps land together.
- The mental model "chrome uses static, pedagogy uses react" has
  to be learned (one line in CLAUDE.md or AI-author docs).
  Mitigation: barrel-only import discipline + this ADR.

**Triggers:**

- Pedagogy `lucide-react` adoption: a follow-up refactor PR (P2
  on the Bucket B PR 6 audit) migrates inline SVGs in
  `<KeyEquation>`, `<Dropdown>` expander, and other
  pedagogy components to `lucide-react`. Adds the dep to
  `@sophie/components/package.json`. Low-risk mechanical refactor.
- New chrome primitives in Bucket B PR 7 (search modal —
  `Search`, possibly `ArrowUp` / `ArrowDown` for keyboard nav).
- `@sophie/components`-side `<GlossaryTerm>` may use a Lucide
  icon (e.g. `BookOpen`) as its hover trigger; that lands as
  part of PR-C1 and is the first `lucide-react` consumer.
  PR-C1 brings in the `lucide-react` dep.

## References

- [PR #34](https://github.com/drannarosen/sophie/pull/34) —
  introduced `lucide-static` for chrome.
- [`packages/astro/src/icons/index.ts`](../../../packages/astro/src/icons/index.ts)
  — the chrome barrel.
- [`packages/astro/src/icons/view-mode.ts`](../../../packages/astro/src/icons/view-mode.ts)
  — the first bespoke chrome icon.
- [ADR 0032](0032-vanilla-js-chrome-state.md) — vanilla JS chrome
  layer; rules out `lucide-react` for chrome.
- [ADR 0038](0038-pedagogy-index-pattern.md) — pedagogy index
  pattern; `<GlossaryTerm>` (PR-C1's first `lucide-react`
  consumer) is one of its consumers.
- [Bucket B PR 6 audit](../../reviews/2026-05-13-bucket-b-pr6-audit.md)
  §"P2 backlog" — the queued P2-NEW-2 `lucide-react` migration.
- [Lucide upstream](https://lucide.dev/) — icon set.
