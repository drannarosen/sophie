---
date: 2026-05-09T00:00:00.000Z
tags:
  - foundation
  - schema
  - types
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-16"
  evidence:
    - kind: test
      ref: packages/core/src/schema/pedagogy-index.test.ts
      date: "2026-05-12"
      notes: "PedagogyIndexSchema parse + refinement coverage."
    - kind: test
      ref: packages/core/src/schema/validation.test.ts
      date: "2026-05-15"
      notes: "ValidationSchema parse + V3 refinement coverage (ADR 0056 PR #43)."
    - kind: test
      ref: packages/core/src/schema/chapter.test.ts
      date: "2026-05-12"
      notes: "ChapterSchema parse with required status frontmatter (ADR 0051)."
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: "2026-05-15"
      notes: "D4 type safety = 20/20; Zod-as-SoT held across all packages."
  notes: "Every load-bearing data shape in `@sophie/core` is a Zod schema; downstream packages type-infer via z.infer. No drift detected in the audit."
---

# ADR 0003: Zod as schema source of truth

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie's content schema (Chapter, Mission, MediaAsset, Concept,
Skill, Misconception, Course) needs to be the source of truth that
every layer refers to: the renderer for content collections, the audit
for validation, the AI authoring kit for introspection, the consumer
for type safety, the build for JSON-Schema-driven tooling like VSCode
YAML autocomplete.

An earlier draft of `content-schema.md` used hand-written TypeScript
interfaces. The risk: TS types and validation schemas drift apart
silently. A new field added to the TS interface but not to the
validator passes type-checking and crashes at build.

Astro Content Collections natively consume Zod schemas. React Hook
Form integrates with Zod. `zod-to-json-schema` is mature.

## Decision

**Zod is the source of truth.** TypeScript types are inferred via
`z.infer<typeof X>`. JSON Schema is generated via
`zod-to-json-schema(X)` for VSCode YAML autocomplete and external
authoring tools.

```typescript
const ChapterSchema = z.object({ /* ... */ });
type Chapter = z.infer<typeof ChapterSchema>;
const ChapterJsonSchema = zodToJsonSchema(ChapterSchema);
```

## Rationale

- **One source eliminates drift.** Adding a field once propagates to
  every consumer: TS types, runtime validation, JSON Schema,
  Astro Content Collections.
- **Astro's natural fit.** Astro Content Collections expect Zod;
  using anything else means writing adapters.
- **Audit needs runtime validation.** The audit walks chapter MDX
  ASTs and validates frontmatter; Zod gives this for free.
- **Bundle size is moot.** Zod isn't shipped to the browser; only
  the validated content payloads are. The size argument against Zod
  doesn't apply to a content schema.

## Alternatives considered

- **Effect Schema (`@effect/schema`).** More powerful, supports
  encoders/decoders, but newer with smaller community and steeper
  learning curve. Rejected: ecosystem maturity wins for v1.
- **TypeBox.** Emits JSON Schema natively, faster runtime
  validation. Rejected: less ergonomic; Astro doesn't use it
  natively.
- **Valibot.** Tree-shakable Zod alternative; smaller bundle.
  Rejected: bundle size doesn't matter (schema doesn't ship to
  browser); ecosystem is smaller.
- **Hand-written TS interfaces + JSON Schema** (the prior draft).
  Rejected: drift foot-gun; no runtime validation.
- **JSON Schema as canonical, generate everything from it.**
  Rejected: backwards. JSON Schema is a transport format; Zod is a
  programming-language-native schema.

## Consequences

**Easier:**

- Astro Content Collections work out of the box.
- VSCode YAML autocomplete on chapter frontmatter works via
  generated JSON Schema in `.vscode/settings.json` `yaml.schemas`
  mapping.
- Audit validation is free.
- Refactoring the schema is type-safe end-to-end.

**Harder:**

- Authors who don't know Zod have a small learning curve. Mitigated
  by: schema is small, idiomatic, and lives in one package.

**Triggers:**

- Component prop schemas live colocated with components in
  `@sophie/components/src/<Name>/<Name>.schema.ts`, also in Zod.
- Persisted-record schemas (`PredictionResponse`, `CodeCellRun`,
  `MissionCompletion`) live alongside the components that produce
  them, also in Zod.
- `schemaVersion` integers on every entity; `sophie upgrade`
  migrates forward-only on read.
- Build emits `sophie.schema.json` for VSCode + external tools.

## Revisions

### R-0058 — Amended by ADR 0058 (epistemic role contract, 2026-05-16)

[ADR 0058](0058-epistemic-component-contract.md) adds the
eight-role `EpistemicRoleSchema` Zod enum and makes
`epistemicRole` an optional, additive field on pedagogy-component
schemas. The role contract is implemented as a Zod literal
(`EpistemicRoleSchema.extract([...])`) — double-bound at compile
time (TypeScript literal narrowing) AND at parse time (Zod literal
validation), per ADR 0058 §R-greenfield. The `<DeepDiveEntry>`
schema added in PR #133 (2026-05-19) extends `inline-content.ts`
following the same Zod-as-source-of-truth shape; no schema for
`<Callout variant="the-more-you-know">` ships because that variant
sits outside the taxonomy by design.

## References

- Brainstorming session, schema-sourcing pin (May 2026).
- [reference/content-schema.md](../reference/content-schema.md) — the
  full Zod schemas.
- [Zod documentation](https://zod.dev).
- [zod-to-json-schema](https://github.com/StefanTerdell/zod-to-json-schema).
