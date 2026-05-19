import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  type BroadcastChannelLayer,
  type BroadcastMessage,
  chapterChannelName,
  createBroadcastChannel,
} from "./BroadcastChannel.ts";
import {
  FallbackResponseStore,
  type PersistenceMode,
} from "./FallbackResponseStore.ts";
import { useProfile } from "./ProfileContext.tsx";
import { compositeKey } from "./ResponseStore.ts";

export type InteractiveStatus = "loading" | "ready" | "error";

/**
 * Spread on persistence-bearing inputs/buttons to gate user
 * interaction until IndexedDB hydration completes. Without this,
 * a click that lands between mount and IDB-fetch resolution gets
 * silently overwritten by the fetch's `setLocalValue(persisted ?? initial)`.
 *
 * The `data-sophie-write-pending` attribute signals async-write
 * commit state — true while at least one IDB write is in flight,
 * false when all writes settle. Playwright e2e tests wait on this
 * before `page.reload()` so the LWW state observed after reload
 * reflects the user's last interaction. Surfaces hook-internal
 * pending-write state to the DOM per SoTA "data attribute = truth
 * source" convention (ADR 0037-adjacent).
 *
 * Convention codified in `docs/website/contributing/coding-standards.md`
 * § "Persistence-bearing controls".
 */
export interface InteractiveControlProps {
  disabled: boolean;
  "aria-busy": boolean;
  "data-sophie-write-pending": boolean;
}

export interface UseInteractiveResult<T> {
  value: T;
  setValue: (next: T) => void;
  status: InteractiveStatus;
  error: Error | null;
  /** True when the IndexedDB fetch has resolved (status === "ready"). */
  hydrated: boolean;
  /**
   * Spread on the interactive control element. Sets `disabled` and
   * `aria-busy` to `true` while loading, `false` when hydrated.
   */
  controlProps: InteractiveControlProps;
  /**
   * Current persistence mode per ADR 0007 + ADR 0053 (CF5).
   *
   * - `"persistent"`: IndexedDB is healthy; state survives reload,
   *   tab close, and browser restart.
   * - `"session"`: `FallbackResponseStore` engaged its in-memory
   *   fallback because IDB is unavailable (Safari private mode,
   *   quota-exhausted storage, IDB disabled by extension or policy).
   *   State survives within the current JS process only — it is lost
   *   on reload. Components SHOULD surface this to students (e.g.,
   *   a "your progress won't be saved" banner near the control).
   *
   * Initialized as `"persistent"`; flips to `"session"` if the first
   * IDB operation fails. The hook then never flips back for this
   * mounted instance — once degraded, stays degraded.
   */
  persistence: PersistenceMode;
}

const stores = new Map<string, FallbackResponseStore>();
const channels = new Map<string, BroadcastChannelLayer>();

function getStore(course: string): FallbackResponseStore {
  let store = stores.get(course);
  if (store === undefined) {
    store = new FallbackResponseStore(course);
    stores.set(course, store);
  }
  return store;
}

function getChannel(course: string, chapter: string): BroadcastChannelLayer {
  const name = chapterChannelName(course, chapter);
  let channel = channels.get(name);
  if (channel === undefined) {
    channel = createBroadcastChannel(name);
    channels.set(name, channel);
  }
  return channel;
}

/** @internal — exposed only for tests. Resets the per-course store/channel caches. */
export function __resetRuntimeCaches(): void {
  for (const channel of channels.values()) channel.close();
  stores.clear();
  channels.clear();
}

/**
 * Persistence-bearing hook backing all `<Interactive*>` components.
 *
 * `course` and `chapter` are required arguments — they identify which
 * IndexedDB and which BroadcastChannel this hook reads/writes through.
 * `profile` is read from `ProfileContext` so a runtime profile toggle
 * (Phase 5) can flip student/instructor mode without re-rendering every
 * call site.
 *
 * Per ADR 0007 + ADR 0027: SophieConfig context was removed because
 * Astro 6 + @astrojs/mdx 5 renders MDX content as Astro server-side;
 * React components inside MDX get their own SSR pass and don't see
 * context providers from `<SophieChapter>`. Course/chapter therefore
 * must be threaded as props.
 *
 * Per ADR 0029: every accepted write (local setValue, hydration read,
 * cross-tab broadcast) carries a `Date.now()` timestamp. The hook
 * tracks the most-recent observed ts per (course, chapter, profile,
 * key) and ignores any incoming write whose ts is older. This last-
 * write-wins gate prevents the BroadcastChannel race where Tab A's
 * slower IDB write could silently overwrite Tab B's more recent
 * user-interaction value.
 */
