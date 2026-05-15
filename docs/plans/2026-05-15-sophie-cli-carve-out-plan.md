# @sophie/cli carve-out — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Carve out a new `@sophie/cli` package from `@sophie/core` and implement `sophie start` + `sophie preview` subcommands with watch-orchestration over `@sophie/components` + `@sophie/theme` source; relocate `audit`; ship `dev` as a citty alias for `start`.

**Architecture:** Shape B per [design doc](./2026-05-15-sophie-cli-carve-out-design.md). New `packages/cli/` workspace package owns the `sophie` bin. `@sophie/core` shrinks to schema + audit-library (loses `/cli` subpath, bin, citty). `@sophie/audit` carve-out defers to Phase 3.

**Tech Stack:** TypeScript 6, citty (CLI parser), execa (child-process spawn), chokidar (file watch — pulled in transitively via tsup), picocolors (terminal color), memfs (test-only filesystem mock), vitest 4, tsup 8, AGPL-3.0-or-later.

---

## Pre-flight (read once before starting)

1. `docs/plans/2026-05-15-sophie-cli-carve-out-design.md` — full design rationale.
2. `docs/website/decisions/0055-squash-merge-for-code-prs.md` — squash-merge mandatory for this PR.
3. `~/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_pre_pr_lockfile_check.md` — local frozen-lockfile check before opening PR.
4. `~/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_no_backcompat_prelaunch.md` — hard renames OK; migrate all callers in same PR.
5. `packages/core/src/cli/{bin.ts,index.ts,commands/audit.ts,commands/dev.ts}` — existing code that moves/disappears.
6. `packages/core/package.json` — the trench-coat package being slimmed.
7. `pnpm-workspace.yaml` at repo root — confirms `packages/*` glob; new `packages/cli/` auto-resolves.

**Branch + worktree setup (before Task 1):**

```bash
cd /Users/anna/Teaching/sophie
git fetch origin
git switch -c feat/sophie-cli-carve-out main
# OR via the using-git-worktrees skill:
git worktree add ../sophie-cli-carve-out -b feat/sophie-cli-carve-out main
cd ../sophie-cli-carve-out
pnpm install --frozen-lockfile  # baseline; verify clean before any changes
```

---

## Phase 1 — Package scaffolding (3 tasks, ~20 min)

### Task 1.1: Create `packages/cli/package.json`

**Files:**
- Create: `packages/cli/package.json`

**Step 1: Write the file**

```json
{
  "name": "@sophie/cli",
  "version": "0.0.0",
  "description": "Sophie CLI — `sophie start`, `sophie preview`, `sophie audit`. Schema-driven scientific textbook tooling.",
  "license": "AGPL-3.0-or-later",
  "author": "Anna Rosen",
  "type": "module",
  "exports": {
    "./commands/start": {
      "types": "./dist/commands/start.d.ts",
      "import": "./dist/commands/start.js"
    },
    "./commands/preview": {
      "types": "./dist/commands/preview.d.ts",
      "import": "./dist/commands/preview.js"
    },
    "./commands/audit": {
      "types": "./dist/commands/audit.d.ts",
      "import": "./dist/commands/audit.js"
    }
  },
  "bin": {
    "sophie": "./dist/bin.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run --coverage",
    "test:watch": "vitest",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@sophie/core": "workspace:*",
    "citty": "^0.2.2",
    "execa": "^10.0.0",
    "picocolors": "^1.1.0"
  },
  "devDependencies": {
    "@types/node": "^25.6.2",
    "@vitest/coverage-v8": "^4.1.5",
    "memfs": "^4.0.0",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.5"
  }
}
```

**Step 2: Verify pnpm resolves the new workspace member**

Run: `pnpm install --frozen-lockfile`

Expected: FAIL — frozen-lockfile rejects the new deps. This is correct; we'll regenerate the lockfile in Task 1.2.

Then: `pnpm install` (no --frozen-lockfile)

Expected: PASS — lockfile updates with new deps; new `node_modules/@sophie/cli` symlink appears.

**Step 3: Commit**

```bash
git add packages/cli/package.json pnpm-lock.yaml
git commit -m "chore(cli): scaffold @sophie/cli package manifest"
```

### Task 1.2: Create tsup + vitest + tsconfig configs

**Files:**
- Create: `packages/cli/tsup.config.ts`
- Create: `packages/cli/vitest.config.ts`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/README.md` (one-line stub)

**Step 1: Write `packages/cli/tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/bin.ts",
    "src/index.ts",
    "src/commands/start.ts",
    "src/commands/preview.ts",
    "src/commands/audit.ts",
    "src/commands/dev.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node22",
  banner: ({ format }) =>
    format === "esm"
      ? { js: "#!/usr/bin/env node\nimport { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" }
      : {},
  // Only bin.ts needs the shebang in practice; tsup's banner applies to all entries.
  // The shebang on non-bin files is harmless (they're modules loaded by bin.ts, not exec'd directly).
});
```

Actually — shebang only on bin.ts. Use the `esbuildOptions` callback instead:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/bin.ts",
    "src/index.ts",
    "src/commands/start.ts",
    "src/commands/preview.ts",
    "src/commands/audit.ts",
    "src/commands/dev.ts",
    "src/lib/resolve-consumer-root.ts",
    "src/lib/detect-monorepo.ts",
    "src/lib/spawn-orchestrator.ts",
    "src/lib/prefix-stream.ts",
    "src/lib/build-if-missing.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node22",
});
```

The shebang lands via `bin.ts`'s source — TypeScript compiles `#!/usr/bin/env node\n` as the first line if present. We'll add it in Task 2.1.

**Step 2: Write `packages/cli/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/bin.ts",            // shebang-only entry; covered transitively
        "src/**/*.test.ts",
      ],
      reporter: ["text", "html"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

**Step 3: Write `packages/cli/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

**Step 4: Write `packages/cli/README.md`**

```markdown
# @sophie/cli

Sophie command-line interface. Provides `sophie start`, `sophie preview`, `sophie audit`, and the `sophie dev` alias for `start`.

See [docs/plans/2026-05-15-sophie-cli-carve-out-design.md](../../docs/plans/2026-05-15-sophie-cli-carve-out-design.md) for design rationale.
```

**Step 5: Run build to verify config wires (will fail — no source yet)**

Run: `pnpm --filter @sophie/cli build`

Expected: FAIL — "No entry points found" or similar.

**Step 6: Commit**

```bash
git add packages/cli/tsup.config.ts packages/cli/vitest.config.ts packages/cli/tsconfig.json packages/cli/README.md
git commit -m "chore(cli): scaffold tsup, vitest, tsconfig, README"
```

### Task 1.3: Add `@sophie/cli` to turbo.json pipeline + verify monorepo wiring

