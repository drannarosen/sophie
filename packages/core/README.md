# @sophie/core

Sophie's core package: schema definitions, audit machinery, and CLI.

## Internal-boundary contract

`@sophie/core` is **one** package today but contains three internal
sub-packages — `schema/`, `audit/`, `cli/` — that will eventually
split into separate `@sophie/*` packages. To keep that future split
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
`noRestrictedImports` rule scoped to `packages/core/src/{schema,audit,cli}/**`
in the repo-root `biome.json`.

## Public surface

| Subpath | What it exports |
|---|---|
| `@sophie/core/schema` | `ChapterSchema`, `FigureSchema`, `SectionSchema`, inferred TS types |
| `@sophie/core/audit` | `auditFile()` — parses MDX frontmatter and validates against `ChapterSchema` |
| `@sophie/core/cli` | Programmatic CLI entry (mostly for tests) |
| `sophie` (bin) | The CLI binary |

## Phase 0 scope

Per [ADR 0023](../../docs/website/decisions/0023-vertical-slice-build-order.md),
this package ships only what the proving slice needs:

- Minimal `Chapter` / `Figure` / `Section` schemas (frontmatter-level only).
- `audit` stub: schema validation pass/fail. No Tier 1 / Tier 2 checks
  (those are Phase 3).
- `sophie dev <path>` shells out to `astro dev`. No audit watcher.
- `sophie audit <path>` runs the schema validation stub.

## Build

```bash
pnpm --filter @sophie/core build
```

Outputs:

- `dist/schema/index.{js,d.ts}`
- `dist/audit/index.{js,d.ts}`
- `dist/cli/index.{js,d.ts}`
- `dist/cli/bin.js` (executable; shebang preserved by tsup)
