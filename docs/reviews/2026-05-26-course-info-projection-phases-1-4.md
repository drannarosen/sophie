# Course-info projection — Phases 1–4 review

- **Date**: 2026-05-26
- **Branch**: `feat/course-info-projection`
- **Base**: `89951880` → **HEAD**: `565332de`
- **Scope**: 14 commits, 92 files, +4826 / −255 LOC
- **Reviewer**: Senior code-reviewer audit, pre–Phase 5 gate
- **Verification run (this audit)**: `pnpm exec biome check` → 895 files, 0/0. `pnpm lint:axe-render` → 58/58. `pnpm vitest run` (core + astro) → 81 tests pass. `pnpm typecheck` (astro) → clean.

## Verdict

**Ready for Phase 5 with two important fixes first.** The schema, virtual-module wiring, route injection, dispatcher, compose evaluator, and chrome-component layer all land where the design said they would. Architectural decisions H1–H7 are honored. The biome/test/lint gates are green. Two issues should land before touching the astr201 consumer repo:

1. A type-safety hole on the dispatcher routes: `courseSpec` is typed `CourseSpec | null` but accessed unguarded in `course-landing.astro` and `info-page.astro`. The runtime path can never hit `null` (integration only injects these routes when the spec is present) but the dispatchers still call `courseSpec.landing?.layout` and `courseSpec.info_pages?.[slug]`. Astro check doesn't catch it because the smoke fixture has no spec. ASTR 201's build (with a real spec + the same virtual-module declaration) will surface this if astro-check is wired in.

2. An author-trap silent skip in `SyllabusPage.astro:88–93`: the `case "prereqs":` branch returns `null` with a comment explaining that the sub-component isn't built yet. The compose evaluator already throws when `spec.prereqs` is absent, but if a consumer authors both `spec.prereqs` AND adds `"prereqs"` to a compose list, the syllabus page silently drops that block at render time. R7's *spirit* (no bare silent skips in extractors / dispatchers without a paired findings.push or audit invariant) applies. Either ship `<PrereqsList>` in this sprint or have the dispatcher throw a curated "not yet implemented" error.

Both are small fixes; neither blocks the overall structural soundness. Everything else is a minor or strength.

---

## Per-phase grades

### Phase 1 — Schema layer — **A**

Commits `6010cd2` → `12a7a14`. Six small commits covering: v0.2 sibling-file schemas, `CourseInfoFragmentSchema`, `virtual:sophie/course-spec` plugin, loader, and integration wire-up.

What works:

- **Clean-break on `grade_weights → grading.categories`** (H1/H5) is uncompromising. The legacy fixture `weights-not-100.yaml` is renamed in-place to `category-weights-not-one.yaml`; the new test at `course-spec.test.ts:94–105` *explicitly* asserts `grade_weights` is rejected by `.strict()`. No back-compat shim slipped in. This is the cleanest version of "pre-launch no-back-compat" I've seen in the codebase.
- **Sibling-file layout (ADR 0061)** is honored: 8 new files in `course-spec-v02-*.ts`, each 20–91 LOC, all `.strict()`. `course-spec.ts` grew from 371 → 404 LOC (within the 500 LOC "warn" budget; under the 800 "stop" budget).
- **Cross-refine on `assessment.category_refs → grading.categories[*].id`** (`course-spec.ts:363–373`) catches one whole class of "I added a category to my assessment but forgot to declare it in grading" mistakes at parse time. This is the structural-fix-over-targeted-patch pattern Anna prefers.
- **Strict union on `compose:` entries** (H4/B5; `course-spec-v02-info-pages.ts:26–34`) is the right call. The compose evaluator (Phase 3) can trust the entry shape and only needs runtime-check spec-field presence.
- **Reserved-slug refine** on `InfoPagesSchema` defends the class. The 7-entry reserved set is right (`units`, `sections`, `library`, plus Astro internals + Pagefind). Two defenses combine (kebab-regex catches `_astro`-style, allowlist catches everything else).
- **Always-register virtual module pattern** (`course-spec-virtual-module.ts:63–84`) — Anna would have noticed the previous-draft "only register when spec present" shape would break `import { courseSpec } from "virtual:sophie/course-spec"` at build time for any chrome component that runs in a pre-v0.2 consumer. The widened `CourseSpec | null` signature with `JSON.stringify(null) → "null"` is structurally sound.
- **R8 HMR-strategy comment** (`course-spec-virtual-module.ts:36–51`) is present, dense, and accurate.
- **`VitePluginLike` structural type** (B7) avoids the vite@7-vs-@8 collision cleanly; the local type stays inferable and doesn't leak.
- **`CourseInfoFragmentSchema` location**: kept in `@sophie/core/schema` (not `@sophie/astro`) as the docstring explains. Right call — `@sophie/astro` doesn't take a zod dep, and all 30+ Zod schemas share one home.

