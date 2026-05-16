---
date: 2026-05-09T00:00:00.000Z
tags:
  - persistence
  - storage
  - privacy
  - ferpa
validation:
  status: validated
  last_validated_date: "2026-05-16"
  evidence:
    - kind: test
      ref: packages/components/src/runtime/useInteractive.test.tsx
      date: "2026-05-12"
      notes: "Covers IndexedDB write/read cycle, MemoryResponseStore fallback, BroadcastChannel LWW (per ADR 0029 refinement)."
    - kind: chapter
      ref: examples/smoke/src/content/chapters/01-foundations/measuring-the-sky.mdx
      date: "2026-05-14"
      notes: "Real chapter exercises Predict + Reflection + ComprehensionGate persistence end-to-end."
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: "2026-05-15"
      notes: "Persistence contract held under the bucket B+C audit."
    - kind: deployment
      ref: null
      date: null
      notes: "ASTR 201 fa26 cohort pending; multi-cohort persistence validation deferred."
  notes: "Build-time + smoke-environment validation complete; multi-cohort outcomes deferred to ASTR 201 fa26."
---

# ADR 0007: IndexedDB + ResponseStore repository for persistence

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

The earlier draft of Sophie's persistence said: localStorage under
`sophie:responses:v1`, ~10 MB cap, oldest-first eviction, no cross-tab
sync, no cross-device. This works in the small but breaks in three
ways even within a single semester:

1. **Synchronous I/O.** localStorage blocks the main thread on every
   read/write. Fine for one prediction; sluggish for a chapter with
   twenty interactive components.
2. **Quota.** 5–10 MB per origin, *shared across every Sophie course
   on the same domain.* A student in ASTR 201 + COMP 521 + ASTR 596
   hits the wall fast.
3. **No cross-tab sync.** Student opens a chapter in two tabs,
   predicts in one, the other doesn't update.

The v3 features (calibration, concept latency) generate longitudinal
data; the storage layer must scale, and the v3 cross-device sync seam
must be designed *now* even if not implemented until later.

## Decision

**IndexedDB via the `idb` library** as the v1 storage primitive,
behind a `ResponseStore` **repository abstraction** in
`@sophie/components/runtime/responseStore.ts`. Cross-tab sync via
`BroadcastChannel`. Per-course databases. Strict data minimization.
The v3 sync seam is the same `ResponseStore` interface with a
different implementation.

## Rationale

- **`idb`** is Jake Archibald's tiny wrapper (~1 KB gzipped). Async,
  structured, hundreds of MB quota in practice, supported everywhere.
- **Repository abstraction** isolates storage concerns from component
  code. Components consume `useInteractive` (the hook from
  [ADR 0004](0004-component-contract-revisions.md)); they never see
  `IDBDatabase` or `ResponseStore` directly.
- **Per-course databases** (`sophie:astr201`, `sophie:comp521`) give
  clean FERPA boundaries: a student deletes one course without
  touching another; quota is per-course, so cross-course leakage and
  quota-interaction don't occur.
- **`BroadcastChannel`** is native, free, ~5 lines of code. Tab A
  writes a response; tab B's `useInteractive` invalidates its cache.
- **Strict data minimization** is non-negotiable. Sophie logs:
  submitted prediction responses, code-cell run records, mission
  completions. **Not** mouse, scroll, dwell, click. **No telemetry
  to Sophie by default ever.** Concept-latency in v3 needs
  *some* engagement signal; that's added with explicit opt-in
  consent UI, not silently.
- **The v3 sync seam is exact, not aspirational.**
  `SyncedResponseStore` implements the same `ResponseStore`
  interface; swapped in via `@sophie/astro` config when a consumer
  enables it. Components don't change.

## Alternatives considered

- **localStorage with size cap** (the prior draft).
  Pros: simplest. Cons: synchronous, quota wall, no cross-tab. Real
  problems within a single semester for a multi-course user.
  Rejected.

