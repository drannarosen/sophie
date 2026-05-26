---
date: 2026-05-16T00:00:00.000Z
tags:
  - state
  - interactive
  - linked-representations
  - primitive
  - zustand
  - a11
  - reasoning-os
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0059: Linked-representation state primitive (A11)

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0058](./0058-epistemic-component-contract.md)
:::

## Context

[ADR 0058](./0058-epistemic-component-contract.md) locked the
eight-role epistemic contract; the
[Reasoning-OS thesis](../vision/reasoning-os/index.md) named the
*linked-representation state primitive* as A11 — accepted-pending-
ADR with this ADR as its authoring document. The motivating use
case is detailed in
[`vision/reasoning-os/linked-representations.md`](../vision/reasoning-os/linked-representations.md):
one parameter cursor (e.g., a blackbody temperature slider) co-
varies multiple linked views (Planck spectrum, Wien-peak readout,
visible-band shading, color swatch, stellar classification) *on
the same page*, with each view tagged for its [ADR 0058](./0058-epistemic-component-contract.md)
epistemic role.

Sophie has one existing state primitive:
[`useInteractive`](./0007-persistence-indexeddb.md) (ADR 0007,
refined by ADR 0029 — BroadcastChannel LWW). It is *per-component,
per-student, durable*: a `<Predict>` answer, a
`<Dropdown>` open/closed state, a `<CodeCell>` code body —
each writes through to IndexedDB with last-write-wins cross-tab
sync. Conflating linked-rep cursor state with `useInteractive`
would either burn ~60 IndexedDB writes per second of slider drag
(bad) or split the codebase into two state models that look
similar but behave differently (worse). The two shapes are
architecturally distinct (full comparison table in the
[linked-representations vision page](../vision/reasoning-os/linked-representations.md#why-this-requires-a-new-state-primitive-a11)).

The trigger for shipping A11 now is **the first concrete interactive
figure**: `<BlackbodyExplorer>` lands in the same PR as this ADR
(see [vertical-slice rationale](#vertical-slice-rationale) below). The Reasoning-OS thesis registered four C-tier consumers
(A8 `<OMIFlow>`, A9 `<AssumptionStack>`, A10 `<UncertaintyLens>`,
A11 itself) in [vision/features/accepted.md](../vision/features/accepted.md);
A11 ships first because the interesting versions of A8/A9/A10 all
depend on cross-component reactive state and would otherwise ship
in degraded static forms.

## Decision

Implement A11 as a **Zustand-backed page-local store** with a
minimal three-primitive surface area, exposed from
`@sophie/components/interactive`:

### Surface 1 — `useLinkedParameter` hook

```ts
function useLinkedParameter(name: string):
  readonly [value: number, setValue: (v: number) => void, def: ParameterDefinition];
```

Subscribes to a named parameter cursor. Returns the current
value, a setter, and the parameter's definition (range, unit,
default). Subscribers re-render only when their named parameter
changes (per-parameter selector to avoid whole-store re-renders).

### Surface 2 — `<ParameterCursor>` definition component

```tsx
<ParameterCursor
  name="T"
  min={1000}
  max={50000}
  default={5772}
  unit="K"
  step="log"           // "log" | number; log treats min/max in log space
  scope="section"      // "section" | "page"; default "section"
  cursorGroup?: string // opt-in cross-section sharing
/>
```

Renders nothing. Registers the named cursor with the page store on
mount; unregisters on unmount. `scope="section"` (default) auto-
prefixes the cursor name with the nearest section anchor so two
sections on the same page get independent cursors unless the
author opts into sharing via `cursorGroup="..."`. Per
[ADR 0058](./0058-epistemic-component-contract.md), `<ParameterCursor>`
is chrome — it has no `epistemicRole`.

### Surface 3 — `<ParameterSlider>` control

```tsx
<ParameterSlider
  name="T"
  label="Temperature"
  ariaLabel?: string
  format?: (value: number) => string  // override readout format
/>
```

[Radix UI slider](https://www.radix-ui.com/primitives/docs/components/slider)
control surface per [ADR 0019](./0019-radix-ui-primitives.md).
Reads + writes the named cursor. Renders the parameter's `unit`
in the inline value readout by default. Per
[ADR 0058](./0058-epistemic-component-contract.md), chrome
(it controls cursors; the cursors carry the epistemic content).

### What's NOT in the primitive surface

The following are deliberately *not* primitives — they are
composition patterns that consumers implement using
`useLinkedParameter` directly:

- `<LinkedPlot>` / `<LinkedValue>` / `<LinkedComputed>` — chapter
  authors call `useLinkedParameter("T")` inside their own
  component bodies. No wrapper sugar at v1.
- `<ParameterCursor>` array / multi-parameter cursors — a page
  with two parameters declares two `<ParameterCursor>` siblings.
  No batching API.
- Animation / interpolation between states — subscribers handle
  their own transitions (Framer Motion, D3 transitions, CSS
  transitions) if they want them. Initial version is step-wise
  re-render on cursor change.
- Persistence — A11 cursor values are deliberately *not*
  persisted. The slider position is navigational state, not a
  learning artifact. A `<Predict>` answer (captured separately
  via `useInteractive`) can snapshot the cursor value at
  submission time; that's the persistence boundary.
- Cross-tab sync — A11 cursors are single-tab. Two tabs viewing
  the same page have independent cursors. No
  [BroadcastChannel](./0029-broadcast-channel-last-write-wins.md)
  binding.

### New dependencies

Three packages added to `@sophie/components/dependencies`:

| Package | Version | Use | License |
|---|---|---|---|
| `zustand` | `^5.x` | A11 store | MIT |
| `@radix-ui/react-slider` | `^1.x` | slider control surface (per ADR 0019) | MIT |
| `@observablehq/plot` | `^0.6.x` | plotting (per ADR 0021; first install) | ISC |

Observable Plot was decided in [ADR 0021](./0021-observable-plot-data-viz.md)
in 2025 but never actually installed because no component
needed it yet. This ADR's bundled consumer
(`<BlackbodyExplorer>`) is the first install. All three packages
are mature, MIT/ISC-licensed, compatible with the AGPL of Sophie
itself ([ADR 0024](./0024-license-agpl.md)).

### What this ADR does *not* commit to

- The full A8 `<OMIFlow>` design (deferred to a future ADR that
  graduates A8; this ADR's primitive is its prerequisite).
- A9 `<AssumptionStack>` or A10 `<UncertaintyLens>` designs.
- Theme tokens for epistemic roles
  ([ADR 0005](./0005-theming-three-layers.md) extension; deferred
  to a future ADR once ≥2 figures earn the tokenization).
- A built-in animation primitive — subscribers handle their own
  motion if they want it.
- Schema for `pedagogyIndex.interactive[]` — the pedagogy-index
  extractor ([ADR 0038](./0038-pedagogy-index-pattern.md))
  treats interactive components as opaque pedagogy nodes at v1.
  Index-level interactive metadata is a future ADR if/when
  audit invariants need it.

## Rationale

### Why Zustand over Jotai, React Context, or bespoke `useSyncExternalStore`

Four candidates, scored against the actual workload (page-local,
sub-millisecond cursor drag, multiple subscribers, SSR-safe):

- **Zustand** (~3 KB gz, hooks-first, no provider, MIT). Per-key
  selectors avoid whole-store re-renders. SSR-safe with default
  values. Zero cognitive overhead — `create<S>()(set => ({...}))`
  is the entire setup. The SoTA default for this state shape in
  React 19.

- **Jotai** (~5 KB gz, atom-based, MIT). Finer per-atom
  granularity than Zustand, but requires a `<Provider>` boundary
  for page-scoped stores; the provider boundary collides with
  MDX-rendered chapter content where the `<ParameterCursor>`
  registration site is the natural scope boundary, not a
  separately-rendered provider. Rejected — provider overhead
  doesn't earn its keep at this scale.

- **React Context + `useState`**. Native, zero extra deps. Cons:
  whole-tree re-render on every cursor change (no selector
  granularity); a single page with 6 subscribers and a 60Hz
  drag is ~360 re-renders/sec all the way down the tree.
  Rejected on performance grounds.

- **Bespoke `useSyncExternalStore`** (React 18+ hook). Pros:
  zero dep. Cons: re-implementing per-key selectors, default
  handling, debug tooling, devtools integration — ~150 lines
  of code that Zustand already ships, tested, with a 4-year
  track record. Rejected on YAGNI; Zustand's surface fits
  exactly.

### Why section-scoped cursors by default

Two sections on the same page that both use a `T` slider — for
example, a "Blackbody Spectrum" section and an "HR Diagram"
section — could share or not-share the cursor. The pedagogical
shape differs:

- **Sharing.** Dragging T in one section moves it in the other.
  Continuity of representation; what changes here changes
  everywhere. Good for *parameter tour* pages.
- **Independent.** Each section has its own T. Locally explorable
  without affecting elsewhere. Good for *parallel example*
  pages.

The conservative default is *independent*. Loosening (opt into
sharing) is a one-attribute change:

```tsx
<ParameterCursor cursorGroup="solar-temperature" name="T" ... />
```

Tightening (opt out of sharing once two sections have been
authored to share) would require a refactor across both sections.
Default to the narrower scope; provide an explicit-widen
mechanism. The
[explicit-widen-not-tighten principle](#scope-defaults) is the
SoTA shape for distributed scope decisions.

The implementation: `scope="section"` (default) prefixes the
cursor name with the nearest [`{#section-anchor}` MDX label](https://mystmd.org/guide/cross-references)
of the enclosing `<section>` or `<details>` element, or the
chapter slug as a fallback. `cursorGroup="..."` overrides the
namespacing with an author-chosen group label.

### Why subscribers handle their own animation

Two reasons:

1. **Subscriber-appropriate motion.** Observable Plot redraws
   step-wise; Framer Motion interpolates smoothly; a text
   readout might want a `motion.span animate={{ opacity }}`
   crossfade; a color swatch might want `transition: background
   200ms`. The animation library and easing function are local
   choices, not store choices. Building animation *into* the
   store would force one motion vocabulary across all
   subscribers.
2. **Bundle discipline.** A built-in motion primitive would
   either pull Framer Motion into A11 always (~30 KB gz) or
   ship a half-baked custom interpolator. Both are wrong shapes
   for a "shared cursor" primitive.

The cost: subscribers that *want* smooth motion implement it
themselves. The benefit: A11 stays ~3 KB and subscribers pay
only for motion they use.

### Why no persistence

A11 cursors are *navigational state*, not *learning artifacts*.
The student's slider position when they revisit a page is not
meaningful pedagogical data — it's like preserving scroll
position. The meaningful artifact is *what they predicted /
answered / submitted* with the slider at a given position; that
artifact lives in `useInteractive` per
[ADR 0007](./0007-persistence-indexeddb.md) and explicitly
captures the cursor value at submission time as a snapshot in
its durable write.

Persisting cursors would also introduce a *cross-session
restoration* surprise: revisiting a page would silently restore
the previous slider position, which usually muddles "where am I
in the lesson?" judgments. The clean separation is exactly the
right shape.

(vertical-slice-rationale)=
### Why bundle the first consumer in the same PR

A11 ships in the same PR as `<BlackbodyExplorer>` — its first
concrete consumer. Two reasons:

1. **Vertical-slice validation** ([ADR 0023](./0023-vertical-slice-build-order.md)).
   The primitive's API is correct *for the use case it's first
   proven against*. Shipping A11 alone as infrastructure then
   building the consumer in a second PR risks API churn between
   the two; the second PR retrofits the primitive to the real
   use case. Bundling forces correctness on first contact.

2. **Demonstrates ADR 0058's contract.** The
   `<BlackbodyExplorer>` exercises **four of the eight
   epistemic roles** (`model` = Planck curve, `observable` =
   visible-band shading + color swatch, `inference` = Wien
   peak + Stefan-Boltzmann + stellar classification,
   `approximation` = Rayleigh-Jeans + Wien limit overlays).
   That is the smallest possible end-to-end test of the
   Reasoning-OS thesis, not a contrived demo. Shipping the
   primitive without the consumer would defer the actual
   contract validation by a PR cycle.

(scope-defaults)=
### The "explicit widen, not tighten" principle

This ADR introduces a small but reusable design rule that future
Sophie state primitives should follow: **when picking scope
defaults, default to the narrower scope and provide an explicit
widen-mechanism, not the reverse.**

Reasons:

- Loosening is one-line and additive; tightening is a refactor
  across all consumers.
- A narrow default surfaces the intent-to-share at the call site
  (`cursorGroup="..."`), making it auditable by reviewers.
- A wide default is invisible at the call site (you have to *not
  see* a `scope="section"` to know it's wide), which makes
  cross-section coupling silently easy to introduce.

This principle generalizes beyond A11 to future per-page,
per-chapter, per-course state shapes.

## Alternatives considered

- **Defer A11; build `<BlackbodyExplorer>` as a monolith first.**
  Pros: smaller first PR. Cons: coins per-component state
  patterns that future C-tier components (A8/A9/A10) would have
  to retrofit; the second figure would re-invent the cursor
  shape; refactor cost compounds. **Rejected** — the
  refactor-cost compounding outweighs the small-first-PR
  benefit.

- **Build A11 alone in this PR; the first consumer in PR 2.**
  Pros: cleaner separation of architectural decision from
  feature delivery. Cons: violates [ADR 0023](./0023-vertical-slice-build-order.md)
  vertical-slice-first; risks API churn in PR 2 because the
  primitive wasn't proven against a real consumer; defers the
  ADR 0058 contract validation by a cycle. **Rejected.**

- **Ship A8 `<OMIFlow>` first, as a static three-panel
  composite, with A11 deferred.** This was the original plan in
  [`vision/features/accepted.md`](../vision/features/accepted.md)
  A8-vs-A11 ordering. Pros: A8 ships earlier. Cons: a static
  three-panel composite demonstrates nothing ADR 0058 doesn't
  already say in prose; the interesting version of A8 needs
  A11 anyway; building A8 on top of A11 from day one avoids
  the refactor. **Rejected** — reordered: A11 first, A8 second.
  The `accepted.md` sequencing note will update at A11
  graduation.

- **A page-level cursor scope as the default.** Pros: cursor
  sharing across sections is the *interesting* showcase.
  Cons: silently easy to introduce unwanted cross-section
  coupling; harder to audit; tighter loosening cost. **Rejected**
  per the explicit-widen-not-tighten principle above.

- **Pull Framer Motion into A11 as a built-in animation
  primitive.** Pros: smooth motion would be one less
  per-consumer integration. Cons: ~30 KB extra in every
  consuming page; forces one motion vocabulary; deeper coupling
  between cursor state and rendering. **Rejected** — A11 stays
  a state primitive, motion is per-subscriber.

- **Persist cursor state via `useInteractive`.** Pros: revisits
  restore prior slider position. Cons: muddles pedagogical-
  artifact persistence with navigational-state persistence;
  burns ~60 IndexedDB writes/sec on drag; surprising UX.
  **Rejected.**

- **Implement bespoke `useSyncExternalStore`-based store.**
  Pros: zero dep. Cons: ~150 lines of code Zustand already
  ships tested. **Rejected** on YAGNI grounds.

## Consequences

**Easier:**

- Authors of interactive figures get a tiny three-primitive
  surface: `useLinkedParameter` + `<ParameterCursor>` +
  `<ParameterSlider>`. No state-management boilerplate per
  component.
- The first interactive figure (`<BlackbodyExplorer>`) ships
  in the same PR, validating the contract immediately.
- Future C-tier components (A8 `<OMIFlow>`, A9
  `<AssumptionStack>`, A10 `<UncertaintyLens>`) inherit a
  proven state model.
- AI authoring per [ADR 0030](./0030-audience-and-ai-author-model.md)
  can generate `<ParameterCursor>` + subscriber pairs from a
  natural-language prompt — *"add a temperature slider that
  updates the spectrum and the color swatch"* maps onto the
  three primitives one-to-one.
- The eight-role contract from
  [ADR 0058](./0058-epistemic-component-contract.md) gets
  concrete first-instance validation in the
  `<BlackbodyExplorer>`'s four role-tagged elements.

**Harder:**

- Three new dependencies (`zustand`, `@radix-ui/react-slider`,
  `@observablehq/plot`) to maintain. Combined gzipped weight
  added to `@sophie/components`: ~30 KB. Observable Plot is the
  largest of the three (~25 KB) and was already locked by
  [ADR 0021](./0021-observable-plot-data-viz.md), so its install
  is overdue rather than additive.
- Section-anchor-namespacing requires the
  `<ParameterCursor>` to resolve its enclosing section at mount
  time. The MDX-rendered DOM provides this via `<section
  id="...">` ancestors; the implementation walks the DOM up
  from the cursor's mount point. Reasonable but not free.
- SSR/hydration: the cursor's default value renders server-side;
  the Zustand store hydrates on client mount. A mismatch would
  manifest as a brief render of default values before client
  takes over. The mitigation: render the default value
  server-side and skip the store binding on first paint; bind
  on first user interaction. Validated in the consumer's
  Storybook story.

**Triggers:**

- **New dep installs** in `@sophie/components/package.json`
  (`zustand`, `@radix-ui/react-slider`, `@observablehq/plot`). PR
  must run `pnpm install --frozen-lockfile` locally before
  open (per
  [`feedback_pre_pr_lockfile_check`](../../../) memory).
- **New module** `packages/components/src/interactive/` with
  three exports + index barrel. Wired into
  `packages/components/src/index.ts` per
  [ADR 0004](./0004-component-contract-revisions.md) component
  contract.
- **Storybook stories** for `<ParameterSlider>` (in isolation)
  and `<BlackbodyExplorer>` (the first consumer). axe-core
  tests per [ADR 0004](./0004-component-contract-revisions.md);
  visual-regression baselines per
  [ADR 0057](./0057-visual-regression-baseline.md).
- **Smoke chapter migration** in `examples/smoke/` that uses
  `<BlackbodyExplorer>` in an OMI-framed section. Validates
  the end-to-end pedagogy index path: the explorer's
  role-tagged elements appear in `pedagogyIndex.interactive[]`
  (extractor support is opaque-pedagogy-node at v1; structured
  index entries are a future ADR).
- **`vision/features/accepted.md`** A11 entry graduates to
  one-line pointer at this ADR's accept. A8 entry's status
  line updates: *"prerequisite met (ADR 0059 + A11); ready to
  graduate."*
- **CLAUDE.md** locked-decisions table gains a 0059 row.

## References

- [ADR 0001 — Platform not monorepo](./0001-platform-not-monorepo.md)
  — `@sophie/components` is framework-pure; no astro:* imports.
- [ADR 0003 — Zod as source of truth](./0003-zod-as-source-of-truth.md)
  — `ParameterCursor` props validated via Zod schema.
- [ADR 0004 — Component contract revisions](./0004-component-contract-revisions.md)
  — axe-core mandate; serialize separation; the contract A11
  primitives extend.
- [ADR 0005 — Three-layer theming](./0005-theming-three-layers.md)
  — future epistemic theme-token slots; not extended by this
  ADR.
- [ADR 0007 — Persistence (IndexedDB)](./0007-persistence-indexeddb.md)
  — `useInteractive` is per-component durable persistence;
  A11 is page-local ephemeral. Distinct shapes.
- [ADR 0019 — Radix UI primitives](./0019-radix-ui-primitives.md)
  — slider primitive used by `<ParameterSlider>`.
- [ADR 0021 — Observable Plot data viz](./0021-observable-plot-data-viz.md)
  — locked the plotting library; this ADR's bundled consumer
  is its first install.
- [ADR 0023 — Vertical-slice build order](./0023-vertical-slice-build-order.md)
  — why A11 + first consumer ship together.
- [ADR 0024 — License (AGPL)](./0024-license-agpl.md)
  — dep license compatibility check.
- [ADR 0029 — BroadcastChannel last-write-wins](./0029-broadcast-channel-last-write-wins.md)
  — `useInteractive` cross-tab semantics; A11 has no
  equivalent because cursors are single-tab.
- [ADR 0030 — Audience + AI author model](./0030-audience-and-ai-author-model.md)
  — AI authoring of role-aware cursor+subscriber pairs.
- [ADR 0038 — Pedagogy-index pattern](./0038-pedagogy-index-pattern.md)
  — interactive components as opaque-pedagogy-node entries at
  v1; structured `pedagogyIndex.interactive[]` deferred.
- [ADR 0057 — Visual regression baseline](./0057-visual-regression-baseline.md)
  — VR baselines for both primitive and consumer.
- [ADR 0058 — Epistemic Component Contract](./0058-epistemic-component-contract.md)
  — the eight-role contract `<BlackbodyExplorer>` validates.
- [vision/reasoning-os/linked-representations.md](../vision/reasoning-os/linked-representations.md)
  — design surface and open-question list this ADR resolves.
- [vision/features/accepted.md A11 entry](../vision/features/accepted.md)
  — promotes to graduated at this ADR's accept; A8 status
  updates to "prerequisite met."
- [Zustand documentation](https://github.com/pmndrs/zustand)
- [@radix-ui/react-slider documentation](https://www.radix-ui.com/primitives/docs/components/slider)
- [@observablehq/plot documentation](https://observablehq.com/plot/)
