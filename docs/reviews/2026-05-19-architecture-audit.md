# 2026-05-19 — Session 10 architecture audit

> **Grade: A (92).** Slight improvement from Session 9 closeout's A (91).
> Architectural coherence is high; the soft spot is ADR-as-historical-fact
> drift (status fields, missing back-fill Revisions, doc-atomicity gaps).
> One real a11y bug surfaced (Callout collapsible duplicate `aria-label`).

## Context

This audit was triggered by the Session 10 plan's Phase 3 deliverable
after the P3 backlog closed (PR #132 self-host VR fix; PR #133
deep-dive pedagogy-tracking). Baseline for comparison is the
[Session 9 closeout review](2026-05-19-session-9-closeout.md) (A, 91)
from earlier the same day. The intent is the same as that audit:
state-of-the-platform snapshot with a prioritized backlog, optimized
for the next sprint's leverage rather than completeness.

Session-10 stake: confirm Sophie's architecture posture before the
next major surface — likely either the Phase-3 LDS plugin split
([ADR 0048](../website/decisions/0048-sophie-lds-content-plugins.md)) or the
Reasoning-OS-core author-facing surfaces
([project_reasoning_os_core_pivot](../../.claude/projects/-Users-anna-Teaching-sophie/memory/project_reasoning_os_core_pivot.md)
memory). Both have higher coordination cost than the P3 P1/P2/P3
tranche just shipped; checking the foundation pre-flight is the cheap
move.

## Methodology

Three review agents ran in parallel against the
`feat/deep-dive-pedagogy-tracking` branch (PR #133 open, 7/7 CI
green):

| Agent | Focus | Output |
|---|---|---|
| ADR alignment + architecture | Walked all 62 ADRs (0001–0062). Mapped each to its implementing files. Flagged drift / staleness / undocumented-deviation. | ~1500 words |
| Cross-package consistency | Audited `@sophie/{core,components,astro,theme,cli}` for barrel-leakage, dependency-graph health, test-layer drift, fixture consistency, LOC budget. | ~1500 words |
| Security + a11y + correctness | Audited `dangerouslySetInnerHTML`/`set:html` sites, `useInteractive`/persistence boundaries, axe coverage, `as`-cast hygiene, silent-fallback patterns. | ~1500 words |

Cross-agent reading + synthesis took ~1h. No agent saw the others'
findings; this synthesis is the first place they're combined.

Gates verified at the time of audit:

- Biome: CLEAN (588 files)
- TypeCheck: 11/11 packages
- Unit tests: @sophie/core 320/320, @sophie/astro 705/705, @sophie/components 585/585
- E2E: 148/148 (10 skipped)
- Smoke audit: 0 errors / 16 warnings / 9 infos (matches `audit-baseline.md`)
- `lint:loc`: 0 errors / 0 warnings / 14 infos / 8 exempt
- `lint:links`: 0 broken (157 files scanned)
- `lint:status`: PASS (62 ADRs + 26 reference pages all tagged)
- Lockfile: no drift

## Findings — by severity

### P1 (fix before next major surface)