**Files:**
- Modify: `turbo.json` (if it has package-specific entries; otherwise no-op).

**Step 1: Inspect turbo.json**

Run: `cat turbo.json | head -40`

Most likely the turbo.json uses globs; new package picks up automatically. If specific entries exist for each package, add `@sophie/cli` analogously.

**Step 2: Verify with empty build**

Create empty stub source so build doesn't fail:

```bash
mkdir -p packages/cli/src/commands packages/cli/src/lib
echo "export {};" > packages/cli/src/bin.ts
echo "export {};" > packages/cli/src/index.ts
for f in start preview audit dev; do echo "export {};" > packages/cli/src/commands/$f.ts; done
for f in resolve-consumer-root detect-monorepo spawn-orchestrator prefix-stream build-if-missing; do
  echo "export {};" > packages/cli/src/lib/$f.ts
done
```

Run: `pnpm --filter @sophie/cli build`

Expected: PASS — empty `.js` files emitted to `packages/cli/dist/`.

Run: `pnpm exec biome check packages/cli`

Expected: PASS — 0 errors, 0 warnings (placeholder files lint clean).

**Step 3: Commit**

```bash
git add packages/cli/src
git commit -m "chore(cli): scaffold empty source tree (stubs)"
```

---

## Phase 2 — Citty arg parsing (4 tasks, ~40 min RED-first)

### Task 2.1: RED — `start` arg parsing test

**Files:**
- Create: `packages/cli/src/commands/start.test.ts`

**Step 1: Write the test**

```ts
import { describe, expect, it } from "vitest";
import { runCommand } from "citty";
import { startCommand } from "./start.ts";

describe("start command — arg parsing", () => {
  it("parses --port flag as number", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["--port", "3000", "./examples/smoke"],
      // citty's test harness invokes run({args}) and returns the resolved args.
    });
    expect(result.result).toMatchObject({ args: { port: 3000 } });
  });

  it("parses --host flag as string", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["--host", "0.0.0.0", "./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { host: "0.0.0.0" } });
  });

  it("parses --open flag as boolean", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["--open", "./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { open: true } });
  });

  it("defaults port to 4321", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { port: 4321 } });
  });

  it("defaults host to localhost", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { host: "localhost" } });
  });

  it("captures positional path arg", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { path: "./examples/smoke" } });
  });
});
```

**Step 2: Run test — expect FAIL**

Run: `pnpm --filter @sophie/cli test:unit src/commands/start.test.ts`

Expected: FAIL — `startCommand` exported as `{}`; citty rejects it.

### Task 2.2: GREEN — `start` arg parsing implementation

**Files:**
- Modify: `packages/cli/src/commands/start.ts`

**Step 1: Write the command definition (parsing only; runner is `noop` for now)**

```ts
import { defineCommand } from "citty";

export const startCommand = defineCommand({
  meta: {
    name: "start",
    description:
      "Start the Sophie dev server (Astro + @sophie/components watch + @sophie/theme watch + pedagogy-index HMR).",
    aliases: ["dev"],
  },
  args: {
    path: {
      type: "positional",
      description: "Path to the Astro project (default: current directory).",
      required: false,
      default: ".",
    },
    port: {
      type: "string", // citty parses to string; we coerce below
      description: "Port to bind the dev server to. Default 4321.",
      required: false,
      default: "4321",
    },
    host: {
      type: "string",
      description: "Host to bind the dev server to. Default localhost.",
      required: false,
      default: "localhost",
    },
    open: {
      type: "boolean",
      description: "Open the dev URL in the default browser on start.",
      required: false,
      default: false,
    },
  },
  async run({ args }) {
    // Implementation lands in Task 4.x. For now, return args for parsing tests.
    const port = Number.parseInt(String(args.port), 10);
    return { args: { ...args, port } };
  },
});
```

**Step 2: Run test — expect PASS**

Run: `pnpm --filter @sophie/cli test:unit src/commands/start.test.ts`

Expected: PASS — all 6 cases green.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/start.ts packages/cli/src/commands/start.test.ts
git commit -m "feat(cli): start command — citty arg parsing (parser only)"
```

### Task 2.3: RED + GREEN — `preview` arg parsing

**Files:**
- Create: `packages/cli/src/commands/preview.test.ts`
- Modify: `packages/cli/src/commands/preview.ts`

**Step 1: Write `preview.test.ts`** (mirror of start.test.ts with `--no-build`)

```ts
import { describe, expect, it } from "vitest";
import { runCommand } from "citty";
import { previewCommand } from "./preview.ts";

