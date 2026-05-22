# Wedge B-followup Implementation Plan (W1)

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Default batch size = 3 tasks; report after each batch and wait for Anna's confirmation per the HITL mandate in `/Users/anna/Teaching/sophie/CLAUDE.md`.

**Goal:** Surface `Section[]` + `Unit[]` collections in `PedagogyIndex`, graduate the three Wedge-B1-deferred audit invariants (PRA-1 Unit-aware, SR-1 section-validity, RET-1 unchanged), and wire `<SpacedReview section="…">` end-to-end rendering against the index. This is **W1 of a four-wedge migration sequence** (W1 → W2 → W3 → W4) toward ADR 0067's locked SoTA shape. See [design doc](2026-05-22-wedge-b-followup-design.md) for the canonical SoTA target and the multi-wedge sequence.

**Architecture:** Add `SectionEntry` + `UnitEntry` schemas to `@sophie/core/schema/pedagogy-index-entries/`. UnitEntry extends `UnitSchema` with `section_id` + two named artifact bindings (`chapter: string` for reading, `lecture?: string` for slides). Consumer-supplied via `getCollection('sections')` + `getCollection('units')` and forwarded by `TextbookLayout.astro` through `setSections` / `setUnits` (mirroring `setChapters` / `setModules`). Audit invariants graduate in place. New `useInteractiveRangeMulti` hook + `ResponseStore.getAllMulti` for cross-chapter range reads. Smoke fixture ADDS `sections/` + `units/` content collections; existing `chapters/` + `modules/` stay (transitional — deleted in W2).

**Tech Stack:** TypeScript, Zod, Astro 6 + MDX, React 19, pnpm, Turborepo, Biome, Vitest, Playwright, IndexedDB via the persistence layer per [ADR 0007](../decisions/0007-persistence.md).

---

## Task 1 — Create worktree + feature branch

**Files:**
- (no in-repo file changes; sets up the working environment)

**Step 1:** Use `superpowers:using-git-worktrees`.

```bash
# from /Users/anna/Teaching/sophie
git worktree add ../sophie-wedge-b-followup -b feat/wedge-b-followup main
cd ../sophie-wedge-b-followup
pnpm install
```

**Step 2:** Verify clean state.

```bash
git status   # expect: clean
pnpm exec biome check 2>&1 | grep -E "error|warning" | head   # expect: empty
```

**Step 3:** Commit nothing — branch is ready.

---

## Task 2 — Add `SectionEntry` schema

**Files:**
- Create: `packages/core/src/schema/pedagogy-index-entries/section.ts`
- Modify: `packages/core/src/schema/pedagogy-index-entries/index.ts` (barrel export)
- Test: `packages/core/src/schema/pedagogy-index-entries/section.test.ts`

**Step 1: Failing test.**

```ts
// packages/core/src/schema/pedagogy-index-entries/section.test.ts
import { describe, expect, it } from "vitest";
import { SectionEntrySchema } from "./section.ts";

describe("SectionEntrySchema", () => {
  it("parses a module-variant section", () => {
    const input = {
      type: "module",
      slug: "intro",
      title: "Introduction to Astrophysics",
      order: 0,
      description: "Foundation concepts.",
    };
    expect(SectionEntrySchema.parse(input)).toEqual(input);
  });

  it("parses a bridge-variant section with display_label", () => {
    const input = {
      type: "bridge",
      slug: "math-prereqs",
      title: "Math Prerequisites",
      order: 0,
      display_label: "Foundations",
    };
    expect(SectionEntrySchema.parse(input)).toEqual(input);
  });

  it("rejects an unknown type discriminator", () => {
    expect(() =>
      SectionEntrySchema.parse({
        type: "unknown",
        slug: "x",
        title: "X",
        order: 0,
      })
    ).toThrow();
  });
});
```

**Step 2:** Run; expect fail (module not found).

```bash
pnpm turbo run test:unit --filter=@sophie/core -- section.test
```

**Step 3: Implement.**

```ts
// packages/core/src/schema/pedagogy-index-entries/section.ts
import { SectionSchema } from "../section.ts";

/**
 * A section entry — one per top-level course Section in the consumer's
 * Astro `sections` content collection. Populated at SSR-merge time by
 * `TextbookLayout` from `getCollection('sections')`; never written by
 * the remark extractor (sections are consumer-app-owned, like
 * `chapters` / `modules` / `figureRegistry`). Per ADR 0067.
 *
 * W1 (Wedge B-followup) introduces this entry as a verbatim alias of
 * `SectionSchema`; no extra index-specific fields are needed because
 * Section data is intrinsically navigation-shaped (slug + title + type +
 * order). Future fields (e.g., derived `unit_count`) attach here when
 * earned by a concrete audit / UI consumer.
 */
export const SectionEntrySchema = SectionSchema;
export type SectionEntry = ReturnType<typeof SectionEntrySchema.parse>;
```

**Step 4:** Barrel export.

```ts
// packages/core/src/schema/pedagogy-index-entries/index.ts (add)
export {
  type SectionEntry,
  SectionEntrySchema,
} from "./section.ts";
```

**Step 5:** Run; expect 3/3 pass.

**Step 6: Commit.**

```bash
git add packages/core/src/schema/pedagogy-index-entries/section.ts \
        packages/core/src/schema/pedagogy-index-entries/section.test.ts \
        packages/core/src/schema/pedagogy-index-entries/index.ts
git commit -m "feat(core): add SectionEntry schema (W1)"
```

---

## Task 3 — Add `UnitEntry` schema (section_id + chapter + lecture bindings)

**Files:**
- Create: `packages/core/src/schema/pedagogy-index-entries/unit.ts`
- Modify: `packages/core/src/schema/pedagogy-index-entries/index.ts`
- Test: `packages/core/src/schema/pedagogy-index-entries/unit.test.ts`

