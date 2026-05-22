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

export interface UseInteractiveRangeResult<T> {
  /**
   * Snapshot of every record for (course, chapter) whose key starts
   * with `keyPrefix` (or every record for the chapter when `keyPrefix
   * === undefined`). Keys are the *unwrapped* keys (the third arg to
   * `useInteractive`/`set`), not the internal composite keys. Returns
   * a frozen `Record` reference; mutations require per-key
   * `useInteractive` writes.
   */
  values: Readonly<Record<string, T>>;
  status: InteractiveStatus;
  error: Error | null;
  /** True once the initial IDB range read resolves (status === "ready"). */
  hydrated: boolean;
  persistence: PersistenceMode;
}

/**
 * Range-read sibling of `useInteractive`. Hydrates from a
 * `ResponseStore.getAll` call on mount; subscribes to the same
 * BroadcastChannel as `useInteractive` so cross-tab writes to matching
 * keys flow in as LWW updates (ADR 0029) per individual key.
 *
 * Read-only: this hook does not expose `setValue`. Mutations must use
 * `useInteractive` per-key — so `<SpacedReview>` reads the aggregate
 * via `useInteractiveRange`, while `<RetrievalPrompt>` writes its own
 * attempt array via `useInteractive` (composed through
 * `useRetrievalAttempt`).
 *
 * Added 2026-05-22 in Wedge B1 to back `<SpacedReview>` per the plan
 * amendment + ADR 0007 follow-up.
 */
export function useInteractiveRange<T>(
  course: string,
  chapter: string,
  keyPrefix?: string
): UseInteractiveRangeResult<T> {
  const profile = useProfile();
  const senderId = useId();

  const [values, setValues] = useState<Record<string, T>>({});
  const [status, setStatus] = useState<InteractiveStatus>("loading");
  const [error, setError] = useState<Error | null>(null);
  const [persistence, setPersistence] = useState<PersistenceMode>(() =>
    getStore(course).getPersistence()
  );

  // Per-key LWW timestamps. Keyspace is the *unwrapped* key (not the
  // composite). Mutable across renders; not part of React state because
  // LWW gating doesn't drive visible UI directly — the broadcast handler
  // updates `values` via setValues when it accepts a fresh write.
  const tsRef = useRef<Map<string, number>>(new Map());

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
    tsRef.current.clear();
    const unsubscribePersistence = store.subscribePersistenceChange((mode) => {
      if (cancelled) return;
      setPersistence(mode);
    });
    store
      .getAll<T>(profile, chapter, keyPrefix)
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
  }, [course, chapter, profile, keyPrefix]);

  useEffect(() => {
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
    return unsubscribe;
  }, [course, chapter, profile, keyPrefix, senderId]);

  const hydrated = status === "ready";

  return { values, status, error, hydrated, persistence };
}
