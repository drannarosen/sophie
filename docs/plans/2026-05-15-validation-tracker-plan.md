# Validation Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Sophie's validation tracker per [ADR 0056](../website/decisions/0056-validation-tracker.md). Ship the frontmatter schema, per-page admonition rendering, generated index page, audit invariants, and migration of ~74 existing contracts. Pre-launch private rendering via a build flag.

**Architecture:** Two build-time hooks following the pedagogy-index pattern (ADR 0038). Zod schema lives in `@sophie/core/schema/validation.ts`. A MyST plugin in `@sophie/astro/src/lib/validation-admonition-plugin.ts` reads each contract's frontmatter `validation:` block and emits a top-of-page admonition (with staleness auto-detection from Revisions sections). A Vite plugin in `@sophie/astro/src/lib/validation-index-generator.ts` walks `decisions/` + `reference/` at build time and emits `docs/website/status/validation.md` as an aggregate dashboard. Audit invariants V1–V7 extend `packages/astro/src/lib/pedagogy-audit.ts`. The `SOPHIE_DOCS_INCLUDE_VALIDATION` env flag gates the rendered surfaces while keeping the frontmatter data layer always-present.

**Tech Stack:**

- Zod 3.x for schema (existing `@sophie/core` dep).
- `unified` / `remark` / `myst-parser` ecosystem for the MyST plugin (existing in `@sophie/astro`).
- Vite plugin API (existing in `@sophie/astro` via the pedagogy-index virtual module).
- Vitest for unit tests, Playwright for e2e (existing infra).
- jest-axe / axe-core for a11y (existing per ADR 0004).

**Sequencing:** Six PRs land sequentially on `main` per `feedback_branch_pr_scope` memory (full PR flow for code changes). Each PR is independently reviewable + revertable. Approximate effort: ~2–3 weeks at Sophie's Bucket B / Bucket C pace.

| PR | Scope | Depends on |
|---|---|---|
| **PR 1** | Zod schema in `@sophie/core/schema/validation.ts` | — |
| **PR 2** | Bulk migration — default `validation: { status: "unvalidated" }` block on all ~74 ADRs + reference docs | PR 1 schema |
| **PR 3** | Audit invariants V1–V7 in `pedagogy-audit.ts` (initially WARNING-grade across the board) | PR 1 + PR 2 |
| **PR 4** | MyST admonition plugin (per-page rendering + staleness detection), gated behind `SOPHIE_DOCS_INCLUDE_VALIDATION` flag | PR 1 + PR 2 |
| **PR 5** | Vite index plugin (generated `/status/validation/` page), same build flag | PR 1 + PR 4 |
| **PR 6** | Reference doc `reference/validation-tracker.md` + curated initial-pass migration that lifts substantial contracts to actual current state; promote V1/V2 invariants WARNING → ERROR | PRs 1–5 |

---

## PR 1 — Zod schema for validation block

**Branch:** `feat/validation-schema`
**Files:**

- Create: `packages/core/src/schema/validation.ts`
- Create: `packages/core/src/schema/validation.test.ts`
- Modify: `packages/core/src/schema/index.ts` (add re-exports)

### Task 1.1: Write the failing schema test

**File:** `packages/core/src/schema/validation.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import {
  ValidationKindSchema,
  ValidationStatusSchema,
  ValidationEvidenceSchema,
  ValidationSchema,
} from "./validation";

describe("ValidationStatusSchema", () => {
  it.each([
    "unvalidated",
    "in-progress",
    "validated",
    "re-validation-needed",
  ])("accepts %s", (status) => {
    expect(() => ValidationStatusSchema.parse(status)).not.toThrow();
  });

  it("rejects unknown status", () => {
    expect(() => ValidationStatusSchema.parse("partial")).toThrow();
  });
});

describe("ValidationKindSchema", () => {
  it.each([
    "test",
    "chapter",
    "review",
    "deployment",
    "audit",
    "manual",
  ])("accepts %s", (kind) => {
    expect(() => ValidationKindSchema.parse(kind)).not.toThrow();
  });

  it("rejects unknown kind", () => {
    expect(() => ValidationKindSchema.parse("unit-test")).toThrow();
  });
});

describe("ValidationEvidenceSchema", () => {
  it("accepts a complete record", () => {
    const record = {
      kind: "test",
      ref: "packages/components/src/Predict.test.tsx",
      date: "2026-05-12",
      notes: "14 unit tests + axe-core pass",
    };
    expect(() => ValidationEvidenceSchema.parse(record)).not.toThrow();
  });

  it("accepts a deferred record (null ref + null date)", () => {
    const record = {
      kind: "deployment",
      ref: null,
      date: null,
      notes: "ASTR 201 fa26 cohort pending",
    };
    expect(() => ValidationEvidenceSchema.parse(record)).not.toThrow();
  });

  it("makes notes optional", () => {
    const record = { kind: "test", ref: "x.ts", date: "2026-05-12" };
    expect(() => ValidationEvidenceSchema.parse(record)).not.toThrow();
  });
});

describe("ValidationSchema", () => {
  it("accepts a complete validated block", () => {
    const block = {
      status: "validated",
      last_validated_date: "2026-05-14",
      evidence: [
        {
          kind: "test",
          ref: "packages/components/src/Predict.test.tsx",
          date: "2026-05-12",
        },
      ],
      notes: "Persistence + cross-tab sync covered.",
    };
    expect(() => ValidationSchema.parse(block)).not.toThrow();
  });

  it("accepts a default unvalidated block", () => {
    const block = {
      status: "unvalidated",
      last_validated_date: null,
      evidence: [],
    };
    expect(() => ValidationSchema.parse(block)).not.toThrow();
  });

  it("defaults evidence to empty array when omitted", () => {
    const parsed = ValidationSchema.parse({
      status: "unvalidated",
      last_validated_date: null,
    });
    expect(parsed.evidence).toEqual([]);
  });
});
```