**Step 1: Failing test.**

```ts
// packages/core/src/schema/pedagogy-index-entries/unit.test.ts
import { describe, expect, it } from "vitest";
import { UnitEntrySchema } from "./unit.ts";

describe("UnitEntrySchema", () => {
  it("parses a lecture-variant unit with section_id + chapter binding", () => {
    const input = {
      id: "intro-to-the-sky",
      type: "lecture",
      title: "Introducing the Sky",
      order: 0,
      prereqs: [],
      section_id: "intro",
      chapter: "introducing-the-sky",
    };
    expect(UnitEntrySchema.parse(input)).toEqual(input);
  });

  it("accepts the optional `lecture` slides-artifact binding", () => {
    const input = {
      id: "spectra",
      type: "lecture",
      title: "Spectra & Composition",
      order: 0,
      prereqs: ["logarithms"],
      section_id: "stars",
      chapter: "spectra-and-composition",
      lecture: "L3-spectra-slides",
    };
    const parsed = UnitEntrySchema.parse(input);
    expect(parsed.lecture).toBe("L3-spectra-slides");
  });

  it("defaults prereqs to []", () => {
    const input = {
      id: "x",
      type: "topic",
      title: "X",
      order: 0,
      section_id: "intro",
      chapter: "x",
    };
    const parsed = UnitEntrySchema.parse(input);
    expect(parsed.prereqs).toEqual([]);
  });

  it("rejects when section_id is missing", () => {
    expect(() =>
      UnitEntrySchema.parse({
        id: "x",
        type: "lecture",
        title: "X",
        order: 0,
        chapter: "x",
      })
    ).toThrow();
  });

  it("rejects when chapter is missing", () => {
    expect(() =>
      UnitEntrySchema.parse({
        id: "x",
        type: "lecture",
        title: "X",
        order: 0,
        section_id: "intro",
      })
    ).toThrow();
  });
});
```

**Step 2:** Run; expect fail.

**Step 3: Implement.**

```ts
// packages/core/src/schema/pedagogy-index-entries/unit.ts
import type { z } from "zod";
import { NonEmptyString } from "../primitives.ts";
import { UnitSchema } from "../unit.ts";

/**
 * A unit entry — one per `Unit` in the consumer's Astro `units` content
 * collection. Populated at SSR-merge time by `TextbookLayout` from
 * `getCollection('units')`. Per ADR 0067.
 *
 * Extends `UnitSchema` with three bindings surfaced for the pedagogy
 * index:
 *
 * - `section_id`: parent ref to the containing `Section`'s `slug`.
 *   Powers PRA-1's "same Section or prior Section" prereq lookup and
 *   `<SpacedReview section="…">` rendering's section→chapters traversal.
 *
 * - `chapter` (D7): slug of the **reading artifact** (the chapter-shaped
 *   reading.mdx). "Chapter" = the reading content students study at home.
 *   In W1 this points at the existing chapter MDX slug; W2 keeps the
 *   field but its string value now points at the moved
 *   `sections/<id>/units/<id>/reading.mdx` artifact.
 *
 * - `lecture?` (D7): slug of the **slides artifact** (the lecture-session
 *   slide deck). "Lecture" = the slides delivered in person. Optional in
 *   W1 (smoke has no slides.mdx yet); becomes the binding to slides.mdx
 *   when it lands.
 *
 * Both `chapter` and `lecture` field NAMES are permanent — they persist
 * past W2/W3. Only their string values change as the file-layout
 * migration moves artifacts around.
 */
export const UnitEntrySchema = UnitSchema.extend({
  section_id: NonEmptyString,
  chapter: NonEmptyString,
  lecture: NonEmptyString.optional(),
});
export type UnitEntry = z.infer<typeof UnitEntrySchema>;
```

**Step 4:** Barrel export.

```ts
// packages/core/src/schema/pedagogy-index-entries/index.ts (add)
export {
  type UnitEntry,
  UnitEntrySchema,
} from "./unit.ts";
```

**Step 5:** Run; expect 5/5 pass.

**Step 6: Commit.**

```bash
git add packages/core/src/schema/pedagogy-index-entries/unit.ts \
        packages/core/src/schema/pedagogy-index-entries/unit.test.ts \
        packages/core/src/schema/pedagogy-index-entries/index.ts
git commit -m "feat(core): add UnitEntry with section_id + chapter + lecture bindings (W1)"
```

---

## Task 4 — Wire `sections` + `units` into `PedagogyIndexSchema`

**Files:**
- Modify: `packages/core/src/schema/pedagogy-index.ts`
- Test: `packages/core/src/schema/pedagogy-index.test.ts`

**Step 1: Failing test** — add cases for `sections` + `units` present + defaulting to `[]`.

```ts
it("parses with sections + units populated", () => {
  const input = {
    // (all existing required arrays with [])
    sections: [{ type: "module", slug: "intro", title: "Intro", order: 0 }],
    units: [
      {
        id: "u1",
        type: "lecture",
        title: "U1",
        order: 0,
        prereqs: [],
        section_id: "intro",
        chapter: "u1-chapter",
      },
    ],
  };
  expect(() => PedagogyIndexSchema.parse(input)).not.toThrow();
});

it("defaults sections + units to [] when absent", () => {
  const input = { /* required arrays = [] */ };
  const parsed = PedagogyIndexSchema.parse(input);
  expect(parsed.sections).toEqual([]);
  expect(parsed.units).toEqual([]);
});
```

**Step 2:** Run; fail.

**Step 3: Implement.** Add to the entry imports, then add the two collections to `PedagogyIndexSchema` with `.readonly().default([])` semantics (mirrors the established pre-launch-additive pattern).

