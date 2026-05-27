# Formative-Assessment v1 + Reading-Hardening Fast Wins — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Every PR carries full Sophie platform discipline per AGENTS.md (W1–W4, R6–R12, zero biome warnings, axe-on-render for every component). HITL mandate applies: confirm before every push / PR / issue / branch side-effect.

**Goal:** Ship the formative-assessment family (six components + two shared reveals + practice route + audit invariants) as ADR 0073 Amendment 1, plus four independent reading-hardening fast wins from the ASTR 201 Modules 1–4 migration. v1 renders + reveals; grading deferred but seamed.

**Architecture:** Two tracks across **12 PRs**. Track A is one ADR amendment + eight bottom-up PRs that ship six MDX formative components (`<MCQ>`, `<MultiSelect>`, `<FillBlank>`, `<NumericQuestion>`, `<QuickCheck>`, `<PracticeProblem>`) and two shared reveal primitives (`<Solution>`, `<Hint>`), backed by a new `formatives` pedagogy-index bucket with five audit invariants (AS-1..AS-5), rendered via an injected `/units/[unit]/practice` route alongside an N-tab `Reading | Slides | Practice` link-bar in `<ChapterLayout>`. Track B is four independent fast wins: `<Video>` (closes ADR 0064 gap), author-trap lint extension, audit-error DX, figures.ts duplicate-key guard. Foundational shape: **compile-time parent-prop threading** via `sophieAutoImportsRemarkPlugin` (shipped PR 4) — only `<MCQ>` / `<MultiSelect>` / `<FillBlank>` / `<NumericQuestion>` / `<QuickCheck>` / `<PracticeProblem>` declare `course/unit/id`; the remark plugin walks the MDX AST at compile time and threads those values onto every nested `<Solution>` / `<Hint>` as `course` / `unit` / `parentId` props (curated MDX-compile error when missing); answer-contract as discriminated union materialized by the extractor onto `FormativeEntry`; grading + retrieval-unification + cross-unit `<Assignment>` deferred to v2 with the seam locked in §v2-foreshadowing.

**Tech stack:** Sophie monorepo — pnpm + Turborepo (per ADR 0011/0014); Astro 6 + `@astrojs/mdx`; React 19 islands per ADR 0001/0027; Zod v4 schemas per ADR 0003; Radix UI primitives per ADR 0019 (adds `@radix-ui/react-radio-group` + `@radix-ui/react-checkbox` to the existing six); IndexedDB persistence via `useInteractive` per ADR 0007; Biome lint + format per ADR 0013; Vitest + axe-core test discipline per ADR 0004 + R11.

---

## Context — why this work, now

The ASTR 201 Modules 1–4 reading migration (23 readings across 4 modules; `pilots/m1-l*` through `pilots/m4-l*` records) surfaced the same gaps repeatedly. Ranked by leverage from the validated design doc at [`docs/plans/2026-05-27-formative-assessment-design.md`](../../Teaching/sophie/docs/plans/2026-05-27-formative-assessment-design.md):