**Run:** `pnpm turbo run test --filter=@sophie/core -- validation.test.ts`
**Expected:** FAIL — module `./validation` not found.

### Task 1.2: Write the schema implementation

**File:** `packages/core/src/schema/validation.ts`

```typescript
import { z } from "zod";

export const ValidationKindSchema = z.enum([
  "test",
  "chapter",
  "review",
  "deployment",
  "audit",
  "manual",
]);
export type ValidationKind = z.infer<typeof ValidationKindSchema>;

export const ValidationStatusSchema = z.enum([
  "unvalidated",
  "in-progress",
  "validated",
  "re-validation-needed",
]);
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

export const ValidationEvidenceSchema = z.object({
  kind: ValidationKindSchema,
  ref: z.string().nullable(),
  date: z.string().nullable(),
  notes: z.string().optional(),
});
export type ValidationEvidence = z.infer<typeof ValidationEvidenceSchema>;

export const ValidationSchema = z.object({
  status: ValidationStatusSchema,
  last_validated_date: z.string().nullable(),
  evidence: z.array(ValidationEvidenceSchema).default([]),
  notes: z.string().optional(),
});
export type Validation = z.infer<typeof ValidationSchema>;
```

**Run:** `pnpm turbo run test --filter=@sophie/core -- validation.test.ts`
**Expected:** PASS — all 11 tests green.

### Task 1.3: Add cross-field refinement (status ↔ last_validated_date)

ADR 0056 Decision 2: when `status` is `validated` or `re-validation-needed`, `last_validated_date` must be non-null. This is invariant V3 at the schema layer (audit-side check ships in PR 3 too).

**File:** `packages/core/src/schema/validation.test.ts`

Append:

```typescript
describe("ValidationSchema cross-field refinement", () => {
  it("rejects validated status without last_validated_date", () => {
    const block = {
      status: "validated",
      last_validated_date: null,
      evidence: [],
    };
    expect(() => ValidationSchema.parse(block)).toThrow(
      /last_validated_date is required/i,
    );
  });

  it("rejects re-validation-needed without last_validated_date", () => {
    const block = {
      status: "re-validation-needed",
      last_validated_date: null,
      evidence: [],
    };
    expect(() => ValidationSchema.parse(block)).toThrow(
      /last_validated_date is required/i,
    );
  });

  it("accepts unvalidated without last_validated_date", () => {
    expect(() =>
      ValidationSchema.parse({
        status: "unvalidated",
        last_validated_date: null,
        evidence: [],
      }),
    ).not.toThrow();
  });
});
```