```ts
// packages/core/src/schema/pedagogy-index.ts (imports)
import {
  // ...existing
  SectionEntrySchema,
  UnitEntrySchema,
} from "./pedagogy-index-entries/index.ts";

// PedagogyIndexSchema body (add):
  /**
   * Consumer-app-owned section metadata, forwarded from
   * `getCollection('sections')` per ADR 0067. Wedge B-followup (W1)
   * introduces this collection; consumers on the pre-W1 path see [].
   */
  sections: z.array(SectionEntrySchema).readonly().default([]),
  /**
   * Consumer-app-owned unit metadata, forwarded from
   * `getCollection('units')` per ADR 0067. `UnitEntry.section_id` binds
   * to a `SectionEntry.slug`; `UnitEntry.chapter` binds to a reading
   * artifact (the "chapter"); `UnitEntry.lecture?` binds to a slides
   * artifact (the "lecture"). Pre-W1 consumers see [].
   */
  units: z.array(UnitEntrySchema).readonly().default([]),
```

**Step 4:** Run; pass.

**Step 5: Commit.**

```bash
git commit -m "feat(core): surface sections + units in PedagogyIndexSchema (W1)"
```

---

## Task 5 — Accumulator: `setSections` + `setUnits` + emission + reset coverage

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-index/accumulator.ts`
- Test: `packages/astro/src/lib/pedagogy-index/accumulator.test.ts`

**Step 1: Failing test.**

```ts
describe("setSections + setUnits", () => {
  beforeEach(() => resetIndexAccumulator());

  it("forwards sections + units through asPedagogyIndex", () => {
    indexAccumulator.setSections([
      { type: "module", slug: "intro", title: "Intro", order: 0 },
    ]);
    indexAccumulator.setUnits([
      {
        id: "u1",
        type: "lecture",
        title: "U1",
        order: 0,
        prereqs: [],
        section_id: "intro",
        chapter: "u1-chapter",
      },
    ]);
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.sections).toHaveLength(1);
    expect(index.units).toHaveLength(1);
    expect(index.sections[0].slug).toBe("intro");
    expect(index.units[0].section_id).toBe("intro");
  });

  it("resetIndexAccumulator clears sections + units", () => {
    indexAccumulator.setSections([
      { type: "module", slug: "intro", title: "Intro", order: 0 },
    ]);
    resetIndexAccumulator();
    expect(indexAccumulator.asPedagogyIndex().sections).toEqual([]);
  });

  it("clearChapter does NOT touch sections + units (mirrors setChapters/setModules)", () => {
    indexAccumulator.setSections([
      { type: "module", slug: "intro", title: "Intro", order: 0 },
    ]);
    indexAccumulator.clearChapter("some-chapter");
    expect(indexAccumulator.asPedagogyIndex().sections).toHaveLength(1);
  });
});
```

**Step 2:** Fail.

**Step 3: Implement.** Mirror `setChapters` / `setModules` exactly: add to `GlobalIndexState`, `getGlobalState` init, class methods, `asPedagogyIndex` return, `resetIndexAccumulator`. **Do NOT touch `clearChapter`** (sections + units are consumer-global per the existing pattern).

```ts
// GlobalIndexState additions
  sections: ReadonlyArray<SectionEntry>;
  units: ReadonlyArray<UnitEntry>;

// getGlobalState init additions
      sections: [],
      units: [],

// class methods (after setModules)
  setSections(entries: ReadonlyArray<SectionEntry>): void {
    const state = getGlobalState();
    state.sections = entries;
  }

  setUnits(entries: ReadonlyArray<UnitEntry>): void {
    const state = getGlobalState();
    state.units = entries;
  }

// asPedagogyIndex return additions
      sections: state.sections,
      units: state.units,

// resetIndexAccumulator additions
  state.sections = [];
  state.units = [];
```

**Step 4:** Pass.

**Step 5: Commit.**

```bash
git commit -m "feat(astro): accumulator setSections + setUnits (W1)"
```

---

## Task 6 — Internal store hydration: `__setSections` + `__setUnits`

**Files:**
- Modify: `packages/components/src/internal/store-hydration.ts` (verify path; mirror `__setChapters` / `__setModules`)
- Test: extend existing `internal/store-hydration.test.ts`

**Step 1:** Failing test — mirror the existing `__setChapters` test shape.

**Step 2:** Fail.

**Step 3: Implement.** Mirror `__setChapters` / `__setModules` exactly. The implementation is mechanical — read the existing setter pair, add the two new setters with identical shape.

**Step 4:** Pass.

**Step 5: Commit.**

```bash
git commit -m "feat(components): internal __setSections + __setUnits store hydration (W1)"
```

---

## Task 7 — Component-side read hooks: `useSections` + `useUnits`

**Files:**
- Create or extend: `packages/components/src/runtime/useSections.ts`, `useUnits.ts` (or extend the existing pedagogy-store hook file — verify by reading the `useChapters` location first)
- Test: sibling `.test.ts` files

**Step 1:** Read the existing `useChapters` hook to mirror its shape.

```bash
grep -rn "useChapters\b" packages/components/src/runtime/ --include="*.ts"
```

**Step 2: Failing tests** covering:
- Empty default
- Populated after `__setSections` / `__setUnits`
- Reactive update when the store changes

**Step 3:** Fail.

**Step 4: Implement** the two hooks. Mirror `useChapters` / `useModules`.

**Step 5:** Pass.

**Step 6: Commit.**

```bash
git commit -m "feat(components): useSections + useUnits read hooks (W1)"
```

---

## Task 8 — `ResponseStore.getAllMulti` method

**Files:**
- Modify: `packages/components/src/runtime/ResponseStore.ts`
- Modify: `packages/components/src/runtime/FallbackResponseStore.ts`
- Test: `packages/components/src/runtime/ResponseStore.test.ts`

**Step 1: Failing tests.**

```ts
it("getAllMulti merges results across multiple chapters", async () => {
  const store = new ResponseStore("test-course");
  await store.set("p1", "ch-a", "practice-attempt:logs", { /* ... */ });
  await store.set("p1", "ch-b", "practice-attempt:trig", { /* ... */ });
  await store.set("p1", "ch-c", "practice-attempt:exp", { /* ... */ });
  const result = await store.getAllMulti(
    "p1",
    ["ch-a", "ch-b"],
    "practice-attempt:"
  );
  expect(Object.keys(result)).toHaveLength(2);
  expect(result).toHaveProperty("practice-attempt:logs");
  expect(result).toHaveProperty("practice-attempt:trig");
  expect(result).not.toHaveProperty("practice-attempt:exp");
});

