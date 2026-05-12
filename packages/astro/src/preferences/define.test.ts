import { beforeEach, describe, expect, test } from "vitest";
import { definePreference } from "./define";

type Variant = "a" | "b" | "c";

function makePref() {
  return definePreference<Variant>({
    key: "test:variant",
    attribute: "data-test-variant",
    default: "a",
    values: ["a", "b", "c"],
    parse: (raw) => (raw === "b" || raw === "c" ? raw : "a"),
    serialize: (v) => v,
  });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-test-variant");
});

describe("definePreference: read()", () => {
  test("returns default when localStorage has no entry", () => {
    expect(makePref().read()).toBe("a");
  });

  test("returns parsed value when localStorage entry is valid", () => {
    localStorage.setItem("test:variant", "b");
    expect(makePref().read()).toBe("b");
  });

  test("returns default when localStorage entry is unparseable", () => {
    localStorage.setItem("test:variant", "garbage");
    expect(makePref().read()).toBe("a");
  });
});

describe("definePreference: write()", () => {
  test("persists serialized value to localStorage", () => {
    makePref().write("c");
    expect(localStorage.getItem("test:variant")).toBe("c");
  });

  test("sets data-* attribute on <html>", () => {
    makePref().write("b");
    expect(document.documentElement.getAttribute("data-test-variant")).toBe(
      "b"
    );
  });

  test("applies resolve() mapper to the attribute value", () => {
    type Stored = "system" | "on" | "off";
    type Attr = "on" | "off";
    const pref = definePreference<Stored, Attr>({
      key: "test:tri",
      attribute: "data-test-tri",
      default: "system",
      values: ["system", "on", "off"],
      parse: (raw) =>
        raw === "on" || raw === "off" || raw === "system" ? raw : "system",
      serialize: (v) => v,
      resolve: (stored) => (stored === "on" ? "on" : "off"),
    });
    pref.write("system");
    // Stored "system" → resolved attribute "off"
    expect(localStorage.getItem("test:tri")).toBe("system");
    expect(document.documentElement.getAttribute("data-test-tri")).toBe("off");

    pref.write("on");
    expect(localStorage.getItem("test:tri")).toBe("on");
    expect(document.documentElement.getAttribute("data-test-tri")).toBe("on");

    document.documentElement.removeAttribute("data-test-tri");
  });
});

describe("definePreference: subscribe()", () => {
  test("write() notifies subscribers with the new value", () => {
    const pref = makePref();
    const seen: Variant[] = [];
    pref.subscribe((v) => seen.push(v));
    pref.write("b");
    pref.write("c");
    expect(seen).toEqual(["b", "c"]);
  });

  test("notifies multiple subscribers", () => {
    const pref = makePref();
    const a: Variant[] = [];
    const b: Variant[] = [];
    pref.subscribe((v) => a.push(v));
    pref.subscribe((v) => b.push(v));
    pref.write("b");
    expect(a).toEqual(["b"]);
    expect(b).toEqual(["b"]);
  });

  test("returned unsubscribe stops further notifications", () => {
    const pref = makePref();
    const seen: Variant[] = [];
    const off = pref.subscribe((v) => seen.push(v));
    pref.write("b");
    off();
    pref.write("c");
    expect(seen).toEqual(["b"]);
  });
});

describe("definePreference: cross-tab storage event", () => {
  function dispatchStorage(key: string, newValue: string | null): void {
    // storageArea is intentionally omitted: in the test environment
    // localStorage is a polyfilled object, not a real Storage instance,
    // and jsdom's StorageEvent constructor rejects it.
    window.dispatchEvent(
      new StorageEvent("storage", { key, newValue, oldValue: null })
    );
  }

  test("storage event for our key updates the data-* attribute", () => {
    makePref(); // attach the listener
    dispatchStorage("test:variant", "b");
    expect(document.documentElement.getAttribute("data-test-variant")).toBe(
      "b"
    );
  });

  test("storage event notifies subscribers with the parsed value", () => {
    const pref = makePref();
    const seen: Variant[] = [];
    pref.subscribe((v) => seen.push(v));
    dispatchStorage("test:variant", "c");
    expect(seen).toEqual(["c"]);
  });

  test("storage event for a different key is ignored", () => {
    const pref = makePref();
    const seen: Variant[] = [];
    pref.subscribe((v) => seen.push(v));
    dispatchStorage("some:other-key", "b");
    expect(seen).toEqual([]);
    expect(document.documentElement.hasAttribute("data-test-variant")).toBe(
      false
    );
  });

  test("storage event with newValue=null applies the default", () => {
    const pref = makePref();
    const seen: Variant[] = [];
    pref.subscribe((v) => seen.push(v));
    dispatchStorage("test:variant", null);
    expect(seen).toEqual(["a"]);
    expect(document.documentElement.getAttribute("data-test-variant")).toBe(
      "a"
    );
  });
});