**Run:** `pnpm turbo run test --filter=@sophie/core -- validation.test.ts`
**Expected:** FAIL — 3 new failures (the cross-field check isn't yet enforced).

**File:** `packages/core/src/schema/validation.ts`

Replace `ValidationSchema` with:

```typescript
export const ValidationSchema = z
  .object({
    status: ValidationStatusSchema,
    last_validated_date: z.string().nullable(),
    evidence: z.array(ValidationEvidenceSchema).default([]),
    notes: z.string().optional(),
  })
  .refine(
    (block) => {
      if (block.status === "validated" || block.status === "re-validation-needed") {
        return block.last_validated_date !== null;
      }
      return true;
    },
    {
      message:
        "last_validated_date is required when status is validated or re-validation-needed",
      path: ["last_validated_date"],
    },
  );
```

**Run:** `pnpm turbo run test --filter=@sophie/core -- validation.test.ts`
**Expected:** PASS — 14 tests green.

### Task 1.4: Re-export from package index

**File:** `packages/core/src/schema/index.ts`

Add to the existing re-exports:

```typescript
export {
  ValidationKindSchema,
  ValidationStatusSchema,
  ValidationEvidenceSchema,
  ValidationSchema,
  type ValidationKind,
  type ValidationStatus,
  type ValidationEvidence,
  type Validation,
} from "./validation";
```

**Run:** `pnpm turbo run typecheck --filter=@sophie/core`
**Expected:** PASS — no TS errors.

### Task 1.5: Commit PR 1

**Run:**

```bash
git checkout -b feat/validation-schema
git add packages/core/src/schema/validation.ts \
  packages/core/src/schema/validation.test.ts \
  packages/core/src/schema/index.ts
git commit -m "$(cat <<'EOF'
feat(core): Zod schema for validation block (ADR 0056)

Adds the foundation schema for Sophie's validation tracker per
ADR 0056. Four enums + one composite schema:

- ValidationStatusSchema: unvalidated / in-progress / validated /
  re-validation-needed (the four-state vocabulary locked in Q2).
- ValidationKindSchema: test / chapter / review / deployment /
  audit / manual (the six-kind enum locked in Q3).
- ValidationEvidenceSchema: { kind, ref, date, notes? } — structured
  record with optional prose notes. ref + date nullable so deferred
  evidence ("deployment pending") still records intent.
- ValidationSchema: { status, last_validated_date, evidence, notes? }
  with cross-field refinement enforcing last_validated_date non-null
  when status is validated or re-validation-needed (invariant V3 at
  the schema layer; audit-layer check ships in PR 3).

No production callsites yet. PR 2 backfills frontmatter blocks on
all ~74 ADRs + reference docs; PR 3 ships audit invariants V1–V7
that consume this schema.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin feat/validation-schema
gh pr create --title "feat(core): Zod schema for validation block (ADR 0056)" --body "$(cat <<'EOF'
## Summary
- Add Zod schema for the validation tracker frontmatter block per [ADR 0056](docs/website/decisions/0056-validation-tracker.md).
- Four-state status enum + six-kind evidence enum + cross-field refinement (V3 at schema layer).
- No production callsites yet; PRs 2–6 build on top.

## Test plan
- [ ] `pnpm turbo run test --filter=@sophie/core` — 14 new schema tests pass
- [ ] `pnpm turbo run typecheck --filter=@sophie/core` — clean
- [ ] `pnpm exec biome check packages/core/src/schema/validation.ts packages/core/src/schema/validation.test.ts` — 0 errors, 0 warnings

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## PR 2 — Bulk migration: default-unvalidated frontmatter on all contracts

**Branch:** `feat/validation-bulk-migration`
**Files:**

- Modify: all `docs/website/decisions/NNNN-*.md` (54 files)
- Modify: all `docs/website/reference/*.md` (~20 files)
- Create: `scripts/migrate-validation-blocks.mjs` (one-shot migration script)

### Task 2.1: Write the migration script

**File:** `scripts/migrate-validation-blocks.mjs`

```javascript
#!/usr/bin/env node
// One-shot migration: add default validation block to every ADR +
// reference doc that doesn't already have one.

import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { resolve } from "node:path";
import matter from "gray-matter";

const ROOTS = [
  "docs/website/decisions",
  "docs/website/reference",
];

const DEFAULT_VALIDATION = {
  status: "unvalidated",
  last_validated_date: null,
  evidence: [],
};

const SKIP_FILENAMES = new Set(["template.md"]);

async function main() {
  const paths = [];
  for (const root of ROOTS) {
    for await (const entry of glob(`${root}/*.md`)) {
      const filename = entry.split("/").pop();
      if (SKIP_FILENAMES.has(filename)) continue;
      paths.push(entry);
    }
  }

  let added = 0;
  let skipped = 0;
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    const { data, content } = matter(source);
    if (data.validation) {
      skipped += 1;
      continue;
    }
    data.validation = DEFAULT_VALIDATION;
    const next = matter.stringify(content, data);
    await writeFile(path, next, "utf8");
    added += 1;
  }

  console.log(`Added validation block to ${added} files; skipped ${skipped} (already had a block).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Run:** `node scripts/migrate-validation-blocks.mjs`
**Expected:** `Added validation block to ~74 files; skipped 0 (already had a block).`

### Task 2.2: Spot-check a migrated frontmatter

**Run:** `head -15 docs/website/decisions/0001-platform-not-monorepo.md`
**Expected:** Frontmatter includes:

```yaml
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
```

### Task 2.3: Verify build still passes

**Run:**

```bash
cd docs/website && npx mystmd build --html 2>&1 \
  | grep -v "GET\|💌\|^$\|DeprecationWarning\|trace-warnings\|docs/plans\|📖 Built" \
  | grep -iE "error|fail|❌|broken|missing" | head -20
```

**Expected:** empty (no new errors; pre-existing artifact-4-... warning permitted).

### Task 2.4: Commit PR 2

**Run:**

```bash
git checkout -b feat/validation-bulk-migration
git add scripts/migrate-validation-blocks.mjs \
  docs/website/decisions/*.md \
  docs/website/reference/*.md
git commit -m "$(cat <<'EOF'
feat(docs): bulk default-unvalidated frontmatter migration (ADR 0056)

Per ADR 0056 + the validation-tracker design doc's two-pass
migration plan: bulk-add a default `validation:` frontmatter block
to every ADR + reference doc that doesn't already carry one.

Default block per ADR 0056 Decision 1 (status: unvalidated;
last_validated_date: null; evidence: []) — the schema's safe
starting point. PR 6 (curated initial-pass) graduates substantial
contracts to their actual current state after the rendering plugins
ship.

Includes a one-shot migration script (scripts/migrate-validation-
blocks.mjs) that uses gray-matter to walk decisions/ + reference/
and add the default block where missing. Idempotent: skips files
already carrying a validation block.

Skipped: decisions/template.md (not a contract).

No rendering changes yet — PR 4 ships the MyST admonition plugin
that surfaces this data. The frontmatter blocks exist now so PRs
3–5 can build on top with real fixture data.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
gh pr create --title "feat(docs): bulk default-unvalidated frontmatter migration (ADR 0056)" --body "..."
```

---

## PR 3 — Audit invariants V1–V7

**Branch:** `feat/validation-audit-invariants`
**Files:**

- Modify: `packages/astro/src/lib/pedagogy-audit.ts`
- Modify: `packages/astro/src/lib/pedagogy-audit.test.ts`
- Modify: `packages/core/src/schema/pedagogy-index.ts` (add `contractValidations` field)

### Task 3.1: Add `ContractValidation` to the pedagogy index

The audit walks the populated `PedagogyIndex`. Validation blocks live on docs (not on chapter MDX), so we extend the index with a separate `contractValidations` field collected at build time.

**File:** `packages/core/src/schema/pedagogy-index.ts`

Add to the existing schema (sketch — exact merge follows the file's existing pattern):

```typescript
import { ValidationSchema } from "./validation";

export const ContractValidationEntrySchema = z.object({
  path: NonEmptyString,     // relative docs/website/ path
  validation: ValidationSchema.optional(),
  lastRevisedDate: z.string().nullable(),  // derived from Revisions section / git
});

// Extend PedagogyIndexSchema:
export const PedagogyIndexSchema = z.object({
  // ... existing fields (modules, chapters, definitions, equations, etc.)
  contractValidations: z.array(ContractValidationEntrySchema).default([]),
});
```

### Task 3.2: Write failing audit tests for V1–V2

**File:** `packages/astro/src/lib/pedagogy-audit.test.ts`

Append:

```typescript
describe("validation audit invariants", () => {
  it("V1: WARNING when an ADR is missing a validation block", () => {
    const index = makeIndex({
      contractValidations: [
        { path: "docs/website/decisions/0001-platform-not-monorepo.md", validation: undefined, lastRevisedDate: null },
      ],
    });
    const report = runPedagogyAudit(index);
    expect(report.warnings).toContainEqual(
      expect.objectContaining({ code: "V1" }),
    );
  });

  it("V2: WARNING when a reference doc is missing a validation block", () => {
    const index = makeIndex({
      contractValidations: [
        { path: "docs/website/reference/content-schema.md", validation: undefined, lastRevisedDate: null },
      ],
    });
    const report = runPedagogyAudit(index);
    expect(report.warnings).toContainEqual(
      expect.objectContaining({ code: "V2" }),
    );
  });

  it("V3: ERROR when status=validated but last_validated_date is null", () => {
    // Note: schema-layer refinement (PR 1) catches this; audit-layer
    // is defense-in-depth for hand-edited frontmatter that bypassed
    // schema validation.
    const index = makeIndex({
      contractValidations: [{
        path: "docs/website/decisions/0042-...md",
        validation: { status: "validated", last_validated_date: null, evidence: [] } as unknown as Validation,
        lastRevisedDate: null,
      }],
    });
    const report = runPedagogyAudit(index);
    expect(report.errors).toContainEqual(
      expect.objectContaining({ code: "V3" }),
    );
  });

  // ... V4, V5, V6, V7 follow the same pattern
});
```

**Run:** `pnpm turbo run test --filter=@sophie/astro -- pedagogy-audit.test.ts`
**Expected:** FAIL — V1–V7 audit checks not yet implemented.

### Task 3.3: Implement audit invariants V1–V7

**File:** `packages/astro/src/lib/pedagogy-audit.ts`

Add to the existing `runPedagogyAudit` function:

```typescript
function runValidationInvariants(index: PedagogyIndex): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const entry of index.contractValidations) {
    // V1: ADR missing validation block
    if (
      !entry.validation &&
      entry.path.startsWith("docs/website/decisions/") &&
      !entry.path.endsWith("/template.md")
    ) {
      findings.push({
        severity: "WARNING",
        code: "V1",
        message: `ADR is missing a validation block: ${entry.path}`,
        location: { chapter: entry.path },
      });
    }

    // V2: reference doc missing validation block
    if (!entry.validation && entry.path.startsWith("docs/website/reference/")) {
      findings.push({
        severity: "WARNING",
        code: "V2",
        message: `Reference doc is missing a validation block: ${entry.path}`,
        location: { chapter: entry.path },
      });
    }

    if (!entry.validation) continue;
    const v = entry.validation;

    // V3: validated/re-validation-needed must have a date
    if (
      (v.status === "validated" || v.status === "re-validation-needed") &&
      v.last_validated_date === null
    ) {
      findings.push({
        severity: "ERROR",
        code: "V3",
        message: `${entry.path}: status is ${v.status} but last_validated_date is null`,
        location: { chapter: entry.path },
      });
    }

    // V4: unvalidated must be clean
    if (
      v.status === "unvalidated" &&
      (v.evidence.length > 0 || v.last_validated_date !== null)
    ) {
      findings.push({
        severity: "ERROR",
        code: "V4",
        message: `${entry.path}: status is unvalidated but evidence or last_validated_date is set`,
        location: { chapter: entry.path },
      });
    }

    // V5: evidence refs must resolve (deferred null refs OK)
    for (const ev of v.evidence) {
      if (ev.ref !== null && !existsSync(ev.ref)) {
        findings.push({
          severity: "ERROR",
          code: "V5",
          message: `${entry.path}: evidence ref does not exist: ${ev.ref}`,
          location: { chapter: entry.path },
        });
      }
    }

    // V6: dates must be valid ISO
    for (const ev of v.evidence) {
      if (ev.date !== null && !isValidIsoDate(ev.date)) {
        findings.push({
          severity: "ERROR",
          code: "V6",
          message: `${entry.path}: evidence date is not a valid ISO date: ${ev.date}`,
          location: { chapter: entry.path },
        });
      }
    }

    // V7: last_validated_date must not be in the future
    if (v.last_validated_date !== null && new Date(v.last_validated_date) > new Date()) {
      findings.push({
        severity: "WARNING",
        code: "V7",
        message: `${entry.path}: last_validated_date is in the future: ${v.last_validated_date}`,
        location: { chapter: entry.path },
      });
    }
  }
  return findings;
}

function isValidIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}
```

Call `runValidationInvariants(index)` inside `runPedagogyAudit` and merge findings into the report.

**Run:** `pnpm turbo run test --filter=@sophie/astro -- pedagogy-audit.test.ts`
**Expected:** PASS — V1–V7 tests green.

### Task 3.4: Add contract-validations extractor

**File:** `packages/astro/src/lib/validation-extractor.ts` (new)

```typescript
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import matter from "gray-matter";
import { ValidationSchema } from "@sophie/core/schema";
import type { ContractValidationEntry } from "@sophie/core/schema";

export function extractContractValidations(rootDir: string): ContractValidationEntry[] {
  const entries: ContractValidationEntry[] = [];
  const patterns = [
    `${rootDir}/docs/website/decisions/*.md`,
    `${rootDir}/docs/website/reference/*.md`,
  ];
  for (const pattern of patterns) {
    for (const filepath of globSync(pattern)) {
      if (filepath.endsWith("/template.md")) continue;
      const source = readFileSync(filepath, "utf8");
      const { data } = matter(source);
      const validation = data.validation
        ? ValidationSchema.safeParse(data.validation)
        : null;
      entries.push({
        path: filepath.replace(`${rootDir}/`, ""),
        validation: validation?.success ? validation.data : undefined,
        lastRevisedDate: extractLastRevisedDate(source),
      });
    }
  }
  return entries;
}

function extractLastRevisedDate(source: string): string | null {
  // Look for the most recent Revisions section header date.
  // Pattern: `**§N — YYYY-MM-DD — <label>**` per ADR-process convention.
  const matches = [...source.matchAll(/\*\*§\d+ — (\d{4}-\d{2}-\d{2}) —/g)];
  if (matches.length === 0) return null;
  const dates = matches.map((m) => m[1]);
  return dates.sort().pop() ?? null;
}
```

### Task 3.5: Wire the extractor into the build

**File:** `packages/astro/src/lib/pedagogy-index-extractor.ts`

After the chapter walk completes, append:

```typescript
const contractValidations = extractContractValidations(repoRoot);
indexAccumulator.setContractValidations(contractValidations);
```

(Implement the `setContractValidations` setter on the accumulator class following the existing pattern.)

### Task 3.6: e2e: audit reports V1 for an ADR with no validation block

**File:** `examples/smoke/e2e/validation-audit.spec.ts` (new)

```typescript
import { expect, test } from "@playwright/test";

test("V1 WARNING surfaces when an ADR is missing a validation block", async ({ page }) => {
  // Use the smoke project's audit endpoint or CLI invocation.
  // (Concrete invocation depends on Sophie's existing audit-e2e harness;
  //  follow the pattern from existing e2e specs.)
  // ...
});
```

(Lower priority for v1; the audit-invariant unit tests are the primary safety net.)

### Task 3.7: Commit PR 3

**Run:**

```bash
git checkout -b feat/validation-audit-invariants
git add packages/astro/src/lib/validation-extractor.ts \
  packages/astro/src/lib/pedagogy-audit.ts \
  packages/astro/src/lib/pedagogy-audit.test.ts \
  packages/astro/src/lib/pedagogy-index-extractor.ts \
  packages/core/src/schema/pedagogy-index.ts
git commit -m "..."
gh pr create --title "feat(astro): audit invariants V1-V7 (ADR 0056)" --body "..."
```

---

## PR 4 — MyST admonition plugin (per-page rendering + staleness)

**Branch:** `feat/validation-admonition-plugin`
**Files:**

- Create: `packages/astro/src/lib/validation-admonition-plugin.ts`
- Create: `packages/astro/src/lib/validation-admonition-plugin.test.ts`
- Modify: `docs/website/myst.yml` (register the plugin)
- Modify: `packages/theme/src/tokens.ts` (add validation-status palette)

### Task 4.1: Write failing tests for admonition rendering

**File:** `packages/astro/src/lib/validation-admonition-plugin.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import { renderValidationAdmonition } from "./validation-admonition-plugin";

describe("renderValidationAdmonition", () => {
  it("emits a validated admonition for status=validated", () => {
    const md = renderValidationAdmonition({
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [{ kind: "test", ref: "x.test.ts", date: "2026-05-12" }],
      },
      lastRevisedDate: null,
    });
    expect(md).toMatch(/:::\{admonition\}\s+Validation/);
    expect(md).toMatch(/:class:\s+validation-validated/);
    expect(md).toMatch(/Last validated.*2026-05-14/);
  });

  it("auto-flips to re-validation-needed when revisions post-date validation", () => {
    const md = renderValidationAdmonition({
      validation: {
        status: "validated",
        last_validated_date: "2026-04-30",
        evidence: [],
      },
      lastRevisedDate: "2026-05-15",
    });
    expect(md).toMatch(/:class:\s+validation-re-validation-needed/);
    expect(md).toMatch(/Revised after validation/);
  });

  it("emits unvalidated admonition for missing block", () => {
    const md = renderValidationAdmonition({ validation: undefined, lastRevisedDate: null });
    expect(md).toMatch(/:class:\s+validation-unvalidated/);
  });

  it("respects SOPHIE_DOCS_INCLUDE_VALIDATION=0 by returning empty", () => {
    process.env.SOPHIE_DOCS_INCLUDE_VALIDATION = "0";
    const md = renderValidationAdmonition({
      validation: { status: "validated", last_validated_date: "2026-05-14", evidence: [] },
      lastRevisedDate: null,
    });
    expect(md).toBe("");
    delete process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;
  });
});
```

**Run:** `pnpm turbo run test --filter=@sophie/astro -- validation-admonition-plugin.test.ts`
**Expected:** FAIL — module not found.

### Task 4.2: Implement the admonition renderer

**File:** `packages/astro/src/lib/validation-admonition-plugin.ts`

```typescript
import type { Validation } from "@sophie/core/schema";

interface RenderInput {
  validation: Validation | undefined;
  lastRevisedDate: string | null;
}

export function renderValidationAdmonition({ validation, lastRevisedDate }: RenderInput): string {
  if (process.env.SOPHIE_DOCS_INCLUDE_VALIDATION === "0") return "";

  // Default to unvalidated if no block
  if (!validation) {
    return [
      ":::{admonition} Validation",
      ":class: validation-unvalidated",
      "- **Status:** unvalidated",
      "- **Last validated:** —",
      "- **Evidence:** —",
      ":::",
      "",
    ].join("\n");
  }

  // Auto-flip to re-validation-needed
  const renderedStatus = computeRenderedStatus(validation, lastRevisedDate);
  const className = `validation-${renderedStatus}`;
  const staleNote =
    renderedStatus === "re-validation-needed" && validation.status === "validated"
      ? `\n- **Revised after validation:** ${lastRevisedDate}`
      : "";

  const evidenceLine = formatEvidenceLine(validation.evidence);
  const lastValidatedLine = validation.last_validated_date
    ? `- **Last validated:** ${validation.last_validated_date}`
    : "- **Last validated:** —";
  const notesLine = validation.notes ? `- **Notes:** ${validation.notes}` : "";

  return [
    ":::{admonition} Validation",
    `:class: ${className}`,
    `- **Status:** ${renderedStatus}`,
    lastValidatedLine,
    evidenceLine,
    staleNote,
    notesLine,
    ":::",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function computeRenderedStatus(v: Validation, lastRevisedDate: string | null): string {
  if (v.status !== "validated") return v.status;
  if (!lastRevisedDate || !v.last_validated_date) return "validated";
  if (lastRevisedDate > v.last_validated_date) return "re-validation-needed";
  return "validated";
}

function formatEvidenceLine(evidence: Validation["evidence"]): string {
  if (evidence.length === 0) return "- **Evidence:** —";
  const items = evidence.map((ev) => {
    if (ev.ref === null && ev.date === null) return `⏸ ${ev.kind} (deferred)`;
    if (ev.date === null) return `? ${ev.kind}`;
    return `✓ ${ev.kind} (${ev.date})`;
  });
  return `- **Evidence:** ${items.join(" · ")}`;
}
```

**Run:** `pnpm turbo run test --filter=@sophie/astro -- validation-admonition-plugin.test.ts`
**Expected:** PASS.

### Task 4.3: Add status palette to `@sophie/theme`

**File:** `packages/theme/src/tokens.ts`

Add (following existing token-shape):

```typescript
export const validationStatusTokens = {
  "validation-unvalidated-bg": /* token ref */,
  "validation-unvalidated-stripe": /* token ref */,
  "validation-in-progress-bg": /* token ref */,
  "validation-in-progress-stripe": /* token ref */,
  "validation-validated-bg": /* token ref */,
  "validation-validated-stripe": /* token ref */,
  "validation-re-validation-needed-bg": /* token ref */,
  "validation-re-validation-needed-stripe": /* token ref */,
};
```

Add corresponding CSS class rules in `packages/astro/src/styles/textbook-layout.css`.

### Task 4.4: Wire the plugin into MyST build

Register the plugin in `docs/website/myst.yml` so it runs during the transform phase.

### Task 4.5: e2e: render an ADR with a validated admonition

**File:** `examples/smoke/e2e/validation-admonition.spec.ts` (new)

```typescript
import { expect, test } from "@playwright/test";