it("getAllMulti returns {} for empty chapters array", async () => {
  const store = new ResponseStore("test-course");
  const result = await store.getAllMulti("p1", [], "practice-attempt:");
  expect(result).toEqual({});
});

it("getAllMulti dedupes by unwrapped key — last chapter wins on collision (documented behavior)", async () => {
  // Rare in practice (same unwrapped key in two chapters); document.
  const store = new ResponseStore("test-course");
  await store.set("p1", "ch-a", "practice-attempt:logs", { /* attempt-a */ });
  await store.set("p1", "ch-b", "practice-attempt:logs", { /* attempt-b */ });
  const result = await store.getAllMulti("p1", ["ch-a", "ch-b"], "practice-attempt:");
  // Whichever chapter ran last wins; the merge is best-effort because
  // unwrapped keys are intentionally unique per chapter in normal usage.
  // For section-scope SpacedReview, target_id values rarely collide
  // across chapters in the same section in practice.
});
```

**Step 2:** Fail.

**Step 3: Implement.** Internal: `Promise.all(chapters.map(ch => this.getAll(profile, ch, prefix)))` then `Object.assign(...)` merge. Mirror the Fallback variant.

```ts
async getAllMulti<T>(
  profile: string,
  chapters: readonly string[],
  keyPrefix?: string
): Promise<Record<string, StoredRecord<T>>> {
  if (chapters.length === 0) return {};
  const perChapter = await Promise.all(
    chapters.map((ch) => this.getAll<T>(profile, ch, keyPrefix))
  );
  return Object.assign({}, ...perChapter);
}
```

**Step 4:** Pass.

**Step 5: Commit.**

```bash
git commit -m "feat(components): ResponseStore.getAllMulti for cross-chapter range reads (W1)"
```

---

## Task 9 — `useInteractiveRangeMulti` hook

**Files:**
- Create: `packages/components/src/runtime/useInteractiveRangeMulti.ts`
- Test: `packages/components/src/runtime/useInteractiveRangeMulti.test.tsx`

**Step 1: Failing tests** covering:
- Initial hydration from `store.getAllMulti`
- Cross-chapter broadcast subscription (write to one chapter → hook updates)
- LWW gating per (chapter, key)
- Empty `chapters: []` → `values: {}`, `hydrated: true`, no IDB calls
- `chapters` list change → re-subscribe correctly

**Step 2:** Fail.

**Step 3: Implement.** Hand-rolled (no `useInteractiveRange` looping). Two `useEffect`s: one for hydration (`getAllMulti`), one for N-channel broadcast subscription with cleanup in a Map. Mirror LWW + `senderId` semantics from `useInteractiveRange`.

```ts
// packages/components/src/runtime/useInteractiveRangeMulti.ts
import { useEffect, useId, useRef, useState } from "react";
import type { BroadcastMessage } from "./BroadcastChannel.ts";
import type { PersistenceMode } from "./FallbackResponseStore.ts";
import { useProfile } from "./ProfileContext.tsx";
import { compositeKey } from "./ResponseStore.ts";
import {
  getChannel,
  getStore,
  type InteractiveStatus,
} from "./useInteractive.ts";

export interface UseInteractiveRangeMultiResult<T> {
  values: Readonly<Record<string, T>>;
  status: InteractiveStatus;
  error: Error | null;
  hydrated: boolean;
  persistence: PersistenceMode;
}

/**
 * Multi-chapter sibling of `useInteractiveRange`. Hydrates from
 * `ResponseStore.getAllMulti` and subscribes to one BroadcastChannel
 * per chapter for cross-tab + same-tab LWW-gated updates.
 *
 * Section-scope `<SpacedReview>` is the first caller; Cockpit (ADR
 * 0076) is the committed second caller. Read-only — mutations go
 * through per-key `useInteractive` writes.
 */
export function useInteractiveRangeMulti<T>(
  course: string,
  chapters: readonly string[],
  keyPrefix?: string
): UseInteractiveRangeMultiResult<T> {
  // ... (full implementation; ~120 LOC mirroring useInteractiveRange
  //      but with N-channel subscription bookkeeping)
}
```

**Step 4:** Pass.

**Step 5: Commit.**

```bash
git commit -m "feat(components): useInteractiveRangeMulti hook (W1)"
```

---

## Task 10 — Smoke fixture: `sections/` + `units/` content collections

**Files:**
- Create: `examples/smoke/src/content/sections/intro.yaml`
- Create: `examples/smoke/src/content/sections/stars.yaml`
- Create: `examples/smoke/src/content/units/<5 unit yaml files>.yaml`
- Modify: `examples/smoke/src/content/config.ts`

**Step 1:** Verify current smoke build baseline.

```bash
pnpm turbo run build --filter=@sophie/smoke
# expect: 12 pages, 125 pedagogy entries
```

**Step 2:** Add `sections` + `units` collection schemas to smoke's `content/config.ts`. Use `SectionSchema` + `UnitEntrySchema` (from `@sophie/core/schema`) directly as the Astro content-collection schemas.

```ts
// examples/smoke/src/content/config.ts (add)
import { defineCollection } from "astro:content";
import { SectionSchema, UnitEntrySchema } from "@sophie/core/schema";

