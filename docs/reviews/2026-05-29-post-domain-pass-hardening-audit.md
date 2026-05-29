# Post-Domain-Pass Hardening Audit — 2026-05-29

**Trigger:** Anna asked "what hardening should we do next?" + `/reviewing-project-quality`, after the merge train #226–#229 (tsup-entry discovery, base-path correctness ×2, epistemic domain pass) landed on `main` (`8d85f75`).

**Relationship to prior audits:** Delta-refresh of [`2026-05-29-post-item5-quality-audit.md`](2026-05-29-post-item5-quality-audit.md) (A−, 87). Four PRs merged since; the grade moves to **A (90)**, driven almost entirely by the recurring build-fragility class being structurally eliminated. All numbers from fresh runs on `8d85f75`.

---

## 1. What changed since the post-ITEM-5 audit

| Change | Detail | ADR / PR |
|---|---|---|
| Dynamic tsup-entry discovery | `.astro`→`lib` value-imports derive tsup entries automatically + self-validation guard throws on silent miss; the manual entry map is gone | 0091 / #226 |
| Base-path correctness (full class) | `joinBase` pure util + `withBase` + SSR-setter (`getSophieBaseUrl`) doctrine; ~34 link/asset sites + breadcrumbs + info-page slug; CI `base-path` guard | 0092 / #227, #228 |
| Epistemic domain pass | 14 `GRANDFATHERED` → 0 (12 chrome, `CommonMisuse` declares `misconception`, `KeyEquation` role-via-slot); `ROLE_VIA_SLOT` concept broadened | 0058 R-domain-pass / #229 |
| Infra | `main` branch protection (all 9 checks, strict); auto-merge enabled; delete-branch-on-merge | — |

## 2. Test & gate metrics (fresh, `8d85f75`)

| Metric | Value |
|---|---|
| Unit tests | **2,847** passed (theme 29 · core 586 · cli 33 · components 937 · astro 1,262), 293 files, **0 fail / 0 RolldownError** |
| e2e | 45 specs (smoke 41 · packed-smoke 4); **5 `test.skip`** (all children-mode/Astro-slot — see §4) |
| `lint:epistemic-role` | **6 declare · 2 role-via-slot · 51 chrome · 0 grandfathered** (59/59), exit 0 |
| `lint:axe-render` | 64/64 ✓ |
| `lint:loc` | 0 err · **4 warn** · 37 info · 8 exempt |
| biome (`packages/ scripts/`) | 0 errors / 0 warnings |
| typecheck | 11/11 |
| Source LOC | core 4,585 · components 18,432 · astro 16,380 (excl. `.astro`) · theme 480 · cli 586 |
| ADRs | 92 (0001–0092; 0050 reserved) |
| Tech-debt | 1 TODO (issue-linked) · **0 `as any` / 0 `@ts-ignore` in production src** · 41 `biome-ignore` (justified) · 5 `test.skip` (e2e, one root cause) · 0 axe `disableRules` in src (2 tracked in test axe configs) · **28 `dangerouslySetInnerHTML` across 11 component files** |

## 3. Quality grade

| Category | Score | Δ | Evidence |
|---|---|---|---|
| Test coverage | 17/20 | — | 2,847 unit, 4-layer, condition-based, axe-mandatory (R11 64/64). −2: 5 children-mode e2e skips (gap **and** anti-pattern); no CI coverage ratchet. −1: ~21 astro/lib utilities tested only transitively. |
| Schema/contract correctness | 19/20 | — | Zod single source; epistemic-role machine-enforced **and now fully adjudicated** (grandfathered → 0); 0 `as any`/`ts-ignore` in prod. −1: no audit invariant yet *consumes* declared roles (cross-component coverage). |
| Accessibility | 18/20 | — | axe 64/64 on render; label-strict; SRE speech across build-time math. −2: 2 tracked axe disables (color-contrast, list/listitem). |
| Architecture | 17/20 | — | Acyclic, framework-pure, paid-for factories, 41 justified `biome-ignore`; base-path now structurally correct. −2: 28 `dangerouslySetInnerHTML` across 11 files (un-centralized trust surface); −1: 3 splittable source files (`compound-expand` 638, `sophie-auto-imports` 615, `TextbookLayout.astro` 526). |
| Build/distribution | **19/20** | **+3** | **The recurring "missing dist entry" bug class is structurally eliminated** (ADR 0091 dynamic discovery + self-validation — the exact −4 the last two audits flagged). packed-smoke + base-path CI guards are the structural defenses; `main` now branch-protected (9 required checks). −1: residual essential complexity (externalized-prerender `import.meta.env` doctrine; globalThis singletons). |

