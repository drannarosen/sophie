import { useEffect, useId, useRef, useState } from "react";
import type { BroadcastMessage } from "./BroadcastChannel.ts";
import type { PersistenceMode } from "./FallbackResponseStore.ts";
import { useProfile } from "./ProfileContext.tsx";
import { compositeKey } from "./ResponseStore.ts";
import {
  getChannel,
  getStore,
  type InteractiveStatus,
} from "./useInteractive.ts";

export interface UseInteractiveRangeMultiResult<T> {
  /**
   * Snapshot of every record across all listed `chapters` whose key
   * starts with `keyPrefix` (or every record for the chapters when
   * `keyPrefix === undefined`). Keys are the *unwrapped* keys, not the
   * internal composite keys; collisions across chapters resolve
   * last-chapter-wins (in iteration order), matching
   * `ResponseStore.getAllMulti`'s contract.
   */
  values: Readonly<Record<string, T>>;
  status: InteractiveStatus;
  error: Error | null;
  /** True once the initial multi-chapter range read resolves (status === "ready"). */
  hydrated: boolean;
  persistence: PersistenceMode;
}

/**
 * Cross-chapter sibling of `useInteractiveRange`. Hydrates from a
 * `ResponseStore.getAllMulti` call on mount; subscribes to one
 * BroadcastChannel per chapter so writes anywhere in the listed
 * `chapters` flow in as LWW updates (ADR 0029) per individual key.
 *
 * Read-only: mutations must go through `useInteractive` per-key,
 * scoped to a single (course, chapter).
 *
 * The chapter list is treated as a *stable build-time fact* — sourced
 * from `PedagogyIndex.units` via the section→units→chapter binding
 * chain. The hook depends on the `chapters` array reference; callers
 * **must** `useMemo` the array when deriving from the index, otherwise
 * the effects refire on every render. (`<SpacedReview section=…>`
 * memoizes via `useMemo([units, section])`.)
 *
 * Added 2026-05-22 in Wedge B-followup (W1) to back
 * `<SpacedReview section="…">` per design doc D2. Cockpit (ADR 0076)
 * is the committed second caller.
 */
export function useInteractiveRangeMulti<T>(
  course: string,
  chapters: ReadonlyArray<string>,
  keyPrefix?: string
): UseInteractiveRangeMultiResult<T> {
  const profile = useProfile();
  const senderId = useId();

  const [values, setValues] = useState<Record<string, T>>({});
  const [status, setStatus] = useState<InteractiveStatus>("loading");
  const [error, setError] = useState<Error | null>(null);
  const [persistence, setPersistence] = useState<PersistenceMode>(() =>
    getStore(course).getPersistence()
  );

  // Per-key LWW timestamps. Keyspace is the *unwrapped* key (not the
  // composite). Multi-chapter LWW resolves on the unwrapped key —
  // matches getAllMulti's collision semantics.
  const tsRef = useRef<Map<string, number>>(new Map());

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Hydration effect: read from getAllMulti, populate values + ts map.
  useEffect(() => {
    let cancelled = false;
    const store = getStore(course);
    if (chapters.length === 0) {
      // Empty list → no I/O; ready immediately.
      setValues({});
      setStatus("ready");
      setError(null);
      tsRef.current.clear();
      return;
    }
    setStatus("loading");
    setError(null);
    tsRef.current.clear();
    const unsubscribePersistence = store.subscribePersistenceChange((mode) => {
      if (cancelled) return;
      setPersistence(mode);
    });
    store
      .getAllMulti<T>(profile, chapters, keyPrefix)
      .then((stored) => {
        if (cancelled) return;
        setPersistence(store.getPersistence());
        const next: Record<string, T> = {};
        for (const [key, record] of Object.entries(stored)) {
          next[key] = record.value;
          tsRef.current.set(key, record.ts);
        }
        setValues(next);
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
  }, [course, profile, keyPrefix, chapters]);

  // Broadcast subscription effect: one subscription per chapter.
  useEffect(() => {
    if (chapters.length === 0) return;
    const unsubscribers: Array<() => void> = [];
    for (const chapter of chapters) {
      const channel = getChannel(course, chapter);
      const chapterPrefix = `${profile}:${chapter}:`;
      const compositePrefix = compositeKey(profile, chapter, keyPrefix ?? "");
      const unsubscribe = channel.subscribe((message: BroadcastMessage) => {
        if (message.senderId === senderId) return;
        if (typeof message.key !== "string") return;
        if (!message.key.startsWith(compositePrefix)) return;
        if (typeof message.ts !== "number") return;
        const unwrappedKey = message.key.slice(chapterPrefix.length);
        const priorTs = tsRef.current.get(unwrappedKey) ?? 0;
        if (message.ts <= priorTs) return;
        tsRef.current.set(unwrappedKey, message.ts);
        if (!mountedRef.current) return;
        setValues((prev) => ({ ...prev, [unwrappedKey]: message.value as T }));
      });
      unsubscribers.push(unsubscribe);
    }
    return () => {
      for (const fn of unsubscribers) fn();
    };
  }, [course, profile, keyPrefix, senderId, chapters]);

  const hydrated = status === "ready";

  return { values, status, error, hydrated, persistence };
}