describe("preview command — arg parsing", () => {
  it("parses --port flag", async () => {
    const result = await runCommand(previewCommand, {
      rawArgs: ["--port", "3000", "./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { port: 3000 } });
  });

  it("parses --no-build flag", async () => {
    const result = await runCommand(previewCommand, {
      rawArgs: ["--no-build", "./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { build: false } });
  });

  it("defaults build to true", async () => {
    const result = await runCommand(previewCommand, {
      rawArgs: ["./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { build: true } });
  });

  it("defaults port to 4321", async () => {
    const result = await runCommand(previewCommand, {
      rawArgs: ["./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { port: 4321 } });
  });
});
```

Run: `pnpm --filter @sophie/cli test:unit src/commands/preview.test.ts` → expect FAIL.

**Step 2: Write `preview.ts`**

```ts
import { defineCommand } from "citty";

export const previewCommand = defineCommand({
  meta: {
    name: "preview",
    description:
      "Build the consumer's Astro site and serve the production output. Used for e2e, print verification, pre-merge checks.",
  },
  args: {
    path: {
      type: "positional",
      description: "Path to the Astro project (default: current directory).",
      required: false,
      default: ".",
    },
    port: {
      type: "string",
      description: "Port to bind the preview server to. Default 4321.",
      required: false,
      default: "4321",
    },
    host: {
      type: "string",
      description: "Host to bind the preview server to. Default localhost.",
      required: false,
      default: "localhost",
    },
    build: {
      type: "boolean",
      description: "Run astro build before previewing. Default true.",
      required: false,
      default: true,
    },
  },
  async run({ args }) {
    const port = Number.parseInt(String(args.port), 10);
    return { args: { ...args, port } };
  },
});
```

Run test → expect PASS.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/preview.ts packages/cli/src/commands/preview.test.ts
git commit -m "feat(cli): preview command — citty arg parsing (parser only)"
```

### Task 2.4: Wire bin.ts + index.ts

**Files:**
- Modify: `packages/cli/src/bin.ts`
- Modify: `packages/cli/src/index.ts`

**Step 1: Write `index.ts`** (root citty command + subcommand registry)

```ts
import { defineCommand } from "citty";
import { auditCommand } from "./commands/audit.ts";
import { previewCommand } from "./commands/preview.ts";
import { startCommand } from "./commands/start.ts";

export const main = defineCommand({
  meta: {
    name: "sophie",
    version: "0.0.0",
    description:
      "Sophie CLI — schema-driven, AI-authorable scientific textbooks.",
  },
  subCommands: {
    start: startCommand,
    dev: startCommand, // alias; citty resolves to start's handler
    preview: previewCommand,
    audit: auditCommand,
  },
});
```

**Step 2: Write `bin.ts`** (shebang + runMain)

```ts
#!/usr/bin/env node
import { runMain } from "citty";
import { main } from "./index.ts";

runMain(main);
```

**Step 3: Create audit.ts stub** (real relocation happens in Phase 6)

For now, satisfy the import. In `packages/cli/src/commands/audit.ts`:

```ts
import { defineCommand } from "citty";

// Placeholder; full relocation in Phase 6.
export const auditCommand = defineCommand({
  meta: {
    name: "audit",
    description: "Validate a Sophie chapter file's frontmatter against the schema.",
  },
  args: {
    file: {
      type: "positional",
      description: "Path to a chapter MDX file.",
      required: true,
    },
  },
  async run() {
    throw new Error("audit command relocation pending (Phase 6).");
  },
});
```

**Step 4: Build + smoke-test the binary**

```bash
pnpm --filter @sophie/cli build
node packages/cli/dist/bin.js --help
```

Expected: prints the sophie CLI help text listing start, dev, preview, audit subcommands.

```bash
node packages/cli/dist/bin.js start --help
```

Expected: prints start subcommand's help with --port, --host, --open, path positional.

**Step 5: Commit**

```bash
git add packages/cli/src/bin.ts packages/cli/src/index.ts packages/cli/src/commands/audit.ts
git commit -m "feat(cli): wire bin.ts + index.ts + audit stub; binary boots"
```

---

## Phase 3 — Lib helpers (4 tasks, ~60 min, RED-first each)

### Task 3.1: `resolve-consumer-root` (path-walker + astro.config detection)

**Files:**
- Create: `packages/cli/src/lib/resolve-consumer-root.test.ts`
- Modify: `packages/cli/src/lib/resolve-consumer-root.ts`

**Step 1: Write the test**

```ts
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { vol } from "memfs";

vi.mock("node:fs", async () => {
  const memfs = await import("memfs");
  return memfs.fs;
});
vi.mock("node:fs/promises", async () => {
  const memfs = await import("memfs");
  return memfs.fs.promises;
});

import { resolveConsumerRoot } from "./resolve-consumer-root.ts";

describe("resolveConsumerRoot", () => {
  beforeEach(() => vol.reset());
  afterEach(() => vol.reset());

  it("returns the path verbatim if astro.config.ts exists there", async () => {
    vol.fromJSON({ "/repo/examples/smoke/astro.config.ts": "export default {}" });
    const root = await resolveConsumerRoot("/repo/examples/smoke");
    expect(root).toBe("/repo/examples/smoke");
  });

  it("accepts .mjs and .js config variants", async () => {
    vol.fromJSON({ "/repo/proj/astro.config.mjs": "" });
    expect(await resolveConsumerRoot("/repo/proj")).toBe("/repo/proj");

    vol.reset();
    vol.fromJSON({ "/repo/proj/astro.config.js": "" });
    expect(await resolveConsumerRoot("/repo/proj")).toBe("/repo/proj");
  });

  it("throws a friendly error when no astro.config.* exists", async () => {
    vol.fromJSON({ "/repo/not-astro/package.json": "{}" });
    await expect(resolveConsumerRoot("/repo/not-astro")).rejects.toThrow(
      /No astro\.config\.\{ts,mjs,js\} found/
    );
  });

  it("the error message includes the resolved path and a sample command", async () => {
    vol.fromJSON({ "/repo/empty/.gitkeep": "" });
    await expect(resolveConsumerRoot("/repo/empty")).rejects.toThrow(
      /Run from a Sophie consumer repo, or pass the path/
    );
  });
});
```

Run → expect FAIL.

**Step 2: Implementation**

```ts
import { access } from "node:fs/promises";
import { resolve } from "node:path";

const CONFIG_NAMES = ["astro.config.ts", "astro.config.mjs", "astro.config.js"] as const;

/**
 * Resolve a Sophie consumer's project root by verifying it contains an
 * Astro config file. The path argument can be absolute or relative; it's
 * resolved against process.cwd().
 *
 * Throws a user-actionable error if no astro.config.{ts,mjs,js} is
 * present at the resolved path. The error message names the path and
 * suggests `sophie start ./examples/smoke` as a sample correction.
 */
export async function resolveConsumerRoot(path: string): Promise<string> {
  const absolute = resolve(path);
  for (const name of CONFIG_NAMES) {
    try {
      await access(`${absolute}/${name}`);
      return absolute;
    } catch {
      // file not present; try next variant
    }
  }
  throw new Error(
    `No astro.config.{ts,mjs,js} found in ${absolute}. ` +
      `Run from a Sophie consumer repo, or pass the path: ` +
      `sophie start ./examples/smoke`
  );
}
```

Run test → expect PASS.

**Step 3: Commit**

```bash
git add packages/cli/src/lib/resolve-consumer-root.ts packages/cli/src/lib/resolve-consumer-root.test.ts
git commit -m "feat(cli): resolve-consumer-root + memfs-mocked tests"
```

### Task 3.2: `detect-monorepo` (walk up for pnpm-workspace.yaml)

**Files:**
- Create: `packages/cli/src/lib/detect-monorepo.test.ts`
- Modify: `packages/cli/src/lib/detect-monorepo.ts`

**Step 1: Write test**

```ts
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { vol } from "memfs";

vi.mock("node:fs", async () => {
  const memfs = await import("memfs");
  return memfs.fs;
});
vi.mock("node:fs/promises", async () => {
  const memfs = await import("memfs");
  return memfs.fs.promises;
});

import { detectMonorepo } from "./detect-monorepo.ts";

describe("detectMonorepo", () => {
  beforeEach(() => vol.reset());
  afterEach(() => vol.reset());

  it("returns null when no pnpm-workspace.yaml exists up the tree", async () => {
    vol.fromJSON({
      "/repo/just-astro/astro.config.ts": "",
    });
    const result = await detectMonorepo("/repo/just-astro");
    expect(result).toBeNull();
  });

  it("returns monorepo root + sophie pkgs when pnpm-workspace.yaml found one level up", async () => {
    vol.fromJSON({
      "/repo/pnpm-workspace.yaml": `packages:\n  - "packages/*"\n  - "examples/*"`,
      "/repo/packages/components/package.json": JSON.stringify({ name: "@sophie/components" }),
      "/repo/packages/theme/package.json": JSON.stringify({ name: "@sophie/theme" }),
      "/repo/examples/smoke/astro.config.ts": "",
    });
    const result = await detectMonorepo("/repo/examples/smoke");
    expect(result).toEqual({
      monorepoRoot: "/repo",
      componentsSrc: "/repo/packages/components",
      themeSrc: "/repo/packages/theme",
    });
  });

  it("walks up multiple levels", async () => {
    vol.fromJSON({
      "/repo/pnpm-workspace.yaml": `packages:\n  - "packages/*"`,
      "/repo/packages/components/package.json": JSON.stringify({ name: "@sophie/components" }),
      "/repo/packages/theme/package.json": JSON.stringify({ name: "@sophie/theme" }),
      "/repo/nested/deep/proj/astro.config.ts": "",
    });
    const result = await detectMonorepo("/repo/nested/deep/proj");
    expect(result?.monorepoRoot).toBe("/repo");
  });

  it("returns null when monorepo found but @sophie/components missing (external-consumer-like)", async () => {
    vol.fromJSON({
      "/other-monorepo/pnpm-workspace.yaml": `packages:\n  - "apps/*"`,
      "/other-monorepo/apps/textbook/astro.config.ts": "",
    });
    const result = await detectMonorepo("/other-monorepo/apps/textbook");
    expect(result).toBeNull();
  });
});
```

Run → expect FAIL.

**Step 2: Implementation**

```ts
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface MonorepoDetectResult {
  monorepoRoot: string;
  componentsSrc: string;
  themeSrc: string;
}

/**
 * Walk up from `startPath` looking for a pnpm-workspace.yaml file. If
 * found, verify the monorepo contains @sophie/components and
 * @sophie/theme as workspace packages — return their absolute paths.
 * Return null if no workspace file is found, or if the workspace
 * lacks the Sophie packages (external monorepo, not Sophie's own).
 *
 * Stops at the filesystem root. Pure async + read-only.
 */
export async function detectMonorepo(
  startPath: string
): Promise<MonorepoDetectResult | null> {
  let current = resolve(startPath);
  while (true) {
    const workspaceYaml = `${current}/pnpm-workspace.yaml`;
    try {
      await access(workspaceYaml);
      // Found a workspace; verify it's Sophie's by looking for the packages.
      const componentsSrc = `${current}/packages/components`;
      const themeSrc = `${current}/packages/theme`;
      try {
        await access(`${componentsSrc}/package.json`);
        await access(`${themeSrc}/package.json`);
        // Confirm names — defensive against a non-Sophie monorepo with
        // matching directory layout.
        const componentsPkg = JSON.parse(
          await readFile(`${componentsSrc}/package.json`, "utf8")
        );
        const themePkg = JSON.parse(
          await readFile(`${themeSrc}/package.json`, "utf8")
        );
        if (
          componentsPkg.name === "@sophie/components" &&
          themePkg.name === "@sophie/theme"
        ) {
          return { monorepoRoot: current, componentsSrc, themeSrc };
        }
      } catch {
        // workspace exists but isn't Sophie's; bail.
      }
      return null;
    } catch {
      // no workspace yaml here; walk up
    }
    const parent = dirname(current);
    if (parent === current) return null; // filesystem root
    current = parent;
  }
}
```

Run test → expect PASS.

**Step 3: Commit**

```bash
git add packages/cli/src/lib/detect-monorepo.ts packages/cli/src/lib/detect-monorepo.test.ts
git commit -m "feat(cli): detect-monorepo via pnpm-workspace.yaml walk + sophie pkg verification"
```

### Task 3.3: `prefix-stream` (terminal log prefix + color)

**Files:**
- Create: `packages/cli/src/lib/prefix-stream.test.ts`
- Modify: `packages/cli/src/lib/prefix-stream.ts`

**Step 1: Write test**

```ts
import { describe, expect, it } from "vitest";
import { Readable } from "node:stream";
import { prefixStream } from "./prefix-stream.ts";

async function collect(readable: NodeJS.ReadableStream): Promise<string> {
  let out = "";
  for await (const chunk of readable) out += chunk.toString();
  return out;
}

describe("prefixStream", () => {
  it("prepends [label] to each line", async () => {
    const source = Readable.from(["hello\nworld\n"]);
    const piped = source.pipe(prefixStream("astro"));
    const text = await collect(piped);
    // Strip ANSI codes for the assertion (picocolors wraps the label).
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, "");
    expect(stripped).toBe("[astro] hello\n[astro] world\n");
  });

  it("handles partial lines spanning chunks", async () => {
    const source = Readable.from(["hel", "lo\nwor", "ld\n"]);
    const piped = source.pipe(prefixStream("theme"));
    const text = (await collect(piped)).replace(/\x1b\[[0-9;]*m/g, "");
    expect(text).toBe("[theme] hello\n[theme] world\n");
  });

  it("does not emit a stray prefix for a trailing partial line without newline", async () => {
    const source = Readable.from(["partial line"]);
    const piped = source.pipe(prefixStream("components"));
    const text = (await collect(piped)).replace(/\x1b\[[0-9;]*m/g, "");
    expect(text).toBe("[components] partial line");
  });

  it("applies color to the label per picocolors", async () => {
    const source = Readable.from(["x\n"]);
    const piped = source.pipe(prefixStream("astro"));
    const text = await collect(piped);
    expect(text).toMatch(/\x1b\[34m\[astro\]\x1b\[39m/); // blue
  });
});
```

Run → expect FAIL.

**Step 2: Implementation**

```ts
import { Transform } from "node:stream";
import pc from "picocolors";

type Label = "astro" | "components" | "theme";

const COLOR: Record<Label, (s: string) => string> = {
  astro: pc.blue,
  components: pc.green,
  theme: pc.magenta,
};

/**
 * Transform stream that prepends a colored `[label]` prefix to each
 * line of input. Lines spanning chunks are buffered until the newline
 * arrives; a trailing partial line without newline is emitted as-is
 * with one prefix (preserves spinner-style updates from child tools).
 */
export function prefixStream(label: Label): Transform {
  const tag = `${COLOR[label](`[${label}]`)} `;
  let buffer = "";
  let lineStarted = false;

  return new Transform({
    transform(chunk: Buffer, _enc, callback) {
      buffer += chunk.toString();
      let out = "";
      let idx = buffer.indexOf("\n");
      while (idx !== -1) {
        const line = buffer.slice(0, idx);
        out += (lineStarted ? "" : tag) + line + "\n";
        buffer = buffer.slice(idx + 1);
        lineStarted = false;
        idx = buffer.indexOf("\n");
      }
      if (buffer.length > 0 && !lineStarted) {
        out += tag + buffer;
        buffer = "";
        lineStarted = true;
      }
      callback(null, out);
    },
    flush(callback) {
      if (buffer.length > 0) {
        callback(null, lineStarted ? buffer : tag + buffer);
      } else {
        callback();
      }
    },
  });
}
```

Run → expect PASS.

**Step 3: Commit**

```bash
git add packages/cli/src/lib/prefix-stream.ts packages/cli/src/lib/prefix-stream.test.ts
git commit -m "feat(cli): prefix-stream Transform for colored [label] line prefixes"
```

### Task 3.4: `build-if-missing` (one-shot tsup when dist/ absent)

**Files:**
- Create: `packages/cli/src/lib/build-if-missing.test.ts`
- Modify: `packages/cli/src/lib/build-if-missing.ts`

**Step 1: Write test**

```ts
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { vol } from "memfs";

vi.mock("node:fs", async () => {
  const memfs = await import("memfs");
  return memfs.fs;
});
vi.mock("node:fs/promises", async () => {
  const memfs = await import("memfs");
  return memfs.fs.promises;
});

const execaCalls: Array<{ cmd: string; args: string[]; cwd?: string }> = [];
vi.mock("execa", () => ({
  execa: vi.fn(async (cmd: string, args: string[], opts?: { cwd?: string }) => {
    execaCalls.push({ cmd, args, cwd: opts?.cwd });
    return { exitCode: 0 };
  }),
}));

import { buildIfMissing } from "./build-if-missing.ts";

describe("buildIfMissing", () => {
  beforeEach(() => {
    vol.reset();
    execaCalls.length = 0;
  });

  it("invokes pnpm build when the dist artifact is missing", async () => {
    vol.fromJSON({ "/repo/packages/theme/package.json": JSON.stringify({ name: "@sophie/theme" }) });
    await buildIfMissing({
      pkgDir: "/repo/packages/theme",
      artifact: "dist/theme.css",
      pkgLabel: "@sophie/theme",
    });
    expect(execaCalls).toHaveLength(1);
    expect(execaCalls[0]).toMatchObject({
      cmd: "pnpm",
      args: ["--filter", "@sophie/theme", "build"],
    });
  });

  it("skips the build when the dist artifact already exists", async () => {
    vol.fromJSON({
      "/repo/packages/theme/dist/theme.css": "html { color: red }",
    });
    await buildIfMissing({
      pkgDir: "/repo/packages/theme",
      artifact: "dist/theme.css",
      pkgLabel: "@sophie/theme",
    });
    expect(execaCalls).toHaveLength(0);
  });
});
```

Run → expect FAIL.

**Step 2: Implementation**

```ts
import { access } from "node:fs/promises";
import { execa } from "execa";

export interface BuildIfMissingArgs {
  pkgDir: string;
  artifact: string; // relative to pkgDir
  pkgLabel: string; // e.g. "@sophie/theme"
}

/**
 * If the artifact (typically dist/something) doesn't exist under
 * pkgDir, invoke `pnpm --filter <pkgLabel> build` and wait for
 * completion. No-op when the artifact is already present.
 *
 * Used by `sophie start` to handle fresh-clone case where @sophie/theme
 * + @sophie/components haven't been built yet.
 */
export async function buildIfMissing(args: BuildIfMissingArgs): Promise<void> {
  const full = `${args.pkgDir}/${args.artifact}`;
  try {
    await access(full);
    return; // exists; skip
  } catch {
    // missing; build
  }
  process.stdout.write(
    `Building ${args.pkgLabel} (${args.artifact} missing)...\n`
  );
  await execa("pnpm", ["--filter", args.pkgLabel, "build"], {
    cwd: args.pkgDir.split("/packages/")[0] || process.cwd(),
  });
}
```

Run → expect PASS.

**Step 3: Commit**

```bash
git add packages/cli/src/lib/build-if-missing.ts packages/cli/src/lib/build-if-missing.test.ts
git commit -m "feat(cli): build-if-missing one-shot tsup for fresh clones"
```

---

## Phase 4 — Spawn orchestrator (1 task, ~45 min)

### Task 4.1: spawn-orchestrator (the heart of `sophie start`)

**Files:**
- Create: `packages/cli/src/lib/spawn-orchestrator.test.ts`
- Modify: `packages/cli/src/lib/spawn-orchestrator.ts`

**Step 1: Write integration test (mocks execa)**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

const mockChildren: MockChild[] = [];
class MockChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = Math.floor(Math.random() * 100000);
  kill = vi.fn();
  constructor(public cmd: string, public args: string[], public opts: { cwd?: string }) {
    super();
    mockChildren.push(this);
  }
}

vi.mock("execa", () => ({
  execa: vi.fn((cmd: string, args: string[], opts?: { cwd?: string }) => {
    const child = new MockChild(cmd, args, opts ?? {});
    // Return a promise-like with .pipeStdout etc. that resolves on the "exit" event
    const promise: any = new Promise((resolve) => {
      child.on("exit", (code: number) => resolve({ exitCode: code }));
    });
    promise.stdout = child.stdout;
    promise.stderr = child.stderr;
    promise.pid = child.pid;
    promise.kill = child.kill;
    return promise;
  }),
}));

import { spawnOrchestrator } from "./spawn-orchestrator.ts";

describe("spawnOrchestrator", () => {
  beforeEach(() => {
    mockChildren.length = 0;
  });

  it("spawns astro + components-watch + theme-watch when monorepo info provided", async () => {
    const orchestrator = spawnOrchestrator({
      astro: { cwd: "/repo/examples/smoke", args: ["dev", "--port", "4321", "--host", "localhost"] },
      componentsWatch: { cwd: "/repo/packages/components" },
      themeWatch: { cwd: "/repo/packages/theme" },
    });
    // Don't await the orchestrator's run completion; we're testing it spawned the right things.
    expect(mockChildren).toHaveLength(3);
    expect(mockChildren[0].cmd).toBe("astro");
    expect(mockChildren[1].args).toContain("--watch");
    expect(mockChildren[2].opts.cwd).toBe("/repo/packages/theme");

    // Cleanup: emit exit on each to let the orchestrator settle
    mockChildren.forEach((c) => c.emit("exit", 0));
    await orchestrator.done;
  });

  it("spawns only astro when monorepo info is absent (external-consumer mode)", async () => {
    const orchestrator = spawnOrchestrator({
      astro: { cwd: "/external", args: ["dev"] },
      componentsWatch: null,
      themeWatch: null,
    });
    expect(mockChildren).toHaveLength(1);
    expect(mockChildren[0].cmd).toBe("astro");
    mockChildren[0].emit("exit", 0);
    await orchestrator.done;
  });

  it("fail-fast: when one child exits non-zero, others are SIGTERM'd", async () => {
    const orchestrator = spawnOrchestrator({
      astro: { cwd: "/proj", args: ["dev"] },
      componentsWatch: { cwd: "/pkg/components" },
      themeWatch: { cwd: "/pkg/theme" },
    });
    expect(mockChildren).toHaveLength(3);
    // astro crashes
    mockChildren[0].emit("exit", 1);
    // Allow microtasks to settle
    await new Promise((r) => setImmediate(r));
    expect(mockChildren[1].kill).toHaveBeenCalledWith("SIGTERM");
    expect(mockChildren[2].kill).toHaveBeenCalledWith("SIGTERM");
    // Settle the others
    mockChildren[1].emit("exit", 143);
    mockChildren[2].emit("exit", 143);
    const result = await orchestrator.done;
    expect(result.exitCode).toBe(1);
  });
});
```

Run → expect FAIL.

**Step 2: Implementation**

```ts
import { execa, type ResultPromise } from "execa";
import { prefixStream } from "./prefix-stream.ts";

export interface SpawnSpec {
  astro: { cwd: string; args: string[] };
  componentsWatch: { cwd: string } | null;
  themeWatch: { cwd: string } | null;
}

export interface OrchestratorHandle {
  done: Promise<{ exitCode: number }>;
}

/**
 * Spawn 1-3 children concurrently. astro is mandatory; the two watch
 * children are optional (monorepo mode only). Each child's stdout/
 * stderr is prefix-streamed to process.stdout/stderr. SIGINT/SIGTERM
 * received by the parent are forwarded to all children. On any child's
 * non-zero exit, fail-fast: SIGTERM the siblings, resolve done with
 * that child's exit code.
 */
export function spawnOrchestrator(spec: SpawnSpec): OrchestratorHandle {
  const children: Array<{
    label: "astro" | "components" | "theme";
    handle: ResultPromise;
  }> = [];

  const astro = execa("astro", spec.astro.args, {
    cwd: spec.astro.cwd,
    reject: false,
  });
  astro.stdout?.pipe(prefixStream("astro")).pipe(process.stdout);
  astro.stderr?.pipe(prefixStream("astro")).pipe(process.stderr);
  children.push({ label: "astro", handle: astro });

  if (spec.componentsWatch) {
    const comp = execa("pnpm", ["exec", "tsup", "--watch"], {
      cwd: spec.componentsWatch.cwd,
      reject: false,
    });
    comp.stdout?.pipe(prefixStream("components")).pipe(process.stdout);
    comp.stderr?.pipe(prefixStream("components")).pipe(process.stderr);
    children.push({ label: "components", handle: comp });
  }

  if (spec.themeWatch) {
    const theme = execa("pnpm", ["exec", "tsup", "--watch"], {
      cwd: spec.themeWatch.cwd,
      reject: false,
    });
    theme.stdout?.pipe(prefixStream("theme")).pipe(process.stdout);
    theme.stderr?.pipe(prefixStream("theme")).pipe(process.stderr);
    children.push({ label: "theme", handle: theme });
  }

  // Signal forwarding: parent SIGINT/SIGTERM → all children
  const forwardSignal = (sig: NodeJS.Signals) => () => {
    for (const c of children) c.handle.kill(sig);
  };
  process.on("SIGINT", forwardSignal("SIGINT"));
  process.on("SIGTERM", forwardSignal("SIGTERM"));

  // Fail-fast: first non-zero exit triggers SIGTERM on siblings
  let firstExitCode: number | null = null;
  const watchers = children.map(({ label, handle }) =>
    handle.then((result) => {
      const code = result.exitCode ?? 0;
      if (firstExitCode === null && code !== 0) {
        firstExitCode = code;
        for (const sibling of children) {
          if (sibling.handle !== handle) sibling.handle.kill("SIGTERM");
        }
        process.stderr.write(
          `\n[${label}] exited with code ${code}; terminating siblings.\n`
        );
      }
      return { label, code };
    })
  );

  const done = Promise.all(watchers).then(() => ({
    exitCode: firstExitCode ?? 0,
  }));

  return { done };
}
```

Run → expect PASS (mocked execa).

**Step 3: Commit**

```bash
git add packages/cli/src/lib/spawn-orchestrator.ts packages/cli/src/lib/spawn-orchestrator.test.ts
git commit -m "feat(cli): spawn-orchestrator — 1-3 children + signal forwarding + fail-fast"
```

---

## Phase 5 — Wire commands to lib (3 tasks, ~30 min)

### Task 5.1: `start` runner implementation

**Files:**
- Modify: `packages/cli/src/commands/start.ts`

**Step 1: Replace the placeholder `run` with the real orchestration**

Replace the `async run({ args })` body in `start.ts`:

```ts
async run({ args }) {
  const port = Number.parseInt(String(args.port), 10);
  if (Number.isNaN(port)) {
    throw new Error(`Invalid --port value: ${args.port}`);
  }

  const consumerRoot = await resolveConsumerRoot(String(args.path));
  const monorepo = await detectMonorepo(consumerRoot);

  if (monorepo) {
    await buildIfMissing({
      pkgDir: monorepo.themeSrc,
      artifact: "dist/theme.css",
      pkgLabel: "@sophie/theme",
    });
    await buildIfMissing({
      pkgDir: monorepo.componentsSrc,
      artifact: "dist/index.js",
      pkgLabel: "@sophie/components",
    });
  }

  const astroArgs = [
    "dev",
    "--port", String(port),
    "--host", String(args.host),
  ];
  if (args.open) astroArgs.push("--open");

  const orchestrator = spawnOrchestrator({
    astro: { cwd: consumerRoot, args: astroArgs },
    componentsWatch: monorepo ? { cwd: monorepo.componentsSrc } : null,
    themeWatch: monorepo ? { cwd: monorepo.themeSrc } : null,
  });
  const result = await orchestrator.done;
  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
  return { args: { ...args, port } };
},
```

Add imports at top:

```ts
import { buildIfMissing } from "../lib/build-if-missing.ts";
import { detectMonorepo } from "../lib/detect-monorepo.ts";
import { resolveConsumerRoot } from "../lib/resolve-consumer-root.ts";
import { spawnOrchestrator } from "../lib/spawn-orchestrator.ts";
```

**Step 2: Re-run arg-parsing tests**

Run: `pnpm --filter @sophie/cli test:unit src/commands/start.test.ts`

Expected: PASS — the runner returns the parsed args before doing real work in tests (citty's runCommand doesn't await orchestration; the spawnOrchestrator call short-circuits in the test harness because no children are mocked at the command-level test).

Wait — this might fail because the real impl now calls resolveConsumerRoot which hits the filesystem. Re-check: the test passes `./examples/smoke` as path; real fs access would fail in vitest if `examples/smoke/astro.config.ts` doesn't exist relative to the test cwd.

Adjustment: keep the command runner pure-parsing for tests; the real implementation lives behind a flag or we use a separate `startMain()` function. Simpler approach: the runner calls a function `runStart(args)` that does the orchestration. The runner itself returns the parsed args. We test `runStart` separately.

**Refactor:** put the orchestration in `src/lib/run-start.ts` and have the command's `run` delegate to it. Tests for `runStart` go in `src/lib/run-start.test.ts` (covered in Task 5.2). The arg-parsing tests stay unaffected.

So in start.ts:

```ts
import { defineCommand } from "citty";
import { runStart } from "../lib/run-start.ts";

export const startCommand = defineCommand({
  meta: { /* ... */ },
  args: { /* ... */ },
  async run({ args }) {
    const port = Number.parseInt(String(args.port), 10);
    if (Number.isNaN(port)) throw new Error(`Invalid --port: ${args.port}`);
    const normalized = { ...args, port };
    // In test harness, runCommand doesn't actually invoke run() — but if it does,
    // we still need to short-circuit cleanly. Tests assert on the returned args shape.
    if (process.env.SOPHIE_CLI_TEST_HARNESS === "1") {
      return { args: normalized };
    }
    await runStart(normalized);
    return { args: normalized };
  },
});
```

And the tests set `process.env.SOPHIE_CLI_TEST_HARNESS = "1"` in `beforeEach`.

Actually citty's `runCommand` exported helper does invoke `run`. So we need the env-guard.

Re-test: `pnpm --filter @sophie/cli test:unit src/commands/start.test.ts` → expect PASS with `SOPHIE_CLI_TEST_HARNESS=1` set.

**Step 3: Commit**

```bash
git add packages/cli/src/commands/start.ts
git commit -m "feat(cli): start runner — wire resolve + detect + buildIfMissing + spawn"
```

### Task 5.2: `runStart` integration test

**Files:**
- Create: `packages/cli/src/lib/run-start.test.ts`
- Create: `packages/cli/src/lib/run-start.ts`

**Step 1: Write test**

(Similar pattern: memfs for fs, vi.mock for execa. Verifies that runStart calls resolveConsumerRoot → detectMonorepo → buildIfMissing × 2 → spawnOrchestrator in the right order.)

**Step 2: Implementation** — pure orchestration of the four helpers; logic copied from Task 5.1's draft.

**Step 3: Commit**

```bash
git add packages/cli/src/lib/run-start.ts packages/cli/src/lib/run-start.test.ts
git commit -m "feat(cli): runStart — orchestration glue + integration test"
```

### Task 5.3: `preview` runner implementation

**Files:**
- Modify: `packages/cli/src/commands/preview.ts`
- Create: `packages/cli/src/lib/run-preview.ts`
- Create: `packages/cli/src/lib/run-preview.test.ts`

**Step 1: Test for `runPreview`**

Asserts: if `build === true`, execa is called with `astro build` first (awaited), then `astro preview` is spawned. If `build === false`, only `astro preview` runs.

**Step 2: Implementation** — sequential: optionally `execa("astro", ["build"])`, then `execa("astro", ["preview", ...])` with same signal forwarding as start.

**Step 3: Wire `preview` command** to call `runPreview` behind the same `SOPHIE_CLI_TEST_HARNESS` env guard.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/preview.ts packages/cli/src/lib/run-preview.ts packages/cli/src/lib/run-preview.test.ts
git commit -m "feat(cli): preview runner — astro build + astro preview + signal forwarding"
```

---

## Phase 6 — Audit relocation (1 task, ~10 min)

### Task 6.1: Move `audit` command from `@sophie/core` to `@sophie/cli`

**Files:**
- Move: `packages/core/src/cli/commands/audit.ts` → `packages/cli/src/commands/audit.ts`
- Modify: imports in the moved file (it imports `@sophie/core/audit` — still valid).

**Step 1: Replace the placeholder audit.ts in cli with the real one**

```ts
import { auditFile } from "@sophie/core/audit";
import { defineCommand } from "citty";

export const auditCommand = defineCommand({
  meta: {
    name: "audit",
    description:
      "Validate a Sophie chapter file's frontmatter against the schema.",
  },
  args: {
    file: {
      type: "positional",
      description: "Path to a chapter MDX file.",
      required: true,
    },
  },
  async run({ args }) {
    const findings = await auditFile(args.file);
    if (findings.length === 0) {
      console.log(`OK  ${args.file}`);
      return;
    }
    console.error(`FAIL  ${args.file}`);
    for (const finding of findings) {
      const where = finding.path.length > 0 ? finding.path.join(".") : "<root>";
      console.error(`  [${finding.severity}] ${where}: ${finding.message}`);
    }
    process.exit(1);
  },
});
```

**Step 2: Verify smoke target's audit script still works**

Run: `pnpm --filter smoke sophie:audit`

Expected: PASS — audits `examples/smoke/src/content/chapters/spoiler-alerts.mdx` and prints OK or finding list.

If it fails because the binary path resolution changed: update `examples/smoke/package.json`'s script to use the new path (likely no change needed since `sophie` is on PATH via node_modules/.bin symlink regardless of which package owns the bin field).

**Step 3: Commit**

```bash
git add packages/cli/src/commands/audit.ts
git commit -m "feat(cli): relocate audit command from @sophie/core (full impl)"
```

---

## Phase 7 — @sophie/core cleanup (2 tasks, ~15 min)

### Task 7.1: Delete `packages/core/src/cli/`

**Files:**
- Delete: `packages/core/src/cli/` (entire directory)

**Step 1: Verify nothing else imports from `@sophie/core/cli`**

```bash
grep -rn '@sophie/core/cli' packages/ examples/ 2>/dev/null
```

Expected: zero hits.

**Step 2: Remove the directory**

```bash
rm -rf packages/core/src/cli/
```

**Step 3: Commit**

```bash
git add -A packages/core/src/cli
git commit -m "feat(core): remove cli subpath — sophie bin now in @sophie/cli"
```

### Task 7.2: Update `packages/core/package.json`

**Files:**
- Modify: `packages/core/package.json`

**Step 1: Edit**

- Remove `"./cli"` entry from `exports`.
- Remove `"bin"` field entirely.
- Update `"description"` to drop "CLI" reference.
- Remove `"citty"` from `"dependencies"`.

Resulting `package.json`:

```json
{
  "name": "@sophie/core",
  "version": "0.0.0",
  "description": "Sophie core: schema + audit-as-library. Internal subpackages enforced via subpath exports + Biome boundary rule.",
  "license": "AGPL-3.0-or-later",
  "author": "Anna Rosen",
  "type": "module",
  "exports": {
    "./schema": {
      "types": "./dist/schema/index.d.ts",
      "import": "./dist/schema/index.js"
    },
    "./audit": {
      "types": "./dist/audit/index.d.ts",
      "import": "./dist/audit/index.js"
    }
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run --coverage",
    "test:watch": "vitest",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "gray-matter": "^4.0.3",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/node": "^25.6.2",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "@vitest/coverage-v8": "^4.1.5",
    "vitest": "^4.1.5"
  }
}
```

**Step 2: Update `packages/core/tsup.config.ts`** — remove cli entry from entries.

**Step 3: Verify the smoke target's `sophie:audit` still works AND `pnpm install --frozen-lockfile` is happy**

```bash
pnpm install --frozen-lockfile
pnpm --filter @sophie/core build
pnpm --filter smoke sophie:audit
```

All expected: PASS.

**Step 4: Commit**

```bash
git add packages/core/package.json packages/core/tsup.config.ts pnpm-lock.yaml
git commit -m "feat(core): drop bin + /cli subpath + citty dep — @sophie/cli owns CLI now"
```

---

## Phase 8 — E2E tests (1 task, ~20 min)

### Task 8.1: Smoke e2e for `sophie start` + `sophie preview`

**Files:**
- Create: `examples/smoke/e2e/sophie-start.spec.ts`
- Create: `examples/smoke/e2e/sophie-preview.spec.ts`

**Step 1: Write `sophie-start.spec.ts`**

```ts
import { expect, test } from "@playwright/test";
import { execa } from "execa";

test.describe("sophie start", () => {
  test("serves the smoke chapter on the requested port and exits clean on SIGTERM", async ({
    request,
  }) => {
    // Use a non-default port to avoid colliding with playwright's webServer.
    const port = 4399;
    const child = execa(
      "node",
      ["packages/cli/dist/bin.js", "start", "--port", String(port), "examples/smoke"],
      {
        cwd: process.cwd(),
        reject: false,
      }
    );

    // Wait for astro dev to start serving. Poll up to 30s.
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      try {
        const res = await request.get(`http://localhost:${port}/`);
        if (res.ok()) break;
      } catch {
        // not ready yet
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    const finalRes = await request.get(`http://localhost:${port}/chapters/spoiler-alerts/`);
    expect(finalRes.ok()).toBe(true);

    child.kill("SIGTERM");
    await child;
    // Note: astro dev exits 0 on SIGTERM; the orchestrator inherits that.
  });
});
```

**Step 2: Write `sophie-preview.spec.ts`** (similar shape; uses --no-build since the smoke build was already produced).

**Step 3: Build the CLI and run the e2e tests**

```bash
pnpm exec turbo run build --filter=@sophie/cli --filter=smoke
pnpm test:e2e sophie-start sophie-preview
```

Expected: 2 passes.

Run 3× consecutively (per the brief's 3× discipline):

```bash
for i in 1 2 3; do echo "=== run $i ==="; pnpm test:e2e sophie-start sophie-preview; done
```

Expected: 3/3 GREEN.

**Step 4: Commit**

```bash
git add examples/smoke/e2e/sophie-start.spec.ts examples/smoke/e2e/sophie-preview.spec.ts
git commit -m "test(smoke): e2e for sophie start + sophie preview (3-of-3 GREEN)"
```

---

## Phase 9 — Pre-PR verification (1 task, ~10 min)

### Task 9.1: Final verification + open PR

**Step 1: Full repo check**

```bash
pnpm install --frozen-lockfile            # must pass — frozen-lockfile rigor
pnpm exec biome check .                   # 0 errors, 0 warnings
pnpm exec turbo run build                 # all packages build
pnpm exec turbo run test:unit             # all unit tests pass
pnpm test:e2e                             # all e2e green
```

**Step 2: Manual smoke**

```bash
node packages/cli/dist/bin.js --help
node packages/cli/dist/bin.js start --help
node packages/cli/dist/bin.js preview --help
node packages/cli/dist/bin.js dev --help     # alias should resolve to start
node packages/cli/dist/bin.js audit --help
```

All expected: print sensible help text.

**Step 3: Open the PR with squash-merge convention**

```bash
git push -u origin feat/sophie-cli-carve-out
gh pr create --title "feat(cli): carve out @sophie/cli — start/preview/audit/dev" --body "$(cat <<'EOF'
## Summary

- Carves out `@sophie/cli` as a new workspace package; `@sophie/core` shrinks to schema + audit-library.
- Implements `sophie start` (Astro dev + watch orchestration for @sophie/components + @sophie/theme + pedagogy-index HMR), `sophie preview` (astro build + astro preview), relocates `sophie audit`, ships `sophie dev` as a citty alias for `start`.
- First PR under [ADR 0055](../docs/website/decisions/0055-squash-merge-for-code-prs.md) squash-merge convention.

Design: [docs/plans/2026-05-15-sophie-cli-carve-out-design.md](../docs/plans/2026-05-15-sophie-cli-carve-out-design.md)
Plan:   [docs/plans/2026-05-15-sophie-cli-carve-out-plan.md](../docs/plans/2026-05-15-sophie-cli-carve-out-plan.md)

## Test plan

- [x] `pnpm install --frozen-lockfile` clean
- [x] `pnpm exec biome check .` → 0 errors, 0 warnings
- [x] `pnpm exec turbo run build` → all packages build
- [x] `pnpm exec turbo run test:unit` → all unit tests pass; +~50 new in @sophie/cli
- [x] `pnpm test:e2e sophie-start sophie-preview` → 3-of-3 consecutive GREEN
- [x] `pnpm --filter smoke sophie:audit` → still passes (audit relocation regression check)
- [x] Manual smoke: `node packages/cli/dist/bin.js --help` lists all 4 subcommands

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" --base main
```

**Step 4: Squash-merge once review passes** (Anna handles via GitHub UI per ADR 0055).

---

## Summary — what this plan ships

- **1 new package**: `@sophie/cli` with `start`, `preview`, `audit`, `dev`-alias subcommands.
- **1 package slimmed**: `@sophie/core` drops `bin`, `/cli` subpath, and `citty` dep.
- **5 new lib helpers** in `@sophie/cli`: resolve-consumer-root, detect-monorepo, prefix-stream, build-if-missing, spawn-orchestrator (plus run-start, run-preview glue).
- **~50 new unit tests** + 2 new Playwright e2e specs.
- **15 atomic commits**, squash-merged at PR close per ADR 0055.

Expected timeline: 6-10 hours of focused work.

## Execution handoff

**Plan complete and saved to `docs/plans/2026-05-15-sophie-cli-carve-out-plan.md`.** Two execution options per the writing-plans skill:

1. **Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Required sub-skill: `superpowers:subagent-driven-development`. Stays in this conversation.

2. **Parallel Session (separate)** — Open a new Claude Code session inside the `feat/sophie-cli-carve-out` worktree; that session uses `superpowers:executing-plans` to batch-execute with checkpoints between phases.

Which approach?
