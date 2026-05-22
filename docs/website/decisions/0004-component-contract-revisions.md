---
date: 2026-05-09T00:00:00.000Z
tags:
  - components
  - contract
  - accessibility
  - persistence
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-16"
  evidence:
    - kind: test
      ref: packages/components/src/components/Predict/Predict.contract.test.ts
      date: "2026-05-12"
      notes: "Component-contract conformance tests on Predict; mirrored across LearningObjectives, Aside, Callout, etc."
    - kind: test
      ref: packages/components/src/components/LearningObjectives/LearningObjectives.contract.test.ts
      date: "2026-05-12"
      notes: "Contract suite covering serialize/render split + axe-core a11y."
    - kind: chapter
      ref: examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx
      date: "2026-05-14"
      notes: "1347-line real chapter exercises Predict + Reflection + ComprehensionGate per the component-contract revisions."
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: "2026-05-15"
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

## Revisions

### R-2026-05-22 — Doc clarification pass (no code change)

External review (2026-05-22) of the contract reference doc surfaced
seven doctrine clarifications that were *implicit* in Sophie's shipped
code but *unstated* in the reference doc. The
[component-contract.md](../reference/component-contract.md) reference
gained:

1. **§3 "Minimal viable component"** — explicit floor (`kind` +
   `schema` + `render.read`); helper factories (`defineStaticComponent`,
   `defineInteractiveComponent`, `defineCalloutComponent`,
   `defineRegistryBackedComponent`) called out as the ergonomic layer.
2. **§4 print render-mode "static-fallback rule"** — every interactive
   component must define a meaningful non-interactive print
   representation; placeholder shape is locked.
3. **§6 dual-reference-system clarification** — the `refs.consumes` /
   `refs.produces` field handles intra-chapter component pairings;
   [ADR 0060](./0060-registry-ecosystem.md)'s `refId` pattern handles
   cross-document registry references. Two systems, one pedagogy
   graph; new components pick whichever fits.
4. **§7 "Component identity policy"** — the canonical anchor prefix
   table at [packages/core/src/schema/pedagogy-index.ts:36-53](../../packages/core/src/schema/pedagogy-index.ts#L36-L53)
   IS Sophie's identity policy; documented alongside the M1/M2/F3
   uniqueness invariants.
5. **§8 "Deterministic vs. AI audit boundary" — locked principle** —
   deterministic checks for structure, AI checks for judgment;
   surfaced as an `:::{important}` admonition.
6. **§9 "Audit finding output schema"** — references
   [`AuditFindingSchema`](../../packages/core/src/schema/audit.ts);
   documents the locked shape (severity / code / message / location)
   and the deferred Tier 3 extensions (category / rationale /
   suggestedFix / confidence).
7. **§10 "Source locations & patchability"** — current
   chapter-keyed location shape is documented as a base; file / line /
   column extension is a planned enhancement that lands when
   extractors forward `mdast` positions.

§14 (Open design questions) updated to reflect resolved items
(composition rules, serialize contract, cross-page refs via ADR 0060)
and four newly-named deferred items (Tier 3 AI check spec shape,
source-location extension, profile visibility on the contract,
security model for Pyodide embeds).

No code changes in this revision. The contract's TypeScript shape
(`PedagogyComponent<Props, State, Response>`) is unchanged.
`AuditFindingSchema` stays at its W1-locked shape; future fields
land with their first concrete AI-check consumer. This amendment is
a documentation-rigor pass, not a contract revision.

### R-0058 — Amended by ADR 0058 (epistemic role contract, 2026-05-16)

[ADR 0058](0058-epistemic-component-contract.md) adds an optional
top-level `epistemicRole: EpistemicRole.optional()` field to the
component contract. No required migration; existing components
that encode role implicitly (via `variant=`, `kind=`, or child-
component shape) continue to work, and the lookup table in
[scientific-reasoning-os.md](../explanation/scientific-reasoning-os.md)
documents the implicit mapping.

[ADR 0058 §R-deep-dive](0058-epistemic-component-contract.md)
(2026-05-19, shipped via PR #133) demonstrates the contract's
elasticity: `<Callout variant="deep-dive">` joins the implicit-role
table with the new pattern *"role inherited from surrounding
container"* (mirrors the ADR 0046 `<CommonMisuse>` linked-container
pattern), while `<Callout variant="the-more-you-know">` is
deliberately untracked — the first ADR-blessed precedent for
"rendered but not indexed." The taxonomy boundary is itself a
component-contract decision, even when it produces no schema
entry.

## References

- Brainstorming session, contract-revisions Q (May 2026).
- [reference/component-contract.md](../reference/component-contract.md)
  — full contract with these revisions in place.
- [explanation/persistence-model.md](../explanation/persistence-model.md)
  — context for why `useInteractive` matters.