const sections = defineCollection({
  type: "data",
  schema: SectionSchema,
});

const units = defineCollection({
  type: "data",
  schema: UnitEntrySchema,
});

export const collections = {
  // ...existing
  sections,
  units,
};
```

**Step 3:** Author the YAML files.

```yaml
# examples/smoke/src/content/sections/intro.yaml
type: module
slug: intro
title: "01 — Foundations"
order: 0
description: "Foundation concepts for ASTR 201."
```

```yaml
# examples/smoke/src/content/sections/stars.yaml
type: module
slug: stars
title: "02 — Stars"
order: 1
description: "Stellar structure + evolution."
```

Five Units, one per existing chapter. Sample:

```yaml
# examples/smoke/src/content/units/introducing-the-sky.yaml
id: introducing-the-sky
type: lecture
title: "Introducing the Sky"
order: 0
prereqs: []
section_id: intro
chapter: introducing-the-sky
```

```yaml
# examples/smoke/src/content/units/spectra-and-composition.yaml
id: spectra-and-composition
type: lecture
title: "Spectra & Composition"
order: 0
prereqs: ["logarithms"]
section_id: stars
chapter: spectra-and-composition
```

Repeat for `measuring-the-sky`, `misconception-fixture`, `spoiler-alerts`, `stellar-evolution` with appropriate `section_id` mapping (intro vs. stars) and empty prereqs.

**Step 4:** Smoke build.

```bash
pnpm turbo run build --filter=@sophie/smoke
# expect: still passes
```

**Step 5: Commit.**

```bash
git commit -m "feat(smoke): add sections + units content collections (W1 transitional)"
```

---

## Task 11 — TextbookLayout: wire `setSections` + `setUnits` + `__setSections` + `__setUnits`

**Files:**
- Modify: `packages/astro/src/components/TextbookLayout.astro`

**Step 1:** Add `getCollection("sections")` + `getCollection("units")` reads near the existing `getCollection("chapters")` block (around line 124). Call `indexAccumulator.setSections(...)` + `indexAccumulator.setUnits(...)` BEFORE `asPedagogyIndex()` is snapshotted (around line 175).

**Step 2:** Import `__setSections` + `__setUnits` from `@sophie/components/internal/store-hydration` near line 6-15. Call them after `pedagogy = indexAccumulator.asPedagogyIndex()` resolves, mirroring `__setChapters` / `__setModules` at lines 276-277.

```astro
// imports block
import {
  __setChapters,
  __setEquationCitations,
  __setEquations,
  __setFigureRegistry,
  __setFigureUsages,
  __setGlossaryDefinitions,
  __setModules,
  __setObjectives,
  __setSections,   // NEW
  __setUnits,      // NEW
} from "@sophie/components/internal/store-hydration";

// after getCollection("modules") block (line 125)
const sections: CollectionEntry<"sections">[] = await getCollection("sections");
const units: CollectionEntry<"units">[] = await getCollection("units");

// before asPedagogyIndex (after line 173)
indexAccumulator.setSections(sections.map((s) => s.data));
indexAccumulator.setUnits(units.map((u) => u.data));

// after __setModules (line 277)
__setSections(pedagogy.sections);
__setUnits(pedagogy.units);
```

**Step 3:** Smoke build; add a debug log if needed to verify `pedagogy.sections.length === 2` + `pedagogy.units.length === 5`.

**Step 4: Commit.**

```bash
git commit -m "feat(astro): TextbookLayout wires sections + units from content collections (W1)"
```

---

## Task 12 — Graduate PRA-1 to Unit-aware

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-audit/invariants/retrieval-family.ts`
- Modify: `packages/astro/src/lib/pedagogy-audit/invariants/retrieval-family.test.ts`

**Step 1: Failing tests.**

```ts
describe("PRA-1 (Unit-aware, W1 graduation)", () => {
  it("no finding when UnitEntry.prereqs has SkillReview in the SAME Section", () => {
    const index = buildIndex({
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 1 }],
      units: [{
        id: "u1", type: "lecture", title: "U1", order: 0,
        prereqs: ["logarithms"], section_id: "stars", chapter: "u1-ch",
      }],
      skillReviews: [{
        chapter: "u1-ch", anchor: "sk-1", target_id: "topic:logarithms",
        /* ... */
      }],
    });
    const sink = freshSink();
    checkRetrievalFamily(index, sink);
    expect(sink.warnings.filter((w) => w.code === "PRA-1")).toHaveLength(0);
  });

  it("no finding when SkillReview is in a PRIOR Section (by order)", () => {
    const index = buildIndex({
      sections: [
        { type: "bridge", slug: "math", title: "Math", order: 0 },
        { type: "module", slug: "stars", title: "Stars", order: 1 },
      ],
      units: [
        { id: "math-u1", type: "skill", title: "Logs", order: 0, prereqs: [], section_id: "math", chapter: "math-ch", topic_id: "logarithms" },
        { id: "stars-u1", type: "lecture", title: "Spectra", order: 0, prereqs: ["logarithms"], section_id: "stars", chapter: "spectra-ch" },
      ],
      skillReviews: [{ chapter: "math-ch", anchor: "sk-1", target_id: "topic:logarithms", /* ... */ }],
    });
    const sink = freshSink();
    checkRetrievalFamily(index, sink);
    expect(sink.warnings.filter((w) => w.code === "PRA-1")).toHaveLength(0);
  });

  it("PRA-1 WARN when SkillReview is in a LATER Section", () => {
    // ... assert WARNING fires
  });

  it("PRA-1 WARN when no SkillReview covers the prereq topic anywhere", () => {
    // ... assert WARNING fires
  });

  it("falls back to chapter-level approximation when index has no Units (pre-W1)", () => {
    // ... assert existing chapter-level PRA-1 behavior still works
  });
});
```

