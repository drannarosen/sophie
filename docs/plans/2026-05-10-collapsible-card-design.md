# CollapsibleCard — Design

**Date**: 2026-05-10
**Status**: Validated; ready for implementation
**Trio**: 3 (component #1 of 3)
**Authors**: Anna (collaborator), Claude (drafter)
**Source plan**: [docs/plans/2026-05-10-phase-1-component-trios.md § Deep Dive → CollapsibleCard](2026-05-10-phase-1-component-trios.md)

## Purpose

Owns the "Deep Dive" pattern: a disclosure widget that's collapsed
on first read and persists open/closed state per student via
`useInteractive`. Lets chapter authors mark passages as
*skippable on first read* while preserving the affordance for
students who want to drill in. The collapsed-by-default behavior is
the defining feature — a non-collapsible variant would be
structurally a different thing (and per the Trio 2 design notes,
explicitly not a Callout variant).

## Decisions

1. **Mechanism — Radix Collapsible primitive** (per ADR 0019).
   First concrete Radix integration in `@sophie/components`;
   establishes the pattern for future Tabs/Dialog/Tooltip.
   `@radix-ui/react-collapsible` (~3 KB gzipped).
2. **Variants — single variant for v1** (YAGNI). The source SCSS
   supports teal/gold accent pairs ("evidence" / "pitfall"); smoke
   uses only the default. Adding a `variant` prop without a real
   second use case codifies semantics speculatively. Add when a
   chapter genuinely demands the alt accent.
3. **Persistence — required, single component**. Always
   persistence-bearing; required `course/chapter/id` props per
   ADR 0027. Matches `LearningObjectives` / `Predict` / the
   self-assessment family rather than the `Callout` /
   `InteractiveCallout` split. "Deep Dive" is inherently a
   skipped-or-studied signal worth persisting.

## API surface

```ts
export interface CollapsibleCardProps {
  // ADR 0027 per-instance hydration props (required)
  course: string;
  chapter: string;
  id: string;

  // Visible header text + accessible name of the disclosure trigger.
  // Authors typically prefix "Deep Dive: …" but the component does
  // not enforce a pattern.
  title: string;

  // First-visit open state. Default false — "skippable on first
  // read" is the defining feature. Only the initial value before
  // any persisted state exists.
  defaultOpen?: boolean;

  children: React.ReactNode;
}
```

**MDX usage** (requires `client:load` per ADR 0027):

```mdx
<CollapsibleCard
  course="astr101" chapter="spoiler-alerts" id="hydrogen-fingerprint"
  title="Deep Dive: Hydrogen's Atomic Fingerprint"
  client:load
>
  The red glow comes from hydrogen's H-alpha transition at 656.3 nm…
</CollapsibleCard>
```

**Zod schema** mirrors the prop interface (ADR 0003), with
`defaultOpen` defaulting via `.default(false)`.

## Internal structure

```tsx
import * as Collapsible from "@radix-ui/react-collapsible";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./CollapsibleCard.module.css.js";

export function CollapsibleCard({
  course, chapter, id, title, defaultOpen = false, children,
}: CollapsibleCardProps) {
  const { value: open, setValue: setOpen, controlProps } =
    useInteractive<boolean>(
      course, chapter, `collapsible-card:${id}:open`, defaultOpen
    );

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className={styles.card}
    >
      <Collapsible.Trigger {...controlProps} className={styles.trigger}>
        <span className={styles.chevron} aria-hidden="true" />
        <span className={styles.title}>{title}</span>
      </Collapsible.Trigger>
      <Collapsible.Content className={styles.content}>
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
```

**Why this shape**:

- Controlled `open` / `onOpenChange` binds Radix's state directly to
  `useInteractive`. No DOM-attribute sync dance.
- `controlProps` spread on `Trigger` sets `disabled` + `aria-busy`
  while hydration is in flight (PR #8 hardening pattern). Clicks
  landing pre-hydration cannot toggle into a state IDB is about to
  overwrite.
- Chevron rotates via `[data-state="open"]` selector that Radix
  sets on the trigger. Pure CSS; no JS rotation logic.
- Radix auto-manages `aria-expanded` on the trigger and the
  `id`/`aria-controls` linking trigger ↔ content. Axe verifies.

**Persistence key**: `collapsible-card:${id}:open` — matches the
namespacing convention of `interactive-checkbox:${id}:checked`.

## Styling

CSS Module ported from
`astr101-sp26/assets/theme/collapsible-cards.scss`. Translation
choices:

- `$teal-light` → `var(--sophie-brand-teal)`.
- Hardcoded paddings → Sophie spacing-scale tokens.
- `summary::before` chevron pattern preserved (rotate −45° → 45°),
  driven by Radix's `[data-state="open"]` rather than native
  `[open]`.
- `.card-grid` (multi-card stacking with alternating accents) —
  **out of scope** per the v1 single-variant decision. Authors
  stack `<CollapsibleCard>` vertically; spacing comes from each
  card's `margin-block`.
- No manual `[data-bs-theme="dark"]` rules. Sophie's theme
  variables switch automatically via `prefers-color-scheme` in
  `@sophie/theme/css`.
- Logical properties (`border-inline-start`, `padding-inline`) per
  coding-standards.md § CSS.
- Explicit `:focus-visible` ring on the trigger — needed because
  it's now a `<button>` (Radix), not a `<summary>`.

See section 3 of the brainstorming for the full CSS module body.

## Smoke chapter migration

Four `<Callout variant="info" title="Deep Dive: …">` instances in
[examples/smoke/src/content/chapters/spoiler-alerts.mdx](../../examples/smoke/src/content/chapters/spoiler-alerts.mdx)
convert to `<CollapsibleCard client:load>` with these ids:

| Source line (approx) | id |
|---|---|
| ~404 "Hydrogen's Atomic Fingerprint" | `"hydrogen-fingerprint"` |
| ~434 "How the Distance Ladder Works" | `"distance-ladder"` |
| ~469 "Nucleosynthesis Sites" | `"nucleosynthesis-sites"` |
| ~483 (Spoiler 4: Dispersion) | `"dispersion"` |

Add `CollapsibleCard` to the file's component imports. The MDX
components map in `[slug].astro` doesn't need it — `client:load` at
the call site is the routing mechanism per ADR 0027.

## Exports

`packages/components/src/index.ts`: add `CollapsibleCard` +
`CollapsibleCardProps` + `CollapsibleCardPropsSchema` +
`collapsibleCardContract`, alphabetically between Callout and
ComprehensionGate exports.

## Testing scope

**Unit tests** (`CollapsibleCard.test.tsx`):

1. Renders title and chevron; content is collapsed by default.
2. Respects `defaultOpen={true}` on first render (no persisted state).
3. Opens on trigger click; content becomes visible; chevron rotates
   via `data-state="open"`.
4. Closes on second click.
5. Spreads `controlProps`: trigger is `disabled` + `aria-busy`
   before hydration resolves.
6. Persists open state across re-mount via `useInteractive`
   (fake-indexeddb + `__resetRuntimeCaches` between tests).
7. Course/chapter/id namespace isolation: two CollapsibleCards
   with different ids don't share state.
8. Axe-core: zero structural violations.

**E2E test** (`examples/smoke/e2e/collapsible-card.spec.ts`):

1. Renders 4 Deep Dive cards, each collapsed by default, titles
   visible.
2. Click expands; reload preserves expanded state (IDB persistence
   keyed by author id).
3. Axe-core: zero structural violations on the spoiler-alerts
   chapter (`disableRules(["color-contrast"])` per Sophie's
   standing posture).

**Storybook story** (`CollapsibleCard.stories.tsx`):

- Default (closed).
- DefaultOpen (`defaultOpen: true`).
- LongContent (multi-paragraph body).
- ListContent (`<ul>` + `<strong>` to exercise content styles).

Persistence-bearing stories namespace via `course="storybook"`,
`chapter="collapsiblecard"`, unique `id` per story. Per ADR 0028,
test-runner runs axe-only.

## Out of scope (intentionally deferred)

- **Card grid pattern** (`.card-grid` stacking with alternating
  accents). Add when a chapter actually uses it.
- **Evidence vs Pitfall variants**. YAGNI; smoke only uses default.
- **Animation polish**. Radix exposes `--radix-collapsible-content-height`
  for height animation; v1 uses an instant snap. Add motion in a
  follow-up if needed (and respect `prefers-reduced-motion`).
- **Static (non-persistence) `<CollapsibleCard>`**. No real use
  case yet; add the static variant only when one emerges.

## Verification

Per superpowers:verification-before-completion, the PR is green when:

- `pnpm exec turbo run typecheck test:unit build` clean.
- `pnpm test:e2e` includes the new spec, 12 + 3 = 15 specs, all
  pass.
- `pnpm test:storybook` against the static build — all stories
  axe-clean.
- `pnpm lint` + `pnpm format` clean (Biome).
- 6 required CI checks green on first push.

## References

- [ADR 0019](../website/decisions/0019-radix-ui-primitives.md) — Radix as Sophie's a11y primitive layer.
- [ADR 0027](../website/decisions/0027-mdx-render-boundary-prop-threading.md) — per-instance hydration; required course/chapter/id props.
- [ADR 0028](../website/decisions/0028-storybook-setup.md) — Storybook test-runner runs axe-only on stories.
- coding-standards.md § Persistence-bearing controls — the `controlProps` hardening pattern from PR #8.
- [docs/plans/2026-05-10-phase-1-component-trios.md](2026-05-10-phase-1-component-trios.md) — Trio 3 overall.
- Source SCSS: `astr101-sp26/assets/theme/collapsible-cards.scss`.
