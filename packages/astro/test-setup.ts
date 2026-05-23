import "@testing-library/jest-dom/vitest";

/**
 * Realm-alignment for jsdom + Node typed arrays (esbuild invariant fix).
 *
 * Under vitest's jsdom environment on Node 25, `new TextEncoder().encode("")`
 * returns a buffer whose `__proto__` is jsdom's realm-local `Uint8Array`,
 * but `globalThis.Uint8Array` is Node's realm. esbuild (loaded transitively
 * via Vite when Container API tests parse `.astro` files) asserts
 * `new TextEncoder().encode("") instanceof Uint8Array` at module-init time;
 * the realm mismatch makes that `false` and esbuild throws.
 *
 * Fix: probe the realm the global `TextEncoder` actually produces, then
 * reassign `globalThis.Uint8Array` to that realm so `instanceof` succeeds.
 * Equivalent to aligning the two reference points; doesn't touch jsdom's
 * own `TextEncoder` (we want jsdom-realm buffers for any browser-API
 * polyfill that consumes them).
 *
 * Must run BEFORE any module imports esbuild (i.e., before Container API
 * imports). Setup files run before test files, so this is the right spot.
 */
{
  const probe = new TextEncoder().encode("");
  const RealmUint8Array = Object.getPrototypeOf(probe).constructor;
  Object.defineProperty(globalThis, "Uint8Array", {
    configurable: true,
    writable: true,
    value: RealmUint8Array,
  });
}

/**
 * Vitest 4 + jsdom 29 returns a no-op `{}` stub for `localStorage` /
 * `sessionStorage` in this environment (the "--localstorage-file was
 * provided without a valid path" warning at startup is the upstream
 * trigger). Until that ships fixed, install a minimal in-memory
 * `Storage` polyfill that satisfies the real Web Storage contract:
 * `getItem` / `setItem` / `removeItem` / `clear` / `length` / `key`.
 *
 * Each test gets a fresh Map via beforeEach in the test file itself.
 * This polyfill ONLY runs in the vitest jsdom environment and never
 * ships to production.
 */
function installStoragePolyfill(name: "localStorage" | "sessionStorage"): void {
  const existing = (globalThis as Record<string, unknown>)[name];
  if (
    existing &&
    typeof (existing as { clear?: unknown }).clear === "function"
  ) {
    return; // real Storage already present.
  }
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: storage,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, name, {
      configurable: true,
      value: storage,
    });
  }
}

installStoragePolyfill("localStorage");
installStoragePolyfill("sessionStorage");
