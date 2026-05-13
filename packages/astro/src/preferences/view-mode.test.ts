import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  installViewModeKeyboardShortcut,
  nextViewMode,
  type ViewModeStored,
  viewModePref,
} from "./view-mode";

/**
 * Each test that installs the shortcut MUST capture its cleanup
 * here, or alternatively call `install()` helper below. afterEach
 * tears it down — without this, stale window keydown listeners
 * from prior tests fire on subsequent dispatches and silently
 * over-cycle the mode.
 */
const cleanups: Array<() => void> = [];

function install(): void {
  cleanups.push(installViewModeKeyboardShortcut());
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-view-mode");
  document.body.innerHTML = "";
  (
    window as Window & { __sophieViewModeShortcutBound?: boolean }
  ).__sophieViewModeShortcutBound = undefined;
});

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  document.body.innerHTML = "";
});

/**
 * Dispatch a keydown on `document` with the given key + modifiers.
 * Uses `bubbles: true` so the window-level listener installed by
 * `installViewModeKeyboardShortcut` sees it (matches real-browser
 * propagation from the focused element up).
 */
function pressKey(
  key: string,
  opts: { metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean } = {}
): void {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  (document.activeElement ?? document.body).dispatchEvent(event);
}

describe("nextViewMode()", () => {
  test("cycles default → focused → wide → default", () => {
    expect(nextViewMode("default")).toBe("focused" satisfies ViewModeStored);
    expect(nextViewMode("focused")).toBe("wide" satisfies ViewModeStored);
    expect(nextViewMode("wide")).toBe("default" satisfies ViewModeStored);
  });
});

describe("viewModePref: parse", () => {
  test("returns 'default' when localStorage is empty", () => {
    expect(viewModePref.read()).toBe("default" satisfies ViewModeStored);
  });

  test("returns 'focused' / 'wide' when stored verbatim", () => {
    localStorage.setItem("sophie:view-mode", "focused");
    expect(viewModePref.read()).toBe("focused");
    localStorage.setItem("sophie:view-mode", "wide");
    expect(viewModePref.read()).toBe("wide");
  });

  test("returns 'default' for unknown / garbage values", () => {
    localStorage.setItem("sophie:view-mode", "garbage");
    expect(viewModePref.read()).toBe("default");
    localStorage.setItem("sophie:view-mode", "");
    expect(viewModePref.read()).toBe("default");
  });

  test("explicitly accepts the literal 'default' string", () => {
    localStorage.setItem("sophie:view-mode", "default");
    expect(viewModePref.read()).toBe("default");
  });
});

describe("viewModePref: write applies data-view-mode (no resolve indirection)", () => {
  test("write('focused') reflects to <html data-view-mode='focused'>", () => {
    viewModePref.write("focused");
    expect(document.documentElement.getAttribute("data-view-mode")).toBe(
      "focused"
    );
  });

  test("write('wide') reflects to <html data-view-mode='wide'>", () => {
    viewModePref.write("wide");
    expect(document.documentElement.getAttribute("data-view-mode")).toBe(
      "wide"
    );
  });

  test("write('default') reflects to <html data-view-mode='default'>", () => {
    viewModePref.write("default");
    expect(document.documentElement.getAttribute("data-view-mode")).toBe(
      "default"
    );
  });

  test("write round-trips through localStorage", () => {
    viewModePref.write("wide");
    expect(localStorage.getItem("sophie:view-mode")).toBe("wide");
    expect(viewModePref.read()).toBe("wide");
  });
});

