import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { installAsidePositioning } from "./install-positioning.ts";

/**
 * Lifecycle tests for `installAsidePositioning` — exercise the
 * window-level idempotency guard and the cleanup contract. Real
 * DOM interactions (resize, MutationObserver, view-mode flip) are
 * covered by Playwright in `examples/smoke/e2e/aside.spec.ts`.
 */

describe("installAsidePositioning lifecycle", () => {
  beforeEach(() => {
    (
      window as Window & { __sophieAsideDockBound?: boolean }
    ).__sophieAsideDockBound = undefined;
  });

  afterEach(() => {
    (
      window as Window & { __sophieAsideDockBound?: boolean }
    ).__sophieAsideDockBound = undefined;
  });

  test("first install sets the window guard", () => {
    const cleanup = installAsidePositioning();
    expect(
      (window as Window & { __sophieAsideDockBound?: boolean })
        .__sophieAsideDockBound
    ).toBe(true);
    cleanup();
  });

  test("second install is a no-op (idempotent via window guard)", () => {
    const addListenerSpy = vi.spyOn(window, "addEventListener");
    const first = installAsidePositioning();
    const beforeSecond = addListenerSpy.mock.calls.length;
    const second = installAsidePositioning();
    // Second call should not register new listeners on window.
    expect(addListenerSpy.mock.calls.length).toBe(beforeSecond);
    first();
    second();
    addListenerSpy.mockRestore();
  });

  test("cleanup resets the window guard so re-install works", () => {
    const cleanup = installAsidePositioning();
    cleanup();
    expect(
      (window as Window & { __sophieAsideDockBound?: boolean })
        .__sophieAsideDockBound
    ).toBe(false);
    // Re-install must work.
    const cleanup2 = installAsidePositioning();
    expect(
      (window as Window & { __sophieAsideDockBound?: boolean })
        .__sophieAsideDockBound
    ).toBe(true);
    cleanup2();
  });
});
