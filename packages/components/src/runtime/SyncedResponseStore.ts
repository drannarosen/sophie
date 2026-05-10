import type { ResponseStore } from "./ResponseStore.ts";

/**
 * V3 sync seam. Implementation is intentionally absent in Phase 0;
 * the interface exists so consumers and Phase-3 code can target a
 * stable shape. A `SyncedResponseStore` extends `ResponseStore` with
 * the concept of an authoritative remote (server) and best-effort
 * local-first writes that reconcile asynchronously.
 */
export interface SyncedResponseStore extends ResponseStore {
  /** Pulls remote state for a chapter into the local store. */
  pull(profile: string, chapter: string): Promise<void>;
  /** Pushes local state for a chapter to the remote authority. */
  push(profile: string, chapter: string): Promise<void>;
  /** True if the remote has been reached at least once this session. */
  isOnline(): boolean;
}