1. **`practice.mdx` is authored-but-unrouted** (issue #189) — every reading with a practice section (M3-L10 + all three M4 readings, ~35 problems) builds clean but never renders for students. Highest concrete waste.
2. **No single-best-answer MCQ component** (issue #204) — the `:::{.quiz}` block in three M4 readings remapped to a `tip`-Callout + ballot-box bullets + `<Dropdown>`. Raw GFM task-list would throw one axe `label` violation per option.
3. **No "Quick Check" component** — `tip`-Callout + `<Dropdown label="Answer">` appears dozens of times across the course; one reusable self-check shape.
4. **No structured answer / solution / hint model.**
5. **`<Video>` is unbuilt** (ADR 0064 known gap) — 4+ readings became link-Callout workarounds.
6. **Author-trap lint** misses `<` before a letter inside math (`<3,700`, `$v_r<0$`, `M(<r)`); also scans comments.
7. **Pedagogy-audit DX**: throw at end-of-build is generic; the `[ERROR Rxx]` detail prints far up the log — scroll-and-grep per error.
8. **`figures.ts` duplicate-key collisions** break builds; caught manually three times only by disciplined grep.

ADR 0073 (`docs/website/decisions/0073-unified-assessment-schema.md`) already locks the full Assessment + Rubric + BKT design as `accepted-design`. This work ships **as Amendment 1 to ADR 0073**, locking the formative-with-reveal v1 wave as a strict subset of the existing schema. Grading, attempt-tracking, BKT, the `<Assignment>` shape, and the `<RetrievalPrompt>`-as-MCQ-wrapper unification are all deferred to v2 but the seams are explicit in §v2-foreshadowing.

## Lessons from PR 4 — architectural pivot (READ BEFORE PRs 5–9)

PR 4 shipped a different architecture than this plan originally described. The author-surface contract is unchanged — consumer-course MDX still writes `<PracticeProblem course unit id>` with bare `<Solution>` / `<Hint>` children — but the **implementation moved from a runtime React Context to a compile-time remark plugin**. This is a meaningful design change, not a minor adjustment. The full design now lives in [ADR 0073 Amendment 1 §3](../website/decisions/0073-unified-assessment-schema.md#amendment-1-section-3-author-surface-and-parent-prop-threading) and [`docs/website/reference/formative-assessment-authoring.md`](../website/reference/formative-assessment-authoring.md); this section is the in-plan summary for future-Anna landing on PRs 5–9 after a context gap.

**Why the pivot.** The original plan threaded `course/unit/parentId` from `<PracticeProblem>` to nested `<Solution>` / `<Hint>` via a `FormativeContext` React provider. Empirically does not work in Astro's MDX island model: each top-level MDX JSX tag SSRs as its own React tree, so React Context cannot span sibling islands. The `experimentalReactChildren: true` Astro flag does NOT fix this for compound formative-family blocks. `useFormativeContext` threw on every `<Solution>` during smoke SSR.

**The fix — `sophieAutoImportsRemarkPlugin`** at [`packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts`](../../packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts) does THREE jobs at MDX compile time:

1. **Auto-injects `import { … } from "@sophie/components"`** for any used Sophie interactive or content-only component (registries: `SOPHIE_INTERACTIVE_COMPONENTS`, `SOPHIE_CONTENT_AUTO_IMPORT`).
2. **Auto-injects `client:load`** as a boolean-presence attribute on interactive components (unless author already declared a different client directive).
3. **Walks formative-parent blocks and threads `course`/`unit`/`parentId` to nested `<Solution>` / `<Hint>` descendants** — registries: `SOPHIE_FORMATIVE_PARENTS` (all six v1 parents pre-registered) and `SOPHIE_FORMATIVE_CHILDREN` (`Solution`, `Hint`). Curated MDX-compile error names the file + parent when `course`/`unit`/`id` is missing.

**What this means for PRs 5–9 (compound effect — read every bullet):**

- **The plugin's formative-parent registry is ALREADY COMPLETE.** All six v1 parents (`PracticeProblem`, `MCQ`, `MultiSelect`, `FillBlank`, `NumericQuestion`, `QuickCheck`) are pre-registered in `SOPHIE_FORMATIVE_PARENTS`. When PRs 5–9 ship those parent components, **the plugin already knows about them — no plugin changes needed in those PRs.**
- **Drop all `FormativeContext` / `FormativeProvider` / `useFormativeContext` references** from PR 5–9 designs. The components accept explicit `course` / `unit` / `parentId` props; the plugin supplies them at compile time. No provider element appears in the rendered tree.
- **Tests pass explicit props.** Component tests no longer need a `<FormativeProvider>` wrapper; pass `course`/`unit`/`parentId` directly. Storybook stories do the same.
- **Formative-family components do NOT register in `makeStaticComponents`.** Static-mapped components can't carry `client:load` (the map doesn't carry hydration metadata), and `useInteractive` hydration is mandatory for store-backed reveals. Components that hydrate inside MDX MUST flow through the auto-imports plugin — i.e., be registered in `SOPHIE_INTERACTIVE_COMPONENTS`. **Per ADR 0058 §R-0080-A2, formative-family components are also excluded from `makeChromeComponents` (chrome ≠ pedagogy).**
- **No runtime `course`/`unit`/`id` validation on formative parents.** When a parent is missing `course`/`unit`/`id`, the plugin throws an MDX-compile-time error with file:line position — better DX than a runtime React Context throw. Parent components should NOT re-validate at render time (unreachable; plugin catches first).
- **Path-shape correction.** Use `segs[1] === "units" && segs[2] === unit` when parsing artifact paths (PR 3 correction); the original plan's `segs[0] === "sections"` shape is wrong.
- **Storybook VR baseline workflow** recurs per PR: after first CI run on a PR adding new stories, trigger `vr-update.yml` GitHub Actions workflow to seed baselines, then push a no-op commit to re-trigger CI and pick up the baselines.
- **Pedagogy-index extractor unchanged in design.** PR 5 still creates `packages/astro/src/lib/pedagogy-index/extractors/formative.ts`. The plugin runs BEFORE the extractor in the MDX pipeline; by the time the extractor walks the tree, `course` / `unit` / `parentId` are already present on children. The extractor doesn't change architecture — it just emits `FormativeEntry` records from the (now-pre-threaded) AST.

**Net effect:** PRs 5–9 task lists shrink — the cross-cutting infrastructure (auto-imports, client:load injection, parent-prop threading, plugin registry) already exists. Per-component PR scope is now: component + tests + storybook + (for PR 5+) the formative pedagogy-index extractor + audit invariant + any §v2-foreshadowing-relevant ADR 0073 Amendment 1 updates.

---

## Cross-cutting conventions (apply on every PR)

| Rule | Enforcement |
|---|---|
| Zero biome warnings | `pnpm biome check` — full output grep for "warning" + "error"; tail-only insufficient (per `feedback_biome_verification.md` memory) |
| axe-on-render (R11) | Every `*.test.tsx` calling `render(` must also call `axe(` / `AxeBuilder` / `toHaveNoViolations`; `pnpm lint:axe-render` gate |
| Component contract (ADR 0004) | `*.schema.ts` + `*.contract.ts` + `*.test.tsx` + `*.stories.tsx` siblings per component dir |
| `course/unit/id` props (ADR 0027) | Persistence-bearing components require all three; declared on the formative-family parent only — `<Solution>` / `<Hint>` receive `course` / `unit` / `parentId` props threaded by `sophieAutoImportsRemarkPlugin` at MDX compile time (NOT React context — see "Lessons from PR 4" above) |
| `client:load` mandatory (ADR 0038 §A2) | All store-backed components hydrate as islands; SSR fallback via `useHydrated()`. In consumer-course MDX, `client:load` is **auto-injected by `sophieAutoImportsRemarkPlugin`** for components registered in `SOPHIE_INTERACTIVE_COMPONENTS` — authors write none. Author-declared `client:visible` / `client:idle` / `client:only` / `client:media` always wins |
| Author-surface imports | Consumer-course MDX writes zero `import` statements and zero `client:*` directives. `sophieAutoImportsRemarkPlugin` injects both at compile time. **When adding a new interactive component, register it in `SOPHIE_INTERACTIVE_COMPONENTS` in [`packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts`](../../packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts) (and `SOPHIE_FORMATIVE_PARENTS` if it owns a formative-family namespace)** |
| MyST anchor verification (R6) | Cited ADR sections use heading-slug, not `#L\d+` — grep `docs/website/**/*.md` for `#L[0-9]+` |
| Silent-skip extractor disposition (R7) | Every silent-skip filter has paired audit invariant OR `findings.push` at filter site |
| Canonical `FindingSink` (R9-production) | One `interface FindingSink` declaration per `packages/*/src/`; tests prefer canonical import |
| Landmark choice (R10) | Components nested under existing landmark use `<section aria-labelledby={...}>`; never `<main>`, `<article>`, or bare `<div>` |
| Virtual-module narrowing (R12) | Dispatcher routes that import nullable `virtual:sophie/*` exports open frontmatter with `if (!X) throw` |
| Docs don't drift from code | Any code change touching `docs/website/` updates docs in same PR |
| MyST build verification | `npx mystmd build --html` then `grep -c "⚠"` on output — emoji-only, NOT `(error|warning)` (Node deprecation noise) |
| Validation-dashboard regen | Any ADR `status:` / `validation:` change regenerates `docs/website/status/validation.md` (I3 integration test on the unit job) |
| Pre-PR lockfile check | `pnpm install --frozen-lockfile` locally before opening any deps-touching PR |
| Branch + PR scope | Code changes use full PR flow + squash-merge per ADR 0055; pure docs/reviews/registry updates land directly on `main` |

**HITL gates:** Every push, PR creation, PR merge, issue creation, branch deletion needs explicit text confirmation from Anna in-thread. The Sophie no-questions-mode scope feedback memory explicitly excludes side-effects from autonomous execution.

---

## Task 0 — Copy this plan into the repo audit trail

**Files:**
- Create: `/Users/anna/Teaching/sophie/docs/plans/2026-05-27-formative-assessment-implementation.md`

**Step 1:** Copy `/Users/anna/.claude/plans/sophie-platform-session-design-soft-matsumoto.md` → `/Users/anna/Teaching/sophie/docs/plans/2026-05-27-formative-assessment-implementation.md`.

**Step 2:** Add the file to the next PR's diff (typically PR 1's branch); the docs/plans/ entry lands directly on `main` per the docs-no-PR scope rule, OR rides PR 1's branch — Anna's call at PR-1 creation time.

**Step 3:** Verify the design doc at `docs/plans/2026-05-27-formative-assessment-design.md` and this implementation plan cross-link each other (add a `[Implementation plan](2026-05-27-formative-assessment-implementation.md)` link at the top of the design doc; reverse link in this plan's header).

---

## PR 1 (Track B) — `<Video>` component

Closes the ADR 0064 known gap (4+ readings shipped video-as-link workaround). Confidence-builder per the design doc's recommended order. Independent: ships before Track A's ADR 0073 Amendment 1 to seed momentum.

**Branch:** `feat/video-component`
**Squash-merge per ADR 0055.**

### Files

| Action | Path |
|---|---|
| Create | `packages/components/src/components/Video/Video.tsx` |
| Create | `packages/components/src/components/Video/Video.schema.ts` |
| Create | `packages/components/src/components/Video/Video.contract.ts` |
| Create | `packages/components/src/components/Video/Video.module.css` |
| Create | `packages/components/src/components/Video/Video.test.tsx` |
| Create | `packages/components/src/components/Video/Video.stories.tsx` |
| Modify | `packages/components/src/index.ts` (barrel export) |
| Modify | `packages/astro/src/components.tsx` (`makeStaticComponents` adds `Video`) |
| Modify | `docs/website/reference/chapter-components.md` (add `<Video>` row in "Static" table; add usage example in "When to use each component") |
| Modify | `docs/website/decisions/0064-chapter-migration-playbook.md` (close the §3 video-gap mention with a "✅ Closed" pointer to PR 1) |

### Design — privacy-light, axe-clean iframe embed

`<Video>` is a **static** Astro-rendered component (no IDB; no React hydration). Privacy-light defaults:

- Default source = YouTube `?rel=0&modestbranding=1` privacy-enhanced `nocookie` host (`https://www.youtube-nocookie.com/embed/<id>`); explicit `provider` prop overrides (`"youtube" | "vimeo" | "raw"`).
- Required `title` prop for axe (`frame-title` rule); injected as `<iframe title="…">`.
- Required `caption` prop renders as `<figcaption>` (matches `<Figure>` semantics).
- Optional `credit` prop renders below caption.
- `loading="lazy"` + `referrerpolicy="strict-origin-when-cross-origin"` defaults.
- Renders as `<figure>` with `aria-labelledby={captionId}` per R10 (nested under `<main>` landmark).

### Tasks

**Task 1.1: Write schema + contract.**

```ts
// Video.schema.ts
import { z } from "zod";
import { NonEmptyString } from "@sophie/core/schema/primitives";

export const VideoProviderSchema = z.enum(["youtube", "vimeo", "raw"]);

export const VideoPropsSchema = z.object({
  id: NonEmptyString.optional(),         // For provider-hosted (youtube/vimeo)
  src: z.string().url().optional(),      // For provider: raw (full iframe URL)
  provider: VideoProviderSchema.default("youtube"),
  title: NonEmptyString,                 // a11y: iframe title
  caption: NonEmptyString,               // visible caption
  credit: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
}).strict().refine(
  (v) => (v.provider === "raw" ? v.src !== undefined : v.id !== undefined),
  { message: "Video: provider='raw' requires `src`; provider='youtube'|'vimeo' requires `id`." }
);

export type VideoProps = z.infer<typeof VideoPropsSchema>;
```

```ts
// Video.contract.ts
export const VideoContract = {
  name: "Video",
  static: true,
  persistence: false,
  pedagogyIndex: false,
  epistemicRole: undefined, // chrome per ADR 0058
} as const;
```

**Task 1.2: Write failing axe-clean render test.**

```tsx
// Video.test.tsx
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, it, expect } from "vitest";
import { Video } from "./Video.tsx";

describe("<Video>", () => {
  it("renders YouTube privacy-light iframe with title + caption", () => {
    const { getByTitle, getByText } = render(
      <Video id="abc123" title="Crash Course: Galaxies" caption="Tour of galactic morphology" />
    );
    const iframe = getByTitle("Crash Course: Galaxies") as HTMLIFrameElement;
    expect(iframe.src).toContain("youtube-nocookie.com/embed/abc123");
    expect(iframe.getAttribute("loading")).toBe("lazy");
    expect(getByText("Tour of galactic morphology")).toBeInTheDocument();
  });

  it("supports vimeo provider", () => { /* … */ });
  it("supports raw provider with arbitrary src", () => { /* … */ });
  it("renders optional credit below caption", () => { /* … */ });
  it("throws curated schema error when both id and src are missing", () => { /* … */ });

  it("has zero axe violations", async () => {
    const { container } = render(
      <Video id="abc123" title="Crash Course: Galaxies" caption="Tour of galactic morphology" />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
```

Run: `pnpm turbo run test --filter=@sophie/components -- Video` → expect FAIL ("Video is not defined").

**Task 1.3: Write minimal implementation.**

```tsx
// Video.tsx
import { useId } from "react";
import { VideoPropsSchema, type VideoProps } from "./Video.schema.ts";
import styles from "./Video.module.css";

function resolveSrc(p: VideoProps): string {
  if (p.provider === "raw") return p.src!;
  if (p.provider === "vimeo") return `https://player.vimeo.com/video/${p.id}?dnt=1`;
  return `https://www.youtube-nocookie.com/embed/${p.id}?rel=0&modestbranding=1`;
}

export function Video(props: VideoProps) {
  const parsed = VideoPropsSchema.parse(props); // throws curated error on misuse
  const captionId = useId();
  const src = resolveSrc(parsed);
  return (
    <figure className={styles.root} aria-labelledby={captionId}>
      <div className={styles.frame}>
        <iframe
          src={src}
          title={parsed.title}
          width={parsed.width}
          height={parsed.height}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <figcaption id={captionId} className={styles.caption}>
        {parsed.caption}
        {parsed.credit && <span className={styles.credit}> — {parsed.credit}</span>}
      </figcaption>
    </figure>
  );
}
```

**Task 1.4: Write minimal CSS.**

```css
/* Video.module.css */
.root { margin: var(--sophie-space-4) 0; }
.frame { position: relative; aspect-ratio: 16/9; }
.frame > iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; border-radius: var(--sophie-radius-md); }
.caption { font-size: var(--sophie-font-size-sm); color: var(--sophie-color-text-muted); margin-top: var(--sophie-space-2); }
.credit { font-style: italic; }
```

**Task 1.5: Run tests, expect PASS.** `pnpm turbo run test --filter=@sophie/components -- Video`.

**Task 1.6: Wire into `makeStaticComponents`.** Add `Video` to the returned map at [packages/astro/src/components.tsx](../../Teaching/sophie/packages/astro/src/components.tsx). Update both `makeStaticComponents` AND `makeChromeComponents` (Video is chrome per ADR 0058 §R-0080-A2 — usable in chapter MDX and course-info prose).

**Task 1.7: Update barrel.** Add `export * from "./components/Video/Video.tsx";` to `packages/components/src/index.ts`.

**Task 1.8: Write Storybook story.** Three stories: `YouTube`, `Vimeo`, `Raw`. Used by Chromatic baselines.

**Task 1.9: Update chapter-components reference doc.**

In [`docs/website/reference/chapter-components.md`](../../Teaching/sophie/docs/website/reference/chapter-components.md):
- Add `<Video>` row to "Static (Astro-rendered)" table.
- Add `<Video>` row to "When to use each component" table.
- Add usage example with three providers.

**Task 1.10: Close the ADR 0064 gap mention.** In `docs/website/decisions/0064-chapter-migration-playbook.md`, update §3 with a "✅ Closed by PR #N (2026-05-NN) — `<Video>` ships with privacy-light defaults" line.

**Task 1.11: Run full local verification gate.**

```bash
pnpm biome check                          # zero warnings
pnpm turbo run typecheck                  # zero errors
pnpm turbo run test                       # all packages green
pnpm turbo run lint                       # axe-render gate clean
pnpm --filter smoke build                 # prod build clean
npx mystmd build --html                   # docs build
grep -c "⚠" docs/website/_build/html/...  # zero MyST content warnings (emoji only)
```

**Task 1.12: Commit + open PR.** **HITL confirm before push.** PR title `feat: <Video> component closing ADR 0064 gap`. Body cites the four reading callsites that will adopt it in the astr201 follow-on pass.

---

## PR 2 (Track A) — ADR 0073 Amendment 1: formative-with-reveal v1 schema

ADR-first per the design doc. No code changes; pure design/documentation. Lands as the single citation point for PRs 3–9.

**Branch:** `docs/adr-0073-amendment-1-formative-v1`
**Per AGENTS.md scope rule:** this is a code-adjacent ADR change, so it goes through the full PR flow (not direct-to-main like pure docs).

### Files

| Action | Path |
|---|---|
| Modify | `docs/website/decisions/0073-unified-assessment-schema.md` (add Amendment 1 section) |
| Modify | `docs/website/status/validation.md` (regen after ADR `validation:` block changes) |
| Modify | `docs/website/reference/chapter-components.md` (add empty "Formative family (v1, ADR 0073 Amendment 1)" section ahead of the components landing — sets the docs-no-drift contract) |
| Create | `docs/website/reference/formative-assessment-authoring.md` (author-facing how-to, parallel to other `reference/` how-tos) |
| Modify | `AGENTS.md` (add ADR 0073 to the "Locked decisions — most-cited ADRs" table) |

### Amendment 1 outline (Anna will draft the prose; this scopes the contents)

**Title:** *"Amendment 1 — Formative-with-reveal v1 surface (2026-05-NN): six MDX components + two shared reveals + practice route + AS-1..5 audit invariants. Grading, attempt-tracking, BKT, `<Assignment>`, and `<RetrievalPrompt>`-as-wrapper unification deferred to v2."*

**Sections to lock:**

1. **Scope (v1 is a strict subset of the locked ADR 0073 design).** v1 ships `Assessment[type=practice]` only; `Rubric`, `BKTState`, all eight auto-grading item-graders, the `submission` block, the `schedule`/`stakes` blocks: **all deferred to v2**. The schema field `Assessment.type` is locked at v1 to the literal `"practice"` only; v2 widens to the full four-variant union.

2. **The six v1 MDX components + two shared reveals.**
   - `<MCQ>` — single-best-answer; Radix RadioGroup; AS-1 (ERROR: exactly one `correct`).
   - `<MultiSelect>` — select-all-that-apply; Radix Checkbox; AS-5 (ERROR: ≥1 `correct`).
   - `<FillBlank>` — text-fill with inline slots; AS-3 (WARN: ≥1 `<FillBlank.Slot>`).
   - `<NumericQuestion>` — numeric answer + tolerance + unit; AS-4 (ERROR: exactly one `<NumericQuestion.Answer>`).
   - `<QuickCheck>` — free-response, solution-only.
   - `<PracticeProblem>` — bare practice shell (context owner for `<Solution>`/`<Hint>` when no MCQ/etc. wraps).
   - `<Solution>` — shared reveal primitive; persistence key `solution:${parentId}:open`.
   - `<Hint number={N}>` — shared progressive reveal; persistence key `hint:${parentId}:${n}:open`.

3. **Author surface — compile-time parent-prop threading.** Only the six formative-family parents declare `course`/`unit`/`id`; `<Solution>` / `<Hint>` receive `course` / `unit` / `parentId` props injected at MDX-compile time by `sophieAutoImportsRemarkPlugin` (shipped PR 4 — see "Lessons from PR 4" callout). When a parent is missing `course`/`unit`/`id` the plugin throws a curated MDX-compile error with file:line position (better DX than the originally-planned runtime React Context throw, which empirically does not work across Astro MDX islands). The IDB namespace is owned by the formative item; reveals share it.

4. **Answer contract — JSX-native + index-normalized discriminated union.** Authors type boolean-presence (`<MCQ.Choice correct>`) or value attributes (`<NumericQuestion.Answer value={…} tolerance={…} />`). The extractor materializes a typed `FormativeAnswer` discriminated union onto `FormativeEntry`:

   ```ts
   type FormativeAnswer =
     | { type: "single-choice"; correct: string }
     | { type: "multi-choice"; correct: string[] }
     | { type: "fill-blank"; blanks: Array<{ id: string; correct: string }> }
     | { type: "numeric"; value: number; tolerance: number; toleranceKind: "absolute" | "relative"; unit?: string }
     | { type: "solution-only" };
   ```

5. **Pedagogy-index bucket + audit invariants.** New `PedagogyIndex.formatives: readonly FormativeEntry[]`. Five invariants:
   - **AS-1 (ERROR)** — `<MCQ>` has exactly one `correct` choice.
   - **AS-2 (WARN)** — formative item has no `<Solution>` (authored-but-answerless gap; parallels the silently-missing-Aside class).
   - **AS-3 (WARN)** — `<FillBlank>` has zero `<FillBlank.Slot>` children.
   - **AS-4 (ERROR)** — `<NumericQuestion>` has exactly one `<NumericQuestion.Answer>` child.
   - **AS-5 (ERROR)** — `<MultiSelect>` has at least one `correct` choice.

6. **Practice route.** `/units/[unit]/practice` injected via `@sophie/astro` mirroring the reading route per ADR 0082. Renders `practice.mdx` through `makeStaticComponents`. Issue #189 warning retires; the warning file is deleted in PR 3.

7. **`<ChapterLayout>` link-bar.** N-tab affordance from day one (`Reading | Slides | Practice`); slides slot in when their ADR ships. Conditional render on artifact presence. Trailing CTA at end of `reading.astro` ("→ Practice this lecture").

8. **Stable anchors.** Every formative-family parent accepts an optional `id` prop overriding the `form-${counter}` auto-anchor. Auto-counter is fine for v1 (no cross-unit references yet); the explicit `id` shape is the v2-readiness on-ramp for cross-unit Assignment references.

9. **§v2-foreshadowing.** Three locked design seams:
   - **`<Assignment>` references practice items by `(unitId, anchor)` tuples across multiple units** — not by intra-unit anchor list, not by inline item authoring. The `FormativeEntry.unit + .anchor` shape is the cross-unit reference seam. Assignments live at a course-level route (`/assignments/[id]`), NOT under `/units/[unit]/`; the per-unit link-bar stays Reading|Slides|Practice.
   - **`<RetrievalPrompt>` widens to wrap any formative child** (`<MCQ>`/`<MultiSelect>`/`<FillBlank>`/`<NumericQuestion>`/`<QuickCheck>`). The retrieval-family components own the spaced-review/skill-bridge machinery; the formative-family components own the question content. v2 PR rewrites `<RetrievalPrompt>`'s children-mode while preserving existing target-prop semantics; `useRetrievalAttempt` attempt-record shape gains a discriminated union over the formative answer types.
   - **Grading turns on by reading `FormativeEntry.answer` from the index** + wrapping the runtime components in `useInteractive` attempt-tracking. The v2 attempt-tracking layer reads `course` / `unit` / `parentId` from the **compile-time-threaded props** the remark plugin injected (PR 4 pivot) — not from a runtime React context. No call-site changes. BKT updates per ADR 0073 §"BKT mastery model" key attempts by `(student, formative.id)`.

10. **What v1 explicitly does NOT do.** Auto-grading; attempt tracking; score persistence; `<Assignment>` MDX component; `<RetrievalPrompt>` body widening; per-choice feedback on MCQ; self-grade-after-reveal ("got it / partial / missed"); ordering / matching / categorization / diagram-labeling questions; numeric-tolerance enforcement; submission flow; `Rubric` / `Criterion`. All listed in the design doc's "Deferred (YAGNI, revisit later)" + this amendment's deferred set.

11. **PR sequencing locked.** The 12-PR sequence in this implementation plan is appendix-referenced from this amendment. Each formative-family PR cites Amendment 1 as the design source.

12. **Validation block.** `status: accepted-amendment-1`; `validation: in-progress` (graduates to `validated` when all PRs 3–9 ship + adoption pass lands).

### Tasks

**Task 2.1: Re-read existing ADR 0073** to ensure Amendment 1 prose nests cleanly under the existing `## Decision` / `## Consequences` shape; do not contradict the locked broader vision.