describe("definePreference: bindToggle()", () => {
  function makeButton() {
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    return btn;
  }

  test("click invokes cycle(current) and persists the next value", () => {
    const pref = makePref();
    const btn = makeButton();
    pref.bindToggle(btn, (cur) =>
      cur === "a" ? "b" : cur === "b" ? "c" : "a"
    );
    btn.click();
    expect(pref.read()).toBe("b");
    expect(document.documentElement.getAttribute("data-test-variant")).toBe(
      "b"
    );
    btn.click();
    expect(pref.read()).toBe("c");
    btn.click();
    expect(pref.read()).toBe("a");
    btn.remove();
  });

  test("is idempotent: binding the same button twice still fires once per click", () => {
    const pref = makePref();
    const btn = makeButton();
    const cycle = (cur: Variant): Variant =>
      cur === "a" ? "b" : cur === "b" ? "c" : "a";
    pref.bindToggle(btn, cycle);
    pref.bindToggle(btn, cycle); // second bind should be a no-op
    btn.click();
    expect(pref.read()).toBe("b"); // one step, not two
    btn.remove();
  });
});

describe("definePreference: bootScript()", () => {
  function runBoot(script: string): void {
    new Function(script)();
  }

  test("returns a non-empty IIFE string", () => {
    const script = makePref().bootScript();
    expect(script.length).toBeGreaterThan(0);
    expect(script).toContain("(function");
  });

  test("applies the default when localStorage is empty", () => {
    runBoot(makePref().bootScript());
    expect(document.documentElement.getAttribute("data-test-variant")).toBe(
      "a"
    );
  });

  test("applies the stored value when valid", () => {
    localStorage.setItem("test:variant", "b");
    runBoot(makePref().bootScript());
    expect(document.documentElement.getAttribute("data-test-variant")).toBe(
      "b"
    );
  });

  test("applies the default when stored value is not in `values`", () => {
    localStorage.setItem("test:variant", "garbage");
    runBoot(makePref().bootScript());
    expect(document.documentElement.getAttribute("data-test-variant")).toBe(
      "a"
    );
  });

  test("honors defaultExpression when localStorage is empty", () => {
    runBoot(makePref().bootScript({ defaultExpression: "'c'" }));
    expect(document.documentElement.getAttribute("data-test-variant")).toBe(
      "c"
    );
  });

  test("applies resolveExpression to the validated stored value", () => {
    const pref = definePreference<"on" | "off" | "system", "on" | "off">({
      key: "test:tri",
      attribute: "data-test-tri",
      default: "system",
      values: ["system", "on", "off"],
      parse: (raw) =>
        raw === "on" || raw === "off" || raw === "system" ? raw : "system",
      serialize: (v) => v,
      resolveExpression: "stored === 'on' ? 'on' : 'off'",
    });
    localStorage.setItem("test:tri", "system");
    runBoot(pref.bootScript());
    expect(document.documentElement.getAttribute("data-test-tri")).toBe("off");
    document.documentElement.removeAttribute("data-test-tri");

    localStorage.setItem("test:tri", "on");
    runBoot(pref.bootScript());
    expect(document.documentElement.getAttribute("data-test-tri")).toBe("on");
    document.documentElement.removeAttribute("data-test-tri");
  });

  test("swallows localStorage throw and applies the default", () => {
    const realLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get(): never {
        throw new Error("Safari private mode");
      },
    });
    try {
      // bootScript IIFE must NOT throw; it should fall back to default.
      expect(() => runBoot(makePref().bootScript())).not.toThrow();
      expect(document.documentElement.getAttribute("data-test-variant")).toBe(
        "a"
      );
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: realLocalStorage,
      });
    }
  });
});
