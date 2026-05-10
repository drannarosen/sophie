import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  type BroadcastChannelLayer,
  type BroadcastMessage,
  chapterChannelName,
  createBroadcastChannel,
} from "./BroadcastChannel.ts";
import { IndexedDBResponseStore } from "./IndexedDBResponseStore.ts";
import { useProfile } from "./ProfileContext.tsx";
import type { ResponseStore } from "./ResponseStore.ts";
import { compositeKey } from "./ResponseStore.ts";
import { useSophieConfig } from "./SophieConfig.tsx";

export type InteractiveStatus = "loading" | "ready" | "error";

export interface UseInteractiveResult<T> {
  value: T;
  setValue: (next: T) => void;
  status: InteractiveStatus;
  error: Error | null;
}

const stores = new Map<string, ResponseStore>();
const channels = new Map<string, BroadcastChannelLayer>();

function getStore(course: string): ResponseStore {
  let store = stores.get(course);
  if (store === undefined) {
    store = new IndexedDBResponseStore(course);
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

export function useInteractive<T>(
  componentKey: string,
  initial: T
): UseInteractiveResult<T> {
  const { course, chapter } = useSophieConfig();
  const profile = useProfile();
  const senderId = useId();

  const [value, setLocalValue] = useState<T>(initial);
  const [status, setStatus] = useState<InteractiveStatus>("loading");
  const [error, setError] = useState<Error | null>(null);

  // Keep latest value in a ref so the broadcast handler doesn't see stale state.
  const valueRef = useRef(value);
  valueRef.current = value;

  // Hydrate from IndexedDB on mount / key change.
  useEffect(() => {
    let cancelled = false;
    const store = getStore(course);
    setStatus("loading");
    setError(null);
    store
      .get<T>(profile, chapter, componentKey)
      .then((persisted) => {
        if (cancelled) return;
        if (persisted !== undefined) setLocalValue(persisted);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [course, chapter, profile, componentKey]);

  // Subscribe to BroadcastChannel for cross-tab updates.
  useEffect(() => {
    const channel = getChannel(course, chapter);
    const fullKey = compositeKey(profile, chapter, componentKey);
    const unsubscribe = channel.subscribe((message: BroadcastMessage) => {
      if (message.senderId === senderId) return;
      if (message.key !== fullKey) return;
      setLocalValue(message.value as T);
    });
    return unsubscribe;
  }, [course, chapter, profile, componentKey, senderId]);

  const setValue = useCallback(
    (next: T) => {
      setLocalValue(next);
      const store = getStore(course);
      const channel = getChannel(course, chapter);
      const fullKey = compositeKey(profile, chapter, componentKey);
      store
        .set(profile, chapter, componentKey, next)
        .then(() => {
          channel.post({ senderId, key: fullKey, value: next });
          setError(null);
          setStatus("ready");
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus("error");
        });
    },
    [course, chapter, profile, componentKey, senderId]
  );

  return { value, setValue, status, error };
}
