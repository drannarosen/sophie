---
date: 2026-05-25T00:00:00.000Z
tags:
  - ci
  - hydration
  - ssr
  - packed-consumer
  - regression-class
  - structural-defense
status: accepted-design
validation:
  status: validated
  last_validated_date: "2026-05-25"
  evidence:
    - kind: deployment
      ref: .github/workflows/ci.yml
      date: "2026-05-25"
      notes: "`packed-smoke` job runs on every PR after `build`. Steps: install workspace deps → restore turbo cache → `bash examples/packed-smoke/scripts/sync-packed.sh` (build + pack + strip inter-@sophie deps + install) → `pnpm --dir examples/packed-smoke build` (astro prod build) → `playwright test`. ~3 min cold, ~30s on cache hit."
    - kind: test
      ref: examples/packed-smoke/e2e/hydration-mismatch-defense.spec.ts
      date: "2026-05-25"
      notes: "Single spec asserts zero React #418 hydration mismatches on `/units/packed-smoke-chapter/reading/` — a fixture chapter exercising all five store-backed components (`GlossaryTerm`, `EquationRef`, `FigureRef`, `ChapterRef`, `KeyEquation`) with `client:load`. Listens on both `pageerror` and `console` for `/#418|hydration/i` regex match."
    - kind: manual
      ref: examples/packed-smoke/scripts/sync-packed.sh
      date: "2026-05-25"
      notes: "Sync script encodes the workspace-link → tarball conversion: builds @sophie/{core,theme,components,astro}; packs each with `pnpm pack`; strips `@sophie/*` entries from each tarball's `dependencies`/`peerDependencies` (pnpm pack rewrites `workspace:*` → literal `0.0.0`, which the registry can't resolve outside the workspace); installs the four tarballs into `examples/packed-smoke/` outside the workspace. Idempotent."
  notes: |
    Shipped in PR #176 (PR-D1) as the CI-runtime layer of the hydration-
    class defense family. Pairs with ADR 0038 Amendment 2 (runtime
    `useHydrated` gate) + ADR 0083 (build-time CL1 invariant) + future
    ADR 0085 (authoring-affordance `_template/` skeleton). The four
    layers together close the React #418 hydration regression class
    structurally; the packed-smoke gate is what catches the bug in the
    consumer-shape pnpm workspace resolution cannot exercise by
    construction.
---

# ADR 0084: Packed-smoke CI gate for the workspace-vs-packed regression class

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[ADR 0038 Amendment 2](0038-pedagogy-index-pattern.md) (PR #172) fixed a
class of React #418 hydration mismatches in **packed consumers** of the
five store-backed components (`GlossaryTerm`, `EquationRef`,
`FigureRef`, `ChapterRef`, `KeyEquation`). The bug originally surfaced
in the astr201 consumer's lecture-02 reading page (12 × #418 → 0 via
the `useHydrated` gate); the in-workspace smoke build never reproduced
it.

The reason it never reproduced is structural. pnpm's workspace protocol
resolves `@sophie/*` specifiers to the **in-repo source**, not the
built `dist/` that real downstream consumers consume. So:

- The workspace smoke build (`examples/smoke/`) imports
  `@sophie/components` source files directly; module-state lifetimes,
  SSR-snapshot timing, and Vite-vs-tsup transform semantics all behave
  exactly as they do inside the platform packages.
- A real consumer (e.g. astr201, or any future external adopter)
  installs `@sophie/components` from a published tarball; the imported
  module is the built `dist/` artifact (tsup output, bundled and
  tree-shaken), and module-state lifetimes can diverge from source.

The PR #172 bug lived in that divergence. The `useHydrated` gate's
absence caused store-gated components to SSR with full hover-popover
trees, which React then tried to hydrate against a different bare-prose
DOM emitted by the client transform — but only in the packed shape
because tsup's bundling collapsed module-level singletons that source-
mode imports kept distinct. The workspace smoke build was structurally
incapable of catching this, no matter how many `client:load` callsites
it exercised.

This is not a one-off. Any future regression that depends on
**packed-shape module semantics** — tsup vs Vite transforms, dist
bundling order, treeshaking elisions, the published `exports` map vs
source — falls into the same blind spot. The class needs a CI layer
that consumes `@sophie/*` the same way real downstream consumers do.

## Decision

**A dedicated `packed-smoke` CI job exercises a tarball-pack consumer
outside the pnpm workspace, asserts zero React #418 hydration
mismatches, and runs on every PR after the `build` job.**

Three structural pieces:

1. **The consumer lives outside the pnpm workspace by design.**
   `examples/packed-smoke/` carries its own `pnpm-workspace.yaml` with
   no `packages:` entries (only `allowBuilds` for esbuild/sharp/swc),
   so pnpm does **not** hoist `@sophie/*` from the workspace. Each
   `@sophie/*` dep is declared as a `file:` reference to a tarball in
   `vendor/`. This is the faithful registry-install model: an external
   adopter running `npm install @sophie/astro` would also receive the
   four packages as separately-installed top-level deps.