1. **Callout disclosure duplicate `aria-label`** ([Callout.tsx:108-125](../../packages/components/src/components/Callout/Callout.tsx#L108-L125)).
   When `variant="deep-dive"` renders as `<aside aria-label={visibleTitle}>` wrapping `<details><summary>{visibleTitle}</summary>...</details>`, NVDA/JAWS reads the title twice — first as the aside's accessible name on landmark navigation, then again when the summary gains focus. Drop the outer `aria-label` in the collapsible branch (the summary already names the disclosure) OR set `aria-labelledby` pointing at the summary's title span. **3-line fix, real screen-reader bug.** ADR 0004 (axe coverage).

2. **Doc atomicity gap from PR #130 + PR #133** ([scientific-reasoning-os.md](../website/explanation/scientific-reasoning-os.md), [chapter-components.md](../website/reference/chapter-components.md)). The implicit-role lookup table cited by [ADR 0058 §Decision §3](../website/decisions/0058-epistemic-component-contract.md) lists only the legacy Callout variants — no deep-dive, no the-more-you-know row. [ADR 0061 Rule 5](../website/decisions/0061-ai-optimized-codebase-design.md) (atomic docs) required this update to ship in PR #130 or PR #133. Same failure pattern as the 12-stale-`<EqRef>` drift that prompted ADR 0061. **~30min fix; add to PR-B before merge or land as a separate hygiene PR same session.**

### P2 (fix in the next ~3 PRs)

3. **`__set*` setters leaking from `@sophie/components` root barrel** ([packages/components/src/index.ts](../../packages/components/src/index.ts) lines 43, 49, 101, 120-121, 127, 179). Seven underscore-prefixed setters (`__setChapters`, `__setModules`, `__setEquations`, `__setGlossaryDefinitions`, `__setFigureRegistry`, `__setFigureUsages`, `__setObjectives`) are exported from the public root barrel and consumed only by `TextbookLayout.astro`. The underscore prefix is a *signal*; the package surface is the *contract*. Move to `@sophie/components/internal/store-hydration` subpath export. ADR 0001 + ADR 0061 Rule 4. ~1h.

4. **`color-contrast` axe rule globally disabled with no compensating control** ([test-runner.ts:120](../../packages/components/.storybook/test-runner.ts#L120)). The justification comment defers to "design-system review separately" — but no automated design-system contrast audit exists anywhere in the repo. Either re-enable on stories where author-controlled content is impossible (and fix violations), or add a periodic axe-contrast sweep against the published Storybook static. ADR 0004 makes axe mandatory; selectively disabling a rule indefinitely without a compensating control is the gap.

5. **9+ ADRs with stale `accepted-design` status for shipped code**: 0019 (Radix — 4 deps + components live), 0021 (Observable Plot — figures use it), 0028 (Storybook — `.storybook/` + 31 stories + test-runner), 0039 (lucide two-adapter), 0044 (misconception graph + 12-intervention library), 0046 (equation biography), 0057 (self-hosted VR), 0058 (epistemic contract — `epistemic-role.ts` + 5+ components binding). Codebase outpaced the field. One-pass status sweep, mechanical, mirrors PR #126's PageStatus rollout. ~1-2h.

6. **4 ADRs missing back-fill Revisions for amendments**: 0003 + 0004 (amended by 0058 — no Revisions block mentions it); 0023 + 0030 (amended by 0061 — same). The Revisions back-fill convention is visible in 0038/0043/0044/0046/0048 for the 0060 amendment; just not for 0058/0061. ~30min.

7. **3 ADRs with `shipped` status but trigger unmet**: 0026 (Tailwind v4 — no `tailwindcss` dep anywhere; emitted `@theme {}` blocks never processed), 0002 (`rehype-citation` + `rehype-autolink-headings` absent from `packages/astro/package.json`), 0020 (Shiki + `rehype-pretty-code` absent; no `<CodeCell>` exists). Each needs either a status correction to `accepted-design`/`deferred` OR a Revision declaring the actual posture. ~1h.

8. **`renderChildrenToHtml` silent null fallback** ([jsx-utils.ts:237-239](../../packages/astro/src/lib/pedagogy-index/jsx-utils.ts#L237-L239)). When `toHast` returns `null` but `children.length > 0`, the function returns `""` — co-mingling with the legitimate "empty body" D3 warning in `extractDeepDives`. Should throw when children exist but conversion fails. Makes the empty-body warning load-bearing. ~30min.

9. **No global "expand depth content" toggle** for students with cognitive accommodations. Today the only way to open all deep-dive / the-more-you-know panels at once is print preview (auto-expand via `@media print`). Add a `data-sophie-expand-disclosures` body attribute wired to `<ViewModeToggle>`; CSS-only, no JS. ADR 0004 (component contract). ~1-2h.

10. **`extractDeepDives` mixed-anchor counter test missing**. The counter increments BEFORE the collision check ([deep-dives.ts:54](../../packages/astro/src/lib/pedagogy-index/extractors/deep-dives.ts#L54)); test coverage doesn't lock in the "explicit-id-callout doesn't shift the next anonymous counter" guarantee. A future "warn instead of throw" refactor would silently change `dd-N` numbering. Add 1 test. ~15min. Already filed as part of this audit.

### P3 (file as issues; batch when convenient)

11. **Test file size sprawl**:
    - `pedagogy-audit/runner.test.ts` — 1,682 LOC. Split by severity tier (ERROR / WARNING / INFO) per the header's own taxonomy. ~1h mechanical.
    - `pedagogy-index/accumulator.test.ts` — 1,099 LOC. Split by role collection. ~1h.
    - `core/src/schema/pedagogy-index.test.ts` — 1,018 LOC. Split by entry schema. ~1h.
12. **`accumulator.ts` at 644 LOC** sits between WARN (500) and ERR (800) per ADR 0061 Rule 3. Grandfathered with rationale in `scripts/loc-budget.ts:67`. Defer split until 18th collection lands or 800 hits, but flag it as a known refactor signal.
13. **`extractors/interventions.ts` and `extractors/multireps.ts` have no sibling `.test.ts`** (tests live in `transforms/`). ADR 0061 Rule 4 (filename-as-discovery-key). Either add stub sibling tests delegating to transform tests OR add a `// Tested in: ../transforms/intervention.test.ts` header comment. ~10min for comments.
14. **`biography.test.ts` has its own local helpers** instead of importing from `_test-helpers.ts`. Documented as transitional post-ADR-0060 shim. Graduate to `_biography-test-helpers.ts` sibling on next biography edit.
15. **`pedagogy-store.ts:67` silent fallback in production** ([pedagogy-store.ts:67](../../packages/components/src/runtime/pedagogy-store.ts#L67)). On script-payload parse failure, logs to console.error (non-prod) but silently empties the lookup map in production — "all glossary popovers silently render nothing." Set a one-time `data-sophie-pedagogy-error` attribute on `<html>` so author-mode banner or e2e check can spot it.

### P4 (touch-when-nearby cleanups)

16. **`CLAUDE.md` ADR-range header off-by-two**: line 90 says "ADRs 0001–0060," line 95 "0001–0060 at last count" — table now lists 0061 and 0062. ~1min.
17. **`@sophie/core/audit` barrel is a misnomer**. Only re-exports `auditFile` (chapter-frontmatter Zod parse). All pedagogy audit invariants live in `@sophie/astro`. Either rename or absorb the chapter parse into `schema/`. Worth a brainstorm before touching.
18. **Self-reference inside `@sophie/core`**: `packages/core/src/audit/stub.ts:2` imports `@sophie/core/schema` (published subpath) rather than relative `../schema/index.ts`. Tiny startup-resolution cost; use relative within a package.

### P5 (deferred — document the trigger condition)

19. **`<Demo>` component + Cosmic Playground postMessage protocol** ([ADR 0008](../website/decisions/0008-demos-cosmic-playground.md)). Chapter authoring has clearly proceeded without it (smoke chapter renders 4 chapters fine). Trigger: when the first chapter wants embedded interactive demos that the existing `<MultiRep>` / `<KeyEquation>` / Observable Plot trio can't carry.
20. **CodeCell vertical** ([ADR 0018](../website/decisions/0018-code-editor-codemirror.md) + [ADR 0020](../website/decisions/0020-shiki-syntax-highlighting.md)). Trigger: when a chapter (likely COMP 536 first) needs in-page executable code. Today there are zero `<CodeCell>` callsites; both ADRs should drop to `accepted-design` until that vertical lands.

## Findings — by domain

### Architecture (ADR alignment, dependency graph)

The package graph is **clean**. Zero `astro:*` imports leak into
`@sophie/components`, `@sophie/core`, or `@sophie/theme` (verified via
grep). Zero cycles. Direction-of-import is correct everywhere
(`astro → core → primitives`; `components → core`; no inversions).
Framework purity per [ADR 0001](../website/decisions/0001-repo-shape.md)
holds.

The single recurring failure mode is **ADR-as-historical-fact drift**
(see Findings 5–7 above). Three intertwined symptoms: (a) status
fields encode point-in-time grade rather than current reality; (b)
amending ADRs don't reliably back-fill Revisions on amended ADRs; (c)
per ADR 0061 Rule 5, doc updates should land atomically with code,
but PR #130 + PR #133 between them touched the implicit-role lookup
table contract without updating the author-facing lookup itself
(P1 finding 2).

### Persistence + state management

`useInteractive` → `FallbackResponseStore` → `IndexedDBResponseStore` /
`MemoryResponseStore` is **correct**. The Codex P1 fallback shipped in
2026-05-19 works as advertised: silent-but-warned downgrade with the
persistence guarantee surfaced to components via
`useInteractive.persistence: "session"`. No XSS surface — no
`dangerouslySetInnerHTML` call site consumes a `useInteractive` value
(traced exhaustively). The trust boundary is the MDX source (ADR 0030
author-trust); the extractor pipeline owns sanitization implicitly via
the mdast → hast contract.

### Pedagogy-index pipeline

PR #133 (this branch) is **textbook**. The extractor mirrors the
established misconception pattern, the accumulator follows the
`addX` + cross-chapter invariant + `clearChapter` shape, the schema
sits in the right `inline-content.ts` group per ADR 0061 C4, the
e2e per-entry assertion follows the existing definitions/
misconceptions/interventions loop, and the taxonomy boundary
(`the-more-you-know` NOT walked) is enforced both in code and in
the ADR 0058 §R-deep-dive amendment. This is what "build the best
now" produces — see the strategic observation below.

### Component contract (a11y, axe-core, Radix)

axe coverage is **uniform** — `.storybook/test-runner.ts` runs
`checkA11y` on every story unless `parameters?.a11y?.disable === true`,
and nothing opts out. ADR 0004 holds.

One systemic gap (P2 finding 4): `color-contrast` is globally excluded
with no compensating audit. One real bug (P1 finding 1): Callout
disclosure duplicate `aria-label`.

### Build + CI infrastructure

Gates are **comprehensive and fast**: 7 CI jobs (build / lint /
typecheck / unit / storybook / e2e / VR) complete in ~5 minutes total
when parallelized. The `lint:loc` budget enforcement (`scripts/loc-budget.ts`,
referencing ADR 0061 Rule 3) is running with a defensible grandfather
list. The smoke audit baseline (`0 errors, 16 warnings, 9 infos`) is
documented in `audit-baseline.md` and gated function-of-content.

Wikimedia VR fragility (issue #131) is **fixed** as of PR #132: SVG
placeholders served from `.storybook/static/figures/`. Future
Storybook stories should default to local assets (gated by reviewer
asking "any external URLs?" on each PR).

### Documentation drift

The atomic-docs principle (ADR 0061 Rule 5) is the single most
violated rule today (per ADR-alignment audit). Specific symptoms:
P1 finding 2 (deep-dive variants missing from author-facing lookup
tables), P2 finding 5 (status drift), P2 finding 6 (missing
back-fill Revisions), P2 finding 7 (shipped-but-trigger-unmet).

## Grade — A (92)

| Category | Score | Notes |
|---|---|---|
| Architecture coherence | 19/20 | Package graph clean; framework-purity holds; ADR drift in doc layer not code. |
| Test coverage + quality | 18/20 | 1610+ unit + 148 e2e + axe + VR — strong. -2 for test-file sprawl + missing extractor-side test files. |
| ADR + doc hygiene | 14/20 | The soft spot. P1 finding 2 + P2 findings 5/6/7 cluster here. Best path: dedicated hygiene PR following PR-126 pattern. |
| Component contract + a11y | 17/20 | -1 for color-contrast gap (P2 #4), -2 for Callout disclosure duplicate aria-label (P1 #1). Otherwise strong. |
| Build + CI infrastructure | 19/20 | Comprehensive, fast, gated. -1 for VR fragility class (now fixed for figures, but anything new touching external assets needs review). |
| Pedagogy-index pipeline | 19/20 | PR #133 raises the bar. -1 for accumulator.ts at 644 LOC heading toward the 800 hard-break. |
| Engineering principle adherence | 19/20 | SoTA + no-back-compat + DRY all observed. -1 for the inline `slugify` in `extractDeepDives` (right call now per YAGNI, but should graduate to `deriveCalloutAnchor` on the 2nd caller). |
| Security posture | 19/20 | No XSS surface; persistence trust boundaries clean; no eval/Function; deps locked. -1 for the `pedagogy-store.ts` silent-fallback pattern (P3 #15). |
| **Total** | **92/100 (A)** | Up 1 from Session 9 closeout (91); PR-B and the audit hygiene visibility together raise the floor. |

## Recommended hardening — leverage-ordered

| # | What | Why | Effort | Leverage |
|---|---|---|---|---|
| 1 | **Callout aria-label fix (P1 #1)** | Real screen-reader bug; 3-line change | ~15min | High |
| 2 | **Doc atomicity sweep: scientific-reasoning-os.md + chapter-components.md lookup tables (P1 #2)** | ADR 0061 Rule 5 violation; same pattern as the EqRef drift that prompted ADR 0061 | ~30min | High |
| 3 | **ADR-status sweep PR (P2 #5 + #6 + #7)** | Mechanical, scriptable, mirrors PR #126 shape; restores the load-bearing signal for future AI sessions; back-fills 4 missing Revisions | ~half-day | High |
| 4 | **`__set*` setters → `@sophie/components/internal` subpath (P2 #3)** | Restores the public-surface contract per ADR 0001/0061 R4; consumer apps will start showing up in coming months | ~1h | Medium |
| 5 | **Color-contrast decision (P2 #4)** | ADR 0004 axe coverage; the "design-system handles it" comment needs to either become true or land a compensating audit | ~half-day discovery + N for fixes | Medium |
| 6 | **`renderChildrenToHtml` throw-on-null-children (P2 #8)** | Makes the existing D3 empty-body warning load-bearing | ~30min | Medium |
| 7 | **`<ViewModeToggle>` expand-disclosures option (P2 #9)** | CSS-only a11y accommodation; small surface, durable benefit | ~1-2h | Medium |
| 8 | **`extractDeepDives` mixed-anchor counter test (P2 #10)** | Locks invariant against future refactor; 1 test | ~15min | Medium |

Aggregate effort if all P1 + P2 land: ~1 sprint (~1.5 days focused).
Net grade impact: ~A → A+ (95+) trajectory.

## Strategic positioning

**Phase-3 LDS plugin split readiness ([ADR 0048](../website/decisions/0048-sophie-lds-content-plugins.md))**.
The cross-package consistency audit found **zero blockers** for the
split. Framework purity holds, the dependency graph is acyclic, public
surfaces are *mostly* clean (the `__set*` leak is the one item that'd
matter post-split — fix it before the split, not after). The pedagogy-
index pipeline's new deep-dive collection (PR #133) demonstrates the
"add a tracked role" path is mechanical and well-templated. Ready.

**ASTR 201 fa26 multi-cohort persistence validation**. The Codex
`FallbackResponseStore` shipped 2026-05-19 closes the incognito gap.
The accumulator's chapter-keyed shape supports multi-chapter content
without ordering coupling. The IndexedDB schema is stable. **Ready
for instructor-scale rollout** — gating concern is content, not
platform.

**Reasoning-OS-core author-facing surfaces** ([project_reasoning_os_core_pivot](../../.claude/projects/-Users-anna-Teaching-sophie/memory/project_reasoning_os_core_pivot.md)).
PR #133's deep-dive arc proves the pattern works end-to-end (ADR
amendment → schema → extractor → accumulator → e2e). The next
author-facing surface (likely a chapter-author tool for binding
`<MultiRep>` to Notation Registry concepts, or an `<UncertaintyLens>`
A10 component) can copy the PR-B shape. **Pattern is locked.**

**Pre-tenure case** ([user_role](../../.claude/projects/-Users-anna-Teaching-sophie/memory/user_role.md)).
The audit surfaces ~12 hours of high-leverage hardening that would
move Sophie from A (92) toward A+ (95) — well within a single
focused session. Combined with the Session 9 evidence (13 PRs in
one day, all gates green, audit-clean), the trajectory is strong.
The doc-atomicity gap (P1 #2) is the kind of thing that, if left,
compounds; addressing it in the next session keeps the case clean.

## Files referenced

- `packages/components/src/components/Callout/Callout.tsx` (P1 #1)
- `docs/website/explanation/scientific-reasoning-os.md` (P1 #2)
- `docs/website/reference/chapter-components.md` (P1 #2)
- `packages/components/src/index.ts` (P2 #3)
- `packages/components/.storybook/test-runner.ts` (P2 #4)
- `docs/website/decisions/0019,0021,0028,0039,0044,0046,0057,0058.md` (P2 #5)
- `docs/website/decisions/0003,0004,0023,0030.md` (P2 #6)
- `docs/website/decisions/0002,0020,0026.md` (P2 #7)
- `packages/astro/src/lib/pedagogy-index/jsx-utils.ts` (P2 #8)
- `packages/astro/src/lib/pedagogy-index/extractors/deep-dives.ts` (P2 #10)
- `packages/astro/src/lib/pedagogy-audit/runner.test.ts` (P3 #11)
- `packages/astro/src/lib/pedagogy-index/accumulator.ts` (P3 #12)
- `packages/components/src/runtime/pedagogy-store.ts` (P3 #15)
- `CLAUDE.md` (P4 #16)

## Related reviews

- [2026-05-19 — Session 9 closeout (A, 91)](2026-05-19-session-9-closeout.md) — baseline for this audit
- [2026-05-18 — Post-PR-A codebase audit (A, 90)](2026-05-18-post-pr-a-codebase-audit.md) — the previous comprehensive snapshot
- [2026-05-18 — Codex Sophie audit](2026-05-18-codex-sophie-codebase-architecture-docs-audit.md) — independent adversarial review
