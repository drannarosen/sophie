---
date: 2026-05-10T00:00:00.000Z
tags:
  - persistence
  - broadcast
  - concurrency
  - hardening
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-22"
  evidence:
    - kind: test
      ref: packages/components/src/runtime/useInteractive.test.tsx
      date: "2026-05-12"
      notes: "Covers BroadcastChannel LWW with per-write Date.now() timestamps; useInteractive ignores stale incoming writes."
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: "2026-05-15"
    - kind: test
      ref: packages/components/src/runtime/useInteractiveRange.test.tsx
      date: "2026-05-22"
      notes: "Wedge B1 amendment: BroadcastChannel.post now fires same-tab subscribers synchronously alongside cross-tab postMessage; senderId guard prevents originating-hook re-entrancy. 6 test cases cover the cross-tab and same-tab paths including per-key LWW gate."
    - kind: review
      ref: docs/reviews/2026-05-22-wedge-b1-retrieval-family.md
      date: "2026-05-22"
      notes: "Quality audit explicitly pressure-tested the local-fanout change against re-entrancy concerns; confirmed senderId guard is correct."
  notes: "ADR 0007 refinement; LWW timestamping confirmed via the useInteractive + useInteractiveRange test suites. 2026-05-22 Wedge B1 amendment: same-tab local fan-out added to unblock sibling-hook same-tab sync (senderId guard preserves the no-self-echo semantic). No cross-tab production cohort data yet (deferred to fa26)."
---

