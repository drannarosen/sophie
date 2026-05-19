---
date: 2026-05-12T00:00:00.000Z
tags:
  - theming
  - design-tokens
  - naming-convention
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0035: Theme tokens use flat, kind-less names

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
- **Amends**: 0005
:::

## Context

[ADR 0005](0005-theming-three-layers.md)'s Triggers section
sketched a per-component token namespacing convention:
`--color-<kind>-*`, `--space-<kind>-*`, `--radius-<kind>-*`.
That sketch was never adopted by `@sophie/theme`. What
actually shipped is a flat surface: `--sophie-bg`,
`--sophie-text`, `--sophie-border`, `--sophie-surface-1/2/3`,
`--sophie-space-{0..10}`, `--sophie-radius-{sm,md,lg}`.

The drift surfaced during Bucket B PR 2's visual smoke
([audit 2026-05-12](../../reviews/2026-05-12-bucket-b-pr2-audit.md)):
PR 1's [`packages/astro/src/styles/textbook-layout.css`](../../../packages/astro/src/styles/textbook-layout.css)
was written against the ADR-0005-intended names
(`--sophie-color-bg`, `--sophie-color-fg`,
`--sophie-color-surface`, `--sophie-color-border`) — all
fictional — and every reference fell through to a hardcoded
fallback. Dark mode never reached the shell.
[PR #31](https://github.com/drannarosen/sophie/pull/31) fixed
the four call sites. This ADR ratifies the naming convention
that the code already follows.

## Decision

`@sophie/theme` tokens use **flat, kind-less names**. Color
tokens encode the kind in the name root, not as an infix:

| Kind | Tokens |
|---|---|
| Background | `--sophie-bg` |
| Text | `--sophie-text`, `--sophie-text-2`, `--sophie-text-muted`, `--sophie-text-faint` |
| Border | `--sophie-border`, `--sophie-border-subtle` |
| Surface | `--sophie-surface-1`, `--sophie-surface-2`, `--sophie-surface-3` |
| Link | `--sophie-link`, `--sophie-link-hover` |
| Brand | `--sophie-brand-{teal,rose,violet}[-text]`, `--sophie-accent` |
| Status | `--sophie-status-{success,warning,danger}` |
| Shadow | `--sophie-shadow-card` |
| Focus | `--sophie-focus-color`, `--sophie-focus-width` |

Non-color tokens follow the same shape: `--sophie-space-N`,
`--sophie-radius-{sm,md,lg}`, `--sophie-text-{xs..4xl}`,
`--sophie-leading-{tight,prose}`, `--sophie-weight-{normal,medium,semibold,bold}`,
`--sophie-font-{sans,serif,mono}`,
`--sophie-prose-max-width`, `--sophie-content-padding-inline`.

Variants are suffixed: `-muted`, `-subtle`, `-2`, numbered
ramps. No `--color-<kind>-` infix.

This **amends** [ADR 0005](0005-theming-three-layers.md)'s
Triggers-section naming sketch. ADR 0005's three-layer
architecture (TS tokens → CSS vars + Tailwind preset; CSS
Modules in components) is unchanged.

## Rationale

- **Already shipped.** Renaming `--sophie-bg` →
  `--sophie-color-bg` would touch `@sophie/theme`, the
  Tailwind preset, every CSS Module in `@sophie/components`,
  and `packages/astro/src/styles/textbook-layout.css` — for
  zero semantic gain.
- **Shorter names are easier to write and read.** `--sophie-bg`
  vs. `--sophie-color-bg` — the kind is obvious from `bg`.
- **Numbered ramps cover the "multiple shades of one kind"
  case.** `--sophie-surface-1/2/3` lets consumers pick a
  depth without needing per-shade kinds.

## Alternatives considered

- **Refactor `@sophie/theme` to `--sophie-color-<kind>-*`
  (ADR 0005's intent).** Rejected: larger churn; consumers
  already use the flat names; the kind disambiguation that
  the infix would provide is already encoded in the name root.

- **Component-prefixed tokens (`--sophie-callout-bg`,
  `--sophie-collapsible-border`).** Rejected: a separate
  concern. Component-scoped tokens are added inside the
  component's CSS Module, derived from the global tokens.
  Already used by P2-8 (`sa-` namespace on the
  self-assessment quartet).

## Consequences

**Easier:**

- The convention is now documentable for AI authors (per
  [ADR 0030](0030-audience-and-ai-author-model.md)). A
  schema-driven assistant scaffolding a component knows that
  `--sophie-bg` is the page background.
- ADR 0005's Triggers-section namespacing wording no longer
  drifts from reality.
- New tokens add cleanly to the flat surface
  (`--sophie-shadow-overlay`, `--sophie-status-info`, etc.).

**Harder:**

- Two component instances that need different shades of the
  same kind must distinguish via numbered ramps or component
  prefixes — there's no per-kind subtoken structure to lean
  on.
- The Tailwind preset must keep emitting the flat token
  names; any future "design-token" library import that
  expects an infix won't work without a wrapper.

**Triggers:**

- Any future drift between `@sophie/theme`'s emitted tokens
  and consumer references is now an audit failure, not an
  unresolved convention question.
- The broader ADR currency sweep for ADRs 0001–0029 (per
  the audit's P2-NEW-3) continues; this ADR is one entry.

## References

- [ADR 0005](0005-theming-three-layers.md) — three-layer
  theming architecture (amended by this ADR's naming
  convention).
- [PR #31](https://github.com/drannarosen/sophie/pull/31) —
  the call-site fix that surfaced the drift.
- [Audit 2026-05-12](../../reviews/2026-05-12-bucket-b-pr2-audit.md)
  — discovered drift; recommended this codification.
- `packages/theme/scripts/generate-css.ts` — the canonical
  emitter; matches this convention.
