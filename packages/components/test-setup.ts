import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { toHaveNoViolations } from "jest-axe";
import { afterEach, beforeEach, expect } from "vitest";
import { __resetRuntimeCaches } from "./src/runtime/useInteractive.ts";

// jest-axe ships its own `expect.extend({ toHaveNoViolations })` in
// CommonJS only; the matcher must be wired explicitly when used from
// vitest. Once registered here, both `.toHaveNoViolations()` and the
// alternative `.violations.toEqual([])` assertion style work across
// the test suite. See https://github.com/nickcolley/jest-axe#vitest.
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
