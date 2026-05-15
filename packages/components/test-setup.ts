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

beforeEach(() => {
  __resetRuntimeCaches();
});

afterEach(() => {
  __resetRuntimeCaches();
});