Issues:

- **`AccessibilitySchema.drc_link: z.url()` and `contact_email: z.email()`** (`course-spec-v02-accessibility.ts:12–13`) use Zod 4's new `z.url()` / `z.email()` builders. These are Zod 4-only — fine since the project pins Zod 4. Verified in `course-spec.test.ts` (no failure). Worth noting because older Sophie schemas use `z.string().email()` for migration purposes.
- **`ObjectiveSchema.assessed_by`** has no cross-refine against `grading.categories[*].id`. The comment in `ObjectivesSection.tsx:21–22` claims "the cross-refine on CourseSpecSchema ensures every assessed_by ref exists" — this is **inaccurate**. Only `assessment.category_refs` has that cross-refine. Either tighten the schema or correct the docstring.
- **Test name lies about coverage**: `compose-evaluator.test.ts:151` is titled "supports all 7 known data keys" but only tests 5 (skips `prereqs` and `schedule_overview`).

### Phase 2 — Route injection + landing layouts — **A−**

Commits `61dc835` → `1435b2b`. Three commits covering integration injection, landing layouts (SimpleList + stubs), section-landing.

What works:

- **Conditional injection** (`integration.ts:198`) is correctly null-gated. Back-compat consumers (smoke, pre-v0.2) get the original `/units/[unit]/reading` only — confirmed by `integration.test.ts:126–133` which asserts negative cases on all three new patterns.
- **Shadow-warn pattern** (`integration.ts:209–246`) mirrors ADR 0082 §A2.6 surgically for the new injected slugs.
- **R10 landmark choice** is correct: `SimpleList.tsx:33` uses `<main>` because the layout IS the page-level shell. `SectionLanding.tsx:30` matches. The unnamed `<section>`s inside (lines 45, 59) are fine — axe doesn't require accessible names for nameless `<section>`s (they're not landmarks).
- **R11 axe-on-render** holds: `pnpm lint:axe-render` reports 58/58. SimpleList + SectionLanding both call `axe()` in their test files.
- **Draft-unit filtering** at `SimpleList.tsx:41` and `SectionLanding.tsx:26` is right — public landings should never link to authored-but-not-ready content.

Issues:

- **`course-landing.astro:29` dereferences `courseSpec.landing?.layout`** but the virtual-modules.d.ts type signature is `CourseSpec | null`. The runtime guarantees non-null here (integration only injects this route when spec is loaded) but the type doesn't carry that guarantee. Astro check would flag this if it actually checked the route file in the ASTR 201 build context. **Suggested fix**: add `if (!courseSpec) throw new Error("…")` at the top of the route. The throw is unreachable in the live runtime, but it narrows the type cleanly and documents the invariant.
- **Stubs without TODO + issue links**. `HeroWithModules.tsx` and `ProseWithToc.tsx` use prose ("v0.2 follow-up per the design doc") rather than a tracked TODO comment. AGENTS.md "no TODO without an issue link" is a hard rule; the workaround here dodges the lint but loses tracking. Either open an issue + add the issue ref, or accept the rule-dodge knowingly. Minor.
- **`ASTR 201 fixture declares `landing.layout: "hero-with-modules"`** (line 367) but that layout is a SimpleList stub. Phase 5 will appear to "work" but the user will see SimpleList rendering when they wrote "hero-with-modules". Worth either changing the fixture to `simple-list` (more honest) or shipping the real HeroWithModules in Phase 5 sequence rather than a follow-up sprint.

### Phase 3 — Info-page layouts + compose evaluator — **A−**

Commits `73c8ae3` → `fed42fe`. Three commits: compose evaluator, 5 React sub-components, 5 .astro layouts + dispatcher.

What works:

- **H7 = Option B execution is clean.** 5 .astro orchestrators in `@sophie/astro/src/components/` match the ChapterLayout precedent; React sub-components in `@sophie/components` are R10-compliant `<section aria-labelledby>` named regions. The `chromeComponents` from `makeStaticComponents` flow through `<Content components={chromeComponents}>` (e.g. `SyllabusPage.astro:70`) so prose fragments get the full chrome component set (Callout, GlossaryTerm, KeyEquation, etc.) — exactly the design doc's chrome-vs-pedagogy boundary.
- **Compose evaluator** (`compose-evaluator.ts:83–104`) is purely functional. Order-preserving, throws with the offending ref name in the error message, schema-validation upstream guarantees the entry shape. The `kind: "data" | "prose"` discriminated union is the right model.
- **`schedule_overview` deferred-throw** (`compose-evaluator.ts:156–159`) correctly carries the H6 contract forward to runtime — the schema accepts it (since `schedule_overview` is in `KNOWN_COMPOSE_DATA_KEYS`), but the evaluator throws an authored-and-curated error pointing at the follow-up sprint. This is the only way to keep the schema's union closed without breaking forward compatibility.
- **Curated error messages**: every throw names the file the author should edit (`course.sophie.yaml's info_pages block`, `src/content/course-info/<slug>.mdx`, etc.). High debug-ability.
- **Tolerant content-collection load** (`info-page.astro:50–59`): `try { getCollection("course-info") } catch { fragments = [] }` lets layouts gracefully degrade when the consumer hasn't declared the collection. Individual prose refs still throw via the compose evaluator if specifically referenced. Right balance.

Issues:

- **`info-page.astro` dispatcher has no fallback when `decl.layout` matches none of the 5 cases** (lines 75–114). The throw on `if (!decl)` covers "slug not in spec," but if a consumer writes `info_pages.syllabus.layout: "MysteryPage"` the spec validates (layout is `NonEmptyString`, not enum) and the page renders empty. **Suggested fix**: either constrain layout to an enum on `InfoPageDeclarationSchema` (matches the 5 dispatcher cases), or add a final `{!["SyllabusPage","SchedulePage","InstructorPage","PoliciesPage","AccommodationsPage"].includes(layoutName) && (() => { throw ... })()` block. Schema-layer fix is preferred (defends the class).
- **`SyllabusPage.astro:88–93` silent-skip on `prereqs`**: see "Critical issues" below. This is the most likely path to "I declared prereqs in compose but they don't show up" → author confusion. The comment "skip silently" is honest — but it should throw with a curated message.
- **`ComposedItem` type lives in `@sophie/astro/src/lib/compose-evaluator.ts` and is imported by sibling-package layouts** (`SyllabusPage.astro:12` via relative path `../lib/compose-evaluator.ts`). The dependency direction is correct (`/components/` consumes `/lib/`), and the type stays in the package that owns the function. Type-duplication risk per R9 is zero here. Good.
- **`info-page.astro` dispatcher uses `(() => { ... })()` IIFE pattern** for each layout case. Astro doesn't lint this, but it's the most LSP-unfriendly pattern in the file. Alternative would be one shared `composedItems` const + a `<Component {...sharedProps} />` (Astro's `<Component is={Layout}>` would also work). Tracked as Minor — not a refactor for now.

### Phase 4 — Chrome components + `useCourseSpec` hook — **A**

Commits `9b13a16` → `565332d`. 2 commits: hook + store + TextbookLayout wiring; then 5 chrome components.

What works:

- **`courseSpecStore.ts` honors the `pedagogy-store.ts:14-22` doctrine** (no `virtual:` imports in `@sophie/components`). The SSR-setter + script-tag auto-hydrate pattern matches the existing `definitions-store.ts` / `figure-registry-store.ts` precedent.
- **TextbookLayout wiring** is clean: 13 lines added (+1 import line, 3-line SSR-setter call with `if (courseSpec)` guard, 8-line script tag block + comment). Sits alongside 8+ existing `__set*` callsites without bloating the file. The `set:html={courseSpecJson}` always emits a value ("null" string when spec absent) — store handles it.
- **`Due.tsx` UTC parsing is correct**: `Date.UTC(y, m-1, d)` + `toLocaleDateString(..., { timeZone: "UTC" })` dodges SSR/client TZ shift. Hostile case: `2026-12-31` in US-eastern → UTC midnight is `Dec 30 21:00 EST`, but `timeZone: "UTC"` formatting yields "Dec 31, 2026" consistently in both contexts. Verified by reading code; no test pins the edge case directly (worth adding).
- **`Points.tsx` schema lookup** throws a curated error when the category id doesn't exist, listing known ids. Right shape.
- **`Reading.tsx` is YAGNI-correct**: prose-string-typed per design doc, no structured `{ textbook_id, chapter, pages: {start, end} }` until a second caller appears. Comment is explicit about the graduation path.
- **`Week.tsx` validates `n` as a positive integer** and throws curated errors. No silent rendering of `<Week n={NaN}>`.
- **`OfficeHoursChrome.tsx` empty-state**: renders `Office hours: not set` rather than nothing. Author-visibility default is the right call — a chapter that uses `<OfficeHours />` but has no `office_hours:` block in the spec gets a visible "fix me" rather than a confusing absence.
- **Naming resolution `OfficeHoursChrome as OfficeHours`** (root barrel, `index.ts:217`) — externally MDX authors write `<OfficeHours />`; internally the file is named `OfficeHoursChrome` to disambiguate from `OfficeHoursTable`. Minor grep-locatability concern; addressed below.

Issues:

- **Naming foot-gun**: `OfficeHoursChrome` at the filesystem level vs. `OfficeHours` at the public API. AI authors (and Anna's authoring workflow per ADR 0030) will grep "OfficeHours" and find both the chrome inline + the info-page section. A `grep "OfficeHoursChrome"` finds nothing if you don't know the internal name. **Suggested fix**: pick one. Rename the internal file to `OfficeHours/`, and rename the info-page section to `OfficeHoursTable` everywhere (it already is). The current double-name is a friction tax.
- **Static heading IDs across the React sub-components** (`grading-section-heading`, `accessibility-section-heading`, `contact-section-heading`, etc.). If two of these sub-components ever appear on the same page (e.g., a Syllabus that lists two accessibility blocks, or unexpected re-use), the IDs collide → axe `duplicate-id-aria` violation. For the current single-page-each layouts this can't happen, but it's a foot-gun. **Suggested fix**: `useId()` (React 18+).
- **`__resetCourseSpecStoreForTesting` exported from `course-spec-store.ts`** but NOT from `runtime/index.ts` (good — test-only stays internal-only). The function name suffix is enough; not worth wrapping in `if (process.env.NODE_ENV === "test")`. (Pattern matches existing `__setX` setters across the codebase.)
- **`<script id="sophie-course-spec">` set:html=`"null"` round-trip**: when the spec is absent, `JSON.parse("null")` yields `null`, and the store sets `cachedSpec = null` + `didSet = true`. Subsequent `useCourseSpec()` calls throw the curated "no spec" error — correct behavior, but the path through `didSet=true` is the first "we have set; the value is null" state in the codebase. Worth a test pin (not present today).
- **`Reading.tsx` has no schema-lookup branch** — Anna's design said "hybrid props-or-schema where applicable." Reading is justified as prose-string-typed-for-v1, but the JSDoc comment doesn't explicitly say "no schema branch" — it says "structured shape deferred." Author may try `<Reading />` (no props) thinking it'll do a schema lookup. **Suggested fix**: small JSDoc clarification: "no schema-default; `source` is required at v1."

---

## Critical issues (must fix before Phase 5)

### C1 — Unguarded null dereference of `courseSpec` in dispatcher routes

**Where**: `packages/astro/src/routes/course-landing.astro:29`, `packages/astro/src/routes/section-landing.astro:29`, `packages/astro/src/routes/info-page.astro:36`.

**Why critical**: virtual-modules.d.ts at lines 38–49 declares `export const courseSpec: CourseSpec | null;`. The runtime safety is provided by the integration's route-injection guard (`integration.ts:198`: `if (courseSpec) { injectRoute(...) }`). But the dispatcher route files type-narrow on `?.` access, which TypeScript happily ignores. When ASTR 201 builds with a real spec + the same type declaration, the access works at runtime but fails type-check if astro check is wired into CI.

**Suggested fix** (per dispatcher):

```astro
import { courseSpec } from "virtual:sophie/course-spec";
if (!courseSpec) {
  throw new Error(
    "[sophie] course-landing.astro reached without a spec. " +
      "defineSophieIntegration's null-guard should have prevented this. " +
      "Report at https://github.com/drannarosen/sophie/issues."
  );
}
// Below this line courseSpec is narrowed to CourseSpec.
```

Three files; ~5 minutes each. Documents the invariant that the integration upstream guarantees.

### C2 — Silent `prereqs` skip in SyllabusPage dispatcher

**Where**: `packages/astro/src/components/SyllabusPage.astro:88–93`.

**Why critical**: the switch case explicitly returns `null` when `item.key === "prereqs"`, with a comment that says "no sub-component yet; skip silently." If a Phase 5 consumer (ASTR 201) declares `prereqs: [...]` in `course.sophie.yaml` and adds `"prereqs"` to a compose list, the page renders nothing for the prereqs block. The compose evaluator throws when `spec.prereqs` is absent, but a non-empty `spec.prereqs` + `"prereqs"` in compose passes evaluator validation and silently drops at the layout. Per AGENTS.md R7 "no silent skips without paired audit invariant or findings.push" (R7 is for extractors, but the principle generalizes: silent absorption is the failure mode this discipline prevents).

**Suggested fix**: either

- (Option A) ship `<PrereqsList>` in this phase (~30 min — same shape as the other 5 sub-components). Recommended.
- (Option B) make the dispatcher throw: `case "prereqs": throw new Error("[sophie] <PrereqsList> sub-component not yet shipped; declare 'prereqs' in compose after v0.2.1.");` and remove "prereqs" from the canonical ASTR 201 compose list (it isn't there today).

Either is fine; Option A is more SoTA-shape and keeps the ASTR 201 fixture composable as authored.

---

## Important issues (should fix before merge)

### I1 — `info-page.astro` dispatcher's missing-layout fallback

**Where**: `packages/astro/src/routes/info-page.astro:75–114`.

**Why important**: `InfoPageDeclarationSchema.layout` is `NonEmptyString`, not an enum. A typo (`SylabusPage`) validates schema-clean and renders an empty page. The dispatcher has no `else` branch to throw a curated error.

**Suggested fix**: tighten `InfoPageDeclarationSchema.layout` to `z.enum(["SyllabusPage", "SchedulePage", "InstructorPage", "PoliciesPage", "AccommodationsPage"])`. Schema-layer fix defends the class. Updates needed in:

- `course-spec-v02-info-pages.ts:41`
- The ASTR 201 fixture already uses these strings — no migration needed.

### I2 — Static heading IDs in React sub-components

**Where**: `ObjectivesSection.tsx:27`, `GradingTable.tsx:27`, `OfficeHoursTable.tsx:24`, `ContactCard.tsx:26`, `AccessibilitySection.tsx:26`.

**Why important**: hard-coded IDs (`course-objectives-heading`, etc.) collide if a sub-component ever renders twice on a page. Today's layouts never duplicate; future composition (or a consumer-side override) might. Defends the class.

**Suggested fix**: `const headingId = useId();` (React 18+). One line per file; no behavior change visible in tests.

### I3 — Inaccurate cross-refine claim in ObjectivesSection docstring

**Where**: `packages/components/src/components/ObjectivesSection/ObjectivesSection.tsx:20–22`.

**Why important**: docstring claims "the cross-refine on CourseSpecSchema ensures every assessed_by ref exists" — false. Only `assessment.category_refs` has that cross-refine. `objectives[].assessed_by` is unchecked. If a consumer's `lo-1: assessed_by: [non-existent-category]` lands, the schema accepts it and the component renders an invalid badge.

**Suggested fix**: pick one of —

- (A) Extend the cross-refine on `CourseSpecSchema` to also validate every `objectives[].assessed_by` ref exists in `grading.categories[*].id`. Matches the structural-fix discipline.
- (B) Correct the docstring to say "no cross-refine; component renders refs as-authored." Less safe; loses the audit invariant.

(A) is recommended (1 line of refine logic in `course-spec.ts:363`).

### I4 — Stubs not tracked

**Where**: `HeroWithModules.tsx`, `ProseWithToc.tsx`.

**Why important**: AGENTS.md "no TODO without an issue link" — these dodge the rule by using JSDoc prose. AI authors discovering "hero-with-modules" in a future migration won't have a GitHub issue to file against.

**Suggested fix**: open one GitHub issue ("Course-info v0.2 follow-up: real HeroWithModules + ProseWithToc layouts"), add `// TODO(sophie#XXX): ship real impl per design doc.` at the top of each stub.

---

## Minor issues (track and revisit)

### M1 — `compose-evaluator.test.ts:151` test name overclaims

Title says "7 known data keys" but tests 5. Update to "supports 5 of 7 known data keys (prereqs requires a populated spec; schedule_overview throws by design)" or add the missing two cases.

### M2 — Edge-case TZ test for `<Due>` not present

`Due.test.tsx` doesn't pin the year-end hostile case (e.g., `2026-12-31` rendered in a US-eastern TZ env). The code is right; a regression-pin would prevent future "let me just use `new Date(date)`" backslides.

### M3 — `null`-as-spec round-trip not tested

When TextbookLayout emits `<script id="sophie-course-spec">null</script>` (null-spec consumer), the store sets `didSet=true` with `cachedSpec=null`, and `useCourseSpec()` correctly throws. Worth a dedicated test pin in `course-spec-store.test.ts` to lock the behavior.

### M4 — `(() => { ... })()` IIFEs in `info-page.astro`

4 IIFEs at lines 75, 92, 100, 108. Astro doesn't lint this; readability suffers slightly. Could refactor to one shared `proseEntry` computation + `<Component is={Layout} ...>` dispatch. Not urgent.

### M5 — Astro layouts have no axe tests

`packages/astro/src/components/SyllabusPage.astro` etc. — no `.axe.test.ts` counterparts. The React sub-components are unit-axe-tested; the .astro composition isn't. Phase 5's planned smoke E2E at desktop + 375px will cover this, but a unit-level axe test on each .astro layout would catch regressions earlier. (The precedent — `InferenceSpecContent.axe.test.ts` etc. — already exists; same pattern would apply.)

### M6 — No integration test on the `info-page.astro` dispatcher

The 5 layout sub-components are unit-tested. The dispatcher's slug-from-pathname + layout switch isn't. A small Vitest integration test using astro's `experimental_AstroContainer` would catch regressions on the dispatch logic. Phase 5's smoke E2E will exercise it transitively.

### M7 — `__resetCourseSpecStoreForTesting` could carry a production-runtime guard

It's exported alongside `getCourseSpec` from `course-spec-store.ts`. The `__` prefix + the `ForTesting` suffix are the existing convention; the only further-safety move would be `if (process.env.NODE_ENV === "production") throw new Error(...)`. Probably over-defended; the existing convention is the bar everywhere else in the codebase. Track for "if we add a runtime guard pattern, do it everywhere at once."

### M8 — `<a><h2>...</h2></a>` pattern in SectionLanding

`SectionLanding.tsx:48–54`. HTML5 + axe both allow heading-inside-link, but a heading-as-link-text is an arguable a11y pattern (screen reader announces "link, heading level 2, ..."). The current shape is fine; flagging for future design review on landing-card patterns.

### M9 — `ASTR 201 fixture's `landing.layout: "hero-with-modules"` resolves to a stub

`course-spec-astr-201.yaml:367`. The fixture is the canonical-good shape; the layout it picks is a stub that delegates to SimpleList. Phase 5 will appear to "work" but render SimpleList. Either change fixture to `"simple-list"` (more honest) or ship real `HeroWithModules` in Phase 5. The simpler fix is updating the fixture for now.

---

## Strengths to replicate in Phase 5

1. **Always-register virtual-module pattern**: `courseSpecVirtualModule(spec: CourseSpec | null)` always returns a plugin. The `null` payload roundtrip is structurally honored at every layer (loader → integration → virtual module → store → hook). This pattern should be the template for ScheduleSchema + iCal's virtual module in the follow-up sprint.

2. **Curated error messages**: every throw in the new code names the file the author should edit, the field they should look at, and (where applicable) the deferred-sprint trigger. Compare to baseline Zod errors. The team should treat this as a hard standard going forward.

3. **Cross-refine for referential integrity**: `assessment.category_refs → grading.categories[*].id` (course-spec.ts:363). The same pattern should defend ScheduleSchema's `unit_id`/`section_id` references against the actual content collection.

4. **Sibling-file LOC budget discipline** (ADR 0061): 8 new schema files, none over 91 LOC. AI authors can find each one by filename. The barrel re-export pattern at `index.ts:43–97` is the right model.

5. **`makeStaticComponents` reuse in info-page layouts**: chrome-allowed component set flows through `<Content components={chromeComponents}>` rather than each layout maintaining its own list. DRY + the chrome-vs-pedagogy boundary stays explicit at one file (`@sophie/astro/src/components.tsx`).

6. **Clean-break execution**: the `assessment.grade_weights` removal in one PR + the explicit test asserting `.strict()` rejection (`course-spec.test.ts:94–105`) + the fixture rename. No back-compat shim slipped in.

7. **Strict union for `compose:` entries**: H4/B5 done at the schema layer rather than via runtime branches in the evaluator. The structural-fix-over-targeted-patch principle, applied.

8. **`pedagogy-store.ts:14–22` doctrine honored**: chrome components never import `virtual:sophie/course-spec` directly. SSR-setter + script-tag auto-hydrate is the second instance of this pattern (first was definitions-store). Codifies it as Sophie convention.

---

## Overall grade: **A−**

Two small-but-must-fix issues (C1 + C2) keep this just below A. Once those land:

- Phase 5 (astr201 integration) is unblocked.
- The schema/dispatcher/store/hook layers are production-shaped, not prototype-shaped.
- The handoff to the iCal follow-up sprint is clean (the deferred-throw on `schedule_overview` + the explicit `schedule_ref` opaque-string field + the "always-register" pattern + the curated error messages all forward-anchor the next sprint).

The architectural decisions (H1–H7) all land where they were promised. The HITL mandate held mid-Phase-3 (H7 decision pause is visible in commit `52270ca` → `fed42fe` split). The biome/lint/test gates are green. The clean-break on `grade_weights` is the cleanest "pre-launch no-back-compat" execution I've audited in this codebase.

---

## TL;DR

- **Phases 1–4 are A−. Ready for Phase 5 with two small fixes first.**
- **C1**: dispatcher routes (`course-landing.astro`, `info-page.astro`, `section-landing.astro`) dereference `courseSpec` (`CourseSpec | null` type) unguarded. Add `if (!courseSpec) throw` at the top of each — runtime-unreachable but type-correct.
- **C2**: `SyllabusPage.astro:88–93` silently skips `prereqs` in the compose dispatcher. Either ship `<PrereqsList>` (~30 min) or throw a curated "not yet" error. Today's ASTR 201 fixture doesn't trigger the bug, but it's a foot-gun for Phase 5 authoring.
- **5 strengths to replicate**: always-register virtual module, curated errors, cross-refine for referential integrity, sibling-file LOC discipline, chrome-vs-pedagogy boundary via `makeStaticComponents`. Treat these as Phase 5 templates.
- **Important follow-ups**: tighten `InfoPageDeclarationSchema.layout` to an enum (I1), `useId()` for sub-component headings (I2), fix the misleading ObjectivesSection docstring + add the matching cross-refine (I3), open issues for the two landing stubs (I4).