**Overall: 90/100 → A.** (+3 vs 05-29 post-ITEM-5.) The jump is the build-fragility class closing; the standing caps are test coverage (the children-mode skips + no ratchet) and the a11y disables + the innerHTML surface.

## 4. Recommended hardening backlog (P1–P3)

**P1 is shipping, not hardening** — the binding constraint is unchanged across five audits: get ASTR 201 live (consumer repo + Anna's pedagogical calls). No hardening item below outranks it for tenure leverage. The list below is what to do *when spending a hardening session*.

| P | Item | Effort | Why it's the pick |
|---|---|---|---|
| **P2** | **H1 — Resolve the 5 children-mode e2e skips** via a reusable hydration-complete signal (`FigureRef` T43/T44/T46, `ChapterRef` children-cite, `ChapterMisconceptions` T42) | Medium | The only item that is **both** a real correctness-coverage gap (children-mode rendering is unverified end-to-end) **and** a spreading anti-pattern the prior audit explicitly flagged ("Astro slot boundary ⇒ skip e2e"). One structural fix pays across all 5 and forecloses future skips. Highest hardening ROI. |
| **P2** | **H2 — Centralize the 28 `dangerouslySetInnerHTML` sites** (11 files) behind one documented build-time-trust primitive | Medium | The standing architecture −2. Collapses an 11-site XSS-reasoning surface to one chokepoint with an explicit trust-boundary rationale (epistemic-legibility ethos). Security-surface consolidation, not cosmetics. |
| **P3** | **H3 — CI coverage ratchet** (fail on coverage drop) + close the ~21 astro/lib transitive-coverage gap | Low–Med | No coverage gate today → the 2,847-test investment can silently erode. A ratchet locks it in. |
| **P3** | **H4 — Split the 3 LOC-warning source files** (`compound-expand` 638, `sophie-auto-imports` 615, `TextbookLayout.astro` 526) | Low | ADR 0061 Rule 1; clears the lint warnings; improves AI-authorability. Pure hygiene, low risk. |
| **P3** | **H5 — Close the 2 tracked axe disables** (color-contrast, list/listitem) | Medium | The a11y −2. Pairs naturally with a design-token contrast pass (aesthetic is unlocked pre-launch). |

**Recommended order: H1 → H2 → H3 → H4 → H5.** H1 first because it arrests an anti-pattern while closing real coverage; H2 next because it's the genuine security/architecture surface; H3–H5 are cheap future-proofing and hygiene.

## 5. What this audit examined

Read-only metrics pass — no code changed. Fresh runs: full unit suite (`turbo run test:unit --force`), `lint:epistemic-role` / `lint:axe-render` / `lint:loc`, `biome check`, grep-based tech-debt counts (TODO, `as any`/`ts-ignore`, `biome-ignore`, `test.skip`, `dangerouslySetInnerHTML`, axe `disableRules`), LOC-by-package + largest-file scan, e2e spec/skip inventory, coverage-config probe. This doc + its README row land directly on `main` (dated review, per branch-scope convention).

## Bottom line

Engineering ticked to **A (90)** — the build-fragility class that capped the last two audits is now structurally closed, and the Reasoning-OS contract is fully adjudicated. **The binding constraint remains shipping (ASTR 201), not engineering.** If a hardening session is the call, **H1 (children-mode e2e skips)** is the highest-leverage pick: it closes a real coverage gap and arrests a spreading "skip-on-slot-boundary" anti-pattern with a single reusable fix. No P1 engineering blockers; no regressions.