test("validated admonition renders with green stripe", async ({ page }) => {
  await page.goto("/decisions/0007-persistence-indexeddb/");
  const admonition = page.locator(".validation-validated");
  await expect(admonition).toBeVisible();
  await expect(admonition).toContainText("Status: validated");
});

test("admonition is hidden when SOPHIE_DOCS_INCLUDE_VALIDATION=0", async ({ page }) => {
  // Set in test env; verify omitted.
  // ...
});
```

### Task 4.6: axe-core test

**File:** `packages/astro/src/lib/validation-admonition-plugin.test.tsx` (or extend existing)

Verify the rendered admonition passes axe-core with no violations.

### Task 4.7: Commit PR 4

```bash
git checkout -b feat/validation-admonition-plugin
git add packages/astro/src/lib/validation-admonition-plugin.ts \
  packages/astro/src/lib/validation-admonition-plugin.test.ts \
  packages/astro/src/styles/textbook-layout.css \
  packages/theme/src/tokens.ts \
  docs/website/myst.yml \
  examples/smoke/e2e/validation-admonition.spec.ts
git commit -m "..."
gh pr create --title "feat(astro): MyST validation admonition plugin (ADR 0056 Decision 4)" --body "..."
```

---

## PR 5 — Vite index plugin

**Branch:** `feat/validation-index-page`
**Files:**

- Create: `packages/astro/src/lib/validation-index-generator.ts`
- Create: `packages/astro/src/lib/validation-index-generator.test.ts`
- Modify: `packages/astro/src/integration.ts` (or wherever the Vite plugins register; verify exact path)
- Modify: `docs/website/myst.yml` (add `status/validation.md` to the toc with `private: true` tag)

### Task 5.1: Write failing tests for index generation

```typescript
describe("generateValidationIndex", () => {
  it("emits a summary table with status counts", () => {
    const md = generateValidationIndex({
      contractValidations: [
        { path: "...0001.md", validation: { status: "validated", ... }, lastRevisedDate: null },
        { path: "...0002.md", validation: { status: "unvalidated", ... }, lastRevisedDate: null },
      ],
    });
    expect(md).toMatch(/\| Validated\s+\|\s+1\s+\|/);
    expect(md).toMatch(/\| Unvalidated\s+\|\s+1\s+\|/);
  });

  it("cross-tabulates evidence kinds", () => {
    // ...
  });

  it("lists every contract with link + status + last_validated_date", () => {
    // ...
  });

  it("returns empty when SOPHIE_DOCS_INCLUDE_VALIDATION=0", () => {
    // ...
  });
});
```

### Task 5.2: Implement the index generator

Implementation follows the existing pagefind-postbuild.ts pattern. Walk the `contractValidations` field on the populated pedagogy index; aggregate counts; emit `docs/website/status/validation.md`.

### Task 5.3: Wire into the Vite plugin pipeline

The plugin runs at build-end (after all extractors have populated the index); emits the generated `.md` file to the output directory.

### Task 5.4: Mark page private in myst.yml

```yaml
- file: status/validation.md
  tags: [private]
