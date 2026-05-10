---
title: Persistence Model
short_title: Persistence
description: How student response data is stored — IndexedDB via the ResponseStore repository, BroadcastChannel sync, FERPA boundaries, the v3 sync seam.
tags: [persistence, indexeddb, ferpa, privacy]
---

# Persistence model

How student response data — submitted predictions, code-cell run
records, mission completions — gets stored, exported, and (in v3)
synced. The decision is captured in
[ADR 0007](../decisions/0007-persistence-indexeddb.md); this page
explains the *shape* and the *seams*.

## The problem with localStorage

An earlier draft used localStorage. It breaks in three ways even
within a single semester:

1. **Synchronous I/O** blocks the main thread on every read/write.
2. **5–10 MB quota per origin**, shared across every Sophie course on
   the same domain. A student in ASTR 201 + COMP 521 + ASTR 596 hits
   the wall.
3. **No cross-tab sync.** Tab A predicts; Tab B doesn't update.

The replacement is IndexedDB, behind a repository abstraction so
storage concerns never leak into component code.

## The shape

```{mermaid}
flowchart LR
    Component["<Prediction />"] --> Hook["useInteractive"]
    Hook --> Store["ResponseStore<br/>(interface)"]
    Store --> IDB["IndexedDBResponseStore<br/>(v1 implementation)"]
    Store -.v3.-> Synced["SyncedResponseStore<br/>(local + remote)"]
    Synced -.-> SyncClient["SyncClient<br/>(pluggable: Cloudflare / Supabase / Convex / ...)"]
    IDB --> idb["idb library"]
    idb --> Browser["Browser IndexedDB"]
    Hook -.cross-tab.-> BC["BroadcastChannel"]
```

### Layers

