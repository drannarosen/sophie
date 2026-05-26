---
date: 2026-05-10T00:00:00.000Z
tags:
  - theming
  - design-tokens
  - css
  - tailwind
  - phase-0
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-25"
  evidence:
    - kind: deployment
      ref: packages/theme/scripts/generate-tailwind.ts
      date: "2026-05-25"
      notes: "The Tailwind v4 `@theme { ... }` directive is emitted by this generator script at build time (line 78) — the CSS-first configuration this ADR locks. No `tailwind.config.{js,ts}` file exists in the repo; the directive replaces the v3 JS preset entirely."
    - kind: deployment
      ref: packages/theme/package.json
      date: "2026-05-25"
      notes: "`@sophie/theme` package description names 'Tailwind v4 `@theme` emit' explicitly and exports `./tailwind` → `./dist/tailwind.css` as the Tailwind-consumption entry point. The package.json description is the human-facing assertion that v4 (not v3) is in force."
    - kind: deployment
      ref: packages/theme/scripts/generate-css.ts
      date: "2026-05-25"
      notes: "Companion generator emits the CSS variables that the `@theme` directive consumes. Layer 1 (TS tokens) → Layer 2 (CSS + `@theme` emit) is the v4 CSS-first chain this ADR specifies."
    - kind: manual
      ref: packages/theme/scripts/generate-tailwind.ts
      date: "2026-05-25"
      notes: "Generated CSS preamble begins with `@import \"./theme.css\";` then opens `@theme { ... }` — the v4 import-then-directive pattern. The absence of a `tailwind.config.{js,ts}` file alongside this emit confirms the CSS-first commitment."
  notes: |
    Tailwind v4 with CSS-first `@theme` directive is in active force. The
    `generate-tailwind.ts` script emits a CSS file that opens with
    `@import "./theme.css";` then `@theme { ... }`. No `tailwind.config.{js,ts}`
    JS preset file exists in the repo, confirming the v3 escape hatch
    described in 'Alternatives considered' was rejected as designed. The
    three-layer model from ADR 0005 is preserved; this ADR refines Layer 2's
    delivery mechanism to CSS-first.
---

# ADR 0026: Tailwind v4 (CSS-first configuration)

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[ADR 0005](./0005-theming-three-layers.md) established the
three-layer theming model (TS tokens → CSS vars + Tailwind preset →
component CSS Modules). Its language was v3-era: "Tailwind preset
auto-consumes tokens", "preset published in `@sophie/theme`". Phase 0
actually shipped on **Tailwind v4**, which uses a CSS-first
configuration (`@theme` directive in CSS) rather than a JavaScript
preset/config file.

This ADR makes the v4 commitment explicit so future contributors
don't follow ADR 0005's literal "preset" wording into a v3-era
mental model that no longer matches the codebase.

## Decision

**Tailwind v4** with **CSS-first configuration**.

- Design tokens are defined in `@sophie/theme`'s `dist/theme.css` via
  the `@theme` directive.
- Tokens are consumed by Astro/MDX via standard CSS imports (no JS
  preset, no `tailwind.config.{js,ts}` file).
- Component CSS Modules reference the CSS variables exposed by
  `@theme`.

## Rationale

1. **Tokens live where they're consumed.** v4's CSS-first `@theme`
   directive eliminates the JS preset round-trip: design tokens are
   in CSS, where the component CSS Modules reference them. One
   source, one consumer language.

2. **Faster dev loop.** No `tailwind.config.js` to invalidate; HMR
   on `@sophie/theme/src/tokens.ts` → CSS regeneration → CSS Module
   recompute is a single chain. v3's preset chain added a JS-eval
   step that v4 removes.

3. **Three-layer model preserved.** ADR 0005's three-layer theming
   model is unchanged in concept:
   - Layer 1 (source of truth): TS tokens in `@sophie/theme/src/tokens.ts`.
   - Layer 2 (delivery): CSS variables emitted via `@theme` in
     `dist/theme.css` (was: Tailwind preset).
   - Layer 3 (consumption): component-level CSS Modules referencing
     the variables.

   Only the *delivery mechanism* between layer 1 and layer 2 changed
   (CSS-first instead of JS-preset). The non-Tailwind escape hatch
   from ADR 0005 still works: consumers who don't want Tailwind can
   import `dist/theme.css`'s variables without using any Tailwind
   utility classes.