# ADR 0029: BroadcastChannel last-write-wins via per-write timestamps

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[ADR 0007](0007-persistence-indexeddb.md) committed Sophie's
persistence to IndexedDB + a `ResponseStore` repository abstraction +
`BroadcastChannel` cross-tab sync. The Phase 1 hardening audit
([P1-5](../../reviews/2026-05-10-phase-1-hardening-audit.md#p1-5-broadcastchannel-race-condition-potential-silent-data-loss))
identified a silent data-loss path in the current
`useInteractive` + `BroadcastChannel` interaction.

The race, with two tabs of the same chapter open at the same
`(profile, chapter, componentKey)`:

1. Tab A calls `setValue("checked")` at T0. Local state updates
   immediately. Async IDB write begins.
2. Tab B calls `setValue("unchecked")` at T0+10ms. Local state
   updates immediately. Async IDB write begins.
3. Tab B's IDB write finishes first (T0+30ms). On-disk value is now
   `"unchecked"`. Tab B posts to `BroadcastChannel`:
   `{ value: "unchecked" }`.
4. Tab A receives the broadcast. Tab A's `setLocalValue("unchecked")`
   overwrites the user's `"checked"` action.
5. Tab A's IDB write finishes (T0+50ms). On-disk value is now
   `"checked"`.
6. Tab A's broadcast post arrives at Tab B: `{ value: "checked" }`.
7. Tab B's `setLocalValue("checked")` overwrites Tab B's user's
   `"unchecked"` action.

Net result: both tabs display `"checked"`, but Tab B's user clicked
`"unchecked"` last and got silently overruled — not because the
student changed their mind, but because Tab A's IDB write took longer
to commit. The hydration guard ([PR #8](https://github.com/drannarosen/sophie/pull/8))
prevents this *during* hydration; nothing prevents it *after*
hydration when both tabs are steady.

The current code, [`useInteractive.ts:150-171`](../../../packages/components/src/runtime/useInteractive.ts),
sequences: (a) local set, (b) async IDB write, (c) post to channel
*only after IDB resolves*. The broadcast is correctly ordered with
respect to disk, but neither writer nor receiver knows whether the
incoming value is *causally newer* than what they already have.

The fix is necessary now because (a) Phase 0 had only `<Callout>`'s
reviewed-toggle, single-bit state students rarely tabbed for —
the bug was theoretical. (b) Phase 1 added `<Predict>` answer
textareas, `<Reflection>` long-form prose, and four self-assessment
widgets. The space of \"oops I had two tabs open\" data loss now
includes free-text. Recovery is impossible without a backup. (c) Phase 5's instructor dashboard will read this data; trusting
its integrity now is cheaper than auditing it then.

## Decision

**Each persisted value carries a `Date.now()` timestamp. Both
IndexedDB and BroadcastChannel pass `{ value, ts }` pairs. The local
hook tracks the most recent observed `ts` per key and ignores any
incoming write (from IDB hydration or a broadcast) whose `ts` is
older than what it has.**

Sophie is pre-launch — no production students, no external consumers
of the IDB schema. The implementation makes a clean break: the
`responses` object store is dropped and recreated on `DB_VERSION =
2`'s upgrade. Existing local IDB data (the smoke chapter's developer
test state, nothing else) is discarded. No legacy unwrapping code
ships.

## Rationale

The bug is a *causality* problem, not a *concurrency* problem.
Sophie has no concurrent writers in any meaningful sense — only one
user, racing themselves across tabs. The fix needs to answer "is
this incoming value newer than what I have?", not "did multiple
authors arrive at this value through different paths?"

A `Date.now()` timestamp answers it. Within a single user's
machine, clock skew between tabs is negligible (sub-millisecond).
The receiver compares incoming `ts` to local `ts`; if incoming is
older, the receiver keeps its local value. The student's most recent
action — wherever it happened — wins everywhere.

The mechanism stays local. No backend. No vector clocks. No
synchronization protocol. One field, four comparison sites.

Pre-launch posture lets the IDB schema bump be a clean break.
`DB_VERSION = 1 → 2`'s upgrade drops the old `responses` object
store and creates a fresh one. Every read after the bump sees the
new `{ value, ts }` shape unconditionally. No legacy-shape unwrap
code, no sentinel `ts: 0` values, no schema-version branching at
the read site. The runtime stays small and the call sites stay
readable.

## Alternatives considered

- **Hybrid Logical Clock (HLC)** — timestamp + monotonic counter
  to break clock-skew ties, used for distributed systems with
  multiple machines.
  - Pros: robust against system-clock jumps; standard distributed-
    systems shape.
  - Cons: 30+ lines of code Sophie does not need today. The same
    machine's clock either jumps both tabs or neither.
  - Rejected: solves a problem Sophie doesn't have (multi-machine
    write concurrency). v3 cross-device sync may reconsider HLC
    or vector clocks; that's a separate ADR.

- **Per-write monotonic version counter** — each write reads the
  current version, increments, conditionally commits if no other
  write has incremented in the meantime.
  - Pros: clock-independent; the textbook concurrency control
    pattern.
  - Cons: requires a synchronous read-modify-write transaction per
    setValue. Doubles IDB round trips per write. The
    BroadcastChannel still needs separate broadcast logic that
    counter-tracks too.
  - Rejected: clock-independence buys nothing on a single machine;
    twice the disk traffic costs every setValue.

- **CRDT (Yjs, Automerge, Loro) at the `useInteractive` level.**
  - Pros: principled conflict-free convergence; battle-tested for
    real-time collaboration.
  - Cons: kilobytes of CRDT runtime per component; the merge
    semantics for boolean toggles or strings have no meaningful
    "concurrent" interpretation for a single student.
  - Rejected: same reasoning as ADR 0007 (\"overkill for v1; the
    conflict-free story doesn't help unless there's actually
    concurrent editing across devices, which v1 doesn't support\").
    v3 will revisit.

- **Server-arbitrated writes** (Cloudflare Worker / Convex / Supabase).
  - Pros: a single source of truth resolves any cross-device or
    cross-tab race.
  - Cons: requires a backend Sophie does not have in v1.
  - Rejected: v1 is "no backend." v3 cross-device sync is a
    separate decision that may revisit.

- **Per-tab causal — each tab's user's writes are sticky, only
  adopt remote writes if local hasn't written since.**
  - Pros: maximally preserves each tab's user's actions.
  - Cons: diverges semantics from "most recent user action wins
    everywhere." A student who closes Tab A and continues in Tab B
    expects Tab A's older state to be irrelevant; per-tab causal
    keeps it sticky against newer remote writes from elsewhere.
  - Rejected: misaligned with Sophie's mental model (one student,
    most-recent-action wins).

- **Do nothing** — accept the silent data loss.
  - Pros: zero code change.
  - Cons: free-text input loss is a real student-experience harm
    and a real research-data-integrity harm once Phase 5 reads
    this data.
  - Rejected: the audit named this as a P1 hardening item for a
    reason.

## Consequences

**Easier:**

- The student's most recent action wins regardless of which tab it
  came from. The mental model matches reality.
- Phase 5's instructor dashboard reads from a corpus the platform
  has already protected against silent overwrites.
- The new shape `{ value, ts }` is a natural place to attach future
  metadata (origin device id, soft-delete flag) without further
  schema bumps.
- Conflict detection becomes possible (writer compares pre-write ts
  to fresh-read ts). v3 can build on this for cross-device merge UI.

**Harder:**

- The `ResponseStore` interface changes shape. `set` and `get` now
  traffic in `{ value, ts }` instead of bare `T`. Components still
  go through `useInteractive`, which threads the timestamp on their
  behalf — the repository abstraction from ADR 0007 is preserved.
- Tests that previously asserted on bare `value` in IDB now see
  `{ value, ts }`. Existing unit tests need their fixtures rewritten
  to the new shape. Mechanical change, but it touches every
  persistence-bearing component's test file.

**Triggers:**

- Implementation PR follows this ADR. Scope:
  - `ResponseStore`: type signatures change to `{ value, ts }` shape.
  - `IndexedDBResponseStore`: `DB_VERSION = 2`'s upgrade drops the
    legacy `responses` store and recreates it; reads/writes traffic
    in the wrapped shape only.
  - `useInteractive`: track `ts` ref alongside `value`; gate
    incoming broadcasts and the initial hydration read on
    `ts > local.ts`.
  - `BroadcastMessage`: add `ts: number` field.
  - Unit test: two stores writing the "same" backing IDB, one with
    older ts, one with newer; receiver state reflects newer only.
  - E2E test (dual-tab Playwright) — added P2 effort, may slip to
    Phase 2 if the unit test gives sufficient confidence.
- ADR 0007 stays accepted; this ADR refines the BroadcastChannel
  behavior without superseding the storage choice.
- Phase 5 dashboard work can assume IDB values are LWW-resolved.

### Amendment — 2026-05-22 (Wedge B1)

`BroadcastChannelLayer.post()` now **also fires same-tab subscribers
synchronously** alongside the cross-tab `postMessage` call. The
browser `BroadcastChannel` API does not echo a tab's own `postMessage`
back to its own `onmessage` listener; without this local fan-out,
sibling hooks subscribing to the same channel in the same tab would
silently miss each other's writes.

This unblocks the Wedge B1 pattern where `<SpacedReview>` (consumer of
`useInteractiveRange`) observes writes posted by `<RetrievalPrompt>`
(consumer of `useInteractive`) when both are mounted in the same
chapter page — they share the same per-(course, chapter) channel via
`getChannel()`, so without the local fan-out the SpacedReview snapshot
would only refresh on cross-tab traffic or component remount.

**LWW semantics unchanged.** Each subscriber's `senderId` guard still
runs first, so the originating hook ignores its own broadcast; the
per-key `ts` gate still rejects stale messages. Cross-tab delivery is
unchanged. The change is **additive**: same-tab subscribers now get
the broadcast too.

Implementation: `BrowserBroadcast.post()` iterates the local
`handlers` Set before calling `this.channel.postMessage(...)`. Code:
[`packages/components/src/runtime/BroadcastChannel.ts`](../../../packages/components/src/runtime/BroadcastChannel.ts).
6 new `useInteractiveRange` unit tests cover the cross-tab and same-
tab paths; full 685-test `@sophie/components` suite stayed green when
the change landed.

## References

- [ADR 0007](0007-persistence-indexeddb.md) — IndexedDB +
  ResponseStore + BroadcastChannel (the foundation this refines).
- [Phase 1 hardening audit § P1-5](../../reviews/2026-05-10-phase-1-hardening-audit.md#p1-5-broadcastchannel-race-condition-potential-silent-data-loss)
  — the audit finding that triggered this ADR.
- [coding-standards § Persistence-bearing controls](../contributing/coding-standards.md)
  — the hydration-guard pattern (PR #8) the LWW fix complements.
- [`useInteractive.ts`](../../../packages/components/src/runtime/useInteractive.ts)
  and [`IndexedDBResponseStore.ts`](../../../packages/components/src/runtime/IndexedDBResponseStore.ts)
  — the implementation surface.