```

The MyST config's `excludeTagged: [private]` flag (added in Task 6.1) keeps it out of the public build.

### Task 5.5: e2e for the index page

Render the index page in local dev (with the flag on); verify summary table accuracy against the fixture frontmatter.

### Task 5.6: Commit PR 5

---

## PR 6 — Reference doc + curated initial-pass + promote V1/V2 to ERROR

**Branch:** `feat/validation-reference-doc-and-initial-pass`
**Files:**

- Create: `docs/website/reference/validation-tracker.md`
- Modify: ~20 substantial ADRs/reference docs with curated initial-pass validation state (the contracts that have real evidence today; e.g., ADRs 0001/0004/0007/0029/0038, ADRs 0040–0046 with `status: in-progress` due to docs-only shipping, etc.)
- Modify: `packages/astro/src/lib/pedagogy-audit.ts` (promote V1+V2 from WARNING to ERROR)
- Modify: `docs/website/myst.yml` (add reference doc to toc)

### Task 6.1: Author the companion reference doc

`reference/validation-tracker.md` specs the frontmatter schema, the admonition rendering contract, the audit invariants V1–V7, and migration guidance for new ADRs. Follow the shape of `reference/pedagogy-contract-schema.md`.

### Task 6.2: Curated initial-pass

Work through ~20 substantial contracts; assign accurate initial status + evidence per the kind enum. Use AI authoring (`chapter-drafter` skill style) to draft entries; Anna reviews + approves each.

Example for ADR 0007:

```yaml
validation:
  status: validated
  last_validated_date: 2026-05-14
  evidence:
    - kind: test
      ref: packages/components/src/runtime/useInteractive.test.ts
      date: 2026-05-12
      notes: "Covers IndexedDB write/read cycle + MemoryResponseStore fallback + BroadcastChannel LWW"
    - kind: chapter
      ref: examples/smoke/src/content/modules/m1/c1-measuring-the-sky.mdx
      date: 2026-05-14
      notes: "1198-line real chapter; exercises Predict + Reflection + ComprehensionGate persistence"
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: 2026-05-15
      notes: "D1 boundary purity = 20/20; D4 type safety = 20/20"
  notes: "Build-time + smoke-environment validation complete; multi-cohort outcomes deferred to B9."