**Step 2:** Fail.

**Step 3: Implement** the graduated logic in `checkPRA1`. Use the lookup chain in §D1 of the design doc. Falls back to the chapter-level approximation when `index.units.length === 0`.

```ts
function checkPRA1(index: PedagogyIndex, sink: FindingSink): void {
  // Fall back to chapter-level when index has no Units (pre-W1 consumers).
  if (index.units.length === 0) {
    checkPRA1ChapterLevel(index, sink);
    return;
  }

  const sectionOrder = new Map<string, number>();
  for (const s of index.sections) sectionOrder.set(s.slug, s.order);

  const chapterSectionOrder = new Map<string, number>();
  for (const u of index.units) {
    const ord = sectionOrder.get(u.section_id);
    if (ord !== undefined) chapterSectionOrder.set(u.chapter, ord);
  }

  // section.order -> Set<topic_id> covered by SkillReviews in that order's chapters
  const coverByOrder = new Map<number, Set<string>>();
  for (const sr of index.skillReviews) {
    if (parseTargetPrefix(sr.target_id) !== "topic") continue;
    const ord = chapterSectionOrder.get(sr.chapter);
    if (ord === undefined) continue;
    let s = coverByOrder.get(ord);
    if (s === undefined) {
      s = new Set();
      coverByOrder.set(ord, s);
    }
    s.add(sr.target_id);
  }

  for (const unit of index.units) {
    const unitOrd = sectionOrder.get(unit.section_id);
    if (unitOrd === undefined) continue;
    for (const prereq of unit.prereqs) {
      const target = `topic:${prereq}`;
      let covered = false;
      for (const [ord, covers] of coverByOrder) {
        if (ord <= unitOrd && covers.has(target)) {
          covered = true;
          break;
        }
      }
      if (!covered) {
        sink.warnings.push({
          severity: "WARNING",
          code: "PRA-1",
          message: `PRA-1: Unit "${unit.id}" in Section "${unit.section_id}" declares prereq "topic:${prereq}" but no <SkillReview target="topic:${prereq}"> exists in this Section or any prior Section. Resolution: add a <SkillReview> for this topic in this Section or an earlier one, or remove the prereq if off-scope.`,
          location: { chapter: unit.chapter },
        });
      }
    }
  }
}
```

Extract the existing chapter-level logic into `checkPRA1ChapterLevel(index, sink)` so the fallback is clean.

**Step 4:** Pass.

**Step 5: Commit.**

```bash
git commit -m "feat(audit): graduate PRA-1 to Unit-aware (W1)"
```

---

## Task 13 — Graduate SR-1 to validate `<SpacedReview section="…">` refs

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-audit/invariants/retrieval-family.ts`
- Modify: `retrieval-family.test.ts`

**Step 1: Failing tests.**

```ts
describe("SR-1 (section-validity, W1 graduation)", () => {
  it("no finding when section_id matches a known SectionEntry", () => {
    const index = buildIndex({
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 1 }],
      spacedReviews: [{ chapter: "ch1", anchor: "sp-1", section_id: "stars" /* ... */ }],
    });
    const sink = freshSink();
    checkRetrievalFamily(index, sink);
    expect(sink.errors.filter((e) => e.code === "SR-1")).toHaveLength(0);
  });

  it("SR-1 ERROR when section_id refers to an unknown section", () => {
    const index = buildIndex({
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 1 }],
      spacedReviews: [{ chapter: "ch1", anchor: "sp-1", section_id: "nonexistent" /* ... */ }],
    });
    const sink = freshSink();
    checkRetrievalFamily(index, sink);
    expect(sink.errors.filter((e) => e.code === "SR-1")).toHaveLength(1);
    expect(sink.errors[0].message).toMatch(/unknown section "nonexistent"/);
  });
});
```

**Step 2:** Fail.

**Step 3: Implement.** Extend `checkSR1`:

```ts
function checkSR1(index: PedagogyIndex, sink: FindingSink): void {
  const knownSections = new Set(index.sections.map((s) => s.slug));
  for (const e of index.spacedReviews) {
    // ... existing target_id prefix checks
    if (e.section_id !== undefined && !knownSections.has(e.section_id)) {
      sink.errors.push({
        severity: "ERROR",
        code: "SR-1",
        message: `SR-1: <SpacedReview section="${e.section_id}"> in chapter "${e.chapter}" refers to an unknown section slug. Resolution: ensure src/content/sections/${e.section_id}.yaml exists, or fix the slug.`,
        location: { chapter: e.chapter, anchor: e.anchor },
      });
    }
  }
}
```

**Step 4:** Pass.

**Step 5: Commit.**

```bash
git commit -m "feat(audit): graduate SR-1 to validate <SpacedReview section> refs (W1)"
```

---

## Task 14 — Wire `<SpacedReview section="…">` rendering end-to-end

**Files:**
- Modify: `packages/components/src/components/SpacedReview/SpacedReview.tsx`
- Modify: `packages/components/src/components/SpacedReview/SpacedReview.test.tsx`

**Step 1: Failing test.**

```tsx
it("renders section-scope review across chapters in the same Section", async () => {
  // Hydrate the store with smoke-like sections + units
  __setSections([{ type: "module", slug: "stars", title: "Stars", order: 1 }]);
  __setUnits([
    { id: "u1", type: "lecture", title: "U1", order: 0, prereqs: [], section_id: "stars", chapter: "ch-spectra" },
    { id: "u2", type: "lecture", title: "U2", order: 1, prereqs: [], section_id: "stars", chapter: "ch-evolution" },
  ]);
  await seedAttempt("ch-spectra", "topic:logs", "2026-05-20T00:00:00.000Z");
  await seedAttempt("ch-evolution", "topic:trig", "2026-05-21T00:00:00.000Z");

  render(
    <SpacedReview course="astr201" chapter="ch-spectra" section="stars" max={3} />
  );
  const items = await screen.findAllByTestId("spaced-review-item");
  expect(items).toHaveLength(2);
});
```

**Step 2:** Fail (component returns empty array on section path).

**Step 3: Implement.** Read `useUnits()`; filter by `section_id === section`; collect `unit.chapter` slugs; call `useInteractiveRangeMulti(course, chapters, "practice-attempt:")`; flatten attempts; run `selectLeastRecentlyAttempted({ attempts, max })`.

```tsx
const units = useUnits();
const chaptersInSection = useMemo(() => {
  if (section === undefined) return [] as readonly string[];
  return units.filter((u) => u.section_id === section).map((u) => u.chapter);
}, [units, section]);

