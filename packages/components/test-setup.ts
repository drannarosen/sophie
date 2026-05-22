import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { toHaveNoViolations } from "jest-axe";
import { afterEach, beforeEach, expect } from "vitest";
import { __resetRuntimeCaches } from "./src/runtime/useInteractive.ts";

// jest-axe exports `toHaveNoViolations` as a matcher-collection
// object (`{ toHaveNoViolations(results) { ... } }`) — already the
// exact shape `expect.extend` consumes. The library's own
// `extend-expect.js` shim does the same call but isn't auto-loaded
// under vitest, so we register it explicitly here. Once registered,
// both `.toHaveNoViolations()` and the alternative
// `.violations.toEqual([])` assertion style work across the suite.
// See https://github.com/nickcolley/jest-axe#vitest.
expect.extend(toHaveNoViolations);

// Radix UI primitives (Popover used by <GlossaryTerm> in PR-C1)
// observe size changes via ResizeObserver. JSDOM doesn't ship one;
// polyfill with a no-op so Radix doesn't ReferenceError at mount.
// Real visual behaviour is verified by Playwright e2e.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom under vitest doesn't initialize a working Storage instance when
// the JSDOM URL is `about:blank` (the default). Provide a minimal in-
// memory Storage polyfill so `getUserId` and any future Web-Storage-
// backed helpers work in unit tests. Real browser behavior is what
// gets exercised in Playwright e2e.
if (
  typeof window !== "undefined" &&
  (typeof window.localStorage !== "object" ||
    typeof window.localStorage?.getItem !== "function")
) {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
}

beforeEach(() => {
  __resetRuntimeCaches();
});

afterEach(() => {
  __resetRuntimeCaches();
});