describe("installViewModeKeyboardShortcut: cycles on `v`", () => {
  test("pressing 'v' while body is focused cycles the mode", () => {
    install();
    expect(viewModePref.read()).toBe("default");

    pressKey("v");
    expect(viewModePref.read()).toBe("focused");

    pressKey("v");
    expect(viewModePref.read()).toBe("wide");

    pressKey("v");
    expect(viewModePref.read()).toBe("default");
  });

  test("pressing 'V' (Shift+v / capital) also cycles", () => {
    install();
    pressKey("V");
    expect(viewModePref.read()).toBe("focused");
  });

  test("Cmd+v does NOT cycle (don't hijack paste)", () => {
    install();
    pressKey("v", { metaKey: true });
    expect(viewModePref.read()).toBe("default");
  });

  test("Ctrl+v does NOT cycle (don't hijack paste)", () => {
    install();
    pressKey("v", { ctrlKey: true });
    expect(viewModePref.read()).toBe("default");
  });

  test("Alt+v does NOT cycle", () => {
    install();
    pressKey("v", { altKey: true });
    expect(viewModePref.read()).toBe("default");
  });

  test("keys other than v are ignored", () => {
    install();
    pressKey("a");
    pressKey("Enter");
    pressKey(" ");
    expect(viewModePref.read()).toBe("default");
  });
});

describe("installViewModeKeyboardShortcut: input-focus guard", () => {
  test("pressing 'v' while focused on <input> does NOT cycle", () => {
    const input = document.createElement("input");
    input.type = "text";
    document.body.appendChild(input);
    input.focus();
    install();

    pressKey("v");
    expect(viewModePref.read()).toBe("default");
  });

  test("pressing 'v' while focused on <textarea> does NOT cycle", () => {
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    ta.focus();
    install();

    pressKey("v");
    expect(viewModePref.read()).toBe("default");
  });

  test("pressing 'v' while focused on contenteditable does NOT cycle", () => {
    const div = document.createElement("div");
    // Set both property + attribute: JSDOM's reflection is uneven,
    // and real-browser content can be authored either way.
    div.contentEditable = "true";
    div.setAttribute("contenteditable", "true");
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();
    install();

    pressKey("v");
    expect(viewModePref.read()).toBe("default");
  });

  test("pressing 'v' while focused on <select> does NOT cycle", () => {
    const sel = document.createElement("select");
    document.body.appendChild(sel);
    sel.focus();
    install();

    pressKey("v");
    expect(viewModePref.read()).toBe("default");
  });
});

describe("installViewModeKeyboardShortcut: idempotency", () => {
  test("installing twice does not fire the handler twice per keypress", () => {
    install();
    install();
    pressKey("v");
    // If the handler ran twice, the mode would have advanced past
    // "focused" to "wide".
    expect(viewModePref.read()).toBe("focused");
  });

  test("returns a cleanup that removes the listener", () => {
    const cleanup = installViewModeKeyboardShortcut();
    cleanup();
    pressKey("v");
    expect(viewModePref.read()).toBe("default");
  });
});

describe("viewModePref: bootScript()", () => {
  function runBoot(script: string): void {
    new Function(script)();
  }

  test("stored 'focused' boots to data-view-mode='focused'", () => {
    localStorage.setItem("sophie:view-mode", "focused");
    runBoot(viewModePref.bootScript());
    expect(document.documentElement.getAttribute("data-view-mode")).toBe(
      "focused"
    );
  });

  test("stored 'wide' boots to data-view-mode='wide'", () => {
    localStorage.setItem("sophie:view-mode", "wide");
    runBoot(viewModePref.bootScript());
    expect(document.documentElement.getAttribute("data-view-mode")).toBe(
      "wide"
    );
  });

  test("empty localStorage boots to data-view-mode='default'", () => {
    runBoot(viewModePref.bootScript());
    expect(document.documentElement.getAttribute("data-view-mode")).toBe(
      "default"
    );
  });

  test("invalid stored value boots to data-view-mode='default'", () => {
    localStorage.setItem("sophie:view-mode", "garbage");
    runBoot(viewModePref.bootScript());
    expect(document.documentElement.getAttribute("data-view-mode")).toBe(
      "default"
    );
  });

  test("bootScript never throws under localStorage failure", () => {
    const original = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("Safari private mode");
      },
    });
    try {
      expect(() => runBoot(viewModePref.bootScript())).not.toThrow();
      expect(document.documentElement.getAttribute("data-view-mode")).toBe(
        "default"
      );
    } finally {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: original,
      });
    }
  });
});