export function useInteractive<T>(
  course: string,
  chapter: string,
  componentKey: string,
  initial: T
): UseInteractiveResult<T> {
  const profile = useProfile();
  const senderId = useId();

  const [value, setLocalValue] = useState<T>(initial);
  const [status, setStatus] = useState<InteractiveStatus>("loading");
  const [error, setError] = useState<Error | null>(null);
  // Persistence mode per ADR 0007 + ADR 0053 (CF5). Initialized to the
  // store's current mode (typically `"persistent"`); flips to
  // `"session"` if the FallbackResponseStore wrapper engages its
  // in-memory fallback. The hook subscribes to mode changes so a
  // mid-session downgrade (rare but possible) surfaces immediately.
  const [persistence, setPersistence] = useState<PersistenceMode>(() =>
    getStore(course).getPersistence()
  );

  // Counter of in-flight IDB writes. Increments at setValue entry,
  // decrements when the write settles (success or error). Surfaced
  // via `controlProps["data-sophie-write-pending"]` so callers (and
  // e2e tests) can wait for write-commit before navigating away.
  // Counter (not boolean) handles re-entrant writes: rapid successive
  // setValue() calls each increment, and pending stays true until the
  // last one settles.
  const [writesPending, setWritesPending] = useState(0);

  const valueRef = useRef(value);
  valueRef.current = value;

  // Most recent observed timestamp for this (course, chapter, profile,
  // key) tuple. Per ADR 0029, every accepted update (local setValue,
  // hydration read, cross-tab broadcast) advances this; incoming
  // updates with `ts <= tsRef.current` are ignored as stale. Initial 0
  // means any positive timestamp from disk or broadcast supersedes the
  // initial-value default.
  const tsRef = useRef(0);

  // Tracks whether the component is mounted; used to guard async write
  // callbacks from calling setError/setStatus after unmount. Caught in
  // code review 2026-05-09.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const store = getStore(course);
    setStatus("loading");
    setError(null);
    // Reset the LWW gate when the (course, chapter, profile, key) tuple
    // changes — different key means a different value lineage; the
    // previous tuple's ts has no causal relation here.
    tsRef.current = 0;
    // Subscribe to fallback-engagement events so a mid-session
    // downgrade (e.g., first hydration call succeeds via IDB, later
    // write hits a quota exception) reflects on the component.
    const unsubscribePersistence = store.subscribePersistenceChange((mode) => {
      if (cancelled) return;
      setPersistence(mode);
    });
    store
      .get<T>(profile, chapter, componentKey)
      .then((persisted) => {
        if (cancelled) return;
        // After the first round-trip the store's mode is settled
        // (FallbackResponseStore flips it during the .get() if IDB
        // failed). Sync the hook's state to the store's authoritative
        // mode.
        setPersistence(store.getPersistence());
        // Reset to initial when the new key has no stored value — otherwise
        // the previous key's state lingers across (course, chapter, profile,
        // key) changes. Caught in code review 2026-05-09.
        if (persisted === undefined) {
          setLocalValue(initial);
        } else if (persisted.ts > tsRef.current) {
          setLocalValue(persisted.value);
          tsRef.current = persisted.ts;
        }
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus("error");
      });
    return () => {
      cancelled = true;
      unsubscribePersistence();
    };
  }, [course, chapter, profile, componentKey, initial]);

  useEffect(() => {
    const channel = getChannel(course, chapter);
    const fullKey = compositeKey(profile, chapter, componentKey);
    const unsubscribe = channel.subscribe((message: BroadcastMessage) => {
      if (message.senderId === senderId) return;
      if (message.key !== fullKey) return;
      // LWW gate per ADR 0029. Defensive against malformed messages
      // (the BroadcastChannel API delivers anything postMessage'd);
      // a non-number `ts` is treated as stale and ignored.
      if (typeof message.ts !== "number" || message.ts <= tsRef.current) {
        return;
      }
      tsRef.current = message.ts;
      setLocalValue(message.value as T);
    });
    return unsubscribe;
  }, [course, chapter, profile, componentKey, senderId]);

  const setValue = useCallback(
    (next: T) => {
      const ts = Date.now();
      tsRef.current = ts;
      setLocalValue(next);
      const store = getStore(course);
      const channel = getChannel(course, chapter);
      const fullKey = compositeKey(profile, chapter, componentKey);
      setWritesPending((n) => n + 1);
      store
        .set(profile, chapter, componentKey, { value: next, ts })
        .then(() => {
          channel.post({ senderId, key: fullKey, value: next, ts });
          if (!mountedRef.current) return;
          setError(null);
          setStatus("ready");
        })
        .catch((err: unknown) => {
          if (!mountedRef.current) return;
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus("error");
        })
        .finally(() => {
          if (!mountedRef.current) return;
          setWritesPending((n) => n - 1);
        });
    },
    [course, chapter, profile, componentKey, senderId]
  );

  const hydrated = status === "ready";
  const controlProps: InteractiveControlProps = {
    disabled: !hydrated,
    "aria-busy": !hydrated,
    "data-sophie-write-pending": writesPending > 0,
  };

  return {
    value,
    setValue,
    status,
    error,
    hydrated,
    controlProps,
    persistence,
  };
}