const { values: multiValues } = useInteractiveRangeMulti<readonly PracticeAttempt[]>(
  course,
  chaptersInSection,
  PRACTICE_ATTEMPT_PREFIX,
);

// in the section-scope branch of dueTargets:
if (section !== undefined) {
  const allAttempts: Array<{ target_id: string; updated_at: string }> = [];
  for (const list of Object.values(multiValues)) {
    for (const a of list) {
      allAttempts.push({ target_id: a.target_id, updated_at: a.updated_at });
    }
  }
  return selectLeastRecentlyAttempted({ attempts: allAttempts, max });
}
```

**Step 4:** Pass.

**Step 5: Commit.**

```bash
git commit -m "feat(components): wire <SpacedReview section=> rendering via useInteractiveRangeMulti (W1)"
```

---

## Task 15 — Smoke chapter callsite + e2e

**Files:**
- Modify: one smoke chapter MDX (e.g., `examples/smoke/src/content/chapters/02-stars/spectra-and-composition.mdx`)
- Create: `examples/smoke/e2e/spaced-review-section-scope.spec.ts`

**Step 1:** Add a `<SpacedReview client:load course="astr201" chapter="spectra-and-composition" section="stars" max={3} />` callsite to the smoke chapter.

**Step 2:** Author the e2e: visit the chapter, seed practice attempts in two stars-section chapters (via IDB seed), reload, expect 2 review items rendered.

**Step 3:** Kill stale dev server + run e2e.

```bash
lsof -ti:4321 | xargs -r kill -9
pnpm test:e2e --filter=@sophie/smoke
# expect: new spec passes; existing 157+ specs still green
```

**Step 4: Commit.**

```bash
git commit -m "feat(smoke): exercise <SpacedReview section> end-to-end via e2e (W1)"
```

---

## Task 16 — Update `audit-baseline.md` smoke counts

**Files:**
- Modify: `packages/astro/src/lib/pedagogy-audit/audit-baseline.md`

**Step 1:** Run smoke build; capture the audit output.

```bash
pnpm turbo run build --filter=@sophie/smoke
# capture: "X errors, Y warnings, Z infos" from audit report
```

**Step 2:** Update `audit-baseline.md` with the new counts. Document the deltas (PRA-1 firing/quieting based on the new Unit-aware logic; SR-1 quiet because the new smoke fixture's `<SpacedReview section="stars">` ref is valid).

**Step 3: Commit.**

```bash
git commit -m "docs(audit): update audit-baseline.md smoke counts (W1)"
```

---

## Task 17 — Validation-block escalations

**Files:**
- Modify: `docs/website/reference/chapter-components.md`
- Modify: `docs/website/reference/multirep-component.md`
- Modify: `docs/website/reference/intervention-library.md`

**Step 1:** Escalate `status: unvalidated` → `status: in-progress` on each; add an `evidence:` row referencing this PR + the new audit graduations.

**Step 2:** Verify V0–V8 contract-validation invariants don't fire on the new states.

```bash
pnpm turbo run test:unit --filter=@sophie/astro -- contract-validation
```

**Step 3: Commit.**

```bash
git commit -m "docs(validation): escalate chapter-components/multirep/intervention to in-progress (W1)"
```

---

## Task 18 — Regenerate `validation.md` dashboard

**Files:**
- Modify: `docs/website/status/validation.md`

**Step 1:** Run the dashboard regenerator (verify the exact pnpm task — likely `pnpm turbo run validation:regen` or `pnpm exec tsx scripts/regen-validation-dashboard.ts`).

**Step 2: Commit.**

```bash
git commit -m "docs(validation): regenerate validation.md dashboard (W1)"
```

---

## Task 19 — Update `chapter-components.md` with `<SpacedReview section=>` docs

**Files:**
- Modify: `docs/website/reference/chapter-components.md`

**Step 1:** Document the new `<SpacedReview section="…">` rendering path: signature, slot rules, section→chapters lookup behavior, LRU-across-chapters semantics, SR-1 audit error. Cross-reference ADR 0067 and this wedge's design doc.

**Step 2: Commit.**

```bash
git commit -m "docs(reference): document <SpacedReview section> + Section/Unit in PedagogyIndex (W1)"
```

---

## Task 20 — Pre-PR gates

**Step 1:** Lockfile per `feedback_pre_pr_lockfile_check`.

```bash
pnpm install --frozen-lockfile
```

**Step 2:** Biome zero-warning per `feedback_biome_verification`.

```bash
pnpm exec biome check 2>&1 | tee /tmp/biome.log
grep -E "error|warning" /tmp/biome.log | head
# expect: empty
```

**Step 3:** Full turbo build.

```bash
pnpm turbo run build
```

**Step 4:** Full unit tests.

```bash
pnpm turbo run test:unit
```

**Step 5:** Full e2e (kill port 4321 first per `project_local_dev_pagefind_e2e_pitfall`).

```bash
lsof -ti:4321 | xargs -r kill -9
pnpm test:e2e
```

**Step 6:** Smoke build verification.

```bash
pnpm turbo run build --filter=@sophie/smoke
```

---

## Task 21 — Open PR

**Step 1:** Push branch.

```bash
git push -u origin feat/wedge-b-followup
```

**Step 2:** Open PR via `gh pr create`. Title:

```
feat(core+astro+components): Wedge B-followup — Section/Unit in PedagogyIndex + audit graduation + <SpacedReview section> render (W1 of W1→W4)
```

Body references the [design doc](2026-05-22-wedge-b-followup-design.md), the four-wedge sequence, and ADR 0067.

**Step 3:** HITL hand-off — wait for Anna's review before merging. Anna text-confirms each side-effect (push, PR open, merge) per `feedback_no_questions_mode_scope`.

---

## Critical files reference

### Schemas (`@sophie/core`)
- `packages/core/src/schema/section.ts` — existing `SectionSchema`
- `packages/core/src/schema/unit.ts` — existing `UnitSchema`
- `packages/core/src/schema/pedagogy-index.ts` — gains `sections` + `units`
- `packages/core/src/schema/pedagogy-index-entries/index.ts` — barrel
- `packages/core/src/schema/pedagogy-index-entries/section.ts` (NEW)
- `packages/core/src/schema/pedagogy-index-entries/unit.ts` (NEW)

### Build-time (`@sophie/astro`)
- `packages/astro/src/lib/pedagogy-index/accumulator.ts` — gains setSections + setUnits
- `packages/astro/src/lib/pedagogy-audit/invariants/retrieval-family.ts` — PRA-1 + SR-1 graduate
- `packages/astro/src/components/TextbookLayout.astro` — reads + forwards new collections

### Runtime (`@sophie/components`)
- `packages/components/src/internal/store-hydration.ts` — gains __setSections + __setUnits
- `packages/components/src/runtime/useSections.ts` (NEW)
- `packages/components/src/runtime/useUnits.ts` (NEW)
- `packages/components/src/runtime/ResponseStore.ts` — gains getAllMulti
- `packages/components/src/runtime/FallbackResponseStore.ts` — mirrors getAllMulti
- `packages/components/src/runtime/useInteractiveRangeMulti.ts` (NEW)
- `packages/components/src/components/SpacedReview/SpacedReview.tsx` — section-scope render

### Fixtures (`examples/smoke`)
- `examples/smoke/src/content/sections/intro.yaml` (NEW)
- `examples/smoke/src/content/sections/stars.yaml` (NEW)
- `examples/smoke/src/content/units/<5 files>.yaml` (NEW)
- `examples/smoke/src/content/config.ts` — adds sections + units collections
- One chapter MDX modified to add `<SpacedReview section="stars">` callsite
- `examples/smoke/e2e/spaced-review-section-scope.spec.ts` (NEW)

### Docs
- `docs/plans/2026-05-22-wedge-b-followup-design.md` (already created)
- `docs/plans/2026-05-22-wedge-b-followup.md` (this file)
- `docs/website/reference/chapter-components.md`
- `docs/website/reference/multirep-component.md`
- `docs/website/reference/intervention-library.md`
- `docs/website/status/validation.md` (regenerated)
- `packages/astro/src/lib/pedagogy-audit/audit-baseline.md`

---

## Verification gates

| Gate | Command | Expected |
|---|---|---|
| Lockfile drift | `pnpm install --frozen-lockfile` | No drift |
| Biome | `pnpm exec biome check 2>&1 \| grep -E "error\|warning"` | Empty |
| @sophie/core unit | `pnpm turbo run test:unit --filter=@sophie/core` | 434 + ~10 new |
| @sophie/components unit | `pnpm turbo run test:unit --filter=@sophie/components` | 685 + ~20 new |
| @sophie/astro unit | `pnpm turbo run test:unit --filter=@sophie/astro` | 780 + ~15 new |
| @sophie/theme unit | `pnpm turbo run test:unit --filter=@sophie/theme` | 29 (unchanged) |
| Smoke build | `pnpm turbo run build --filter=@sophie/smoke` | 12+ pages, sections=2, units=5 |
| E2E | `lsof -ti:4321 \| xargs -r kill -9; pnpm test:e2e` | 157+/0/5 (+1 new spec) |
| Full turbo build | `pnpm turbo run build` | All green |

---

## Out of scope (deferred to W2 / W3 / W4)

See [design doc §5](2026-05-22-wedge-b-followup-design.md#5-out-of-scope-for-w1) for the full out-of-scope list. Headline deferrals:

- **W2** — File-layout migration: smoke chapter MDX MOVES into `sections/<id>/units/<id>/reading.mdx`. ChapterEntry + ModuleEntry deleted; ArtifactEntry surfaces.
- **W3** — Per-callsite key rename `chapter` → `unit` on all ~13 entry schemas. UnitEntry.chapter + UnitEntry.lecture field NAMES stay (their values point at the post-W2 artifact slugs).
- **W4** — Library room + bridge rooms + 8 registry Spec pages + `<SkillReview>` self-closing form.
- RET-1 word-count-ratio, FSRS scheduler (Wedge D), BKT mastery (Wedge E), Cockpit (ADR 0076), auth-server identity (post-launch).

---

## Execution handoff

**Option A — Subagent-driven execution (recommended for W1).** Dispatch a fresh subagent per task; review between tasks via `superpowers:code-reviewer`. Uses `superpowers:subagent-driven-development`. Best fit for W1 because tasks are interdependent (schema → accumulator → store → component → audit → fixture → e2e) and review-between catches drift early.

**Option B — Batch execution (alternative).** Use `superpowers:executing-plans` with batch size 3. Report after each batch.

Default recommendation: **Option A**.
