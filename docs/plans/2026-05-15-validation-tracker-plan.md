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

| PR | Scope | Status |
|---|---|---|
| **PR 1** | Zod schema in `@sophie/core/schema/validation.ts` | ✅ Merged 2026-05-15 (#43, `ad0a13d`) |
| **PR 2** | Bulk migration — default `validation: { status: "unvalidated" }` block on all ~74 ADRs + reference docs | ✅ Merged 2026-05-15 (#44, `faf041c`) |
| **PR 4** | MyST admonition plugin (per-page rendering + staleness detection), gated behind `SOPHIE_DOCS_INCLUDE_VALIDATION` flag | ✅ Merged 2026-05-15 (#50, `47f6e5c`, replaces auto-closed #46) |
| **PR 3** | Audit invariants V1–V7 in `pedagogy-audit.ts` (initially WARNING-grade across the board) | ⏳ Pending |
| **PR 5** | Vite index plugin (generated `/status/validation/` page), same build flag | ⏳ Pending |
| **PR 6** | Reference doc `reference/validation-tracker.md` + curated initial-pass migration that lifts substantial contracts to actual current state; promote V1/V2 invariants WARNING → ERROR | ⏳ Pending |

**Merge order**: PRs 1/2/4 landed on 2026-05-15 in the order #43 → #44 → #50. PR 4 was reordered ahead of PR 3 per a code-review recommendation (the original "collapse warn-flood" rationale turned out to be moot — mystmd 1.9 silently accepts unknown frontmatter keys, so the warn-flood never appeared — but PR 4 first still gave faster review on the rendered surface).

---

## Progress (2026-05-15)

### Today's landings

- **PR #43 (validation schema)** — 21 unit tests (`it.each` expanded from the plan's predicted 14); biome 0/0; cross-field refinement V3 at schema layer enforced.
- **PR #44 (bulk migration)** — 77 contract files migrated (55 ADRs + 22 reference docs, excluding `template.md`); the plan's "~74" was a soft estimate. gray-matter added as root devDep. **Roundtrip side-effects accepted**: `date: YYYY-MM-DD` → `date: YYYY-MM-DDT00:00:00.000Z` and inline `tags: [a, b, c]` → block-style lists; semantically equivalent; YAGNI to round-trip-preserve for a one-shot script.
- **Direct-to-main follow-up (`8e7df6f`)** — closed PR 2's code review Important #1: `decisions/template.md` + `contributing/adr-process.md` now include `validation:` in the documented frontmatter shape so new ADRs ship correctly. Cherry-picked to main per `feedback_branch_pr_scope` docs convention.
- **PR #50 (admonition plugin)** — 34 new tests (12 renderer + 5 builder + 5 isContractFile + 5 staleness + 4 axe-core + 1 integration); biome 0/0; staleness detection matches both Revisions shapes (canonical `**§N — date —**` + H2-inline `## Revisions (date — …)`). Theme palette extended with `info` + `neutral` status anchors (brand-teal + slate-gray); 8 new validation-status CSS vars via color-mix. Replaces auto-closed #46 (closed when its base branch `feat/validation-schema` was deleted on PR #43 merge).

### Parallel-track work that landed in main today (affects remaining PRs)

Anna ran a parallel session shipping Phase 3 first moves identified by the Bucket B+C audit:

- **PR #45** (`d390d5a`) — `@sophie/cli` carve-out as its own package.
- **PR #47** (`6821b11`) — emits `dist/.sophie/pedagogy-index.json` at build time. **Relevant to PR 5**: the Vite plugin should consume this JSON rather than re-walking frontmatter (DRY with #47's extraction).
- **PR #48** (`de8b1ec`) — misconception graph fields + MG audit invariants in `pedagogy-audit.ts`. **Relevant to PR 3**: pedagogy-audit.ts has changed since the plan was written; PR 3 subagent must re-read the file in its current post-#48 state and integrate cleanly with the MG-family invariants.
- **PR #49** (`8248774`) — `chapter.status` frontmatter (`draft | review | stable`) + `get-student-chapters.ts` filter. **Relevant to PR 6**: ADR 0051 (chapter-level status) and ADR 0056 (contract-level validation) are sibling status surfaces; reference doc should note the distinction without conflating them.

### Code-review deferred items to fold into remaining PRs

**For PR 3** (from PR #43 review):

- **V4 implementation** at the audit layer ("unvalidated must be clean: empty evidence + null date"). Schema only enforces V3; V4 is the audit's job per ADR 0056 §"Audit / validation invariants".
- **V8 / V4b**: warn on unknown keys inside the `validation` block (Zod's default `.strip()` drops unknown keys silently). New audit invariant; INFO severity. Composes cleanly with the existing V1–V7 family.
- **Header comment** in `packages/core/src/schema/validation.ts` documenting the V3-here / V4-V7-audit split for future readers (optional cleanup).

**For PR 5 or PR 6** (from PR #50 review):

- **Integration-test coverage extension (I2)**: the existing integration test in PR 4 covers ADR 0007 only. Extend to assert every ADR + reference artifact carries a validation class.

**Follow-up issue, not blocking** (from PR #50 review I1):

- `docs/website/scripts/validation-admonition-plugin.mjs` imports `../../../packages/astro/dist/index.js`. Needs either turbo `dependsOn: ["@sophie/astro#build"]` or promoting `docs/website` to a workspace member. Track as a separate issue; not blocking PR 5.

### Mystmd warn-flood prediction (resolved)

The original plan + PR 2 reviewer predicted 77 "extra key ignored: validation" warnings between PR 2 (data lands) and PR 4 (renderer claims the key). **Never appeared**: mystmd 1.9 silently accepts unknown frontmatter keys without warning. Informational; no plan impact.

---

## PR 1 — Zod schema for validation block

**Status:** ✅ Merged 2026-05-15 as [#43](https://github.com/drannarosen/sophie/pull/43) (`ad0a13d`). 21 tests; biome 0/0; cross-field refinement V3 enforced. Tasks 1.1–1.5 below are kept as historical record of the TDD steps executed.

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

**Status:** ✅ Merged 2026-05-15 as [#44](https://github.com/drannarosen/sophie/pull/44) (`faf041c`). 77 files migrated (55 ADRs + 22 reference docs); idempotent; MyST build clean; biome 0/0 on the script. Code review surfaced template.md + adr-process.md gap which was closed in follow-up direct-to-main commit `8e7df6f`. Tasks 2.1–2.4 below are kept as historical record.

**Branch:** `feat/validation-bulk-migration`
**Files:**

- Modify: all `docs/website/decisions/NNNN-*.md` (55 files; plan estimated 54)
- Modify: all `docs/website/reference/*.md` (22 files; plan estimated ~20)
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

**Status:** ⏳ Pending — next in queue.

**Critical context** (not in original plan; folded in 2026-05-15 after PR 1 + PR 2 review + parallel-track merges; hardened 2026-05-15 evening after final pre-execution review):

- **PR #48 modified `pedagogy-audit.ts`** to add MG (misconception graph) audit invariants. **Re-read `pedagogy-audit.ts` in its current post-#48 state** before adding V1–V7. The validation invariants must integrate cleanly with the MG family; don't clobber the existing `runMisconceptionGraphInvariants` (or equivalent) function. Sibling-function pattern: `runValidationInvariants(index, repoRoot) → AuditFinding[]`.
- **Ship V0 — frontmatter parse failure (ERROR) — at the extractor layer.** When `ValidationSchema.safeParse(data.validation)` returns `success: false`, surface a `V0` finding with the Zod issue list. **Structurally necessary, not optional**: without V0, the original §3.4 extractor design silently turns invalid frontmatter into `validation: undefined`, which fires V1/V2 (missing block) instead of the real cause and renders V3/V5/V6 dead code at the audit layer. The extractor returns `ContractValidationEntry & { extractorFindings: AuditFinding[] }`; the audit merges those findings into its own report.
- **Ship V4** at the audit layer: "if status is `unvalidated`, then evidence is empty AND last_validated_date is null." ERROR severity. Catches the stale-half-filled-block failure mode (PR 1 reviewer's deferred item).
- **Ship V5 with correct path resolution.** Evidence refs in frontmatter are repo-root-relative (e.g., `packages/components/src/Predict.test.tsx`). The audit must resolve them via `path.resolve(repoRoot, ev.ref)` before `existsSync`. Thread `repoRoot` through `runPedagogyAudit` (cleanest) or pre-resolve at extraction time and store both raw + resolved paths on the entry.
- **Ship V8 (unknown-key warning) at the extractor.** Schema strips unknown keys silently (Zod 4 `z.object()` defaults to `.strip()`); audit-layer alone cannot see them. Pattern: at the extractor, after `gray-matter` returns the raw block as `Record<string, unknown>`, parse with the schema AND diff `Object.keys(rawBlock)` against `new Set(["status", "last_validated_date", "evidence", "notes"])`. Emit one INFO finding per unknown key. Catches typos like `last_validation_date` (missing "ed") or `evidence_summary`. **Severity:** INFO — must not break CI (verify `auditExitCode` ignores INFO before merging).
- **Keep V3 at audit layer as defense-in-depth.** Once V0 lands, schema-rejected frontmatter never reaches the audit, so V3 becomes redundant for normal extraction. Keep it with a comment: `// Defense-in-depth: schema rejects this case at parse time (see V0); guard against future audit inputs that bypass the extractor (e.g., direct test fixtures).`
- **Use `.readonly()` on `contractValidations`** in `PedagogyIndexSchema` for consistency with `definitions`, `equations`, `keyInsights`, etc.: `z.array(ContractValidationEntrySchema).readonly().default([])`.
- **Mirror existing extractor I/O pattern.** Use `node:fs/promises` async walks as in `pedagogy-index-extractor.ts`, not `globSync` from `node:fs`. Keeps the codebase coherent.
- **Eliminate all `as unknown as Validation` casts in tests.** Two clean alternatives: (a) construct test fixtures as `ContractValidationEntry` with `validation: unknown` so the audit/extractor accepts raw input gracefully; (b) make the extractor the unit-under-test for V0/V3/V8 fixtures (since that's where raw frontmatter actually enters), and reserve audit tests for invariants that probe already-typed `Validation` shapes (V4/V5/V6/V7).
- **Optional header comment** in `packages/core/src/schema/validation.ts` documenting the V3-here / V0–V8-audit split for future readers (PR 1 reviewer suggested).

**Branch:** `feat/validation-audit-invariants`
**Files:**

- Modify: `packages/astro/src/lib/pedagogy-audit.ts`
- Modify: `packages/astro/src/lib/pedagogy-audit.test.ts`
- Modify: `packages/core/src/schema/pedagogy-index.ts` (add `contractValidations` field)
- Modify: `packages/core/src/schema/validation.ts` (optional header comment)

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
  contractValidations: z.array(ContractValidationEntrySchema).readonly().default([]),
  // V0/V8 findings collected by the extractor (parse failures + unknown
  // keys) — surfaced into the audit report alongside V1–V7. Sibling
  // shape to `contractValidations` so the audit can merge in one pass.
  extractorFindings: z.array(/* AuditFinding schema or InlineRefKind-style enum-tagged shape */).readonly().default([]),
});
```

### Task 3.2: Write failing audit + extractor tests, split by layer

**Layer split (per 2026-05-15 hardening review):**

- **Extractor-side tests** (`validation-extractor.test.ts`) cover invariants that consume *raw frontmatter*: **V0** (schema parse failure) and **V8** (unknown key inside the `validation` block). These need raw `Record<string, unknown>` input and would otherwise force `as unknown as Validation` casts at the audit layer.
- **Audit-side tests** (`pedagogy-audit.test.ts`) cover invariants that consume *already-typed* `Validation`: **V1, V2** (missing-block on typed `validation: undefined`), and **V3–V7** (per-field invariants on a typed `Validation`). No casts needed.

This split is the SoTA shape (extractor owns parse-error responsibility; audit owns invariant responsibility) and incidentally eliminates every `as unknown as Validation` cast.

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
    const report = runPedagogyAudit(index, { repoRoot: REPO_ROOT });
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
    const report = runPedagogyAudit(index, { repoRoot: REPO_ROOT });
    expect(report.warnings).toContainEqual(
      expect.objectContaining({ code: "V2" }),
    );
  });

  it("V3: ERROR when status=validated but last_validated_date is null (defense-in-depth)", () => {
    // Defense-in-depth: schema-layer refinement (PR 1) catches this
    // before V3 ever sees it, and extractor V0 surfaces parse failures.
    // V3 fires only on inputs that bypassed both — kept as a safety net.
    //
    // Test fixture constructs a ContractValidationEntry directly (not
    // via the schema), bypassing V0 — i.e., simulating a future bug
    // where the extractor pipeline lets a malformed entry through.
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: { status: "validated", last_validated_date: null, evidence: [], notes: undefined },
      lastRevisedDate: null,
    };
    const index = makeIndex({ contractValidations: [entry] });
    const report = runPedagogyAudit(index, { repoRoot: REPO_ROOT });
    expect(report.errors).toContainEqual(
      expect.objectContaining({ code: "V3" }),
    );
  });

  // ... V4, V5, V6, V7 follow the same pattern, all on typed Validation
  //     fixtures. V5 fixtures construct refs relative to a tmp REPO_ROOT
  //     so existsSync(path.resolve(REPO_ROOT, ev.ref)) can hit/miss
  //     deterministically.
});
```

**File:** `packages/astro/src/lib/validation-extractor.test.ts` (new — covers V0 + V8)

```typescript
describe("extractContractValidations", () => {
  it("V0: surfaces ERROR finding when the validation block fails schema parse", async () => {
    const tmpRoot = await makeTmpRepoWithContract({
      path: "docs/website/decisions/0099-broken.md",
      frontmatter: { validation: { status: "validated", last_validated_date: null, evidence: [] } },
      // schema rejects: status=validated but last_validated_date=null
    });
    const { entries, findings } = await extractContractValidations(tmpRoot);
    expect(entries[0].validation).toBeUndefined();
    expect(findings).toContainEqual(
      expect.objectContaining({ code: "V0", severity: "ERROR" }),
    );
  });

  it("V8: surfaces INFO finding for unknown keys inside the validation block", async () => {
    const tmpRoot = await makeTmpRepoWithContract({
      path: "docs/website/decisions/0099-typo.md",
      frontmatter: {
        validation: {
          status: "unvalidated",
          last_validated_date: null,
          evidence: [],
          last_validation_date: "2026-05-14",  // typo: missing "ed"
        },
      },
    });
    const { findings } = await extractContractValidations(tmpRoot);
    expect(findings).toContainEqual(
      expect.objectContaining({ code: "V8", severity: "INFO", message: expect.stringContaining("last_validation_date") }),
    );
  });
});
```

**Run:**

```bash
pnpm turbo run test --filter=@sophie/astro -- pedagogy-audit.test.ts validation-extractor.test.ts
```

**Expected:** FAIL — V0–V8 audit + extractor checks not yet implemented.

### Task 3.3: Implement audit invariants V1–V7 (with V0 + V8 merging in from extractor)

**File:** `packages/astro/src/lib/pedagogy-audit.ts`

Two changes to `runPedagogyAudit`:

1. **Threading `repoRoot`** so V5 can resolve evidence refs (which are repo-root-relative). Extend the existing call signature with an options bag: `runPedagogyAudit(index, opts: { repoRoot: string })`. All existing callers pass `process.cwd()` or the consumer-app dir; verify call-site impact during execution.
2. **Merging extractor findings** — the new `index.extractorFindings` (V0 + V8) flow straight into the merged report at the top of `runPedagogyAudit` before sibling `runValidationInvariants` runs.

```typescript
import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

interface RunOptions {
  repoRoot: string;
}

function runValidationInvariants(index: PedagogyIndex, opts: RunOptions): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const entry of index.contractValidations) {
    // V1: ADR missing validation block
    if (
      !entry.validation &&
      entry.path.startsWith("docs/website/decisions/") &&
      !entry.path.endsWith("/template.md")
    ) {
      findings.push({
        severity: "WARNING",  // PR 6 promotes to ERROR
        code: "V1",
        message: `ADR is missing a validation block: ${entry.path}`,
        location: { chapter: entry.path },
      });
    }

    // V2: reference doc missing validation block
    if (!entry.validation && entry.path.startsWith("docs/website/reference/")) {
      findings.push({
        severity: "WARNING",  // PR 6 promotes to ERROR
        code: "V2",
        message: `Reference doc is missing a validation block: ${entry.path}`,
        location: { chapter: entry.path },
      });
    }

    if (!entry.validation) continue;
    const v = entry.validation;

    // V3: validated/re-validation-needed must have a date.
    //
    // Defense-in-depth: schema-layer refinement (PR 1) catches this at
    // parse time, and extractor V0 surfaces parse failures explicitly.
    // V3 fires only on inputs that bypassed both — kept as a safety net
    // for direct ContractValidationEntry construction (tests, future
    // synthesizers).
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

    // V5: evidence refs must resolve. Refs are repo-root-relative;
    // resolve against opts.repoRoot before existence-check. Deferred
    // null refs are intentionally tolerated (PR 1 schema decision).
    for (const ev of v.evidence) {
      if (ev.ref !== null && !existsSync(resolvePath(opts.repoRoot, ev.ref))) {
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

    // V7: last_validated_date must not be in the future. Date-only ISO
    // string compares against today's date-only ISO — TZ-stable.
    if (v.last_validated_date !== null && v.last_validated_date > todayIsoDate()) {
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

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
```

Inside `runPedagogyAudit`, near the existing invariant-runner calls:

```typescript
// V0 + V8 — surfaced by the extractor, flow straight into the report.
report.findings.push(...index.extractorFindings);
// V1–V7 — audit-layer invariants on typed contractValidations.
report.findings.push(...runValidationInvariants(index, opts));
```

**Run:** `pnpm turbo run test --filter=@sophie/astro -- pedagogy-audit.test.ts`
**Expected:** PASS — V1–V7 tests green.

### Task 3.4: Add contract-validations extractor (with V0 + V8 surfacing)

**Three responsibilities** (per the 2026-05-15 hardening review):

1. Walk `decisions/*.md` + `reference/*.md` and build `ContractValidationEntry[]`.
2. **V0 — surface schema-parse failures** as ERROR findings (don't silently swallow them into `validation: undefined`).
3. **V8 — surface unknown keys** inside the `validation` block as INFO findings.

Returns `{ entries: ContractValidationEntry[]; findings: AuditFinding[] }`. The `findings` array flows into `PedagogyIndex.extractorFindings`; the audit merges them into its report in §3.3.

**File:** `packages/astro/src/lib/validation-extractor.ts` (new)

```typescript
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import matter from "gray-matter";
import { ValidationSchema } from "@sophie/core/schema";
import type {
  AuditFinding,
  ContractValidationEntry,
} from "@sophie/core/schema";

const KNOWN_VALIDATION_KEYS = new Set([
  "status",
  "last_validated_date",
  "evidence",
  "notes",
]);

const CONTRACT_DIRS = [
  "docs/website/decisions",
  "docs/website/reference",
] as const;

export async function extractContractValidations(rootDir: string): Promise<{
  entries: ContractValidationEntry[];
  findings: AuditFinding[];
}> {
  const entries: ContractValidationEntry[] = [];
  const findings: AuditFinding[] = [];

  for (const subdir of CONTRACT_DIRS) {
    const absDir = join(rootDir, subdir);
    const files = (await readdir(absDir)).filter((name) =>
      name.endsWith(".md") && name !== "template.md",
    );
    for (const name of files) {
      const filepath = join(absDir, name);
      const source = await readFile(filepath, "utf8");
      const { data } = matter(source);
      const relPath = relative(rootDir, filepath);

      const rawBlock = data.validation as Record<string, unknown> | undefined;
      let validation: ContractValidationEntry["validation"];
      if (rawBlock) {
        const parsed = ValidationSchema.safeParse(rawBlock);
        if (parsed.success) {
          validation = parsed.data;
        } else {
          // V0: surface schema-parse failures (don't silently swallow)
          findings.push({
            severity: "ERROR",
            code: "V0",
            message: `${relPath}: validation block failed schema parse: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
            location: { chapter: relPath },
          });
          validation = undefined;
        }

        // V8: warn on unknown keys (Zod 4's z.object() defaults to
        // .strip() — would otherwise silently drop them).
        for (const key of Object.keys(rawBlock)) {
          if (!KNOWN_VALIDATION_KEYS.has(key)) {
            findings.push({
              severity: "INFO",
              code: "V8",
              message: `${relPath}: validation block has unknown key '${key}' (did you mean one of: status, last_validated_date, evidence, notes?)`,
              location: { chapter: relPath },
            });
          }
        }
      }

      entries.push({
        path: relPath,
        validation,
        lastRevisedDate: extractLastRevisedDate(source),
      });
    }
  }

  return { entries, findings };
}

function extractLastRevisedDate(source: string): string | null {
  // Look for the most recent Revisions section header date.
  // Two shapes (matching PR #50's staleness detector):
  //   - canonical: `**§N — YYYY-MM-DD — <label>**`
  //   - H2-inline: `## Revisions (YYYY-MM-DD — …)`
  const pattern = /(?:\*\*§\d+ — (\d{4}-\d{2}-\d{2}) —|## Revisions \((\d{4}-\d{2}-\d{2}))/g;
  const dates: string[] = [];
  for (const match of source.matchAll(pattern)) {
    dates.push(match[1] ?? match[2]);
  }
  if (dates.length === 0) return null;
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

**Status:** ✅ Merged 2026-05-15 as [#50](https://github.com/drannarosen/sophie/pull/50) (`47f6e5c`, replaces auto-closed #46). 34 new tests (renderer + AST builder + isContractFile + staleness + axe-core + integration); biome 0/0. Theme palette extended with `info` + `neutral` status anchors (brand-teal + slate-gray) — code review found this defensible (no conflict with existing `Callout.info` mapping; reversible). Two follow-up items for PR 5/6: build-order I1 (turbo dependsOn or workspace-promote `docs/website`) + integration-test I2 (extend to every ADR + reference doc). Tasks 4.1–4.7 below are kept as historical record.

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

**Status:** ⏳ Pending — runs after PR 3.

**Critical context** (not in original plan; folded in 2026-05-15 after parallel-track merges; hardened 2026-05-15 evening after final pre-execution review):

- **Consume the in-memory snapshot, not the JSON file on disk.** PR #47 (`6821b11`) wires JSON emission inside `packages/astro/src/lib/pagefind-postbuild.ts` (the postbuild orchestrator) via `indexAccumulator.asPedagogyIndex()` + a new `writePedagogyIndexJson` helper. **PR 5 should hook into `pagefind-postbuild.ts` right next to that JSON write**, consuming the same in-memory snapshot directly and emitting `docs/website/status/validation.md` as a sibling postbuild output. No disk round-trip; one extractor pipeline produces both artifacts. This is more DRY than the original "re-read the JSON" framing and keeps PR 5 + #47 conceptually paired.
- **Add `extractorFindings` to the JSON.** PR 3 introduced a sibling `index.extractorFindings` field for V0/V8. Verify #47's JSON serializer includes it (it should — `JSON.stringify` walks the full `PedagogyIndex`); spot-check the emitted JSON's keys during PR 5 implementation.
- **Index page path: `/status/validation/`** as sibling to `/status/roadmap/`. Established convention in `docs/website/status/`.
- **Extend the integration test from PR 4 (I2)**: assert every ADR + reference doc artifact carries a `validation-*` class in the rendered output. Land this in PR 5 alongside the index-page rendering test, or in PR 6 with the curated-pass changes — subagent decides based on scope; **must report the decision in the PR description**.

**Branch:** `feat/validation-index-page`
**Files:**

- Create: `packages/astro/src/lib/validation-index-generator.ts`
- Create: `packages/astro/src/lib/validation-index-generator.test.ts`
- Modify: `packages/astro/src/integration.ts` (or wherever the Vite plugins register; verify exact path)
- Modify: `docs/website/myst.yml` (add `status/validation.md` to the toc with `private: true` tag)
- Possibly modify: `packages/astro/src/lib/pedagogy-index-*` to extend the emitted JSON with `contractValidations`

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

Pure function: `generateValidationIndex(index: PedagogyIndex): string` returns the Markdown body. Walk `index.contractValidations`; aggregate counts; surface `index.extractorFindings` summary (count of V0 + V8 findings); emit a Markdown body that becomes `docs/website/status/validation.md`.

### Task 5.3: Wire into `pagefind-postbuild.ts` next to the JSON write

PR #47 (`6821b11`) wires the JSON emission inside `packages/astro/src/lib/pagefind-postbuild.ts` via `indexAccumulator.asPedagogyIndex()` + the new `writePedagogyIndexJson` helper. **PR 5 hooks in right there** — sibling helper `writeValidationIndexMarkdown(snapshot, outDir)` that consumes the same in-memory snapshot already used by the JSON write. No disk round-trip; both artifacts come from one extraction pass.

Concrete shape (sketch):

```typescript
// packages/astro/src/lib/pagefind-postbuild.ts (extension)
const snapshot = indexAccumulator.asPedagogyIndex();
await writePedagogyIndexJson(snapshot, outDir);                  // PR #47
if (process.env.SOPHIE_DOCS_INCLUDE_VALIDATION !== "0") {
  await writeValidationIndexMarkdown(snapshot, sophieRoot);      // PR 5
}
```

The validation Markdown lands at `docs/website/status/validation.md` (NOT in the build output; checked-in-but-private-tagged per Task 5.4). The `SOPHIE_DOCS_INCLUDE_VALIDATION=0` gate matches PR #50's admonition flag for symmetry.

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

**Status:** ⏳ Pending — runs after PR 5.

**Critical context** (not in original plan; folded in 2026-05-15 after parallel-track merges; hardened 2026-05-15 evening after final pre-execution review):

- **Expanded curated-initial-pass scope**: substantial contracts now include the newly-shipped Phase 3 ADRs Anna landed in parallel today. Suggested list for the initial pass — adjust per actual evidence:
  - **Foundation primitives** (high test + chapter coverage): ADRs 0001, 0002, 0003, 0004, 0007, 0011, 0013, 0014, 0029, 0038. Many ship `kind: test + chapter`.
  - **LDS foundation tranche, docs-only**: ADRs 0040–0046 with `status: in-progress` (contracts spec'd, code partially shipped). #44 (misconception graph fields, ADR 0044), #45 (sophie/cli carve-out), #47 (pedagogy-index JSON, ADR 0045), #48 (MG audit invariants), #49 (chapter.status, ADR 0051) all advanced the implementation today.
  - **Validation tracker itself** (ADR 0056): self-referential. Set to `in-progress` until PR 6 closes; promote to `validated` once curated initial-pass + spot-check completes.
- **ADR 0051 (chapter.status) ↔ ADR 0056 (validation status) distinction**: these are sibling status surfaces — chapter-level vs contract-level. The new reference doc `reference/validation-tracker.md` should note this in a "See also" or comparison block so future readers don't conflate them.
- **Promote V1 + V2 WARNING → ERROR** after the bulk migration is verified clean (which it is — PR #44 covered all 77 contracts). Update `pedagogy-audit.ts` severity tables in this PR.
- **Confirm V8 (INFO) is non-blocking in CI** before merging. Spot-check `auditExitCode(report)` in `pedagogy-audit.ts:558` — it must return 0 when only INFO findings are present, since V8 will fire frequently as authors typo or experiment with new keys and must not break the build. If it doesn't already, fix the severity table OR fix `auditExitCode`. (CLAUDE.md principle: warnings are signal, errors block.)

**Branch:** `feat/validation-reference-doc-and-initial-pass`
**Files:**

- Create: `docs/website/reference/validation-tracker.md`
- Modify: ~20–25 substantial ADRs/reference docs with curated initial-pass validation state (see expanded list above)
- Modify: `packages/astro/src/lib/pedagogy-audit.ts` (promote V1+V2 from WARNING to ERROR)
- Modify: `docs/website/decisions/0056-validation-tracker.md` (its own validation block — `in-progress` → `validated` after spot-check)
- Modify: `docs/website/myst.yml` (add reference doc to toc)

### Task 6.1: Author the companion reference doc

`reference/validation-tracker.md` specs the frontmatter schema, the admonition rendering contract, the audit invariants V1–V7, and migration guidance for new ADRs. Follow the shape of `reference/pedagogy-contract-schema.md`.

### Task 6.2: Curated initial-pass

Work through ~20 substantial contracts; assign accurate initial status + evidence per the kind enum.

**Drafting workflow per contract** (replacing earlier mention of a `chapter-drafter` skill that is not in the available-skills list):

1. Read the contract (ADR or reference doc) end-to-end.
2. Identify shipped evidence via:
   - `git log --oneline --all -- <ref-candidate>` to confirm test files / chapter files were authored.
   - `grep -rn "<contract-key>"` for citations in code, tests, or smoke chapters.
   - `docs/reviews/*.md` for review-kind evidence.
3. Draft the validation block following the ADR 0007 example below; assign status conservatively (prefer `in-progress` over `validated` when in doubt).
4. **HITL gate per CLAUDE.md mandate**: Anna reviews each block before commit — no batch-blind drafting. The curated initial-pass is the canonical assertion that contract claims match shipped reality; it should not be autonomously generated and merged.

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

- [x] All ADRs + reference docs carry a `validation:` frontmatter block. **77 contracts via PR #44** (plan estimated ~74).
- [x] The per-page admonition renders at the top of each contract page (local dev with flag on). **Shipped via PR #50.**
- [x] `SOPHIE_DOCS_INCLUDE_VALIDATION=0` excludes the per-page admonition from rendered output; data layer (frontmatter) always present. **Shipped via PR #50.**
- [ ] `/status/validation/` index page lists every contract with status + last_validated_date + evidence kinds. **PR 5 ships this.**
- [ ] V1–V7 audit invariants fire correctly against fixture frontmatter; V1+V2 are ERROR-grade post-PR-6. **PR 3 ships V1–V7 (initially WARNING); PR 6 promotes V1+V2 to ERROR.**
- [ ] `SOPHIE_DOCS_INCLUDE_VALIDATION=0` excludes the index page too. **PR 5 ships this.**
- [ ] Self-referential: ADR 0056 + `reference/validation-tracker.md` carry their own validation blocks and graduate from `in-progress` to `validated` post-PR-6 spot-check. **PR 6.**

### Open implementation questions — resolved by execution

- ~~Build-flag mechanism precise wiring~~ → **Resolved:** env var `SOPHIE_DOCS_INCLUDE_VALIDATION=0` suppresses admonition (PR #50). PR 5 will use the same flag for the index page.
- ~~Exact MyST plugin registration path~~ → **Resolved:** PR #50 registered the plugin in `docs/website/myst.yml` via the `plugins:` field; concrete shape locked.
- ~~Whether to ship `:::{validation}` as a custom directive name~~ → **Resolved:** PR #50 went with `:::{admonition} Validation` + status-keyed CSS class (`validation-{state}`); no custom directive needed.

### Open implementation questions — still pending

- **Index-page toc placement** (Status section sibling vs new section). PR 5 decides.
- **Build-order enforcement** for `docs/website/scripts/validation-admonition-plugin.mjs`'s `dist/` import — PR #50 review I1. Track as a follow-up issue.

### Skill handoff

Execution-time skill: **superpowers:executing-plans** picks this plan up task-by-task. Per-PR review uses **superpowers:requesting-code-review** dispatching superpowers:code-reviewer between PRs. Verification before completion uses **superpowers:verification-before-completion** — every step's expected-output assertion is the verification gate.

---

## References

- [ADR 0056](../website/decisions/0056-validation-tracker.md) — the contract this plan implements.
- [Validation tracker design doc](2026-05-15-validation-tracker-design.md) — full design + frontmatter schema + plugin architecture.
- [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md) — pattern this plan follows.
- [packages/astro/src/lib/pedagogy-audit.ts](../../packages/astro/src/lib/pedagogy-audit.ts) — existing audit pattern V1–V7 extend.
- [packages/astro/src/lib/pedagogy-index-extractor.ts](../../packages/astro/src/lib/pedagogy-index-extractor.ts) — existing extractor pattern the contract-validations extractor mirrors.