- **OPFS (Origin Private File System).** Newer, very high quota,
  faster I/O. Pros: future-leaning. Cons: still maturing 2026
  browser support; overkill for response logs (which are small
  records). Rejected: IndexedDB is the right primitive for
  structured records.

- **CRDT-based local-first sync** (Automerge, Yjs, Loro) in v1.
  Pros: enables cross-device sync without a traditional backend.
  Cons: overkill for v1; adds complexity; the conflict-free
  story doesn't help unless there's actually concurrent editing
  across devices, which v1 doesn't support. Rejected: v3 will
  reconsider when cross-device is real.

- **Tiny custom backend (Cloudflare Worker + KV)** in v1. Rejected:
  v1 is "no backend"; that constraint is real.

## Consequences

**Easier:**

- Calibration curves are async-fast — `ResponseStore.list({ kind:
  'prediction' })` paginates.
- Cross-tab consistency: predictions submitted in one tab appear in
  another instantly.
- Future export to Canvas is one method call (`export('csv')`).
- "Delete my data" is one method (`clear('course')`).
- The v3 seam is exact, not "we'll figure it out."

**Harder:**

- IDB schema migration is more work than localStorage's
  "JSON.parse and check schemaVersion." Mitigated by the
  repository abstraction owning all migration code in one place.
- `BroadcastChannel` doesn't work in older browsers (IE/old
  Safari). Acceptable: Sophie targets modern evergreen browsers
  per WCAG 2.1 AA targets anyway.

**Runtime fallback semantics** (formalized as part of the
conformance-failure taxonomy in
[ADR 0053](0053-conformance-failure-modes.md) §CF5):

- **IndexedDB unavailable** (private browsing, quota exhaustion,
  storage-disabled browsers, Safari edge cases). `ResponseStore`
  swaps in `MemoryResponseStore` — same interface, in-memory
  Map-backed, scoped to the page session. Persistence is lost
  on tab close; nothing breaks at runtime. The fallback emits a
  one-time console warning (`[sophie] IndexedDB unavailable;
  responses will not persist across sessions`) and surfaces via
  `useInteractive`'s `persistence: 'session' | 'persistent'`
  hook return value so chapter UI can optionally show a session-
  only banner. `MemoryResponseStore` is **not** for testing-only
  use; it is the production fallback. The warning + return-value
  surface is justified because IndexedDB unavailability loses
  persistence — the student should know their work won't be there
  on next session.

- **BroadcastChannel unavailable** (older Safari versions,
  cross-origin iframes, restrictive embedding contexts).
  Cross-tab sync degrades **silently** — `useInteractive`
  continues to function within a single tab; concurrent tabs
  diverge until next page load. No banner, no warning surface to
  students. ADR 0029's LWW timestamps still resolve conflicts
  on the next read from disk in the IndexedDB-available case.
  The asymmetry with IndexedDB's surface-warning is intentional:
  BroadcastChannel absence doesn't lose persistence (a single tab
  still works fully), so no student-visible signal is warranted.

The v3 sync seam decision is unchanged; `SyncedResponseStore`
remains the future replacement, with the same in-process
fallback behavior.

**Triggers:**

- `IndexedDBResponseStore` ships in
  `@sophie/components/runtime/responseStore.ts` from Phase 1.
- `useInteractive` hook consumes `ResponseStore` —
  components never touch IDB directly.
- `BroadcastChannel` integration in Phase 1.
- `sophie upgrade` performs IDB schema migrations.
- v3 backend choice (Cloudflare Workers / Supabase / Convex) is a
  separate decision deferred until v3 has a real consumer signal.

## References

- Brainstorming session, persistence Q (May 2026).
- [explanation/persistence-model.md](../explanation/persistence-model.md)
  — full design with diagrams.
- [ADR 0004](0004-component-contract-revisions.md) —
  `useInteractive` hook context.
- [`idb` library](https://github.com/jakearchibald/idb).
- [ADR 0029](0029-broadcastchannel-lww.md) — BroadcastChannel
  last-write-wins refinement.
- [ADR 0053](0053-conformance-failure-modes.md) §CF5 — runtime
  fallback semantics formalized.
