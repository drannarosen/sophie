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

export type InteractiveStatus = "loading" | "ready" | "error";

/**
 * Spread on persistence-bearing inputs/buttons to gate user
 * interaction until IndexedDB hydration completes. Without this,
 * a click that lands between mount and IDB-fetch resolution gets
 * silently overwritten by the fetch's `setLocalValue(persisted ?? initial)`.
 *
 * Convention codified in `docs/website/contributing/coding-standards.md`
 * § "Persistence-bearing controls".
 */
export interface InteractiveControlProps {
  disabled: boolean;
  "aria-busy": boolean;
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

  const valueRef = useRef(value);
  valueRef.current = value;

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
    store
      .get<T>(profile, chapter, componentKey)
      .then((persisted) => {
        if (cancelled) return;
        // Reset to initial when the new key has no stored value — otherwise
        // the previous key's state lingers across (course, chapter, profile,
        // key) changes. Caught in code review 2026-05-09.
        setLocalValue(persisted ?? initial);
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
  }, [course, chapter, profile, componentKey, initial]);

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
          if (!mountedRef.current) return;
          setError(null);
          setStatus("ready");
        })
        .catch((err: unknown) => {
          if (!mountedRef.current) return;
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus("error");
        });
    },
    [course, chapter, profile, componentKey, senderId]
  );

  const hydrated = status === "ready";
  const controlProps: InteractiveControlProps = {
    disabled: !hydrated,
    "aria-busy": !hydrated,
  };

  return { value, setValue, status, error, hydrated, controlProps };
}
