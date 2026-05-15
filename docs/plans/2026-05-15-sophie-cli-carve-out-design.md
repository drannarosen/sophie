# Workstream 2 PR 1 — `@sophie/cli` carve-out (design)

**Status:** design committed; implementation plan to follow at
`docs/plans/2026-05-15-sophie-cli-carve-out-plan.md`.
**Workstream:** 2 (CLI; first of four PRs in the cheerful-eagle plan).
**Scope:** carve out `@sophie/cli` from `@sophie/core`; implement
`sophie start` + `sophie preview`; relocate `audit` + `dev`; ship
`dev` as a citty alias for `start`.

## Context

The 2026-05-15 Bucket B + C architecture audit closed with two
named structural debts (P1-1, P1-2) — both shipped in `c8aa453`.
The audit's dim 9 (LDS-foundation code-readiness) flagged a new
docs-vs-code asymmetry: 14 ADRs (0040–0054 minus 0050) ship docs-
only. The cheerful-eagle session plan
([`~/.claude/plans/hi-claude-this-session-cheerful-eagle.md`](file:///Users/anna/.claude/plans/hi-claude-this-session-cheerful-eagle.md))
locked Workstream 2 as the CLI carve-out plus three D9 fold-ins
(pedagogy-index JSON artifact, misconception graph fields,
`chapter.status` frontmatter).

This PR is the first of four. It does not ship the D9 items —
those land in three subsequent PRs after the CLI lands, via
parallel worktrees per `superpowers:subagent-driven-development`
with code-review checkpoints between each.

The `@sophie/core` package today acts as a "three packages in one
trench coat" via subpath exports: `/schema`, `/audit`, `/cli`. The
CLI bin lives in a library package, which means anyone installing
`@sophie/core` for its schemas drags `citty` along. Pre-launch is
the cheapest moment to fix this; refactoring after external
adopters land would mean back-compat work the
[`feedback_no_backcompat_prelaunch`](file:///Users/anna/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_no_backcompat_prelaunch.md)
memory rules out.

## Scope decisions (locked via brainstorming)

| Decision | Outcome |
|---|---|
| Subcommand naming | `start` canonical; `dev` accepted alias via citty. ADR 0015 stays valid; help text lists both. |
| Config surface | No `sophie.config.ts`. CLI flags + the consumer's existing `astro.config.ts` (extended via `defineSophieIntegration({})` when Sophie-specific config materializes). |
| Subcommand scope | start, preview, audit (relocated), dev (alias of start). No `sophie build` — `astro build` works standalone. |
| Package shape | Shape B: carve out `@sophie/cli` only. `@sophie/audit` defers to Phase 3, when the first invariant-running CLI subcommand needs it. |
| D9 sequencing | CLI PR first; 3 D9 PRs follow sequentially with code-review checkpoint between each. |
| Lockfile discipline | Explicit `pnpm install --frozen-lockfile` task in the implementation plan, per `feedback_pre_pr_lockfile_check`. |
| Merge mechanic | Squash-merge per [ADR 0055](../website/decisions/0055-squash-merge-for-code-prs.md). |

## Architecture — Shape B

The new dependency graph:

```
@sophie/components ──> @sophie/core/schema
@sophie/astro      ──> @sophie/core/{schema,audit}  (and contains pedagogy invariants)
@sophie/cli (new)  ──> @sophie/core/{schema,audit}  (no transitive astro/vite/react)
@sophie/core       ──> citty drops out; schema + audit only
```

`@sophie/core` shrinks from "schema + audit + cli" to "schema +
audit." It loses the `/cli` subpath export and the `bin` field;
`citty` moves out of its dependencies. `@sophie/cli` becomes the
sole bin owner.

`@sophie/audit` does **not** carve out in this PR. The pedagogy-
invariant logic stays in `@sophie/astro/lib/pedagogy-audit.ts`
until a CLI subcommand (`sophie audit --invariants`, `sophie diff`,
`sophie refactor` — all Phase 3) needs to import it. At that
moment the carve-out becomes mechanical: relocate ~1500 LOC of
pure functions from `@sophie/astro/lib/` into `@sophie/audit/`,
update three import paths. The dependency direction already
points the right way (`@sophie/astro` → `@sophie/core/schema`),
so no cycle materializes.

## File layout

```
packages/cli/
├── package.json
├── tsup.config.ts
├── vitest.config.ts
├── tsconfig.json
├── README.md
└── src/
    ├── bin.ts                    # shebang + import main from index
    ├── index.ts                  # citty root command, subCommands registry
    ├── commands/
    │   ├── start.ts              # NEW. Watch orchestration + astro dev.
    │   ├── preview.ts            # NEW. astro build + astro preview.
    │   ├── audit.ts              # MOVED from packages/core/src/cli/commands/.
    │   └── dev.ts                # alias of start (citty meta.aliases)
    └── lib/
        ├── resolve-consumer-root.ts   # path-walker; finds astro.config.*
        ├── detect-monorepo.ts         # walks up for pnpm-workspace.yaml
        ├── spawn-orchestrator.ts      # three-child spawn + signal forwarding
        ├── prefix-stream.ts           # [astro]/[components]/[theme] line prefix
        └── build-if-missing.ts        # one-shot tsup if dist/ missing
```

Test files live alongside source (`start.test.ts` next to
`start.ts`, etc.) per the existing package convention.

### `package.json` shape

```json
{
  "name": "@sophie/cli",
  "version": "0.0.0",
  "license": "AGPL-3.0-or-later",
  "type": "module",
  "exports": {
    "./commands/start":   { "import": "./dist/commands/start.js",   "types": "./dist/commands/start.d.ts" },
    "./commands/preview": { "import": "./dist/commands/preview.js", "types": "./dist/commands/preview.d.ts" },
    "./commands/audit":   { "import": "./dist/commands/audit.js",   "types": "./dist/commands/audit.d.ts" }
  },
  "bin": { "sophie": "./dist/bin.js" },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run --coverage",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@sophie/core": "workspace:*",
    "citty": "^0.2.2",
    "execa": "^10.0.0",
    "chokidar": "^4.0.0",
    "picocolors": "^1.1.0"
  },
  "devDependencies": {
    "@types/node": "^25.6.2",
    "memfs": "^4.0.0",
    "tsup": "^8.5.1",
    "vitest": "^4.1.5",
    "@vitest/coverage-v8": "^4.1.5",
    "typescript": "^6.0.3"
  }
}
```

Subpath exports for individual commands let test infrastructure
import them in isolation. The `bin` field is the sole user-facing
entry point.

## Data flow

### `sophie start`

1. Parse `--port`, `--host`, `--open`, positional `path`.
2. Resolve consumer root: stat `astro.config.{ts,mjs,js}` at
   `path` (default cwd). Bail with friendly error if absent.
3. Detect monorepo: walk up from consumer root for
   `pnpm-workspace.yaml`. Locate `@sophie/components` +
   `@sophie/theme` source dirs via workspace globs.
4. One-shot `tsup` build for `@sophie/theme` if `dist/theme.css`
   missing; same for `@sophie/components`.
5. Spawn via `execa`, concurrent:
   - `astro dev` in consumer root with port/host flags.
   - `tsup --watch` in `@sophie/components` (monorepo only).
   - `tsup --watch` in `@sophie/theme` (monorepo only).
6. Pipe each child's stdout/stderr through `prefix-stream` to
   prepend `[astro]`/`[components]`/`[theme]` with `picocolors`-
   tinted prefixes for terminal scanability.
7. Install SIGINT/SIGTERM handler: forward to all children,
   await graceful shutdown, exit.
8. On any child's non-zero exit: fail-fast — print the child's
   last 20 stderr lines, SIGTERM the siblings, exit with the
   child's code.

### `sophie preview`

1. Parse `--port`, `--host`, `--no-build`.
2. Resolve consumer root (same as start).
3. Unless `--no-build`: run `astro build` (await completion).
4. Spawn `astro preview` with port/host.
5. Forward signals (same handler).

### `sophie audit`

Behavior unchanged from current `packages/core/src/cli/commands/
audit.ts`. Imports move from `@sophie/core/audit` (still works —
the package keeps the audit subpath export). Tests move with the
code.

### `sophie dev`

Citty alias for `start` via `meta.aliases: ["dev"]`. Help text
lists both names. Zero implementation cost.

## Error handling

Eight modes. Every message states cause + action.

| # | Mode | Action |
|---|---|---|
| 1 | No `astro.config.*` at resolved path | Exit 1: `"No astro.config.{ts,mjs,js} found in <path>. Run from a Sophie consumer repo, or pass the path: sophie start ./examples/smoke"` |
| 2 | Port in use (EADDRINUSE) | Exit 1: `"Port 4321 is already in use. Try --port 4322, or: lsof -ti :4321 \| xargs kill"` |
| 3 | `@sophie/theme/dist/theme.css` missing | One-shot build; print one line; continue. |
| 4 | `@sophie/components/dist/index.js` missing | One-shot build; print one line; continue. |
| 5 | Module not found (workspace drift) | Exit 1: `"Module not found: <name>. Run: pnpm install"` |
| 6 | Child crashes mid-session | Fail-fast: print child id + last 20 stderr lines + exit code; SIGTERM siblings; exit with child's code. |
| 7 | User Ctrl-C | SIGINT handler forwards to children, awaits shutdown, exits 0. |
| 8 | `astro.config.*` exists but no Sophie integration | Skip pre-validation; astro's runtime error explains. |

Fail-fast over fail-recover follows the dev-tooling convention
(astro itself, vite-dev-server, `next dev`). Auto-restart on
child crashes masks real bugs.

## Testing strategy

Three-tier pyramid; RED-first per
`superpowers:test-driven-development`.

| Test file | Tier | Coverage |
|---|---|---|
| `src/commands/start.test.ts` | 1 unit | citty arg parsing for start |
| `src/commands/preview.test.ts` | 1 unit | citty arg parsing for preview |
| `src/commands/audit.test.ts` | 1 unit | citty arg parsing for audit (regression after relocation) |
| `src/lib/resolve-consumer-root.test.ts` | 1+2 | path-walker for `astro.config.*` (memfs) |
| `src/lib/detect-monorepo.test.ts` | 1+2 | walk-up for `pnpm-workspace.yaml` + sibling package resolution (memfs) |
| `src/lib/spawn-orchestrator.test.ts` | 2 integration | three-child spawn + signal forwarding (mocked execa) |
| `src/lib/prefix-stream.test.ts` | 1 unit | line-prefix transform |
| `src/lib/build-if-missing.test.ts` | 1+2 | rows 3+4 of error table (memfs + mocked execa) |
| `examples/smoke/e2e/sophie-start.spec.ts` | 3 e2e | real spawn, GET localhost:4321, SIGTERM, assert clean exit |
| `examples/smoke/e2e/sophie-preview.spec.ts` | 3 e2e | real spawn + assert preview path |

Target: ~50 new unit cases (current 677 → ~727) + 2 new e2e cases
(current 156 → 158).

Mocking strategy:

- **`memfs`** for filesystem tests — populate an in-memory
  filesystem with `vol.fromJSON({...})`, then `node:fs` calls
  resolve against it. Used for the path-walker logic which makes
  many fs calls.
- **`vi.mock("execa")`** for spawn tests — record spawn calls
  without actually spawning. Verify the orchestrator passes the
  right cwd, args, env to each child.
- **Real spawn** for e2e — use `execa` with the actual built
  binary at `packages/cli/dist/bin.js`. Slow (~5s each) so we
  only ship 2 e2e cases.

## Implementation order

The PR lands in roughly this commit sequence (squash-merged at
end per ADR 0055). Each unit-test commit watches its target test
go RED before the implementation commit lands GREEN.

1. **RED — package scaffolding tests.** Create `packages/cli/`
   with package.json, tsup config, vitest config, tsconfig.
   Empty `src/bin.ts` + `src/index.ts`. Run
   `pnpm install --frozen-lockfile` locally to verify lockfile
   accepts the new package + deps. Run `pnpm build` to confirm
   tsup produces empty `dist/`.
2. **RED — citty arg parsing tests.** Write
   `start.test.ts`, `preview.test.ts`, `audit.test.ts`. Assert
   parsed shapes. Run; watch fail (commands don't exist).
3. **GREEN — citty arg parsing implementations.** Implement
   each command's args definition. Tests go green.
4. **RED — lib unit tests.** Write `resolve-consumer-root.test
   .ts`, `detect-monorepo.test.ts`, `prefix-stream.test.ts`,
   `build-if-missing.test.ts`. Assert behavior. Watch fail.
5. **GREEN — lib implementations.** Build each lib helper.
6. **RED — spawn-orchestrator integration test.** Write
   `spawn-orchestrator.test.ts` with mocked execa. Watch fail.
7. **GREEN — spawn-orchestrator implementation.** Wire start
   to spawn three children with signal forwarding.
8. **GREEN — preview implementation.** Simpler; spawns one
   child after optional build.
9. **GREEN — audit relocation.** Move
   `packages/core/src/cli/commands/audit.ts` →
   `packages/cli/src/commands/audit.ts`. Update import paths.
10. **GREEN — dev alias.** Wire citty `meta.aliases: ["dev"]`
    on the `start` command.
11. **DELETE — `packages/core` cleanup.** Drop the `/cli`
    subpath export from `packages/core/package.json`; drop the
    `bin` field; remove `citty` from `dependencies`; delete
    `packages/core/src/cli/`. Update `packages/core/src/index.ts`
    exports.
12. **MIGRATE — `examples/smoke/package.json`.** Update
    `pnpm sophie:audit` script if its path resolution changes
    (`sophie` binary still resolves the same name; the audit
    command works unchanged).
13. **RED — e2e tests.** Write `sophie-start.spec.ts` and
    `sophie-preview.spec.ts` in `examples/smoke/e2e/`. Watch
    fail (binary not yet built).
14. **GREEN — full chain works.**
    `pnpm exec turbo run build --filter=@sophie/cli` produces
    the binary; e2e tests pass; the 3× consecutive Playwright
    discipline confirms no flake (per
    `feedback_pre_pr_lockfile_check`-adjacent rigor).
15. **VERIFY — pnpm install --frozen-lockfile** clean before
    PR opens.

## Out of scope (deferred to Phase 3)

- `@sophie/audit` package carve-out. Defers until a CLI
  subcommand needs the pedagogy invariants.
- `sophie build`. `astro build` works standalone.
- `sophie audit --invariants`. Phase 3 (ADR 0047).
- `sophie diff`. Phase 3 (ADR 0045).
- `sophie refactor`. Phase 3 (ADR 0049).
- `sophie publish-state`. Phase 3 (ADR 0052).
- `sophie metrics`. Phase 3 (ADR 0047).
- `sophie.config.ts`. Adds when a real consumer needs config
  that doesn't fit in `astro.config.ts`'s
  `defineSophieIntegration({})`.

## References

- [Bucket B + C architecture audit](../reviews/2026-05-15-bucket-b-c-architecture-audit.md)
  — A (94/100); dim 9 LDS-foundation code-readiness gap.
- [ADR 0001](../website/decisions/0001-platform-not-monorepo.md)
  — package boundaries.
- [ADR 0011](../website/decisions/0011-pnpm-package-manager.md)
  — pnpm; workspace dependency syntax.
- [ADR 0014](../website/decisions/0014-turborepo-monorepo-orchestration.md)
  — turbo build orchestration.
- [ADR 0015](../website/decisions/0015-dev-preview-workflow.md)
  — `sophie dev` original surface; this PR's `dev` alias
  preserves the referent.
- [ADR 0022](../website/decisions/0022-tsup-library-builds.md)
  — tsup bundler conventions.
- [ADR 0024](../website/decisions/0024-license-agpl.md)
  — AGPL-3.0-or-later for platform code.
- [ADR 0025](../website/decisions/0025-phase-0-actual-scope.md)
  — `@sophie/cli` named as a v1 deliverable.
- [ADR 0049](../website/decisions/0049-sophie-refactor-cli.md)
  — `sophie refactor` family; Phase 3 trigger for `@sophie/audit`.
- [ADR 0055](../website/decisions/0055-squash-merge-for-code-prs.md)
  — squash-merge convention; this is the first PR under it.
- [`feedback_branch_pr_scope`](file:///Users/anna/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_branch_pr_scope.md)
  — docs direct-to-main; code through PRs.
- [`feedback_no_backcompat_prelaunch`](file:///Users/anna/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_no_backcompat_prelaunch.md)
  — refactor pre-launch is cheap; no compat shims.
- [`feedback_pre_pr_lockfile_check`](file:///Users/anna/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_pre_pr_lockfile_check.md)
  — local `pnpm install --frozen-lockfile` before opening PR.
- [cheerful-eagle session plan](file:///Users/anna/.claude/plans/hi-claude-this-session-cheerful-eagle.md)
  — scope decisions and three D9 fold-ins.
