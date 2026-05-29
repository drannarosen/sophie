# Post-ITEM-2 Comprehensive Audit + Leverage Review — 2026-05-28

**Trigger:** Anna — "comprehensive code audit and review; let's discuss next high-leverage steps," after merging ITEM 2 (PR #223 ADR 0090 unified build-time math rendering + PR #224 ADR 0089 LaTeX→speech accessibility).

**Method:** Fresh metric runs + three parallel read-only audit agents (architecture/coupling, test coverage/quality, strategic/roadmap leverage). All numbers from this session, not memory.

**Headline:** Engineering is **A‑/B+** and stable; the binding constraint has **shifted from platform capability to shipping**. The platform can do far more than is currently in front of students. Highest leverage is no longer "build capability N+1" — it is getting already-built capability into a live, student-facing ASTR 201 site.

---

## 1. What changed (ITEM 2)

| Area | Change | ADR |
|---|---|---|
| Math rendering | One build-time `renderMath` is the only KaTeX site; `KeyEquation`/`EquationRef`/`ResultCard`/`EquationSpecContent` consume prerendered html and **dropped `katex`** (full-drop); `formatUnitTex` single-sourced to `@sophie/core` | 0090 |
| Math a11y | Build-time SRE ClearSpeak `aria-label`s on MDX + choice + registry math; **axe `label` rule re-enabled platform-wide** (lone disable closed); `mathA11y` audit coverage section (artifact_version 0.2) | 0089 |

Both merged green (incl. authoritative Linux VR + `packed-smoke`). The `packed-smoke` gate caught 4 bugs `test:unit`+package-build missed (the recurring tsup/globalThis/UMD-in-ESM/version-pin class — see `project_smoke_gate_catches_packaging_class` memory).

## 2. Test & gate metrics (fresh)

| Layer | Count | Status |
|---|---|---|
| Unit test files | core 38 · components 111 · astro 130 · cli 9 · theme 1 | all green |
| Total unit tests | ~2,737 | 0 fail, 0 RolldownError |
| e2e specs | smoke 41 · packed-smoke 4 | green (CI authoritative) |
| Source LOC | core 4.5k · components 14.5k · astro 22.2k · theme 0.5k · cli 0.6k | — |
| ADRs | 90 | validation.md fresh |
| `lint:axe-render` | 64/64 | ✓ (R11) |
| `lint:loc` | 0 err · 4 warn · 36 info · 8 exempt | warnings pre-existing, < 800 |
| biome | 0 errors / 0 warnings | ✓ |
| MyST content (`grep -c ⚠`) | 0 | ✓ |
| Tech-debt signals | 1 TODO (issue-linked) · 5 `test.skip` · 41 `biome-ignore` (all justified) · 2 axe `disableRules` (tracked) · **0** `@ts-ignore`/`as any` | clean |

## 3. Quality grade

| Category | Score | Evidence |
|---|---|---|
| Test coverage | 17/20 | 4-layer, condition-based, zero anti-patterns, axe mandatory (R11). −3: no CI coverage ratchet; 21 astro/lib utilities tested only transitively (undocumented). |
| Schema/contract correctness | 18/20 | Zod single source (ADR 0003); production audit invariants; 0 `ts-ignore`/`as any`. Pedagogy-index + audit enforce contracts at build. |
| Accessibility | 18/20 | axe-core on every render (64/64); `label` rule now strict; SRE speech across all build-time math. −2: 2 tracked `disableRules` (color-contrast theme-level, list/listitem Astro-slot artifact) still open. |
| Architecture | 17/20 | Acyclic, framework-pure boundaries; paid-for factories; 41 `biome-ignore` all justified. −2: contract reaching `dangerouslySetInnerHTML` saturation (15 KaTeX sites); −1: `compound-expand.ts` (638) splittable. |
| Build/distribution | 16/20 | Essential (not accidental) complexity, deeply documented; `packed-smoke` is the structural defense. −4: manual tsup entry map is a recurring bug source (bit 3× in ITEM 2 + course-info sprint); upstream TODO #221 open. |

**Overall: 86/100 → A‑** (engineering). Caveat: the grade measures the *platform*; §5 is the real story.

## 4. Engineering backlog (P1–P5)

| P | Item | Effort | Why |
|---|---|---|---|
| P2 | **Dynamic tsup-entry discovery** for `.astro`→`lib` imports | 2–4h | Eliminates the "missing dist entry" bug class (3× in recent sprints; 2× in ITEM 2 alone). Structural fix > patch. |
| P2 | Split `compound-expand.ts` → 3 path files (choice/fillblank/tabs) | 2–3h | Clears 1 of 4 LOC warnings; ADR 0061 Rule 1; unblocks Tabs work. |
| P3 | Resolve the 3 `await-children` e2e skips via a hydration-complete signal | medium | Stops "Astro slot boundary ⇒ skip e2e" becoming a pattern as more components slot children. |
| P3 | Doc the Astro/Vite split-environment + globalThis pattern (explanation page) + transitive-coverage comments on 21 astro/lib utils | 1–2h | Surfaces the gotcha class for future authors; the smoke-gate memory is the seed. |
| P4 | Build-time HTML prerender sink (`<MathBlock>`/`<RegistryContent>`) to shrink `dangerouslySetInnerHTML` surface; astro/lib coverage threshold; close the 2 tracked axe disables | exploratory | Future-proofing signals, not defects. |

## 5. Strategic finding — the binding constraint has shifted to *shipping*

Memory (`project_reasoning_os_pivot_status_update`, 2026-05-23) said the chapter-migration capstone was "still future." **That is stale.** Verified on disk in the `astr201` consumer repo (separate repo per ADR 0001):

- **Modules 1–4 fully migrated**: 37 `.mdx` readings, 15 `practice.mdx`, 57 equation-registry entities, populated `course.sophie.yaml` (v0.2-shape). Reasoning-OS components in *real* use: `<OMIFlow>` ×17, `<Intervention>` ×17, `<KeyEquation>` (biographies) ×22.

**The gap (verified this session):**
1. **Formative components shipped (ADR 0073 v1, PR #209) but are unused in the migrated content** — `astr201` has **0** `<MCQ>`/`<QuickCheck>`/`<MultiSelect>`/`<FillBlank>`/`<NumericQuestion>`/`<PracticeProblem>` and **21** files still on the old `<Dropdown>` workaround the formative family was built to replace. The capability has ~zero real-content validation.
2. **No deploy workflow** — `astr201/.github/workflows/` is empty; the site is not student-facing despite "a public URL Anna gives students" being the v1 success criterion.
3. **No slides track** — `@sophie/slides` does not exist; Anna still lectures from Quarto/RevealJS. A genuine v1 content gap, but a multi-sprint build.

**Honest framing:** mildly over-built relative to shipped *student-facing* content, but the gap is small and closing. The infrastructure pays off where exercised (the migration went fast; the audit catches real pedagogy gaps; Reasoning-OS is demonstrated in real astrophysics content). The risk pattern: building capability N+1 (math-speech, epistemic-enforcement) while capability N's adoption + the deploy step lag. For a tenure case that needs **use**, the marginal value of the next capability is now below the marginal value of getting the existing one in front of students.

### Ranked next-step leverage (impact × readiness ÷ effort)

| Rank | Step | Readiness | Effort | Tenure linkage |
|---|---|---|---|---|
| **1** | Retrofit formative components into ASTR 201 readings (Dropdown→`<QuickCheck>`/`<MCQ>`; structured `<Solution>`/`<Hint>` in practice) **+ ship GitHub Pages deploy → live site** | High (all built; `/practice` route exists) | Medium | **Direct.** Teaching-effectiveness evidence needs students *using it*. A live URL is the tenure artifact; green CI is not. Happens in the `astr201` repo. |
| **2** | ITEM 5 — graduate epistemic-role contract optional → enforced-for-new (ADR 0058) | High (plan written + approved) | Low–Med | **Direct to grants/SoTL** — makes "Reasoning OS" structurally true, the thesis separating Sophie from MyST/Quarto. Cheap. |
| **3** | ITEM 4b — act()-warnings hydration-settle test helper | High (plan written) | Low | Platform trust; clears the deck. |
| 4 | `@sophie/slides` track | Low (no package/ADR) | High | Real v1 gap, multi-sprint. |
| 5 | SoTL telemetry substrate | Low (`accepted-design`) | High | Gated behind #1 (can't measure outcomes before students use it). |

**Recommendation:** the single highest-leverage move is **#1 — get ASTR 201 live with formative components retrofitted.** It converts three already-paid investments (migration + formative family + course-info chrome) into the one artifact the tenure case needs. **#2 (epistemic enforcement)** is the right *second* move — cheap, strategically central to the grant story — but follows shipping, not precedes it. Both via the HITL brainstorm-first flow; the retrofit needs Anna's pedagogical call on which Dropdown blocks become `<QuickCheck>` vs `<MCQ>`. **Caveat:** #1 is work in the `astr201` consumer repo, not this platform repo (ADR 0001).

## 6. Files / scope

Audit-only; no platform code changed. This review + a README row + a memory correction (`project_reasoning_os_pivot_status_update` is stale — capstone shipped) land directly on `main` (dated review, per branch-scope convention).
