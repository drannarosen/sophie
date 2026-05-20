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

describe("installAsidePositioning ResizeObserver + fonts.ready hooks", () => {
  beforeEach(() => {
    (
      window as Window & { __sophieAsideDockBound?: boolean }
    ).__sophieAsideDockBound = undefined;
    // Ensure the .sophie-content target exists so the observers can
    // attach. jsdom doesn't ship one by default.
    const existing = document.querySelector(".sophie-content");
    if (existing) existing.remove();
    const content = document.createElement("div");
    content.className = "sophie-content";
    document.body.appendChild(content);
  });

  afterEach(() => {
    (
      window as Window & { __sophieAsideDockBound?: boolean }
    ).__sophieAsideDockBound = undefined;
    const content = document.querySelector(".sophie-content");
    if (content) content.remove();
  });

  test("wires a ResizeObserver to .sophie-content so font-load + async height shifts trigger reposition", () => {
    const observed: Element[] = [];
    const disconnects: number[] = [];
    class MockResizeObserver {
      callback: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.callback = cb;
      }
      observe(el: Element) {
        observed.push(el);
      }
      unobserve() {}
      disconnect() {
        disconnects.push(1);
      }
    }
    const originalRO = (globalThis as { ResizeObserver?: unknown })
      .ResizeObserver;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;

    const cleanup = installAsidePositioning();
    expect(observed).toHaveLength(1);
    expect(observed[0]?.className).toBe("sophie-content");

    cleanup();
    expect(disconnects).toHaveLength(1);

    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = originalRO;
  });

  test("subscribes to document.fonts.ready so the cascade re-runs once fonts swap in", async () => {
    const thenSpy = vi.fn();
    const fakeReady = {
      // biome-ignore lint/suspicious/noThenProperty: this is a deliberate thenable that mocks the FontFaceSet.ready Promise (we want the installer to treat it like a Promise and await it). Renaming `then` would defeat the entire point of the mock.
      then: (resolve: () => void) => {
        thenSpy(resolve);
        // Synchronously invoke the resolver to model "fonts already
        // loaded by the time the installer runs" — a common case in
        // tests + cached repeat visits.
        resolve();
        return { catch: () => {} };
      },
    };
    const originalFonts = (document as Document & { fonts?: FontFaceSet })
      .fonts;
    (document as unknown as { fonts?: { ready: unknown } }).fonts = {
      ready: fakeReady,
    };

    const cleanup = installAsidePositioning();
    expect(thenSpy).toHaveBeenCalledTimes(1);

    cleanup();
    (document as Document & { fonts?: unknown }).fonts = originalFonts;
  });

  test("ResizeObserver absence is tolerated (older browsers / SSR)", () => {
    const originalRO = (globalThis as { ResizeObserver?: unknown })
      .ResizeObserver;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined;
    // Install must not throw.
    expect(() => {
      const cleanup = installAsidePositioning();
      cleanup();
    }).not.toThrow();
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = originalRO;
  });
});