2. **The sync script encodes the workspace-link → tarball conversion.**
   `examples/packed-smoke/scripts/sync-packed.sh` is the canonical
   build pipeline: it runs `pnpm turbo run build` for the four
   `@sophie/*` packages, packs each with `pnpm pack`, strips
   `@sophie/*` entries from each tarball's `dependencies` and
   `peerDependencies` (pnpm pack rewrites `workspace:*` → literal
   `0.0.0`, which fails to resolve outside the workspace), then
   installs the four tarballs into `examples/packed-smoke/`. The
   strip step is the load-bearing convention: without it, pnpm tries
   to resolve `@sophie/core@0.0.0` from the npm registry and fails.

3. **One Playwright spec asserts the structural invariant.**
   `examples/packed-smoke/e2e/hydration-mismatch-defense.spec.ts`
   navigates to `/units/packed-smoke-chapter/reading/` — a fixture
   chapter exercising all five store-backed components with
   `client:load` — and listens on `pageerror` and `console` for any
   `/#418|hydration/i` match. The assertion is
   `expect(errors).toHaveLength(0)`. One spec is sufficient because
   the bug class is binary: either the packed-shape hydration emits a
   #418 or it doesn't.

The CI job orders: `actions/checkout` → corepack → setup-node →
`pnpm install --frozen-lockfile` (workspace) → restore turborepo cache
→ run `sync-packed.sh` → `pnpm --dir examples/packed-smoke build`
(astro prod build) → install Playwright chromium → run the spec →
upload Playwright report on failure. The job `needs: build`, so it
doesn't redundantly rebuild what the main `build` job already
produced; it only re-packs and re-installs into the outside-workspace
consumer.

## Rationale

Four reasons make the packed-smoke gate structural class-of-issue
defense, not an instance-of-issue patch.

1. **The workspace smoke build cannot exercise this code path by
   construction.** Per the Context above, pnpm's workspace resolution
   is the structural cause of the blind spot. Any test running against
   workspace links is testing a different artifact than what consumers
   consume. The packed-smoke gate is the only CI shape that closes the
   gap; alternatives (e.g. "just add more workspace e2e specs") do not.

2. **Citation discoverability.** PR #172 surfaced one instance of a
   regression class; the class is "anything that depends on packed-
   shape module semantics." Future PRs that touch tsup configuration,
   the `exports` map, build-output bundling, or module-singleton
   patterns can cite ADR 0084 as the existing structural defense and
   know the CI gate already covers their change. Without the ADR, each
   future PR re-derives why the packed-shape matters from PR-thread
   archaeology.

3. **Defence-in-depth pairing with ADR 0083 + ADR 0038 Amendment 2.**
   The runtime `useHydrated` gate (ADR 0038 Amendment 2 § A2.2)
   prevents the mismatch when the component hydrates. CL1
   (ADR 0083) prevents the silent-bare-prose state when the component
   fails to hydrate at all. The packed-smoke gate (ADR 0084) catches
   whatever the runtime and build-time layers miss — any new regression
   in packed-shape module semantics that neither static analysis nor
   the runtime gate can foresee. The four-layer family
   (`useHydrated` + CL1 + packed-smoke + [ADR 0085](0085-component-template-skeleton.md)'s
   `_template/` skeleton) makes the hydration regression class
   structurally implausible.

4. **The cost is bounded and one-time.** The CI job runs in ~3 min on
   a fresh runner and ~30s on a cache hit. The maintenance burden is
   one shell script (`sync-packed.sh`, 90 LOC) and one Playwright spec
   (28 LOC). Both encode convention: the script's strip-inter-`@sophie`-
   deps step is the one non-obvious piece, and it's documented inline.
   The job runs **after** the main `build` job and only on PRs that
   already passed the prior gates, so it's the last line of defence —
   not a blocker on every commit.

## Alternatives considered

### Option B — add the packed-shape check as a step inside the existing `build` job

Put the pack-and-install steps after the existing `build` job's final
step; reuse the same runner.

**Rejected.** The packed-smoke step depends on Playwright browser
installation (chromium with system deps), which adds ~60s to every
`build` job — including the many PRs that don't touch hydration vectors
at all. A separate job that `needs: build` runs in parallel with
downstream jobs on PRs and lets the main `build` job stay lean.

### Option C — exercise the packed-shape in `examples/smoke/` via a `pnpm pack` step

Keep one smoke consumer; toggle between workspace-link and tarball-
install modes via an environment flag.

**Rejected.** Toggling the resolution mode in-place would either (a)
require duplicating the smoke spec set across both modes (test-time
cost ×2), or (b) hide the workspace-vs-packed divergence behind a
flag that's easy to forget to flip. A separate consumer at a separate
path (`examples/packed-smoke/` vs `examples/smoke/`) makes the
distinction structural rather than configurational — the file
layout itself documents "these tests run against the packed shape;
those run against workspace links."

### Option D — publish to a local verdaccio registry and `npm install` from there

Spin up a verdaccio container in CI, publish each `@sophie/*` package
to it, and have `examples/packed-smoke/` install from the local
registry.

