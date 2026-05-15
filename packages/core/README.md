# @sophie/core

Sophie's core package: schema definitions and audit machinery
(audit-as-library). The `sophie` CLI now lives in `@sophie/cli`.

## Internal-boundary contract

`@sophie/core` is **one** package today but contains two internal
sub-packages — `schema/` and `audit/` — that will eventually split
into separate `@sophie/*` packages. To keep that future split
mechanical (a `git mv` plus a `package.json` dance, not a refactor of
intertwined imports), cross-folder imports inside `src/` must go
through the public subpath, **not** a relative path.

### Allowed

```ts
// audit/stub.ts importing the public schema entry
import { ChapterSchema } from "@sophie/core/schema";
```

### Forbidden (Biome will fail your build)

```ts
// audit/stub.ts reaching into the schema folder relatively
import { ChapterSchema } from "../schema";
import { ChapterSchema } from "../schema/chapter";
```

The forbidden pattern is enforced by the Biome
`noRestrictedImports` rule scoped to `packages/core/src/{schema,audit}/**`
in the repo-root `biome.json`.

## Public surface

| Subpath | What it exports |
| --- | --- |
| `@sophie/core/schema` | `ChapterSchema`, `FigureSchema`, `SectionSchema`, inferred TS types |
| `@sophie/core/audit` | `auditFile()` — parses MDX frontmatter and validates against `ChapterSchema` |

The `sophie` CLI binary is published from `@sophie/cli`, which depends
on `@sophie/core/audit` as a library.

## Phase 0 scope

Per [ADR 0023](../../docs/website/decisions/0023-vertical-slice-build-order.md),
this package ships only what the proving slice needs:

- Minimal `Chapter` / `Figure` / `Section` schemas (frontmatter-level only).
- `audit` stub: schema validation pass/fail. No Tier 1 / Tier 2 checks
  (those are Phase 3).

## Build

```bash
pnpm --filter @sophie/core build
```

Outputs:

- `dist/schema/index.{js,d.ts}`
- `dist/audit/index.{js,d.ts}`

## Known build-tooling quirks

- **`ignoreDeprecations: "6.0"` in `tsconfig.json`.** TypeScript 6
  deprecated `baseUrl`. `paths` resolution still works without
  `baseUrl`, but tsup's DTS builder triggers the deprecation warning
  internally even on paths-only configs. Silenced for now.
  **TODO:** drop this when tsup ships a TS-6-clean DTS pipeline (or
  when TypeScript provides a paths-without-baseUrl story that doesn't
  warn). Tracked in the Phase 0 implementation plan
  (`~/.claude/plans/read-all-of-the-sharded-sky.md`, step 3 quirk
  note).