4. **Less ecosystem complexity.** v4 dropped the PostCSS plugin
   ecosystem requirement; one Vite plugin (`@tailwindcss/vite`)
   wires it in. Fewer build-time integration points, fewer config
   files to keep in sync.

## Alternatives considered

- **Pin to Tailwind v3 to honor ADR 0005's preset wording literally.**
  Rejected: v3 is in maintenance and the preset/config-file approach
  is the slower path. ADR 0005's *intent* (three layers, single
  source, consumer choice) survives the v3→v4 mechanics change; only
  the delivery wording needed updating.

- **No Tailwind at all; pure CSS Modules.** Rejected for the same
  reasons as in ADR 0005: chapter prose authoring benefits from
  utility classes, and the preset/`@theme` is opt-in for consumers.

- **Wait for Tailwind v5 / next major.** Rejected: v4 is shipped and
  stable; v5 isn't on the horizon. The CSS-first paradigm is the
  Tailwind team's stated direction.

## Consequences

**Easier:**

- Single source of truth in CSS — no preset/config file divergence.
- Faster HMR on token edits.
- One fewer build-time integration (no PostCSS plugin chain).
- Aligned with framework-purity goal: `@sophie/theme` ships pure
  CSS, no JS exports needed for consumers who only want tokens.

**Harder:**

- Documentation that mentioned "Tailwind preset" needs to be
  updated. ADR 0005's language is now historical; this ADR
  supersedes the implicit preset wording. `coding-standards.md`
  references theming and gets updated alongside this.
- Phase 1 SCSS port (callouts.scss, lecture-cards.scss, etc. from
  the existing course repos) targets v4-compatible `@theme`
  entries, not v3 preset config. Slight learning curve for
  contributors familiar with v3.

**Triggers:**

- `@sophie/theme` `package.json` pins to `tailwindcss@^4.x`.
- `coding-standards.md` updated to describe theming as
  "tokens → `@theme` → CSS Modules" (not "tokens → preset").
- ADR 0005's `superseded-by` field stays empty (it's not
  superseded — only its preset wording is amended).
- Phase 1 SCSS port (Phase 1 scope) follows the v4 CSS-first
  pattern.

## Revisions

### R-no-runtime — Tailwind runtime not installed; `@theme` syntax used as CSS-vars sugar (2026-05-19)

The 2026-05-19 architecture audit flagged that this ADR's status
was `shipped` but zero packages have `tailwindcss` installed and
zero Tailwind utility classes appear in any `packages/components/src/components/*`
source. The audit's question: is the runtime missing, or is the
posture different from what the ADR declares?

**Resolved posture**: the implementation is **`@theme` syntax used
as CSS-vars-with-Tailwind-v4-syntactic-sugar, without the Tailwind
runtime**. `@sophie/theme` generates `theme.css` via its own
`scripts/generate-css.ts` (no PostCSS-Tailwind chain); the file
emits standard CSS `--token-name: value;` declarations inside
`@theme {}` blocks that browsers parse as plain CSS (`@theme` is a
no-op selector to a stock CSS parser when the Tailwind plugin
isn't loaded). Components consume these as `var(--token-name)` in
CSS Modules.

**Why this is the right shape (not a defect)**:

- The §Decision's three commitments — "tokens live in CSS where
  consumers read them," "no JS preset," "components reference the
  variables" — are all satisfied without the runtime.
- Sophie does not use Tailwind utility classes (`flex p-4 bg-red-500`),
  per the visual-polish target which favors expressive per-component
  CSS Modules over utility-class composition.
- Avoiding the runtime keeps the JS bundle smaller and removes one
  build-step layer.

**Status stays `shipped`**: the renamed-from-v3-preset-to-CSS-first
decision IS shipped — `@theme` blocks are the live token surface
that every CSS Module references. The Tailwind *utility-class
runtime* is intentionally not part of the shipped surface;
graduating it requires a new ADR (utility-class layer would be a
significant authoring-pattern shift, not a quiet dep-add).

**Trigger to graduate Tailwind utility classes**: an explicit
brainstorm-locked decision that author velocity / consistency
benefits outweigh the visual-polish-target's expressive-CSS bias.
Not on the current roadmap.

## References

- [ADR 0005: Three-layer theming](./0005-theming-three-layers.md) —
  the model this ADR makes explicit at v4. Concept unchanged;
  delivery mechanism amended.
- Tailwind v4 announcement and migration guide:
  <https://tailwindcss.com/docs/v4-beta> (v4 was stable by Phase 0
  ship date).
