import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  installSystemThemeListener,
  nextTheme,
  systemTheme,
  type ThemeAttr,
  themePref,
} from "./theme";

interface FakeMql {
  matches: boolean;
  listeners: Set<(event: { matches: boolean }) => void>;
  fire(matches: boolean): void;
}

function stubMatchMedia(initialMatches: boolean): FakeMql {
  const fake: FakeMql = {
    matches: initialMatches,
    listeners: new Set(),
    fire(matches: boolean) {
      this.matches = matches;
      for (const cb of this.listeners) cb({ matches });
    },
  };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (_query: string) => ({
      get matches() {
        return fake.matches;
      },
      addEventListener: (
        _: string,
        cb: (event: { matches: boolean }) => void
      ) => {
        fake.listeners.add(cb);
      },
      removeEventListener: (
        _: string,
        cb: (event: { matches: boolean }) => void
      ) => {
        fake.listeners.delete(cb);
      },
    }),
  });
  return fake;
}

function clearMatchMedia(): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: undefined,
  });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  // Reset the module-level idempotency guard installed by
  // installSystemThemeListener so each test starts clean.
  (
    window as Window & { __sophieThemeMqlBound?: boolean }
  ).__sophieThemeMqlBound = undefined;
});

afterEach(() => {
  clearMatchMedia();
});

describe("nextTheme()", () => {
  test("cycles system → light → dark → system", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });
});

describe("systemTheme()", () => {
  test("returns 'dark' when prefers-color-scheme matches dark", () => {
    stubMatchMedia(true);
    expect(systemTheme()).toBe("dark" satisfies ThemeAttr);
  });

  test("returns 'light' when prefers-color-scheme does not match dark", () => {
    stubMatchMedia(false);
    expect(systemTheme()).toBe("light" satisfies ThemeAttr);
  });

  test("returns 'light' as the fallback when matchMedia is unavailable", () => {
    clearMatchMedia();
    expect(systemTheme()).toBe("light");
  });
});

describe("themePref: parse", () => {
  test("parses 'system' / 'light' / 'dark' identically", () => {
    localStorage.setItem("sophie:theme", "system");
    expect(themePref.read()).toBe("system");
    localStorage.setItem("sophie:theme", "light");
    expect(themePref.read()).toBe("light");
    localStorage.setItem("sophie:theme", "dark");
    expect(themePref.read()).toBe("dark");
  });

  test("returns 'system' for null or unknown values", () => {
    expect(themePref.read()).toBe("system");
    localStorage.setItem("sophie:theme", "garbage");
    expect(themePref.read()).toBe("system");
  });
});

describe("themePref: resolve at runtime (write)", () => {
  test("write('system') resolves to systemTheme() result", () => {
    stubMatchMedia(true);
    themePref.write("system");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("write('light') always resolves to 'light'", () => {
    stubMatchMedia(true); // OS dark; explicit light wins
    themePref.write("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("write('dark') always resolves to 'dark'", () => {
    stubMatchMedia(false); // OS light; explicit dark wins
    themePref.write("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});

describe("themePref: bootScript() resolveExpression", () => {
  function runBoot(script: string): void {
    new Function(script)();
  }

  test("stored='system' + OS dark → boot sets data-theme='dark'", () => {
    stubMatchMedia(true);
    localStorage.setItem("sophie:theme", "system");
    runBoot(themePref.bootScript());
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("stored='system' + OS light → boot sets data-theme='light'", () => {
    stubMatchMedia(false);
    localStorage.setItem("sophie:theme", "system");
    runBoot(themePref.bootScript());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("stored='dark' + OS light → boot sets data-theme='dark'", () => {
    stubMatchMedia(false);
    localStorage.setItem("sophie:theme", "dark");
    runBoot(themePref.bootScript());
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("empty localStorage + OS dark → boot uses default 'system' → 'dark'", () => {
    stubMatchMedia(true);
    runBoot(themePref.bootScript());
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});

describe("installSystemThemeListener", () => {
  test("OS change re-applies attribute when stored value is 'system'", () => {
    const mql = stubMatchMedia(false);
    localStorage.setItem("sophie:theme", "system");
    themePref.write("system"); // apply initial light
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    installSystemThemeListener();
    mql.fire(true); // OS switches to dark
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    mql.fire(false); // OS switches back to light
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("OS change is ignored when stored value is 'light'", () => {
    const mql = stubMatchMedia(false);
    themePref.write("light");
    installSystemThemeListener();
    mql.fire(true); // OS dark
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("OS change is ignored when stored value is 'dark'", () => {
    const mql = stubMatchMedia(true);
    themePref.write("dark");
    installSystemThemeListener();
    mql.fire(false); // OS light
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("idempotent: installing twice only registers one listener", () => {
    const mql = stubMatchMedia(false);
    themePref.write("system");
    installSystemThemeListener();
    installSystemThemeListener(); // second call should be a no-op
    expect(mql.listeners.size).toBe(1);
  });

  test("returns a cleanup that removes the listener", () => {
    const mql = stubMatchMedia(false);
    themePref.write("system");
    const cleanup = installSystemThemeListener();
    expect(mql.listeners.size).toBe(1);
    cleanup();
    expect(mql.listeners.size).toBe(0);
  });
});
