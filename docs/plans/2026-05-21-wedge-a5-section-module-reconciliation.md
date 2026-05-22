# Wedge A.5 — Section/Module Schema Reconciliation (Implementation Plan)

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. This is the immediate follow-up to Wedge A; closes the locked-but-unmigrated discrepancy between the **existing** `SectionSchema` / `ModuleSchema` and **[ADR 0067](../website/decisions/0067-section-level-artifacts.md)**'s new `Section` discriminated union.

**Goal:** Reconcile the existing `section.ts` + `module.ts` schemas with ADR 0067's new four-tier content hierarchy. Existing `SectionSchema` (chapter-internal H2-anchor concept; `id` + `heading`) gets renamed to **`ChapterSectionSchema`** because that's what it actually is. Existing `ModuleSchema` (course-level grouping; `slug` + `title` + `order` + `description`) gets **absorbed into a new `SectionSchema` discriminated union** as the `type: "module"` variant — alongside `phase` / `track` / `unit-block` / `bridge` per ADR 0067.

**Why now:** Wedge A (PR #154, merged 2026-05-21) shipped Unit + Section-level Artifact + Subsection schemas, deliberately deferring this reconciliation. Without it, the schema package ships two competing "Section" concepts (chapter-internal H2 vs. ADR-0067 course-level grouping) and the Module shape isn't aligned with ADR 0067's locked vocabulary. Both gaps block future wedges that read the content hierarchy uniformly (Library room / Schedule / Cockpit / pedagogy-index expansion).

**Architecture:** Pre-launch hard rename per `feedback_no_backcompat_prelaunch` — no dual-shape bridges, no compatibility shims. Old `SectionSchema` becomes `ChapterSectionSchema`; old `ModuleSchema` deletes and re-emerges as the `module` variant of the new `SectionSchema` discriminated union; every consumer migrates in the same PR. Per Wedge A's deltas: `XSchema` + `type X` naming throughout.

**Out of scope** (defer to follow-up wedges):
- Wiring the new `Section` discriminated union into Astro page templates (`/sections/<slug>/`, `/sections/<slug>/intro/`, etc.) — that's Wedge B/C scope.
- The smoke site's `modules` content collection rename to `sections` — included here ONLY at the schema level (the collection name stays "modules" for this wedge; renamed in a separate content-only PR after Anna confirms the smoke chapters are ready).
- Migrating ASTR 201 chapter frontmatter `module: "01-foundations"` → `section: "01-foundations"` — same reason; content rename is a separate concern from schema rename.

**Tech Stack:** Zod 4 ([ADR 0003](../website/decisions/0003-zod-as-source-of-truth.md)), TypeScript, Vitest, Biome ([ADR 0013](../website/decisions/0013-biome-lint-format.md)), pnpm ([ADR 0011](../website/decisions/0011-pnpm-package-manager.md)).

**Branch + PR strategy:**
- New feature branch `feat/wedge-a5-section-module-reconciliation` off `main`
- PR titled `feat(core): Wedge A.5 — Section/Module reconciliation (ChapterSectionSchema rename + Section discriminated union per ADR 0067)`
- Squash-merge per [ADR 0055](../website/decisions/0055-squash-merge-for-code-prs.md)
- Required CI checks: lint, typecheck, unit, build, e2e, storybook, visual-regression

---

## Blast-radius survey (done; result below)

**Schemas to modify:**
- `packages/core/src/schema/section.ts` — rename file + symbol → `chapter-section.ts` + `ChapterSectionSchema`
- `packages/core/src/schema/module.ts` — delete
- `packages/core/src/schema/section.ts` — **new file**, holds the discriminated union
- `packages/core/src/schema/index.ts` — barrel update (remove old `SectionSchema`/`ModuleSchema` exports; add `ChapterSectionSchema` + new `SectionSchema` + `SectionTypeSchema` + variant constructors)

**Direct schema-import consumers (confirmed via grep):**
- `examples/smoke/src/content.config.ts` line 5–20 — imports `ModuleSchema`, uses as `modules` content-collection schema. Migrates to the new `Section[type=module]` variant schema (rename import; collection shape changes shape slightly per the variant's fields).
- `examples/smoke/src/layouts/ChapterLayout.astro` line 84–86 — reads `m.slug` and `m.order` from collection entries; these field names survive the rename (the new module-variant keeps `slug` + `title` + `order` + `description`).
- `@sophie/astro/components/ModuleNav.astro` — existing component; consumes module-variant data; survives if field names preserved. Component name stays `ModuleNav.astro` for this wedge (renaming to `SectionNav.astro` is a Wedge B/C concern coupled to the page-template work).

**Indirect references (string-slug only, not schema-typed — survive the rename):**
- Every chapter `.mdx` frontmatter with `module: "<slug>"`
- `packages/core/src/schema/module-nav.ts` — `chaptersForModule(moduleSlug, chapters)` takes a string; no schema dependency
- `packages/core/src/schema/pedagogy-index-entries/chapter-meta.ts` — has its own `ModuleEntry` (pedagogy-index module representation), independent of `ModuleSchema`. No change.
- `packages/core/src/schema/chapter.ts` — only references "module" in JSDoc; no schema import. Comment-update only.
- `packages/core/src/audit/stub.ts` line 2 — imports `ChapterSchema` only; no Section/Module reference.
- `packages/astro/src/lib/pedagogy-audit/invariants/chapter-status.ts` — references `Chapter`/`chapter-status` only; no Section/Module reference.

**Pre-flight gates green (verified 2026-05-21 after PR #154 merge):**
- biome 637 files / 0 errors / 0 warnings
- typecheck 11 packages
- test:unit 10 packages / 1153 tests / 0 regressions
- build 7 packages
- e2e 157/0/5

---

## Pre-flight (do once at start of session)

```bash
git checkout main
git pull --ff-only
git checkout -b feat/wedge-a5-section-module-reconciliation
```

Verify clean baseline:

```bash
pnpm install --frozen-lockfile
pnpm exec biome check
pnpm turbo run typecheck --filter=@sophie/core
pnpm turbo run test:unit --filter=@sophie/core
```

Expected: all green. If anything fails on clean main, stop and fix before proceeding.

---

## Task 1 — Rename `section.ts` → `chapter-section.ts` + symbols

**Files:**
- Rename: `packages/core/src/schema/section.ts` → `packages/core/src/schema/chapter-section.ts`
- Rename inside: `SectionSchema` → `ChapterSectionSchema`; `type Section` → `type ChapterSection`
- Update barrel: `packages/core/src/schema/index.ts` (remove old `section.ts` export line; add `chapter-section.ts` export)

**Why this rename specifically:** The existing schema's two fields (`id`, `heading`) describe a chapter-internal section heading (the H2 anchor for in-page navigation, used by the pedagogy-index extractor to anchor cross-references). That's *not* what ADR 0067 calls a "Section." `ChapterSection` is the accurate name.

**Steps:**
1. Use `git mv` to rename the file: `git mv packages/core/src/schema/section.ts packages/core/src/schema/chapter-section.ts`
2. Edit the file contents: rename `SectionSchema` → `ChapterSectionSchema`; rename `type Section` → `type ChapterSection`
3. Update `packages/core/src/schema/index.ts`: remove the `{ type Section, SectionSchema } from "./section.js"` line; add `{ type ChapterSection, ChapterSectionSchema } from "./chapter-section.js"` in alphabetical position
4. `pnpm exec biome check --write` to fix formatting / sort imports
5. `pnpm turbo run typecheck --filter=@sophie/core` (expect 0 errors; nothing else in @sophie/core depends on `SectionSchema`/`type Section` per the blast-radius survey)
6. `pnpm turbo run test:unit --filter=@sophie/core` (no test file exists for old `section.ts` currently — verified; new chapter-section.ts can stay test-light for now since the schema is trivial)
7. Commit:

```bash
git commit -m "refactor(core): rename SectionSchema → ChapterSectionSchema (chapter-internal H2-anchor concept; clears name for ADR 0067 Section)"
```

---

## Task 2 — Delete `module.ts`; create new `section.ts` with discriminated union per ADR 0067

**Files:**
- Delete: `packages/core/src/schema/module.ts` + `module.test.ts`
- Create: `packages/core/src/schema/section.ts` + `section.test.ts`
- Update barrel: `packages/core/src/schema/index.ts`

**Why delete-and-re-create:** Per `feedback_no_backcompat_prelaunch`, the hard rename is the right shape. Old `ModuleSchema` becomes `SectionModuleVariantSchema` inside the new `section.ts`; the existing field set (`slug` + `title` + `order` + `description`) is preserved exactly within the variant. No shim, no migration alias.

**Step 1: Write the failing test**

`packages/core/src/schema/section.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  SectionModuleVariantSchema,
  SectionSchema,
  SectionTypeSchema,
} from "./section.js";

describe("SectionTypeSchema", () => {
  it("accepts each variant per ADR 0067", () => {
    for (const t of ["module", "phase", "track", "unit-block", "bridge"]) {
      expect(() => SectionTypeSchema.parse(t)).not.toThrow();
    }
  });
  it("rejects unknown types", () => {
    expect(() => SectionTypeSchema.parse("chapter")).toThrow();
  });
});

describe("SectionModuleVariantSchema", () => {
  const validModule = {
    type: "module",
    slug: "01-foundations",
    title: "Foundations",
    order: 1,
    description: "Introductory module.",
  };

  it("accepts a valid module variant", () => {
    expect(() => SectionModuleVariantSchema.parse(validModule)).not.toThrow();
  });

  it("rejects missing required fields", () => {
    const { slug: _slug, ...rest } = validModule;
    expect(() => SectionModuleVariantSchema.parse(rest)).toThrow();
  });

  it("rejects wrong type discriminator", () => {
    expect(() =>
      SectionModuleVariantSchema.parse({ ...validModule, type: "phase" }),
    ).toThrow();
  });

  it("accepts module without optional description", () => {
    const { description: _description, ...rest } = validModule;
    expect(() => SectionModuleVariantSchema.parse(rest)).not.toThrow();
  });
});

describe("SectionSchema (discriminated union)", () => {
  it("accepts a module variant", () => {
    expect(() =>
      SectionSchema.parse({
        type: "module",
        slug: "01-foundations",
        title: "Foundations",
        order: 1,
      }),
    ).not.toThrow();
  });

  it("accepts a phase variant", () => {
    expect(() =>
      SectionSchema.parse({
        type: "phase",
        slug: "phase-1",
        title: "Phase 1 — Foundations",
        order: 1,
      }),
    ).not.toThrow();
  });

  it("accepts a bridge variant", () => {
    expect(() =>
      SectionSchema.parse({
        type: "bridge",
        slug: "math-prereqs",
        title: "Math & Physics Prereqs",
        order: 0,
      }),
    ).not.toThrow();
  });

  it("discriminates on type field", () => {
    expect(() =>
      SectionSchema.parse({
        type: "mystery",
        slug: "x",
        title: "X",
        order: 1,
      }),
    ).toThrow();
  });
});
```

**Step 2: Run + verify FAIL**

```bash
pnpm --filter=@sophie/core test:unit --run "section.test"
```

Expected: "Cannot find module './section.js'".

**Step 3: Write the implementation**

`packages/core/src/schema/section.ts`:

```typescript
import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `SectionTypeSchema` — discriminator for the five `Section` variants
 * per [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md).
 *
 * - `module`: traditional course module (lecture-shape: ASTR 201 style)
 * - `phase`: multi-week phase (project-shape: ASTR 596 style)
 * - `track`: parallel subject track within a course
 * - `unit-block`: tight cluster of related Units without phase/module overhead
 * - `bridge`: prerequisite/foundation room (per [ADR 0068](../../../docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md))
 */
export const SectionTypeSchema = z.enum([
  "module",
  "phase",
  "track",
  "unit-block",
  "bridge",
]);
export type SectionType = z.infer<typeof SectionTypeSchema>;

/**
 * `SectionModuleVariantSchema` — the `module`-variant of `SectionSchema`.
 * Field set preserved from the previous `ModuleSchema` for migration
 * continuity: `slug` + `title` + `order` + `description`.
 */
export const SectionModuleVariantSchema = z.object({
  type: z.literal("module"),
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});
export type SectionModuleVariant = z.infer<typeof SectionModuleVariantSchema>;

export const SectionPhaseVariantSchema = z.object({
  type: z.literal("phase"),
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});
export type SectionPhaseVariant = z.infer<typeof SectionPhaseVariantSchema>;

export const SectionTrackVariantSchema = z.object({
  type: z.literal("track"),
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});
export type SectionTrackVariant = z.infer<typeof SectionTrackVariantSchema>;

export const SectionUnitBlockVariantSchema = z.object({
  type: z.literal("unit-block"),
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});
export type SectionUnitBlockVariant = z.infer<typeof SectionUnitBlockVariantSchema>;

/**
 * `SectionBridgeVariantSchema` — bridge / prereq room. Carries an
 * optional `display_label` so the instructor can show
 * "Prerequisites" / "Foundations" / "Python Bootcamp" / etc.
 * without changing the internal type tag.
 */
export const SectionBridgeVariantSchema = z.object({
  type: z.literal("bridge"),
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
  display_label: NonEmptyString.optional(),
});
export type SectionBridgeVariant = z.infer<typeof SectionBridgeVariantSchema>;

/**
 * `SectionSchema` — top-level course-content grouping per
 * [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md).
 * Replaces the previous `ModuleSchema` (now absorbed as the `module`
 * variant). Discriminated union over `type`.
 *
 * Contains Section-level Artifacts (intro / synthesis /
 * equation-collection / practice-set / etc.) and Subsections, which
 * in turn contain Units. See ADR 0067 for the full four-tier hierarchy.
 */
export const SectionSchema = z.discriminatedUnion("type", [
  SectionModuleVariantSchema,
  SectionPhaseVariantSchema,
  SectionTrackVariantSchema,
  SectionUnitBlockVariantSchema,
  SectionBridgeVariantSchema,
]);
export type Section = z.infer<typeof SectionSchema>;
```

**Step 4: Run + verify PASS**

```bash
pnpm --filter=@sophie/core test:unit --run "section.test"
```

Expected: ~11 tests pass.

**Step 5: Delete old `module.ts` + `module.test.ts`**

```bash
git rm packages/core/src/schema/module.ts packages/core/src/schema/module.test.ts
```

**Step 6: Update barrel**

In `packages/core/src/schema/index.ts`:
- Remove the `{ type Module, ModuleSchema } from "./module.js"` line
- Add the new exports from `./section.js` in alphabetical position:

```typescript
export {
  type Section,
  type SectionBridgeVariant,
  SectionBridgeVariantSchema,
  type SectionModuleVariant,
  SectionModuleVariantSchema,
  type SectionPhaseVariant,
  SectionPhaseVariantSchema,
  SectionSchema,
  type SectionTrackVariant,
  SectionTrackVariantSchema,
  type SectionType,
  SectionTypeSchema,
  type SectionUnitBlockVariant,
  SectionUnitBlockVariantSchema,
} from "./section.js";
```

(Biome's `assist/source/organizeImports` will sort these on auto-fix; the human-edit ordering doesn't have to be perfect.)

**Step 7: `pnpm exec biome check --write`**

**Step 8: `pnpm turbo run typecheck --filter=@sophie/core`** — expect 0 errors. If anything fails (likely the smoke-site consumer below in Task 3), do not panic — Task 3 explicitly handles that consumer.

**Step 9: Commit**

```bash
git commit -m "feat(core): replace ModuleSchema with new SectionSchema discriminated union (ADR 0067)

Per ADR 0067 — the previous ModuleSchema (course-level grouping) is
absorbed into a new SectionSchema discriminated union with 5 variants
(module / phase / track / unit-block / bridge). Field set on the
module variant preserved verbatim from the old schema for migration
continuity (slug + title + order + description). Per pre-launch
no-backcompat discipline, no shim or alias; consumers migrate in
the same PR (see Task 3)."
```

---

## Task 3 — Migrate the `examples/smoke` consumer

**Files:**
- `examples/smoke/src/content.config.ts` — change import from `ModuleSchema` to `SectionModuleVariantSchema`; update the `modules` collection schema accordingly
- `examples/smoke/src/layouts/ChapterLayout.astro` — verify field access (`m.slug`, `m.order`) still works (it should — field names preserved)

**Why update Astro content collection here:** This is the only direct consumer of the old `ModuleSchema` import in the codebase. The smoke chapter `.mdx` files use string `module: "<slug>"` frontmatter that doesn't change.

**Step 1: Read current `examples/smoke/src/content.config.ts`**

(Should show line 5–6 import and line ~20 collection definition.)

**Step 2: Edit imports + schema reference**

```typescript
// Before:
import {
  ChapterSchema,
  ModuleSchema,
  ...
} from "@sophie/core/schema";

// After:
import {
  ChapterSchema,
  SectionModuleVariantSchema,
  ...
} from "@sophie/core/schema";
```

```typescript
// Before:
const modules = defineCollection({
  type: "data",
  schema: ModuleSchema,
});

// After:
const modules = defineCollection({
  type: "data",
  schema: SectionModuleVariantSchema,
});
```

**Note:** the collection NAME stays `modules` for this wedge — content-collection renames are out of scope. Each individual module entry (`src/content/modules/<slug>.yaml`) needs a `type: "module"` field added to satisfy the new schema's discriminator. List the existing module YAMLs:

```bash
ls examples/smoke/src/content/modules/
```

For each, prepend `type: module` to the YAML frontmatter (or top-level field).

**Step 3: Run `pnpm exec turbo run typecheck --filter=smoke`** — expect 0 errors. If errors surface, they'll be field-shape mismatches in `ChapterLayout.astro` or downstream pages.

**Step 4: Run `pnpm exec turbo run test:unit`** — verify nothing else regressed.

**Step 5: Quick smoke-site build sanity check:**

```bash
pnpm --filter smoke build
```

Expect: 12 pages built; same Pagefind index as pre-rename.

**Step 6: Commit**

```bash
git commit -m "refactor(smoke): migrate to SectionModuleVariantSchema (Wedge A.5)

Updates content.config.ts to import SectionModuleVariantSchema in
place of ModuleSchema; each module YAML in src/content/modules/
gets type: module added to satisfy the discriminated union.
Collection name stays 'modules' (content-collection rename is a
separate concern). Field access in ChapterLayout.astro unchanged
(slug + order + title preserved verbatim)."
```

---

## Task 4 — Update comments + light JSDoc references

**Files:**
- `packages/core/src/schema/chapter.ts` — line 93 references "module" in JSDoc for `chaptersForModule`; leave the reference (the helper takes a string slug, not the schema). Comment-only sanity pass — no edits expected.
- `packages/core/src/schema/module-nav.ts` — `chaptersForModule` function — verify it still works (uses `Chapter` type only, no Module/Section dependency). No edits expected.
- `packages/core/src/schema/pedagogy-index-entries/chapter-meta.ts` — `ModuleEntry` is a pedagogy-index-internal type, not related to the schema rename. No edits.

**Step 1: Grep one final time** to confirm zero stale `ModuleSchema` or old `SectionSchema` references:

```bash
grep -rln "ModuleSchema\|type Module\>" packages/ examples/ --include="*.ts" --include="*.astro" 2>/dev/null | grep -v node_modules | grep -v dist
grep -rln "from.*['\"]\\.\\./schema/section\.js" packages/ 2>/dev/null | grep -v dist
```

Both should return zero matches (or only the new files themselves).

**Step 2: No commit unless the grep surfaces something** — most likely this task is a no-op verification.

---

## Task 5 — ADR 0067 frontmatter update

**File:**
- `docs/website/decisions/0067-section-level-artifacts.md`

**Change:** Update `validation:` block to reflect that the Section/Subsection/Unit/Artifact schemas are now *partially shipped*:
- Wedge A landed Subsection, Unit, Artifact (per PR #154)
- Wedge A.5 (this PR) lands Section discriminated union

Frontmatter update:

```yaml
validation:
  status: partial
  last_validated_date: 2026-05-21
  evidence:
    - "@sophie/core/schema/section.ts (Section discriminated union; Wedge A.5)"
    - "@sophie/core/schema/subsection.ts (Subsection; Wedge A)"
    - "@sophie/core/schema/unit.ts (Unit + UnitType; Wedge A)"
    - "@sophie/core/schema/artifact.ts (Artifact + 20 variants; Wedge A)"
```

(Check the validation extractor's allowed status values; "partial" or "mixed" — adjust to match Sophie's vocabulary. Per the `feedback_validation_dashboard_regen` memory: this WILL trigger validation.md regen.)

**Step:** After ADR 0067 frontmatter edit, run:

```bash
pnpm tsx scripts/regenerate-validation-index.mts
```

Verify the dashboard reflects the new ADR 0067 validation block. Commit ADR 0067 + validation.md together:

```bash
git commit -m "docs(adr 0067): mark schema landed via Wedge A + A.5 (validation status: partial → evidence array)"
```

---

## Task 6 — Pre-PR verification gates

Per `feedback_pre_pr_lockfile_check` + `feedback_biome_verification`:

```bash
pnpm install --frozen-lockfile           # no diff (no deps added)
pnpm exec biome check                     # 0 errors, 0 warnings
pnpm turbo run typecheck                  # all packages green
pnpm turbo run test:unit                  # ~11 new tests; no regressions
pnpm turbo run build                      # 7 packages build clean
pnpm test:e2e                             # 157/0/5 (matches Sprint K baseline)
```

If `@sophie/astro` integration test fails on dashboard hrefs (per the `project_local_dev_pagefind_e2e_pitfall` memory), force-rebuild docs first:

```bash
pnpm exec turbo run build --filter=@sophie/docs --force
```

---

## Task 7 — Open PR + monitor CI

```bash
git push -u origin feat/wedge-a5-section-module-reconciliation

gh pr create --base main --title "feat(core): Wedge A.5 — Section/Module reconciliation (ChapterSectionSchema rename + Section discriminated union per ADR 0067)" --body "$(cat <<'EOF'
## Summary

Wedge A.5 closes the Section/Module schema discrepancy locked by ADR
0067 but deliberately deferred from Wedge A (PR #154).

**Two structural renames:**
- Existing `SectionSchema` (chapter-internal H2-anchor shape: `id` +
  `heading`) → renamed to **`ChapterSectionSchema`** because that's
  what it actually is. Clears the "Section" name for ADR 0067's
  meaning.
- Existing `ModuleSchema` (course-level grouping: `slug` + `title` +
  `order` + `description`) → **absorbed into a new `SectionSchema`
  discriminated union** as the `type: "module"` variant. The other
  four variants (`phase` / `track` / `unit-block` / `bridge`) are
  shipped alongside per ADR 0067.

Per pre-launch no-back-compat discipline: hard rename, no shim, no
alias. The only direct consumer (`examples/smoke/src/content.config.ts`)
migrates in the same PR. Existing chapter `.mdx` frontmatter
(`module: "<slug>"`) is unaffected (string slug, not schema-typed).

## Files changed

**Schemas:**
- `packages/core/src/schema/chapter-section.ts` (new — renamed from `section.ts`)
- `packages/core/src/schema/section.ts` (new — discriminated union)
- `packages/core/src/schema/section.test.ts` (new — ~11 tests)
- `packages/core/src/schema/module.ts` (deleted)
- `packages/core/src/schema/module.test.ts` (deleted)
- `packages/core/src/schema/index.ts` (barrel update)

**Consumer migration:**
- `examples/smoke/src/content.config.ts` (import rename)
- `examples/smoke/src/content/modules/*.yaml` (added `type: module` to each)

**Validation:**
- `docs/website/decisions/0067-section-level-artifacts.md` (validation block updated)
- `docs/website/status/validation.md` (regenerated)

## Test plan

- [x] `pnpm exec biome check` — 0 errors, 0 warnings
- [x] `pnpm turbo run typecheck` — 0 errors
- [x] `pnpm turbo run test:unit` — ~11 new schema tests; 0 regressions
- [x] `pnpm turbo run build` — 7 packages green; smoke site builds 12 pages
- [x] `pnpm test:e2e` — 157/0/5 (matches Sprint K baseline)

## Related

- [Plan: docs/plans/2026-05-21-wedge-a5-section-module-reconciliation.md](docs/plans/2026-05-21-wedge-a5-section-module-reconciliation.md)
- [ADR 0067 — Section/Subsection/Unit/Artifact](docs/website/decisions/0067-section-level-artifacts.md)
- [Wedge A PR #154 — schemas-only foundation](https://github.com/drannarosen/sophie/pull/154)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Monitor with `gh pr checks <num> --watch --fail-fast`. Squash-merge when green per ADR 0055.

---

## Verification at completion

After merge:
1. **`docs/website/status/validation.md` regen** confirmed by ADR 0067 status update + the new `Section` schema being added under "extractor findings" (should remain 0).
2. **Memory update** worth considering: record that `ModuleSchema` is gone; consumers should import `SectionModuleVariantSchema` from `@sophie/core/schema`.
3. **Future wedges unblocked**: Wedge B (Tier 1 pedagogy components), Wedge C (Library room), Cockpit (ADR 0076), AI Authoring Packets (ADR 0077) — all of these read the content hierarchy uniformly and need the new Section shape in place.

## Notes for the executing engineer

- **TDD strictly**: Task 2 has tests-first. Don't skip the red/green steps.
- **Biome verification**: per `feedback_biome_verification`, never trust tail-only output; grep for "error"/"warning" or check exit code.
- **Pre-PR lockfile check** per `feedback_pre_pr_lockfile_check`.
- **Astro content-collection migration in Task 3** is the only "surprising" part — every module YAML in `src/content/modules/` needs `type: module` prepended. If that step is missed, Astro's content-collection validation will error at build time. Forewarned is forearmed.
- **Don't rename `ModuleNav.astro` → `SectionNav.astro` in this wedge.** That's a UI concern coupled to the page-template work in Wedge B/C. Keeping the component name unchanged minimizes blast radius for this PR.
- **HITL gates remain active**: any deviation from the plan (e.g., unexpected typecheck error in a consumer the survey missed) → pause and ask before improvising.

## Follow-up wedges (out of scope here, but unblocked by this work)

- **Wedge B**: Tier 1 pedagogy components — `<RetrievalPrompt>`, `<WorkedExample>`, `<FadedPrompt>`, `<InterleavedSet>`, evolved `<SkillReview>`
- **Wedge C**: Library room infrastructure — `<EquationSpecPage>`, Cheatsheet, PDF export, Astro routing
- **Wedge D**: `@sophie/pedagogy-fsrs` algorithm + IndexedDB persistence
- **Wedge E**: `@sophie/pedagogy-bkt` algorithm + adaptive surfacing
- **Wedge F**: Schedule view + iCal export
- **Wedge G**: AI co-authoring scaffold (ADR 0077 AI Authoring Packets)
- **New wedge B.5** (per ADR 0076): Student Learning Cockpit + Absence Recovery
- **Content-collection rename** (`modules` → `sections`): separate content-only PR once the smoke chapters are ready
- **`ModuleNav.astro` → `SectionNav.astro`**: bundled with Wedge B/C page-template work