**Task 2.2: Draft Amendment 1 prose** in `docs/website/decisions/0073-unified-assessment-schema.md`, appended after the existing `## References` section as `## Amendments` / `### Amendment 1 — Formative-with-reveal v1 (2026-05-NN)`. Match the structural style of ADR 0080 Amendment 2 (the precedent for "clean-break amendment to an accepted ADR" — see `docs/website/decisions/0080-course-spec-format-v0-1.md`).

**Task 2.3: Update the ADR's frontmatter `validation:` block** with `status: accepted-amendment-1`; add Amendment 1 evidence entries pointing at PRs 3–9 as they materialize (start with placeholder "to be backfilled by PRs N").

**Task 2.4: Regenerate `docs/website/status/validation.md`** per AGENTS.md "Validation-dashboard regen on ADR status change". `pnpm turbo run gen:validation` (or whatever the dashboard-regen script is — find via `grep "validation\.md" packages/astro/scripts/` if not in turbo).

**Task 2.5: Create the author-facing how-to** at `docs/website/reference/formative-assessment-authoring.md`. Sections: when-to-use each of the six components; the parent-context discipline; the `<Solution>` / `<Hint>` reveal pattern; stable-anchor authoring for v2-readiness; common authoring traps. Initial version can be skeletal — PRs 3–9 fill in real callsite examples as components ship.

**Task 2.6: Update `chapter-components.md`** with a "Formative family (v1, ADR 0073 Amendment 1)" section header reserving space for the six components landing in subsequent PRs. Cross-link to the new authoring how-to.

**Task 2.7: Update `AGENTS.md`** — add ADR 0073 to "Locked decisions — most-cited ADRs" table with a one-line summary: *"Amendment 1: formative-with-reveal v1 — six components + two reveals + practice route + AS-1..5; grading deferred."*

**Task 2.8: MyST build verification.** `cd docs/website && npx mystmd build --html && grep -c "⚠" _build/html/**/*.html`. Zero MyST content warnings.

**Task 2.9: Commit + open PR.** **HITL confirm before push.** PR title `docs(adr): 0073 Amendment 1 — formative-with-reveal v1 schema`. Body anchors the PR sequence to follow.

---

## PR 3 (Track A) — Practice route + N-tab link-bar + #189 retirement

Ships the practice-route plumbing **before** any of the new components, so the visibility fix lands immediately for the ~35 existing prose practice problems across M3-L10 + M4. The link-bar is N-tab-ready from day one (Reading|Slides|Practice; only the available views render).

**Branch:** `feat/practice-route-and-link-bar`

### Files

