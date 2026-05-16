---
date: 2026-05-09T00:00:00.000Z
tags:
  - components
  - contract
  - accessibility
  - persistence
validation:
  status: validated
  last_validated_date: 2026-05-16
  evidence:
    - kind: test
      ref: packages/components/src/components/Predict/Predict.contract.test.ts
      date: 2026-05-12
      notes: "Component-contract conformance tests on Predict; mirrored across LearningObjectives, Aside, Callout, etc."
    - kind: test
      ref: packages/components/src/components/LearningObjectives/LearningObjectives.contract.test.ts
      date: 2026-05-12
      notes: "Contract suite covering serialize/render split + axe-core a11y."
    - kind: chapter
      ref: examples/smoke/src/content/chapters/01-foundations/measuring-the-sky.mdx
      date: 2026-05-14
      notes: "Real chapter exercises Predict + Reflection + ComprehensionGate per the component-contract revisions."
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: 2026-05-15
  notes: "Component contract (serialize separate from render, axe-core mandatory, useInteractive for persistence, composition rules) confirmed across every shipped component as of the bucket B+C audit."
---

# ADR 0004: Component contract revisions

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

The initial draft of the [component contract](../reference/component-contract.md)
proposed a `PedagogyComponent` interface with four render modes
(`read` / `slide` / `print` / `audit`), declarative accessibility
metadata (`accessibility: { role, keyboardNavigable, requiresLiveRegion }`),
and per-component persistence handling.

During the May 2026 brainstorming session, three concerns surfaced:

1. **`audit` is not a render mode.** The first three produce HTML;
   `audit` produces an `AuditNode` (JSON tree). They're different
   operations. Putting them in the same `modes` object is a small
   but real category error.
2. **Accessibility-as-data is a lie risk.** A component declaring
   `requiresLiveRegion: true` doesn't make it implement one. Truth
   lives in the rendered DOM, not in metadata.
3. **Persistence is silent-data-corruption risk.** Every interactive
   component would re-implement: read draft from store, write on
   change, freeze on submit, schema-migrate on read, hydration
   safety, cross-tab sync. Boilerplate × every interactive component;
   anyone getting it wrong silently corrupts a year of student data.

A fourth, smaller concern: composition rules ("what nests in what")
were flagged as a future concern but should land in v1.

## Decision

Four revisions to the component contract:

1. **Lift `audit` out of `modes` into top-level `serialize`.**
   `render: { read, slide?, print? }` produces HTML; `serialize?:
   (props) => AuditNode` produces structured data. Different fields,
   different shapes.
2. **Drop `accessibility` declarations as data.** Replace with a
   *requirement* that every component ship axe-core tests in
   Storybook and Playwright. The audit calls `pnpm test:a11y`.
3. **Provide `useInteractive` / `defineInteractive` runtime helper**
   in `@sophie/components/runtime`. Owns ResponseStore I/O, schema
   migration, submit semantics, hydration safety, cross-tab sync.
   Components consume the hook; never touch IndexedDB directly.
4. **Add composition rules** via optional
   `composition.containedIn?: string[]` and
   `composition.forbidsContaining?: string[]` per component.
   Audit Tier 2 enforces; rules grow as authoring surfaces violations.

## Rationale

1. *serialize lifted out:* clean conceptual boundary; render produces
   HTML, serialize produces data. Keeps `render` typed uniformly as
   `ComponentType<Props>` everywhere.
2. *a11y via tests:* truth lives in the DOM. Tests fail loudly when
   reality drifts from intent. Eliminates one class of metadata
   drift forever.
3. *useInteractive:* persistence boilerplate centralized; any
   component author writes `useInteractive({...})` and gets correct
   IndexedDB I/O, schema migration, BroadcastChannel sync, hydration
   safety. The cost of doing this once is small; the cost of getting
   it wrong N times is silent data loss.
4. *composition rules:* the rules already exist informally
   (Prediction-in-Prediction is forbidden; SolutionKey-in-Prediction
   is forbidden). Encoding them in the contract lets the audit
   enforce, lets new component authors see the boundaries.

## Alternatives considered

- **Keep `audit` as a render mode.** Rejected: category error;
  authors writing render functions for "audit" find it confusing
  that it's not HTML.
- **Keep accessibility-as-data, supplemented by tests.** Rejected:
  redundant with tests, drifts from reality, no payoff.
- **Per-component persistence (no helper).** Rejected: silent-data-
  corruption risk too high; cost of one persistence bug measured in
  months of student data.
- **Composition rules as Tier 3 AI checks.** Rejected: deterministic
  rules deserve Tier 1/2; AI for ambiguous content quality.

## Consequences

**Easier:**

- Adding a new component is now: write Zod schema, write `read`,
  call `registerComponent`, write Storybook stories, write axe-core
  tests, *done*. The persistence story comes free via
  `useInteractive`.
- Audit can verify composition statically.
- AI quality checks consume `serialize` output — clean separation of
  concerns.

**Harder:**

- One more concept to internalize (`useInteractive` vs. raw
  IndexedDB). Mitigated by good docs and the fact that nobody should
  touch IndexedDB directly anyway.
- The audit-mode-AuditNode separation reads slightly differently
  from how some other component-system contracts do it.

**Triggers:**

- `useInteractive` hook ships in `@sophie/components/runtime` from
  Phase 1.
- `IndexedDBResponseStore` implements the `ResponseStore` interface
  ([ADR 0007](0007-persistence-indexeddb.md)).
- axe-core integration in Storybook + Playwright from Phase 0
  (non-negotiable for any component PR).
- `composition.containedIn` / `forbidsContaining` audit checks land
  in Tier 2.

## References

- Brainstorming session, contract-revisions Q (May 2026).
- [reference/component-contract.md](../reference/component-contract.md)
  — full contract with these revisions in place.
- [explanation/persistence-model.md](../explanation/persistence-model.md)
  — context for why `useInteractive` matters.