```

### Task 6.3: Promote V1+V2 to ERROR

Update the audit invariants V1+V2 from WARNING → ERROR severity. The build now fails for any unblocked ADR/reference doc — the bulk migration in PR 2 ensures this is achievable.

### Task 6.4: Commit PR 6

---

## End-of-plan checklists

### Acceptance criteria (whole tracker)

- [ ] All ~74 ADRs + reference docs carry a `validation:` frontmatter block.
- [ ] The per-page admonition renders at the top of each contract page (local dev with flag on).
- [ ] `/status/validation/` index page lists every contract with status + last_validated_date + evidence kinds.
- [ ] V1–V7 audit invariants fire correctly against fixture frontmatter; V1+V2 are ERROR-grade post-PR-6.
- [ ] `SOPHIE_DOCS_INCLUDE_VALIDATION=0` (or default) excludes both the per-page admonition and the index page from rendered output; data layer (frontmatter) always present.
- [ ] Self-referential: ADR 0056 + `reference/validation-tracker.md` carry their own validation blocks and graduate from `in-progress` to `validated` post-PR-6 spot-check.

### Open implementation questions for follow-up

- Build-flag mechanism precise wiring (env var vs MyST tag exclusion vs both).
- Exact MyST plugin registration path (verify `docs/website/myst.yml` plugin field shape).
- Whether to ship `:::{validation}` as a custom directive name or stay with `:::{admonition} Validation`.
- Index-page toc placement (Status section sibling vs new section).

### Skill handoff

Execution-time skill: **superpowers:executing-plans** picks this plan up task-by-task. Per-PR review uses **superpowers:requesting-code-review** dispatching superpowers:code-reviewer between PRs. Verification before completion uses **superpowers:verification-before-completion** — every step's expected-output assertion is the verification gate.

---

## References

- [ADR 0056](../website/decisions/0056-validation-tracker.md) — the contract this plan implements.
- [Validation tracker design doc](2026-05-15-validation-tracker-design.md) — full design + frontmatter schema + plugin architecture.
- [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md) — pattern this plan follows.
- [packages/astro/src/lib/pedagogy-audit.ts](../../packages/astro/src/lib/pedagogy-audit.ts) — existing audit pattern V1–V7 extend.
- [packages/astro/src/lib/pedagogy-index-extractor.ts](../../packages/astro/src/lib/pedagogy-index-extractor.ts) — existing extractor pattern the contract-validations extractor mirrors.
