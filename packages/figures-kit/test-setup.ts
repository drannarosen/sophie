import "@testing-library/jest-dom/vitest";
import { toHaveNoViolations } from "jest-axe";
import { expect } from "vitest";

// jest-axe exports `toHaveNoViolations` as a matcher-collection
// object (`{ toHaveNoViolations(results) { ... } }`) — already the
// exact shape `expect.extend` consumes. Mirrors @sophie/components
// test-setup.ts.
expect.extend(toHaveNoViolations);

// Radix UI primitives observe size changes via ResizeObserver.
// jsdom doesn't ship one; polyfill with a no-op so Radix doesn't
// ReferenceError at mount. Real visual behaviour is verified by
// Storybook test-runner.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
