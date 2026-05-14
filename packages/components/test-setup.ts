import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, beforeEach } from "vitest";
import { __resetRuntimeCaches } from "./src/runtime/useInteractive.ts";

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