**Rejected.** Strictly higher fidelity than `pnpm pack` + tarball
install (it exercises the registry-resolution code path too), but
the operational cost is substantial: container lifecycle, registry
auth tokens, publish-step idempotency, registry-cache invalidation
across PRs. The marginal coverage over `pnpm pack` + `file:` tarball
install does not justify the CI complexity at Sophie's current scale.
If a regression class ever emerges that depends specifically on the
registry-resolution path (not the tarball shape), verdaccio is the
upgrade path; for now, tarball install is sufficient.

## Consequences

### Positive

- **CI catches packed-shape regressions in the consumer shape that
  matters.** Any PR that breaks hydration for downstream consumers
  fails at the gate, not at the consumer's next dependency bump.
- **The pack-and-install pipeline is reusable.** Future cross-repo
  consumer verification (e.g. astr201 packed installs) can reuse the
  same `sync-packed.sh` shape; the script is one of two canonical
  references for "how do you install Sophie outside the workspace."
- **Defence-in-depth completeness.** Together with ADR 0083 (CL1
  build-time invariant) and ADR 0038 Amendment 2 (runtime
  `useHydrated` gate), the four-layer hydration family closes the
  React #418 regression class structurally rather than by instance
  patching.

### Negative / risks

Three known risks, each with a planned mitigation.

1. **CI runtime cost on cold cache (~3 min).** The Playwright browser
   install plus the pack-and-install pipeline plus the astro prod
   build add a non-trivial wall-clock cost.
   **Mitigation**: the job `needs: build` so it runs in parallel with
   downstream jobs once `build` completes; turbo-cache keys cover the
   `@sophie/*` build outputs across PRs on the same SHA. On cache
   hit the job finishes in ~30s.

2. **Sync script maintenance burden.** Any change to `pnpm pack`'s
   output shape (e.g. an upstream pnpm release that stops rewriting
   `workspace:*`, or changes the `exports` map handling) can break
   the strip-inter-`@sophie`-deps step.
   **Mitigation**: the script is 90 LOC with inline comments
   explaining each non-obvious step. The CI failure mode is loud
   (the install step exits non-zero), not silent. If pnpm's pack
   semantics change materially, the script's failure surfaces in the
   next CI run.

3. **Single-spec coverage is narrow by design.** The Playwright spec
   asserts one thing (zero #418 hydration errors) on one fixture
   chapter. Any packed-shape regression that doesn't surface as a
   `#418|hydration` console message is invisible to this gate.
   **Mitigation**: the gate's scope is exactly the regression class
   it was created to defend (React #418 in packed consumers).
   Broader packed-shape regressions get their own gate when a
   second class emerges. Per W2 + W3 in AGENTS.md, the gate stays
   minimal until a second concrete class motivates extension.

## Validation

The packed-smoke gate is validated by three artifacts, listed in the
frontmatter `validation.evidence` block:

1. **The CI workflow job** (`.github/workflows/ci.yml`'s `packed-smoke`
   job) runs on every PR after the main `build` job. Failure blocks
   merge.
2. **The Playwright spec**
   (`examples/packed-smoke/e2e/hydration-mismatch-defense.spec.ts`)
   asserts zero `#418|hydration` console-or-pageerror messages on the
   fixture chapter route. One spec, one binary assertion — the
   minimum that catches the regression class.
3. **The sync script** (`examples/packed-smoke/scripts/sync-packed.sh`)
   encodes the workspace-link → tarball conversion as repeatable
   convention. Idempotent; the same script runs locally for
   developer verification and in CI.

PR #176 (PR-D1) shipped the gate to `main`. PR-D1 closes the
post-PR-#172 review item #2 ("structural defense against the
packed-vs-workspace regression class") and completes the CI-runtime
layer of the four-layer hydration defense.

## References

- [ADR 0038](0038-pedagogy-index-pattern.md) — pedagogy-index pattern;
  Amendment 2 § A2.2 (runtime `useHydrated` gate) is the runtime layer
  this gate complements at CI-runtime.
- [ADR 0082](0082-chapter-layout-extraction.md) — chapter-layout
  extraction; PR-C1 + PR-D1 (this gate) are paired post-PR-#172
  hardening work.
- [ADR 0083](0083-cl1-client-directive-invariant.md) — CL1 build-time
  invariant; the build-time-static-analysis layer this gate
  complements at CI-runtime.
- [ADR 0061](0061-ai-optimized-codebase-design.md) — AI-optimized
  codebase design; the rationale for citation-discoverable ADRs as
  defense-in-depth anchors for AI authors.
- [ADR 0085](0085-component-template-skeleton.md) — `_template/` skeleton
  convention; the authoring-affordance layer of the four-layer
  hydration family.
- [PR #176](https://github.com/drannarosen/sophie/pull/176) — the
  squash-merge that shipped the packed-smoke gate (PR-D1).
- `.github/workflows/ci.yml` (`packed-smoke` job) — the CI job
  definition.
- `examples/packed-smoke/scripts/sync-packed.sh` — the
  workspace-link → tarball conversion script.
- `examples/packed-smoke/e2e/hydration-mismatch-defense.spec.ts` — the
  Playwright spec asserting the invariant.