| Action | Path |
|---|---|
| Create | `packages/astro/src/routes/practice.astro` |
| Create | `packages/astro/src/components/UnitViewLinkBar.astro` |
| Modify | `packages/astro/src/components/ChapterLayout.astro` (slot the link-bar at the top; add the trailing CTA) |
| Modify | `packages/astro/src/integration.ts` (add `injectRoute` for practice; delete the #189 warning emitter call) |
| Delete | `packages/astro/src/lib/integration/practice-mdx-warning.ts` (#189 retires) |
| Delete | `packages/astro/src/lib/integration/practice-mdx-warning.test.ts` |
| Create | `packages/astro/src/components/UnitViewLinkBar.test.ts` (unit tests for the available-views computation) |
| Create | `examples/smoke/src/content/sections/foundations/units/chrome-primitives-demo/practice.mdx` (smoke fixture exercising the bare-prose practice render path) |
| Create | `examples/smoke/e2e/practice-route.spec.ts` (Playwright e2e: navigate Reading → Practice via link-bar; back via tab; trailing CTA links to practice) |
| Modify | `docs/website/decisions/0082-chapter-layout-extraction.md` (add a revision entry: R-practice-route — practice route injected per Amendment 1 to ADR 0073) |
| Modify | `docs/website/reference/chapter-components.md` (the §"`practice.mdx` deferral" section — rewrite from "no route yet" to "renders at `/units/<unit>/practice`"; close the #189 cross-link) |

### Design — `practice.astro` mirrors `reading.astro`

```astro
---
// packages/astro/src/routes/practice.astro
import { makeStaticComponents } from "@sophie/astro";
import { getCollection, render } from "astro:content";
import { figures } from "virtual:sophie/figures";
import ChapterLayout from "../components/ChapterLayout.astro";

const components = makeStaticComponents({ figures });

export async function getStaticPaths() {
  const artifacts = await getCollection("artifacts");
  const units = await getCollection("units");
  const draftUnitIds = new Set(
    units.filter((u) => u.data.status === "draft").map((u) => u.data.id)
  );
  const practices = artifacts.filter(
    (a) => a.id.endsWith("/practice") && !draftUnitIds.has(a.id.split("/")[2] ?? "")
  );
  return practices.map((artifact) => {
    const unitId = artifact.id.split("/")[2] ?? "";
    return { params: { unit: unitId }, props: { artifact } };
  });
}

const { artifact } = Astro.props;
const { Content, headings } = await render(artifact);
---

<ChapterLayout
  frontmatter={artifact.data}
  currentChapterSlug={artifact.data.id}
  headings={headings}
  viewKind="practice"
>
  <Content components={components} />
</ChapterLayout>
```

`<ChapterLayout>` gains a `viewKind?: "reading" | "slides" | "practice"` prop (default `"reading"`) so the link-bar knows which tab is `aria-current`. The reading route at `packages/astro/src/routes/reading.astro` passes `viewKind="reading"`.

### Design — `<UnitViewLinkBar>` is link-shaped, not stateful tabs

```astro
---
// packages/astro/src/components/UnitViewLinkBar.astro
import type { UnitViewKind } from "../types.ts";

interface Props {
  unit: string;
  current: UnitViewKind;
  availableViews: ReadonlyArray<UnitViewKind>; // computed from artifact presence
}

const { unit, current, availableViews } = Astro.props;

const labelMap: Record<UnitViewKind, string> = {
  reading: "Reading",
  slides: "Slides",
  practice: "Practice",
};

// Order is locked: reading → slides → practice (read → see → do)
const orderedViews: ReadonlyArray<UnitViewKind> = ["reading", "slides", "practice"];
const tabs = orderedViews.filter((v) => availableViews.includes(v));
---

<nav class="unit-view-link-bar" aria-label="Unit views">
  {tabs.map((v) => (
    <a
      href={`/units/${unit}/${v}`}
      aria-current={v === current ? "page" : undefined}
      class:list={["tab", v === current && "tab--active"]}
    >
      {labelMap[v]}
    </a>
  ))}
</nav>
```

CSS lives in `packages/astro/src/styles/textbook-layout.css` (Sophie convention — chapter-layout chrome shares one stylesheet). Tokens-only per ADR 0005.

### Availability computation

`<ChapterLayout>` computes `availableViews` at render time by walking the artifacts collection for the given unit:

```astro
---
import { getCollection } from "astro:content";

const artifacts = await getCollection("artifacts");
const unitArtifactIds = new Set(
  artifacts
    .filter((a) => a.id.startsWith(`sections/`) && a.id.split("/")[2] === currentUnit)
    .map((a) => a.id.split("/").pop())  // "reading" | "slides" | "practice"
);
const availableViews: UnitViewKind[] = [];
if (unitArtifactIds.has("reading")) availableViews.push("reading");
if (unitArtifactIds.has("slides")) availableViews.push("slides");
if (unitArtifactIds.has("practice")) availableViews.push("practice");
---
```

(Cleaner: extract a `getAvailableUnitViews(unitId): UnitViewKind[]` helper at `packages/astro/src/lib/unit-views.ts` — single responsibility; unit-testable; reused by the trailing CTA.)

### Trailing CTA

End of `reading.astro` rendering (inside `<ChapterLayout>`, after the `<Content />` slot but before the page-foot chrome):

```astro
{availableViews.includes("practice") && currentView === "reading" && (
  <aside class="reading-end-cta">
    <a href={`/units/${unit}/practice`} class="cta-card">
      → Practice this lecture
      {practiceCount !== undefined && <span class="cta-count">({practiceCount} problems)</span>}
    </a>
  </aside>
)}
```

`practiceCount` is optional in v1 — populating it requires walking practice.mdx for `<PracticeProblem>` / `<MCQ>` / etc. counts, which is a Phase-2 nice-to-have. Ship without it in PR 3; backfill via the formative-index `formatives.filter(f => f.unit === currentUnit).length` once PR 5's index extractor lands.

### Tasks

**Task 3.1: Extract `getAvailableUnitViews` helper.** Create `packages/astro/src/lib/unit-views.ts`; export the unit-views computation. Add `packages/astro/src/lib/unit-views.test.ts` — tests cover reading-only, reading+practice, reading+slides+practice, draft-unit-excluded, missing-unit, edge cases.

**Task 3.2: Write failing e2e test.** Create `examples/smoke/e2e/practice-route.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("link-bar navigates Reading → Practice", async ({ page }) => {
  await page.goto("/units/chrome-primitives-demo/reading");
  await expect(page.locator('nav[aria-label="Unit views"]')).toBeVisible();
  await page.click('a[aria-label="Unit views"] >> text=Practice');
  await expect(page).toHaveURL(/\/units\/chrome-primitives-demo\/practice$/);
  await expect(page.locator('a[aria-current="page"]')).toHaveText("Practice");
});

test("link-bar omits Slides tab when no slides artifact", async ({ page }) => {
  await page.goto("/units/chrome-primitives-demo/reading");
  const tabs = page.locator('nav[aria-label="Unit views"] a');
  await expect(tabs).toHaveCount(2); // Reading, Practice
});

test("trailing CTA links to practice", async ({ page }) => {
  await page.goto("/units/chrome-primitives-demo/reading");
  const cta = page.locator(".reading-end-cta a");
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page).toHaveURL(/\/units\/chrome-primitives-demo\/practice$/);
});
```

Run `pnpm test:e2e -- practice-route.spec.ts` → expect FAIL (no route, no link-bar).

**Task 3.3: Create `practice.astro` route.** Path: `packages/astro/src/routes/practice.astro`. Code per "Design — `practice.astro` mirrors `reading.astro`" above.

**Task 3.4: Inject route in integration.** Modify `packages/astro/src/integration.ts` — add `injectRoute({ pattern: "/units/[unit]/practice", entrypoint: "@sophie/astro/routes/practice.astro" })` immediately after the existing reading-route injection at lines 164–172.

**Task 3.5: Remove the #189 warning.** Delete:
- `packages/astro/src/lib/integration/practice-mdx-warning.ts`
- `packages/astro/src/lib/integration/practice-mdx-warning.test.ts`

In `integration.ts`, remove lines 250–259 (the `warnOnUnroutedPracticeMdx(...)` call and surrounding comment block) AND the `import` for the deleted function.

**Task 3.6: Create the smoke practice fixture.** Path: `examples/smoke/src/content/sections/foundations/units/chrome-primitives-demo/practice.mdx`. Minimal bare-prose problems exercising the route. Example body:

```mdx
---
title: "Practice — Chrome Primitives Demo"
---

# Practice problems

**Problem 1.** What is the H-alpha wavelength? *(656.3 nm — the n=3 → n=2 transition)*

**Problem 2.** From $M(<r) = rv^2/G$, find $r$ when $v = 220$ km/s and $M = 10^{11}\,M_\odot$. *(~9.4 kpc)*
```

This deliberately ships WITHOUT the new components (PR 4+ ships those) — confirms the route renders existing prose.

**Task 3.7: Create the `<UnitViewLinkBar>` component.** Path: `packages/astro/src/components/UnitViewLinkBar.astro`. Code per "Design — `<UnitViewLinkBar>`" above. CSS at the bottom of `textbook-layout.css` (tokens-only).

**Task 3.8: Wire link-bar + trailing CTA into `<ChapterLayout>`.** Modify `packages/astro/src/components/ChapterLayout.astro`:
- Add `viewKind: "reading" | "slides" | "practice"` to props.
- At the top of the rendered chapter body, slot the `<UnitViewLinkBar>` (only when `availableViews.length > 1` — single-view units don't need a bar).
- After the `<slot />`, conditional trailing CTA per the design above.

**Task 3.9: Update `reading.astro`** to pass `viewKind="reading"` to `<ChapterLayout>`.

**Task 3.10: Run unit tests.** `pnpm turbo run test --filter=@sophie/astro -- unit-views` → expect PASS.

**Task 3.11: Run smoke build.** `pnpm --filter smoke build` → expect prod build clean; verify `dist/units/chrome-primitives-demo/practice/index.html` exists.

**Task 3.12: Run e2e.** `pnpm test:e2e -- practice-route.spec.ts` → expect PASS (all 3 tests green). Per `feedback_smoke_dist_rebuild_required.md`: rebuild dist between any component fix and e2e.

**Task 3.13: Update chapter-components.md.** Rewrite the §"`practice.mdx` deferral (no route yet)" section to §"`practice.mdx` route" — explain the link-bar, trailing CTA, route shape, getStaticPaths behavior; remove the #189 link.

**Task 3.14: Add ADR 0082 revision.** Append `### R-practice-route (2026-05-NN)` to `docs/website/decisions/0082-chapter-layout-extraction.md` — one paragraph noting the second injected route + the link-bar.

**Task 3.15: Verification gate.** Per cross-cutting conventions table at the top of this plan.

**Task 3.16: Commit + open PR.** **HITL confirm before push.** PR title `feat: /units/[unit]/practice route + N-tab link-bar + #189 retire`. Body links Amendment 1 + issue #189 (closes #189).

---

## PR 4 (Track A) — `<Solution>` + `<Hint>` + `<PracticeProblem>` + `sophieAutoImportsRemarkPlugin` — **SHIPPED 2026-05-27**

**Commit:** `3ba8867` on `feat/solution-hint-practice-problem`.

**Status:** Shipped. The implementation pivoted from the originally-planned `FormativeContext` React provider to a compile-time remark plugin — see "Lessons from PR 4" callout above for the architectural pivot summary, and [ADR 0073 Amendment 1 §3](../website/decisions/0073-unified-assessment-schema.md#amendment-1-section-3-author-surface-and-parent-prop-threading) for the full design. This section is preserved as the audit trail; the in-flight design captured in the task list below is **not the shipped shape**.

### What actually shipped

| Path | Role |
|---|---|
| [`packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts`](../../packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts) | Compile-time remark plugin: auto-imports + `client:load` injection + parent-prop threading for the formative family. Three registries: `SOPHIE_INTERACTIVE_COMPONENTS`, `SOPHIE_CONTENT_AUTO_IMPORT`, `SOPHIE_FORMATIVE_PARENTS` (all six v1 parents pre-registered), `SOPHIE_FORMATIVE_CHILDREN` (`Solution`, `Hint`). |
| [`packages/astro/src/lib/mdx-plugins/sophie-auto-imports.test.ts`](../../packages/astro/src/lib/mdx-plugins/sophie-auto-imports.test.ts) | 37 tests covering all three plugin responsibilities + curated-error shape on missing `course`/`unit`/`id`. |
| `packages/components/src/components/Solution/` | Full-reveal primitive. Radix Accordion + `useInteractive`; key `solution:${parentId}:open`. SSR-fallback via `useHydrated`. Accepts explicit `course` / `unit` / `parentId` props (plugin-supplied at compile time). |
| `packages/components/src/components/Hint/` | Progressive-reveal. Key `hint:${parentId}:${n}:open`; N independent siblings supported. Same explicit-props shape. |
| `packages/components/src/components/PracticeProblem/` | Bare practice shell; compound `<PracticeProblem.Prompt>` slot; renders `<section aria-labelledby>` per R10. The namespace owner the remark plugin reads from. |
| `packages/astro/src/styles/textbook-layout.css` | `.sophie-reveal` print-mode auto-expand class (parallels `.sophie-dropdown`). |
| `docs/website/reference/chapter-components.md` | Formative-family section: Solution / Hint / PracticeProblem rows filled. |
| `docs/website/reference/formative-assessment-authoring.md` | Author-facing how-to: clean MDX surface (no imports, no `client:load`, no `course`/`unit`/`parentId` on children); curated MDX-compile error contract. |
| `docs/website/decisions/0073-unified-assessment-schema.md` Amendment 1 §3 | Updated to describe compile-time threading instead of React Context. |

**What did NOT ship from the original plan:** `packages/components/src/runtime/FormativeContext.tsx` (never created — pivoted before merge). Solution/Hint/PracticeProblem are also **not registered in `makeStaticComponents`** — they flow through the auto-imports plugin like any other hydration-bearing interactive component, because `makeStaticComponents` cannot carry `client:load`.

### Why the pivot (honest framing)

React Context cannot span Astro MDX islands. Each top-level MDX JSX tag SSRs as its own React tree; Context never spans them. `experimentalReactChildren: true` does NOT fix this for compound formative blocks. `useFormativeContext` threw on every `<Solution>` during smoke SSR. This is an architectural finding, not a tactical adjustment — the original plan's runtime-Context shape was structurally incompatible with Astro's island model, and the pivot moves the same authored ergonomics (clean MDX, no imports, no manual props) from runtime React Context to MDX-compile time. Author surface unchanged; implementation strictly stronger (compile-time errors with file:line vs runtime React throws).

### Original task list (historical record — NOT what shipped)

The tasks below are the pre-pivot design; preserved for audit trail. The actual shipped shape is described in the "What actually shipped" section above + ADR 0073 Amendment 1 §3.

**Branch:** `feat/solution-hint-practice-problem`

### Files

| Action | Path |
|---|---|
| Create | `packages/components/src/runtime/FormativeContext.tsx` (React context provider + consumer hook) |
| Create | `packages/components/src/components/Solution/` (Solution.tsx + .schema.ts + .contract.ts + .module.css + .test.tsx + .stories.tsx) |
| Create | `packages/components/src/components/Hint/` (same six files) |
| Create | `packages/components/src/components/PracticeProblem/` (PracticeProblem.tsx + .schema.ts + .contract.ts + .module.css + .test.tsx + .stories.tsx) |
| Modify | `packages/components/src/index.ts` (barrel exports) |
| Modify | `packages/astro/src/components.tsx` (`makeStaticComponents` adds Solution + Hint + PracticeProblem; `makeChromeComponents` excludes them — pedagogy primitives per ADR 0058 §R-0080-A2) |
| Modify | `packages/astro/src/styles/textbook-layout.css` (add `.sophie-reveal { … }` print-mode auto-expand class parallel to `.sophie-dropdown`) |
| Modify | `docs/website/reference/chapter-components.md` (fill out the Formative-family section entries for Solution + Hint + PracticeProblem) |

### Design — `FormativeContext`

```tsx
// packages/components/src/runtime/FormativeContext.tsx
import { createContext, useContext, type ReactNode } from "react";

export interface FormativeContextValue {
  course: string;
  unit: string;
  parentId: string;             // the formative parent's id (e.g., the MCQ's id)
  parentKind: "mcq" | "multi-select" | "fill-blank" | "numeric-question" | "quickcheck" | "practice-problem";
}

const FormativeContext = createContext<FormativeContextValue | null>(null);

export function FormativeProvider({ value, children }: { value: FormativeContextValue; children: ReactNode }) {
  return <FormativeContext.Provider value={value}>{children}</FormativeContext.Provider>;
}

export function useFormativeContext(consumerName: string): FormativeContextValue {
  const ctx = useContext(FormativeContext);
  if (ctx === null) {
    throw new Error(
      `<${consumerName}> must be a child of <MCQ>, <MultiSelect>, <FillBlank>, <NumericQuestion>, <QuickCheck>, or <PracticeProblem>. ` +
      `These six formative-family parents own the course/unit/id IDB namespace; <${consumerName}> reads it via React context.`
    );
  }
  return ctx;
}
```

### Design — `<Solution>`

```tsx
// packages/components/src/components/Solution/Solution.tsx
import * as Accordion from "@radix-ui/react-accordion";
import { useInteractive } from "../../runtime/useInteractive.ts";
import { useFormativeContext } from "../../runtime/FormativeContext.tsx";
import { useHydrated } from "../../runtime/useHydrated.ts";
import styles from "./Solution.module.css";

interface SolutionProps {
  label?: string;        // optional override; default "Show solution" / "Hide solution"
  children: React.ReactNode;
}

export function Solution({ label, children }: SolutionProps) {
  const { course, unit, parentId } = useFormativeContext("Solution");
  const hydrated = useHydrated();
  const { value: openSlugs, setValue, controlProps } = useInteractive<string[]>(
    course,
    unit,
    `solution:${parentId}:open`,
    []
  );
  const isOpen = openSlugs.includes("solution");
  const triggerLabel = label ?? (isOpen ? "Hide solution" : "Show solution");

  if (!hydrated) {
    // SSR fallback: render closed prose-only state (no popover machinery)
    return <div className={`${styles.root} sophie-reveal`} data-pedagogy-role="solution" />;
  }

  return (
    <div className={`${styles.root} sophie-reveal`} data-pedagogy-role="solution">
      <Accordion.Root
        type="multiple"
        value={openSlugs}
        onValueChange={setValue}
      >
        <Accordion.Item value="solution">
          <Accordion.Header>
            <Accordion.Trigger {...controlProps} className={styles.trigger}>
              {triggerLabel}
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className={styles.content}>
            {children}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}
```

### Design — `<Hint>`

```tsx
// packages/components/src/components/Hint/Hint.tsx
interface HintProps {
  number: number;        // 1-indexed; repeated `<Hint>` siblings increment
  children: React.ReactNode;
}

export function Hint({ number, children }: HintProps) {
  const { course, unit, parentId } = useFormativeContext("Hint");
  const hydrated = useHydrated();
  const { value: openSlugs, setValue, controlProps } = useInteractive<string[]>(
    course,
    unit,
    `hint:${parentId}:${number}:open`,
    []
  );
  // …Accordion shape identical to Solution but with triggerLabel = `Hint ${number}` …
}
```

### Design — `<PracticeProblem>` (shell context owner)

```tsx
// packages/components/src/components/PracticeProblem/PracticeProblem.tsx
import { FormativeProvider } from "../../runtime/FormativeContext.tsx";
import styles from "./PracticeProblem.module.css";

interface PracticeProblemProps {
  course: string;
  unit: string;
  id: string;
  children: React.ReactNode;
}

function Prompt({ children }: { children: React.ReactNode }) {
  return <div className={styles.prompt}>{children}</div>;
}

export function PracticeProblem({ course, unit, id, children }: PracticeProblemProps) {
  return (
    <FormativeProvider value={{ course, unit, parentId: id, parentKind: "practice-problem" }}>
      <section
        className={styles.root}
        data-pedagogy-role="practice-problem"
        data-formative-anchor={id}
        aria-labelledby={`${id}-label`}
      >
        <h3 id={`${id}-label`} className={styles.label}>Practice problem</h3>
        {children}
      </section>
    </FormativeProvider>
  );
}

PracticeProblem.Prompt = Prompt;
```

(`<PracticeProblem>` is **persistence-bearing-by-context** — it doesn't own any IDB key itself, but its `id` prop becomes the namespace for its descendants' `solution:${id}:open` / `hint:${id}:N:open` keys. Per ADR 0027 it requires `course`/`unit`/`id`. `client:load` mandatory because the descendants need hydration.)

### Tasks

**Task 4.1: Write failing tests for `FormativeContext`.** Path: `packages/components/src/runtime/FormativeContext.test.tsx`. Tests:
- Provider supplies value to nested `useFormativeContext("Solution")` consumer.
- Bare `useFormativeContext("Hint")` (no provider ancestor) throws curated error containing the consumerName.

**Task 4.2: Implement `FormativeContext.tsx`** per design above. Run tests — expect PASS.

**Task 4.3: Write failing test for `<Solution>` rendering, persistence, axe-clean.** Path: `packages/components/src/components/Solution/Solution.test.tsx`. Tests:
- `<Solution>` inside a `<FormativeProvider>` renders Accordion trigger with "Show solution" label by default.
- Click expands → label flips to "Hide solution"; persistence-write fires (mock useInteractive).
- KaTeX children render correctly (use a `<MathText>` child fixture).
- `<Solution>` outside any `<FormativeProvider>` throws the curated context-missing error.
- axe-clean: render in two states (closed, open); zero violations both.

**Task 4.4: Implement `<Solution>`** per design above.

**Task 4.5: Same TDD cycle for `<Hint>`** (Tasks 4.5a–4.5e).

**Task 4.6: Write failing test for `<PracticeProblem>`.** Tests:
- Renders `<section data-pedagogy-role="practice-problem" aria-labelledby={…}>` per R10.
- Establishes `FormativeContext` for nested `<Solution>` / `<Hint>` consumers.
- Requires `course`/`unit`/`id` props per ADR 0027.
- axe-clean with nested Solution + Hint.

**Task 4.7: Implement `<PracticeProblem>`** per design above.

**Task 4.8: Update CSS.** Add to `packages/astro/src/styles/textbook-layout.css`:

```css
/* Print-mode auto-expand for all formative-reveal containers.
   Mirrors the .sophie-dropdown pattern in this stylesheet. */
@media print {
  .sophie-reveal [data-state="closed"],
  .sophie-reveal [data-state="open"] {
    display: revert !important;
    height: auto !important;
  }
}
```

**Task 4.9: Wire components into `makeStaticComponents`.** Add `Solution`, `Hint`, `PracticeProblem` to the static-components factory at `packages/astro/src/components.tsx`. Per ADR 0058 §R-0080-A2: pedagogy primitives, included in `makeStaticComponents`, **excluded** from `makeChromeComponents` (these don't belong in course-info prose).

**Task 4.10: Update chapter-components.md.** Fill out the Solution, Hint, PracticeProblem rows in the Formative-family section.

**Task 4.11: Add Storybook stories.** Three story files; each story shows the component inside a `<FormativeProvider value={{course:"smoke",unit:"demo",parentId:"demo-problem",parentKind:"practice-problem"}}>` wrapper.

**Task 4.12: Verification gate.**

**Task 4.13: Commit + open PR.** **HITL confirm before push.** PR title `feat: <Solution> + <Hint> + <PracticeProblem> + FormativeContext (ADR 0073 A1 PR 3/8)`.

---

## PR 5 (Track A) — `<QuickCheck>` + formative index extractor + AS-2 invariant

Simplest answer contract first (solution-only); ships the index-bucket plumbing the next four PRs reuse. **Scope shrunk by PR 4** — the auto-imports plugin + parent-prop threading already exist; this PR just adds the component, the `FormativeEntry` schema, the extractor (which walks an already-threaded tree), and the AS-2 invariant. No plugin changes required.

**Branch:** `feat/quickcheck-and-formative-index`

### Files

| Action | Path |
|---|---|
| Create | `packages/components/src/components/QuickCheck/` (six-file component dir) |
| Create | `packages/core/src/schema/pedagogy-index-entries/formative.ts` (FormativeAnswerSchema discriminated union + FormativeEntrySchema) |
| Modify | `packages/core/src/schema/pedagogy-index.ts` (add `formatives: z.array(FormativeEntrySchema).readonly().default([])`; update anchor-prefix table comment with `form-` row) |
| Create | `packages/astro/src/lib/pedagogy-index/extractors/formative.ts` (the extractor; v1 supports only `<QuickCheck>` shape; subsequent PRs add the other five) |
| Modify | `packages/astro/src/lib/pedagogy-index/accumulator.ts` (add `addFormatives()` + `Map<string, FormativeEntry>` instance field; wire into `clearUnit()` reset; surface via `asPedagogyIndex()`) |
| Create | `packages/astro/src/lib/pedagogy-audit/invariants/formative.ts` (AS-2 implementation; AS-1/3/4/5 added in subsequent PRs) |
| Modify | `packages/astro/src/lib/pedagogy-audit/runner.ts` (import + call `checkFormative(index, sink)` after `checkWorkedExamples`) |
| Modify | `packages/components/src/index.ts` (barrel export) |
| Verify | `packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts` — `QuickCheck` is already in `SOPHIE_INTERACTIVE_COMPONENTS` and `SOPHIE_FORMATIVE_PARENTS` (PR 4); no edit required, just confirm |
| Modify | `docs/website/reference/chapter-components.md` (QuickCheck row) |

### Design — `FormativeEntry` schema

```ts
// packages/core/src/schema/pedagogy-index-entries/formative.ts
import { z } from "zod";
import { NonEmptyString } from "../primitives.ts";

export const FormativeKindSchema = z.enum([
  "mcq",
  "multi-select",
  "fill-blank",
  "numeric-question",
  "quickcheck",
  "practice-problem",
]);

export const FormativeAnswerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("single-choice"), correct: NonEmptyString }).strict(),
  z.object({ type: z.literal("multi-choice"), correct: z.array(NonEmptyString).min(1).readonly() }).strict(),
  z.object({
    type: z.literal("fill-blank"),
    blanks: z.array(z.object({ id: NonEmptyString, correct: NonEmptyString }).strict()).readonly(),
  }).strict(),
  z.object({
    type: z.literal("numeric"),
    value: z.number().finite(),
    tolerance: z.number().nonnegative(),
    toleranceKind: z.enum(["absolute", "relative"]),
    unit: z.string().optional(),
  }).strict(),
  z.object({ type: z.literal("solution-only") }).strict(),
]);

export const FormativeEntrySchema = z.object({
  unit: NonEmptyString,
  anchor: NonEmptyString,          // `form-${counter}` auto OR author-supplied id
  kind: FormativeKindSchema,
  prompt: z.string(),              // plain-text extraction of <X.Prompt> body
  answer: FormativeAnswerSchema,
  hasSolution: z.boolean(),
  hintCount: z.number().int().nonnegative(),
}).strict();

export type FormativeEntry = z.infer<typeof FormativeEntrySchema>;
export type FormativeAnswer = z.infer<typeof FormativeAnswerSchema>;
```

### Design — `<QuickCheck>`

`<QuickCheck>` is the namespace owner for nested `<Solution>` / `<Hint>` children. Per PR 4's pivot, the parent does NOT wrap children in a React provider; `sophieAutoImportsRemarkPlugin` (already shipped) reads `course` / `unit` / `id` from `<QuickCheck>` at MDX compile time and threads them onto every nested `<Solution>` / `<Hint>` as `course` / `unit` / `parentId` props. PR 5 must add `"QuickCheck"` to the plugin's `SOPHIE_FORMATIVE_PARENTS` registry — **already done in PR 4** (all six v1 parents pre-registered).

```tsx
// packages/components/src/components/QuickCheck/QuickCheck.tsx
import styles from "./QuickCheck.module.css";

interface QuickCheckProps {
  course: string;
  unit: string;
  id: string;
  children: React.ReactNode;
}

function Prompt({ children }: { children: React.ReactNode }) {
  return <div className={styles.prompt}>{children}</div>;
}

export function QuickCheck({ course, unit: _unit, id, children }: QuickCheckProps) {
  // course/unit are namespace anchors read by the remark plugin and threaded
  // onto nested <Solution>/<Hint> at compile time; the component itself just
  // renders a labelled section. No React provider needed.
  return (
    <section
      className={styles.root}
      data-pedagogy-role="quickcheck"
      data-formative-anchor={id}
      aria-labelledby={`${id}-label`}
    >
      <h3 id={`${id}-label`} className={styles.label}>Quick check</h3>
      {children}
    </section>
  );
}

QuickCheck.Prompt = Prompt;
```

(Per ADR 0027 `<QuickCheck>` still requires `course`/`unit`/`id` props — the plugin asserts their presence at compile time and throws a curated MDX-compile error with file:line position when missing. No runtime validation needed.)

### Design — `extractFormative` (v1: QuickCheck-only branch)

```ts
// packages/astro/src/lib/pedagogy-index/extractors/formative.ts
import { visit } from "unist-util-visit";
import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { readStringAttr } from "../utils/attrs.ts";
import type { FormativeEntry, FormativeAnswer } from "@sophie/core/schema/pedagogy-index-entries/formative.ts";
import type { AuditFinding } from "@sophie/core/schema/audit.ts";

export interface FormativeExtractionResult {
  entries: FormativeEntry[];
  findings: AuditFinding[];
}

const FORMATIVE_PARENT_NAMES = new Set([
  "QuickCheck",
  // PR 6+ adds: MCQ, MultiSelect, FillBlank, NumericQuestion, PracticeProblem
]);

export function extractFormative(tree: Root, unitId: string): FormativeExtractionResult {
  const entries: FormativeEntry[] = [];
  const findings: AuditFinding[] = [];
  const seenAnchors = new Set<string>();
  let counter = 0;

  visit(tree, "mdxJsxFlowElement", (node: unknown) => {
    const el = node as MdxJsxFlowElement;
    if (!FORMATIVE_PARENT_NAMES.has(el.name ?? "")) return;

    counter += 1;
    const explicitId = readStringAttr(el, "id");
    const anchor = explicitId ?? `form-${counter}`;

    if (seenAnchors.has(anchor)) {
      throw new Error(
        `Intra-chapter anchor collision in chapter "${unitId}": formative anchor "${anchor}" generated more than once. ` +
        `Resolution: supply distinct \`id\` props on the affected formative items.`
      );
    }
    seenAnchors.add(anchor);

    // Walk children to find <X.Prompt>, <Solution>, <Hint> + (for MCQ etc., later PRs) specific children
    let promptText = "";
    let hasSolution = false;
    let hintCount = 0;
    for (const child of el.children ?? []) {
      const childEl = child as MdxJsxFlowElement;
      if (childEl.type !== "mdxJsxFlowElement") continue;
      if (childEl.name?.endsWith(".Prompt")) promptText = extractPlainText(childEl);
      else if (childEl.name === "Solution") hasSolution = true;
      else if (childEl.name === "Hint") hintCount += 1;
    }

    const answer: FormativeAnswer = (() => {
      switch (el.name) {
        case "QuickCheck":
          return { type: "solution-only" };
        // PR 6+: MCQ → single-choice; MultiSelect → multi-choice; etc.
        default:
          throw new Error(`extractFormative: unhandled formative kind "${el.name}"`);
      }
    })();

    entries.push({
      unit: unitId,
      anchor,
      kind: jsxNameToKind(el.name ?? ""),
      prompt: promptText,
      answer,
      hasSolution,
      hintCount,
    });
  });

  return { entries, findings };
}

function jsxNameToKind(name: string): FormativeEntry["kind"] {
  switch (name) {
    case "QuickCheck": return "quickcheck";
    case "MCQ": return "mcq";
    case "MultiSelect": return "multi-select";
    case "FillBlank": return "fill-blank";
    case "NumericQuestion": return "numeric-question";
    case "PracticeProblem": return "practice-problem";
    default: throw new Error(`Unknown formative JSX name: ${name}`);
  }
}
```

(`extractPlainText` is a utility — reuse the one in `packages/astro/src/lib/pedagogy-index/utils/` if it exists; otherwise add a small one that walks `mdast.Text` children and concatenates.)

### Design — AS-2 invariant

```ts
// packages/astro/src/lib/pedagogy-audit/invariants/formative.ts
import type { PedagogyIndex } from "@sophie/core/schema/pedagogy-index.ts";
import type { FindingSink } from "../types.ts";

export function checkFormative(index: PedagogyIndex, sink: FindingSink): void {
  for (const f of index.formatives) {
    // AS-2 (WARN): formative item has no <Solution>
    if (!f.hasSolution) {
      sink.warnings.push({
        severity: "WARNING",
        code: "AS-2",
        message:
          `AS-2: ${f.kind} "${f.anchor}" in chapter "${f.unit}" has no <Solution>. ` +
          `Authored-but-answerless formative items leave students without reveal feedback. ` +
          `Resolution: add a <Solution>…</Solution> child explaining the reasoning.`,
        location: { unit: f.unit, anchor: f.anchor },
      });
    }
    // PR 6: AS-1 (MCQ exactly-one correct) handled here in MCQ branch
    // PR 7: AS-5 (MultiSelect ≥1 correct)
    // PR 8: AS-3 (FillBlank ≥1 slot)
    // PR 9: AS-4 (NumericQuestion exactly one Answer)
  }
}
```

### Tasks

**Task 5.1: Add `FormativeAnswer` + `FormativeEntry` schemas.** Path: `packages/core/src/schema/pedagogy-index-entries/formative.ts`. Code per design above.

**Task 5.2: Add tests for schema parsing.** Path: `packages/core/src/schema/pedagogy-index-entries/formative.test.ts`. Test each of the five discriminated-union variants parses; strict mode rejects unknown keys; numeric tolerance non-negative; multi-choice ≥1 element.

**Task 5.3: Extend `PedagogyIndexSchema`.** Modify `packages/core/src/schema/pedagogy-index.ts` line ~84 — add `formatives: z.array(FormativeEntrySchema).readonly().default([])` to the schema; update the canonical anchor-prefix table comment at lines 35–58 with the `form-` row.

**Task 5.4: Write failing test for `<QuickCheck>` rendering.** Path: `packages/components/src/components/QuickCheck/QuickCheck.test.tsx`. Tests pass `course`/`unit`/`id` directly (no provider wrapper — compile-time threading per PR 4 pivot):
- Renders `<section data-pedagogy-role="quickcheck" data-formative-anchor={id} aria-labelledby={…}>` per R10.
- Renders nested `<Solution>` and `<Hint>` when given explicit `course`/`unit`/`parentId` props (mirroring what the remark plugin will inject in MDX at compile time).
- axe-clean with prompt + solution.

**Task 5.5: Implement `<QuickCheck>`** per design above. No React provider; the component just renders a labelled section. `course`/`unit` are namespace anchors read by the remark plugin upstream.

**Task 5.6: Write failing tests for `extractFormative`.** Path: `packages/astro/src/lib/pedagogy-index/extractors/formative.test.ts`. Fixtures (use the same MDX-parse helper the worked-examples extractor uses):
- A QuickCheck with `<QuickCheck.Prompt>` + `<Solution>` → one entry, `hasSolution: true`, kind `quickcheck`, answer `{ type: "solution-only" }`.
- A QuickCheck WITHOUT `<Solution>` → one entry, `hasSolution: false` (AS-2 fires in the audit, not the extractor).
- Two QuickChecks with the same explicit `id="foo"` → throws intra-chapter collision error.
- Author-supplied `id` overrides the auto-counter.
- Hint count: 0, 1, 3.

**Task 5.7: Implement `extractFormative`** per design above (QuickCheck-only branch).

**Task 5.8: Wire extractor into accumulator.** Modify `packages/astro/src/lib/pedagogy-index/accumulator.ts`:
- Add `formatives: new Map<string, FormativeEntry>()` instance field.
- Add `addFormatives(unitId: string, entries: FormativeEntry[])` method.
- Call from the pipeline (find where `addWorkedExamples` is wired and add parallel call).
- Reset in `clearUnit(unitId)`.
- Expose in `asPedagogyIndex()` as `formatives: [...this.formatives.values()]`.

**Task 5.9: Write failing test for AS-2 invariant.** Path: `packages/astro/src/lib/pedagogy-audit/invariants/formative.test.ts`. Tests:
- QuickCheck with `<Solution>` → no AS-2 finding.
- QuickCheck without `<Solution>` → one AS-2 WARN finding with correct code, message, location.

**Task 5.10: Implement `checkFormative`** with AS-2 only (other invariants are PR-6+).

**Task 5.11: Wire into audit runner.** Modify `packages/astro/src/lib/pedagogy-audit/runner.ts` — import + call `checkFormative(index, sink)` immediately after `checkWorkedExamples`.

**Task 5.12: Add a smoke fixture exercising QuickCheck.** Modify `examples/smoke/src/content/sections/foundations/units/chrome-primitives-demo/practice.mdx` to add at least one `<QuickCheck course unit id>` callsite with Solution + Hint children. Also one without Solution to exercise AS-2 — gated behind a `# AS-2 fixture (expected WARN)` heading so reviewers know it's intentional. **Clean author surface** per PR 4 pivot: NO `import` statements, NO `client:load` directive, NO `course`/`unit`/`parentId` on `<Solution>` / `<Hint>` children — the remark plugin injects all three at compile time.

**Task 5.13: Confirm `<QuickCheck>` is registered in `SOPHIE_INTERACTIVE_COMPONENTS` AND `SOPHIE_FORMATIVE_PARENTS`** in `packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts`. **Already pre-registered in PR 4** — verify only. Do NOT register in `makeStaticComponents` (static-mapped components cannot carry `client:load`; the plugin handles import + hydration directive injection). Excluded from `makeChromeComponents` per ADR 0058 §R-0080-A2 (pedagogy ≠ chrome).

**Task 5.14: Update chapter-components.md** with the QuickCheck reference doc entry.

**Task 5.15: Verification gate** (per cross-cutting conventions). Run smoke build — confirm AS-2 WARN surfaces in the audit output with `[WARNING AS-2]` detail.

**Task 5.16: Storybook VR baseline seed.** After first CI run, trigger the `vr-update.yml` GitHub Actions workflow to seed Chromatic/Loki baselines for the new QuickCheck stories. Then push a no-op commit to re-trigger CI and pick up the baselines. Recurs per PR adding new stories.

**Task 5.17: Commit + open PR.** **HITL confirm before push.** PR title `feat: <QuickCheck> + formative index bucket + AS-2 (ADR 0073 A1 PR 4/8)`.

---

## PR 6 (Track A) — `<MCQ>` + AS-1 + `@radix-ui/react-radio-group`

Auto-imports + `client:load` + parent-prop threading already handled by `sophieAutoImportsRemarkPlugin` (PR 4). `MCQ` is pre-registered in both `SOPHIE_INTERACTIVE_COMPONENTS` and `SOPHIE_FORMATIVE_PARENTS`. The component just declares `course/unit/id` props; the plugin handles the rest.

### Files

| Action | Path |
|---|---|
| Modify | `packages/components/package.json` (add `@radix-ui/react-radio-group@^1.x` dep) |
| Create | `packages/components/src/components/MCQ/` (six-file dir; the .tsx exports `MCQ`, `MCQ.Prompt`, `MCQ.Choice` via member-access) |
| Modify | `packages/astro/src/lib/pedagogy-index/extractors/formative.ts` (add MCQ-branch to the answer materialization — count `correct` choices, build `{ type: "single-choice", correct: slugifyOf(correctChoice) }`; note `MCQ` is already in the registry-equivalent walk via PR 5's `FORMATIVE_PARENT_NAMES`) |
| Modify | `packages/astro/src/lib/pedagogy-audit/invariants/formative.ts` (add AS-1 ERROR branch for `kind: "mcq"`) |
| Modify | `packages/components/src/index.ts` (barrel export) |
| Verify | `sophie-auto-imports.ts` — `MCQ` already in `SOPHIE_INTERACTIVE_COMPONENTS` + `SOPHIE_FORMATIVE_PARENTS` (PR 4); no edit required |
| Modify | `docs/website/reference/chapter-components.md` |

### Per-PR notes

- `<MCQ.Choice>` slugifies its text content into the choice id (reuse Dropdown's slugify utility); explicit `id` prop overrides; duplicate-slug detection throws (mirrors Dropdown).
- `<MCQ.Choice correct>` is boolean-presence; extractor counts `correct`-flagged choices.
- AS-1 ERROR: count of `correct` choices !== 1. The error message names which choices were marked.
- Radix RadioGroup keyboard ergonomics: arrow keys navigate, space selects, focus management is automatic.
- The runtime renders all choices; on reveal (via the nested `<Solution>`), the correct choice gets a `data-correct="true"` attribute styled with a checkmark (this is the reveal-only UX; no auto-grading).
- `<MCQ>` does NOT register in `makeStaticComponents` — hydration-bearing components flow through the auto-imports plugin.
- Tests pass explicit `course`/`unit`/`id` directly (no provider wrapper); smoke MDX writes clean author surface (no imports, no `client:load`).

### Tasks (TDD)

**Task 6.1:** `pnpm add @radix-ui/react-radio-group --filter @sophie/components`. Update lockfile. Run `pnpm install --frozen-lockfile` to verify.

**Task 6.2:** Write failing tests for `<MCQ>` — render shape (Radix RadioGroup), keyboard nav (arrow keys), reveal interaction with nested Solution (pass `course`/`unit`/`parentId` props directly), axe-clean, throws on duplicate choice slugs.

**Task 6.3:** Implement `<MCQ>` + `<MCQ.Prompt>` + `<MCQ.Choice>` member-access exports. No React provider; the plugin threads parent props to nested `<Solution>`/`<Hint>` at compile time.

**Task 6.4:** Extend `extractFormative` with the MCQ branch — count `<MCQ.Choice correct>` children, materialize `{ type: "single-choice", correct: slug }`. When count !== 1, the answer is still emitted (with the first correct choice's slug, or a placeholder if zero) but AS-1 fires.

**Task 6.5:** Add AS-1 invariant in `checkFormative`.

**Task 6.6–6.9:** Add barrel export + reference doc + smoke fixture (clean MDX surface) + verification gate + Storybook VR baseline seed via `vr-update.yml`.

**Task 6.10:** **HITL confirm before push.** PR title `feat: <MCQ> + AS-1 + Radix RadioGroup (ADR 0073 A1 PR 5/8)`.

---

## PR 7 (Track A) — `<MultiSelect>` + AS-5 + `@radix-ui/react-checkbox`

Structurally identical to PR 6 with checkbox semantics instead of radios. `MultiSelect` already in `SOPHIE_INTERACTIVE_COMPONENTS` + `SOPHIE_FORMATIVE_PARENTS` (PR 4).

### Files
- Same shape as PR 6: new dep, new component dir, extend extractor + audit + barrel export + reference doc. **No plugin changes** (already registered). **No `makeStaticComponents` registration** (hydration-bearing).

### Per-PR notes
- Radix Checkbox primitive (`@radix-ui/react-checkbox`); a list of `<MultiSelect.Choice>` each backed by a Radix Checkbox.
- AS-5 ERROR: count of `correct` choices < 1 (zero correct = malformed).
- No upper bound on `correct` count (could be all four).
- `FormativeAnswer` variant: `{ type: "multi-choice", correct: string[] }`.
- Tests pass `course`/`unit`/`id` directly; smoke MDX writes clean author surface.

### Tasks
**6 tasks** following the TDD shape of PR 6 + Storybook VR baseline seed via `vr-update.yml`. **HITL confirm before push.** PR title `feat: <MultiSelect> + AS-5 + Radix Checkbox (ADR 0073 A1 PR 6/8)`.

---

## PR 8 (Track A) — `<FillBlank>` + AS-3

`FillBlank` already in `SOPHIE_INTERACTIVE_COMPONENTS` + `SOPHIE_FORMATIVE_PARENTS` (PR 4); plugin threads parent props to nested `<Solution>`/`<Hint>` at compile time.

### Files
- Same shape: new component dir, extend extractor + audit + barrel export + reference doc. **No plugin changes** (already registered).
- No new dep (uses native `<input type="text">`).

### Per-PR notes
- `<FillBlank.Slot id correct>` is rendered as a controlled `<input>` inline within `<FillBlank.Prompt>` MDX flow.
- Slot persistence key: `fillblank:${parentId}:${slotId}:value`.
- Treat numeric answers as text (`correct="656"`) — no tolerance enforcement in v1 since v1 doesn't grade. Future `<NumericQuestion>` is the typed shape (PR 9).
- AS-3 WARN: zero `<FillBlank.Slot>` children = malformed prompt.
- Slot ids must be unique within a FillBlank (throws on collision; mirrors MCQ choice pattern).
- Tests pass `course`/`unit`/`id` directly; smoke MDX writes clean author surface.

### Tasks
**8–10 tasks** including the slot-walking extension to `extractFormative` + Storybook VR baseline seed via `vr-update.yml`. **HITL confirm before push.** PR title `feat: <FillBlank> + AS-3 (ADR 0073 A1 PR 7/8)`.

---

## PR 9 (Track A) — `<NumericQuestion>` + AS-4

`NumericQuestion` already in `SOPHIE_INTERACTIVE_COMPONENTS` + `SOPHIE_FORMATIVE_PARENTS` (PR 4); plugin threads parent props at compile time.

### Files
- Same shape; no new dep. **No plugin changes** (already registered).

### Per-PR notes
- `<NumericQuestion.Answer value={…} tolerance={…} toleranceKind="absolute|relative" unit?={…} />` — self-closing element; renders nothing at v1; the extractor reads its attributes.
- Runtime renders a single `<input type="text">` (no `type="number"` because student input might include commas/units; v1 doesn't validate the input shape, just persists it).
- Persistence key: `numeric:${parentId}:value`.
- AS-4 ERROR: count of `<NumericQuestion.Answer>` !== 1.
- `FormativeAnswer` variant: `{ type: "numeric", value, tolerance, toleranceKind, unit? }`.
- Tests pass `course`/`unit`/`id` directly; smoke MDX writes clean author surface.

### Tasks
**8–10 tasks** including the `<NumericQuestion.Answer>` attribute-reading in `extractFormative` + Storybook VR baseline seed via `vr-update.yml`. **HITL confirm before push.** PR title `feat: <NumericQuestion> + AS-4 — closes v1 formative family (ADR 0073 A1 PR 8/8)`.

### Notes on closing the v1 wave

After PR 9 merges:
- Backfill ADR 0073 Amendment 1's `validation.evidence` block with all eight PR refs.
- Update `docs/website/status/validation.md`.
- Open a tracking issue for v2 — references the §v2-foreshadowing seams.
- The astr201 adoption pass (`.quiz` → `<MCQ>`, tip-Callout → `<QuickCheck>`, etc.) is a separate consumer-repo PR series in `/Users/anna/Teaching/astr201/` — not part of this Sophie session.

---

## PR 10 (Track B) — Author-trap lint extension: warn on `<` before letter in math; suggest `\lt`

**Branch:** `feat/mdx-author-traps-math-lt`

### Files

| Action | Path |
|---|---|
| Modify | `packages/astro/src/lib/mdx-plugins/mdx-author-traps.ts` (add `findLtBeforeLetterInMath` scanner + integrate into the plugin transform) |
| Modify | `packages/astro/src/lib/mdx-plugins/mdx-author-traps.test.ts` (add tests for the new scanner) |
| Modify | `docs/website/reference/chapter-components.md` §"Authoring traps" (add the third trap entry) |

### Design

Extend the trap scanner: inside an inline `$...$` math span (single-line, the current convention), if the body contains `<` followed by a letter, emit a curated finding suggesting `\lt`. The existing trap-2 regex (`/<(?=[^a-zA-Z\s/!?>])/g`) catches `<3`, `<.5` etc. but not `<r` or `<beta`.

```ts
// Add to mdx-author-traps.ts
export function findLtBeforeLetterInMath(code: string): SourceFinding[] {
  const findings: SourceFinding[] = [];
  const lines = code.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;

    // Mask inline code spans first
    const masked = line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length));

    // Find inline math spans
    const mathRe = /\$([^$\n]+?)\$/g;
    let mathMatch: RegExpExecArray | null;
    while ((mathMatch = mathRe.exec(masked)) !== null) {
      const body = mathMatch[1] ?? "";
      const offset = mathMatch.index + 1;
      const ltRe = /<(?=[a-zA-Z])/g;
      let ltMatch: RegExpExecArray | null;
      while ((ltMatch = ltRe.exec(body)) !== null) {
        findings.push({
          line: i + 1,
          column: offset + ltMatch.index + 1,
          snippet: line,
        });
      }
    }
  }
  return findings;
}
```

Plus a `formatLtBeforeLetterInMath` helper that produces the curated error: *"Found `<` before letter inside inline math span on line N. This typically renders fine but conflicts with the math-LT escape convention. Resolution: replace `<` with `\lt` (TeX strict-less-than macro) — e.g., `$v_r \lt 0$` instead of `$v_r<0$`."*

**Important scope clarification**: this lint is a WARN, not an ERROR. The existing M2-L2 / M3-L2 pilot finding was that `<letter` inside math is *empirically tolerated* by the current remark-math pipeline — this lint is a discipline nudge, not a blocker.

### Tasks

**Task 10.1:** Write failing tests for `findLtBeforeLetterInMath` — fixtures cover `$v_r<0$` (catch), `$M(<r)$` (catch — `<r`), `$<3{,}700$` (no catch — `<3` is digit), `` `<r` `` inline code (no catch — masked), `<r` outside math (handled by existing trap), multi-line math (skipped since convention is single-line + trap-1 covers wraps).

**Task 10.2:** Implement `findLtBeforeLetterInMath` per design.

**Task 10.3:** Decide WARN vs ERROR routing. Recommendation: WARN (use `logger.warn` rather than `throw`); does NOT break the build but surfaces in the build output. Wire into the plugin alongside the two existing trap scanners with a separate `formatLtBeforeLetterInMath` warning emitter rather than the throw-on-error pattern.

**Task 10.4:** Note the comment-scanning gotcha. The current scanner runs on raw lines, so MDX JSX comments `{/* <r */}` would false-positive. Two ways to address:
  (a) Mask `{/* … */}` regions like the existing inline-code mask.
  (b) Leave it — the lint is WARN-only, and JSX comments containing `<letter` are rare; the simpler regex wins.
  Recommendation: **(a) mask JSX comments** — small extra mask, prevents annoying false-positive WARNs in chapter comments.

**Task 10.5:** Update `chapter-components.md` §"Authoring traps" with a third entry: *"Trap 3 — `<` before letter inside inline math: replace with `\lt`."*

**Task 10.6:** Verification + commit + **HITL-confirmed push**. PR title `feat(mdx-lint): warn on \`<letter\` inside math; suggest \\lt`.

---

## PR 11 (Track B) — Audit-error DX: print `[ERROR …]` detail in the throw message

**Branch:** `feat/audit-error-dx`

### Files

| Action | Path |
|---|---|
| Modify | `packages/astro/src/components/TextbookLayout.astro` (lines 215–231 — replace the generic throw with a detail-bearing message) |

### Design

The current throw at [`packages/astro/src/components/TextbookLayout.astro:227-229`](../../Teaching/sophie/packages/astro/src/components/TextbookLayout.astro) is:

```ts
throw new Error(
  "Pedagogy audit found errors. See preceding output for details."
);
```

The detail is in `console.log(formatAuditReport(auditReport))` two lines earlier (`format.ts:36-49`). Authors have to scroll up through build output to find which `[ERROR Rxx]` fired. Per the design doc Section §pedagogy-audit DX.

Replace with:

```ts
const errorSummary = report.errors
  .slice(0, 10)
  .map((e) => {
    const loc = e.location?.unit
      ? `[chapter: ${e.location.unit}${e.location.anchor ? `, anchor: ${e.location.anchor}` : ""}]`
      : "";
    return `  [${e.code}] ${e.message.slice(0, 120)}${e.message.length > 120 ? "…" : ""} ${loc}`;
  })
  .join("\n");
const overflow = report.errors.length > 10 ? `\n  …and ${report.errors.length - 10} more — see preceding output` : "";
throw new Error(
  `Pedagogy audit found ${report.errors.length} error${report.errors.length === 1 ? "" : "s"}:\n${errorSummary}${overflow}\n\nSee preceding output for full details + warnings + info.`
);
```

### Tasks

**Task 11.1:** Write failing test for the audit-throw shape. Path: `packages/astro/src/components/textbook-layout-audit-throw.test.ts`. Mock the audit report; assert the thrown message contains `[D4]`, `[AS-1]`, and `chapter:` location markers for two synthetic errors.

**Task 11.2:** Implement the throw shape per design.

**Task 11.3:** Verification gate. Run smoke build with intentional AS-2 in fixture (already exists from PR 5); confirm the audit summary in the throw output mentions the AS-2 directly.

**Task 11.4:** **HITL-confirmed push**. PR title `chore(audit): print [ERROR …] detail in audit-throw message`.

---

## PR 12 (Track B) — `figures.ts` duplicate-key build guard

**Branch:** `feat/figures-duplicate-key-guard`

### Files

| Action | Path |
|---|---|
| Modify | `packages/components/src/runtime/pedagogy-store.ts` (`createPedagogyStore.set()` validates uniqueness; throws on collision) |
| Modify | `packages/components/src/runtime/pedagogy-store.test.ts` (add tests for collision throw) |
| Modify | `packages/astro/src/lib/figures-virtual-module.ts` (also validate at the virtual-module build layer — defense-in-depth) |
| Modify | `docs/website/reference/chapter-components.md` (note the new guard in the Figure section) |

### Design

The `pedagogyStore.set()` method at [`packages/components/src/runtime/pedagogy-store.ts:94-99`](../../Teaching/sophie/packages/components/src/runtime/pedagogy-store.ts) currently uses `new Map(entries.map((e) => [opts.keyOf(e), e]))` — last-write-wins silently. For the figure registry specifically, duplicate names silently overwrite an earlier figure.

Two-layer fix:

**Layer 1 — generic in `pedagogyStore`:** add an `onDuplicateKey?: "throw" | "warn" | "last-write-wins"` option (default `"throw"` to fail loudly; figure-registry consumers opt in to throw).

**Layer 2 — at the figure-virtual-module specifically:** add a build-time validation pass before the JSON serialization:

```ts
// figures-virtual-module.ts
export function figuresVirtualModule(figures: FigureRegistry): Plugin {
  // Validate uniqueness at the boundary — fail the build, not at runtime
  const seen = new Set<string>();
  for (const [key, entry] of Object.entries(figures)) {
    if (key !== entry.name) {
      throw new Error(
        `figures.ts entry key "${key}" does not match its \`name\` field "${entry.name}". ` +
        `Each entry's record key must equal its name.`
      );
    }
    if (seen.has(key)) {
      throw new Error(
        `figures.ts has duplicate entry for name "${key}". ` +
        `Resolution: rename one of the duplicates (e.g., add a unit suffix: "${key}-m2-l3" / "${key}-m3-l10").`
      );
    }
    seen.add(key);
  }
  // … existing virtual-module plugin code …
}
```

(Note: JS object literals naturally dedupe keys at parse time, so the `seen.has(key)` collision case can't fire via the `Object.entries` path — but it CAN fire if the figures registry is built up via spread merging or imports. Keep the check; it's cheap defense-in-depth.)

The mismatched-key-vs-name check (`key !== entry.name`) IS a real authoring trap and catches the case the design doc cited.

### Tasks

**Task 12.1:** Write failing tests for both layers — `pedagogyStore.set()` throws on collision; `figuresVirtualModule` throws on mismatched key/name.

**Task 12.2:** Implement layer 1.

**Task 12.3:** Implement layer 2.

**Task 12.4:** Update chapter-components.md Figure section noting the build-time uniqueness guarantee.

**Task 12.5:** Verification gate. Add a smoke fixture that intentionally collides (gated behind a separate fixture file the build doesn't load by default — `figures.invalid.ts.disabled`) plus a meta-test that imports the fixture and asserts the throw shape.

**Task 12.6:** **HITL-confirmed push**. PR title `feat(figures): duplicate-key + name-mismatch build guard`.

---

## Verification — what "done" looks like for this session

After all 12 PRs merge, the following are observable:

1. **Visibility fix landed** — `practice.mdx` files render at `/units/<unit>/practice`; ~35 problems across M3-L10 + M4 are now student-visible (verified by Playwright e2e against astr201 prod build).
2. **Six formative MDX components shipped** — `<MCQ>`, `<MultiSelect>`, `<FillBlank>`, `<NumericQuestion>`, `<QuickCheck>`, `<PracticeProblem>` — each with parent-context threading + Solution/Hint composition + axe-clean tests + Storybook stories + reference-doc entries.
3. **Five audit invariants fire correctly** — AS-1 ERROR (MCQ exactly-one-correct), AS-2 WARN (formative missing Solution), AS-3 WARN (FillBlank no slots), AS-4 ERROR (NumericQuestion exactly-one-Answer), AS-5 ERROR (MultiSelect ≥1 correct) — each tested against fixtures.
4. **N-tab link-bar in `<ChapterLayout>`** — currently renders 1–2 tabs (Reading; +Practice when present); slides slots in zero-cost when its ADR/PR lands.
5. **`<Video>` closes ADR 0064 gap** — four reading callsites become migration candidates for the astr201 adoption pass.
6. **Author-trap lint catches `<r` in math** — astr201 reauthoring can rely on the lint, removing the hand-fix burden.
7. **Audit-error DX improved** — build-time errors print `[ERROR …]` detail inline in the throw.
8. **Figures.ts duplicate-key build guard prevents the silent-overwrite class.**
9. **ADR 0073 Amendment 1** is the single citation point for everything above; §v2-foreshadowing names the three deferred design seams.
10. **All 12 PRs land with zero biome warnings, axe-on-render coverage, R6–R12 compliance** per AGENTS.md.

The astr201 adoption pass (consumer-repo follow-on) is the natural next session — incremental per-reading conversion of `.quiz` → `<MCQ>`, tip-Callout reveals → `<QuickCheck>`, numeric blanks → `<NumericQuestion>`, etc. It's deliberately out of scope here.

---

## Critical files to revisit before starting each PR

| When starting | Re-read |
|---|---|
| PR 1 (Video) | `docs/website/decisions/0064-chapter-migration-playbook.md` §3 (gap protocol); `docs/website/reference/chapter-components.md` static-components table; one existing static-component impl as model (`packages/components/src/components/Aside/`) |
| PR 2 (ADR Amendment 1) | The full existing `0073-unified-assessment-schema.md`; ADR 0080 Amendment 2 as precedent shape; the design doc at `docs/plans/2026-05-27-formative-assessment-design.md` |
| PR 3 (Practice route) | `packages/astro/src/routes/reading.astro` (the sibling pattern); ADR 0082 (route-injection mechanism); the #189-warning file before deleting |
| PR 4 (Reveals + plugin) | **SHIPPED 2026-05-27** (commit `3ba8867`). Reference for PRs 5–9: `packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts` (the three-job remark plugin); `packages/components/src/components/Solution/` and `Hint/` and `PracticeProblem/` (the prop-shape templates the next five formative parents mirror); ADR 0073 Amendment 1 §3 (compile-time threading design); `formative-assessment-authoring.md` (author-surface contract) |
| PR 5 (QuickCheck + index) | `packages/astro/src/lib/pedagogy-index/extractors/worked-examples.ts` (the model extractor); the accumulator at `packages/astro/src/lib/pedagogy-index/accumulator.ts`; `FindingSink` interface |
| PR 6 (MCQ) | `@radix-ui/react-radio-group` docs (Context7); ADR 0019; the `<MCQ.Choice>` slugify pattern in `Dropdown.tsx` |
| PR 7 (MultiSelect) | `@radix-ui/react-checkbox` docs; PR 6's MCQ implementation as immediate analog |
| PR 8 (FillBlank) | The inline-slot rendering pattern (no exact analog; design from first principles using `<input type="text">` + useInteractive) |
| PR 9 (NumericQuestion) | PR 8 FillBlank for single-input pattern |
| PR 10 (mdx-author-traps) | The existing `mdx-author-traps.ts`; ADR 0064 §6 + the existing chapter-components.md "Authoring traps" section |
| PR 11 (audit-error DX) | `TextbookLayout.astro` lines 215–231; `format.ts` lines 36–49 |
| PR 12 (figures dup-key) | `pedagogy-store.ts` lines 94–99; `figures-virtual-module.ts` (the boundary); chapter-components.md Figure section |

---

## Execution handoff

Plan complete. Recommended execution mode per **superpowers:writing-plans**:

**Subagent-Driven (this session)** — dispatch fresh subagent per task; review between tasks; fast iteration with quality gates at every component. **For this plan specifically**, given the 12-PR scope and the HITL mandate, my recommendation is **Parallel Session per PR-batch** rather than per-task — open a new session per PR (or per 2–3 closely-related PRs), use `superpowers:executing-plans` in that session, and return for HITL confirmation at each push/PR-creation/merge.

The plan stays in `~/.claude/plans/` (this file) AND `docs/plans/` (after Task 0 copy) as the single execution-input artifact.
