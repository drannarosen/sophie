/**
 * `getUserId` — stable per-browser identifier for persistence-bearing
 * components.
 *
 * Per the Wedge B1 plan, every `practice_attempt` record carries a
 * `user_id` (per `BaseRecordSchema`, ADR 0066). Sophie has no auth
 * server yet; each browser generates and persists a UUID on first
 * call. The returned value is stable across sessions for the same
 * browser+device origin.
 *
 * Returns a fixed placeholder during SSR (where `localStorage` is
 * unavailable). The post-hydration browser pass replaces it with the
 * persistent UUID on the first call. Components consuming the value
 * via `useInteractive` won't observe the placeholder in normal flow:
 * the persistence hook only fires writes after IDB hydration, which
 * happens client-side.
 *
 * Replaced by an auth-server-backed identity later (no scope in
 * Wedge B1; tracked alongside the Cockpit work in ADR 0076).
 */

const STORAGE_KEY = "sophie:user-id";
const SSR_PLACEHOLDER = "anonymous-user-ssr";

export function getUserId(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return SSR_PLACEHOLDER;
  }
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (id === null) {
    id = `browser-${crypto.randomUUID()}`;
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