1. **Component code** consumes the [`useInteractive` hook](../reference/component-contract.md#useinteractive-runtime-helper).
   Components never touch IndexedDB directly.
2. **`useInteractive`** owns: read draft from store on mount, write on
   `setState`, freeze on `submit`, hydration safety, schema migration
   on read, BroadcastChannel cross-tab updates.
3. **`ResponseStore`** is the *interface*: `get`, `put`, `list`,
   `watch`, `export`, `delete`, `clear`, `migrate`. It hides
   implementation choice from everything above.
4. **`IndexedDBResponseStore`** is the v1 implementation.
   `SyncedResponseStore` is the v3 implementation that wraps a
   local store + a `SyncClient`.
5. **`SyncClient`** (v3) is the pluggable backend adapter:
   Cloudflare Workers, Supabase, Convex, custom — chosen at consumer
   config time, not platform commit time.

## The `ResponseStore` interface

```typescript
// @sophie/components/runtime/responseStore.ts
export interface ResponseStore {
  get(kind: string, id: string): Promise<Response | null>;
  put(kind: string, id: string, response: Response): Promise<void>;
  list(filter?: ResponseFilter): Promise<Response[]>;
  watch(kind: string, id: string, cb: (r: Response | null) => void): () => void;
  export(format: 'json' | 'csv'): Promise<Blob>;
  delete(kind: string, id: string): Promise<void>;
  clear(scope: 'course' | 'all'): Promise<void>;
  migrate(): Promise<void>;
}
```

The shape is intentionally minimal: enough to support all current
needs (calibration aggregation reads via `list`, Canvas export via
`export`, "delete my data" via `clear`, schema migration via
`migrate`) and small enough that a v3 sync implementation can satisfy
it without surprise.

## Per-course databases

Each Sophie course site has its own IDB database
(`sophie:astr201`, `sophie:comp521`):

- **Clean FERPA boundaries.** A student deletes ASTR 201 data without
  affecting COMP 521.
- **Quota is per-database.** No cross-course interaction; one course's
  large dataset doesn't squeeze another.
- **Simpler mental model.** "All my ASTR 201 work is in one place"
  matches student intuition.

A future "all my Sophie data" view aggregates across IDB databases
explicitly — opt-in, never automatic.

## Cross-tab sync via `BroadcastChannel`

Native, free, ~5 lines of code:

```typescript
const channel = new BroadcastChannel('sophie:responses');
// On put, post; receivers invalidate caches.
channel.postMessage({ kind, id, action: 'put' });
```

Tab A submits a prediction; Tab B's `useInteractive` invalidates its
cache for that `(kind, id)` and re-fetches. The student sees
consistent state across tabs without manual refresh.

## Strict data minimization

Sophie logs **only**:

- Submitted prediction responses (`PredictionResponse`).
- Code-cell run records (`CodeCellRun` — kind, success/failure,
  duration; not full source).
- Mission completions.

Sophie **does not** log:

- Mouse movements, scroll positions, hover events.
- Click tracking.
- Dwell times on individual elements.
- Reading speed.
- Full code-cell source over time (only at submit moments).

**No telemetry to Sophie** by default, ever, from any consumer site.
Telemetry to a consumer's own backend is the consumer's choice and
their responsibility — Sophie doesn't ship telemetry hooks.

If concept-latency (a v3 pedagogical-innovation feature) needs an
engagement signal, it's added with explicit opt-in consent UI and
opt-out controls — not silently.

## Schema migration discipline

Every persisted record carries a `schemaVersion` integer. Migrations
are forward-only and run on read:

```typescript
function migratePredictionResponse(raw: unknown): PredictionResponse {
  const v = raw as { schemaVersion?: number };
  if (v.schemaVersion === undefined || v.schemaVersion === 1) {
    // Already current shape (or pre-versioned)
    return raw as PredictionResponse;
  }
  // future: handle v2, v3, ...
  throw new Error(`Unknown schemaVersion: ${v.schemaVersion}`);
}
```

Original recorded fields are preserved; we don't retroactively
backfill. If a v2 schema adds a field, old records show it as
`undefined` — never as a fabricated default that could mislead
analysis.

## The v3 sync seam

When cross-device sync becomes a real need, `SyncedResponseStore`
implements the same `ResponseStore` interface:

```typescript
export class SyncedResponseStore implements ResponseStore {
  constructor(
    private local: IndexedDBResponseStore,
    private remote: SyncClient,    // pluggable: Cloudflare / Supabase / Convex
  ) {}
  // Local-first reads; background sync; conflict-free via timestamp + immutable responses
  async put(kind: string, id: string, response: Response) {
    await this.local.put(kind, id, response);
    this.remote.queueSync({ kind, id, response }).catch(/* retry queue */);
  }
  // ... other methods delegate similarly
}
```

The interface doesn't change. **Components don't change.** A v3 sync
deployment is a constructor swap in `@sophie/astro` based on consumer
config:

```typescript
sophie({ sync: { provider: 'cloudflare', endpoint: '...' } })
```

Sync is an *opt-in deployment choice* per course, not a platform-
level commitment. ASTR 201 might add it; COMP 521 might not.

## Privacy and FERPA posture

- **Local-by-default.** v1 stores everything client-side; nothing
  leaves the browser unless the student explicitly exports to Canvas.
- **Per-course isolation** as above.
- **No telemetry** as above.
- **`clear('course')`** is a one-method "delete my data for this
  course" implementation; the consumer wires a UI button.
- **`export('csv' | 'json')`** lets the student see and take their
  own data with them.
- **`questionSnapshot` on submit** preserves what the student saw at
  the moment of commit — chapter edits don't retroactively change
  the meaning of past responses.

These are not policy decisions; they're architectural defaults that
make compliance straightforward.

## What this enables in v1

- **Calibration curves are async-fast** — `ResponseStore.list({ kind:
  'prediction' })` paginates.
- **Cross-tab consistency** — predictions submitted in one tab appear
  in another instantly.
- **Future export to Canvas** is one method (`export('csv')`).
- **"Delete my data"** is one method (`clear('course')`).
- **The v3 seam is exact**, not "we'll figure it out."

## Cost honesty

vs. the documented localStorage approach: roughly **+1 week** for the
IDB schema, repository implementation, migration plumbing,
BroadcastChannel wiring, and tests. ~150 LoC for the implementation,
~100 LoC for tests. Frontloaded; pays back the first time a student
hits a quota error or you implement calibration aggregation.
