---
title: Plugin API
short_title: Plugin API
description: Public API for extending Sophie — registerComponent, registerAuditCheck, registerPromptTemplate, extendChapterSchema, theme tokens.
tags: [plugin, extension, api, reference]
---

# Plugin API

Sophie ships **plugin architecture as v1 public API**, even though
you (Anna) are the only initial caller. Designing the API for
third-party use from day one means the contract is real-tested before
v3 third-party adoption — and it costs nothing to do this now since
the platform internally uses the same hooks.

:::{important} Stability tiers
Every export is annotated with a JSDoc tag indicating its stability
contract:
- `@stable` — SemVer-compliant; breaking change requires a major
  bump and a migration script. Safe to depend on.
- `@experimental` — May change in minor versions. Opt in knowingly.
- `@internal` — Not for external use. Subject to change at any time.
:::

## `registerComponent`

Register a pedagogy component with the renderer + audit. See
[Component contract](component-contract.md) for the shape every
component fills in.

```typescript
import { registerComponent } from '@sophie/components';

export const Prediction = registerComponent({
  kind: 'prediction',
  schema: PredictionPropsSchema,
  render: { read: PredictionInteractive, slide: PredictionSlide, print: PredictionPrint },
  serialize: predictionToAuditNode,
  interactive: { state, response, initialState },
  refs: { consumes: [], produces: [] },
  composition: { forbidsContaining: ['prediction'] },
  audit: { requiredFields, pedagogyChecks, aiPrompts },
});
```

**Stability**: `@stable`.

## `registerAuditCheck`

Add a custom audit check (Tier 1, 2, or 3) without modifying core
audit code.

```typescript
import { registerAuditCheck } from '@sophie/audit';

registerAuditCheck({
  id: 'every-chapter-has-primary-video',
  tier: 2,
  scope: 'chapter',
  severity: 'warning',
  message: 'Every published chapter should declare a primaryVideo',
  check: (chapter) => chapter.status !== 'published' || chapter.primaryVideo !== undefined,
});
```

**Stability**: `@stable`.

## `registerPromptTemplate`

Register a Tier 3 AI quality-check prompt template. Templates emit to
`.sophie-tasks/` when `sophie audit` runs at Tier 3.

```typescript
import { registerPromptTemplate } from '@sophie/audit';

registerPromptTemplate({
  id: 'figure-alt-text-quality',
  appliesTo: 'figure',
  confidence: 'medium',
  systemPrompt: `Review this figure's alt text for quality...`,
  input: (props) => `Caption: ${props.caption}\nAlt: ${props.alt}`,
  expectedResponseShape: {
    score: 'number 0-10',
    issues: 'array of { severity, suggestion }',
    verdict: 'ok | needs-revision | rewrite',
  },
});
```

**Stability**: `@stable`.

## `extendChapterSchema`

Add custom fields to the Chapter frontmatter schema for a specific
consumer course. Fields must not collide with platform-reserved
fields; the audit catches conflicts at build start.

```typescript
import { extendChapterSchema } from '@sophie/schema';
import { z } from 'zod';

extendChapterSchema({
  namespace: 'astr201',
  fields: {
    irafExtension: z.string().optional(),
    skyMapCenter: z.tuple([z.number(), z.number()]).optional(),
  },
});
```

Custom fields appear under `chapter.extensions.<namespace>.<field>`
to keep the namespace tidy.

**Stability**: `@experimental`. Likely to evolve as more extension
patterns surface.

## Theme tokens namespacing

Custom components ship their own design tokens under a per-component
namespace; consumers can override.

```typescript
// In the component's tokens.ts contribution:
export const myCustomTokens = {
  '--color-mycomp-bg': 'var(--color-bg-elevated)',
  '--color-mycomp-fg': 'var(--color-fg-default)',
  '--color-mycomp-accent': 'oklch(60% 0.15 220)',
};
```

Naming: `--color-<kind>-*`, `--space-<kind>-*`, `--radius-<kind>-*`.
Conflicts (two plugins claiming the same token name) are flagged by
the audit at build time.

**Stability**: `@stable`.

## Cowork plugin packaging

Sophie's AI authoring kit (skills + slash commands + subagents) ships
as a Cowork plugin. See
[Audit and AI authoring](../explanation/audit-and-ai-authoring.md) for
the full architecture. Third parties can ship their own Sophie-aware
Cowork plugins extending the same surface.

**Stability**: `@experimental` for v1; `@stable` after the first
external plugin lands.

## Conflict resolution

When two plugins claim the same component `kind`, audit-check `id`,
prompt-template `id`, or theme token name, **the audit fails at
build start** with a clear error pointing at both sources. There is
no implicit "last wins" — conflicts are bugs. Consumers resolve by
namespacing or by removing one of the colliding plugins.

## What's not yet in the public API

- **Plugin manifest schema** for third-party Cowork plugins. Sketched
  but not specified until the first external plugin is being onboarded.
- **Custom render-mode adapters** (e.g., `epub`, `latex`). The contract
  is renderer-agnostic but the registration surface is single-renderer
  in v1.
- **Custom storage backends** beyond the v3-designed `SyncedResponseStore`.
  See [Persistence model](../explanation/persistence-model.md).
