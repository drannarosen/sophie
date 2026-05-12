/**
 * `definePreference` — factory for chrome-state preferences that
 * persist via localStorage, reflect onto a `data-*` attribute on
 * `<html>`, and sync across tabs via the `storage` event.
 *
 * Per ADR 0032: chrome state is vanilla JS, NOT React. This is a
 * pure-TS factory, not a hook; do not call inside React components.
 *
 * Per ADR 0033: the `bootScript()` output is intended for
 * `<script is:inline>` inside `<TextbookHead>` (which lives in the
 * consumer's `<head>` outside any React island).
 */

export interface PreferenceOptions<TStored, TAttr extends string = string> {
  /** localStorage key, e.g. "sophie:theme". */
  key: string;
  /** data-* attribute name on <html>, e.g. "data-theme". */
  attribute: string;
  /** Fallback value when no localStorage entry exists. */
  default: TStored;
  /**
   * Whitelist of accepted serialized stored values. Used by
   * `bootScript()` to validate localStorage contents BEFORE any
   * user-provided `parse()` runs (boot code can't include closured
   * functions). At runtime, `parse()` still authoritatively maps
   * raw → typed.
   */
  values: readonly string[];
  /** Parse a raw localStorage value (may be null) into the typed stored value. */
  parse: (raw: string | null) => TStored;
  /** Serialize the stored value back to a string for localStorage. */
  serialize: (value: TStored) => string;
  /**
   * Optional mapper from stored value to attribute value. For
   * tri-state preferences (theme: stored "system" → attribute
   * "light"|"dark") this resolves at boot and on every write.
   * Defaults to identity (stringified).
   */
  resolve?: (stored: TStored) => TAttr;
  /**
   * JS expression-string equivalent of `resolve`, used inside
   * `bootScript()`. References the local `stored` variable.
   * Example for theme: `"stored === 'system' ?
   * (window.matchMedia('(prefers-color-scheme: dark)').matches
   * ? 'dark' : 'light') : stored"`. Defaults to `"stored"`.
   */
  resolveExpression?: string;
}

export interface BootScriptOptions {
  /**
   * A JavaScript expression (as a source string) evaluated INSIDE
   * the generated boot IIFE and used as the runtime default when no
   * stored value is present. Lets callers inject viewport-aware
   * defaults (e.g. sidebar's mobile-default-closed) without baking
   * viewport logic into the generic factory.
   *
   * MUST be a single expression of type string, evaluable in the
   * top frame's window context. Receives no inputs.
   */
  defaultExpression?: string;
}

export interface Preference<TStored> {
  read(): TStored;
  write(next: TStored): void;
  subscribe(cb: (next: TStored) => void): () => void;
  bindToggle(el: HTMLElement, cycle: (current: TStored) => TStored): void;
  bootScript(opts?: BootScriptOptions): string;
}

export function definePreference<TStored, TAttr extends string = string>(
  opts: PreferenceOptions<TStored, TAttr>
): Preference<TStored> {
  const resolve = opts.resolve ?? ((v: TStored) => String(v));

  function applyAttribute(stored: TStored): void {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute(opts.attribute, resolve(stored));
  }

  function read(): TStored {
    return opts.parse(localStorage.getItem(opts.key));
  }

  const subscribers = new Set<(next: TStored) => void>();

  function emit(next: TStored): void {
    applyAttribute(next);
    for (const cb of subscribers) cb(next);
  }

  function write(next: TStored): void {
    localStorage.setItem(opts.key, opts.serialize(next));
    emit(next);
  }

  function subscribe(cb: (next: TStored) => void): () => void {
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key !== opts.key) return;
      emit(opts.parse(event.newValue));
    });
  }

  const BOUND_ATTR = `data-sophie-pref-${opts.key.replace(/[^a-z0-9-]/gi, "-")}`;

  function bindToggle(
    el: HTMLElement,
    cycle: (current: TStored) => TStored
  ): void {
    if (el.hasAttribute(BOUND_ATTR)) return;
    el.setAttribute(BOUND_ATTR, "");
    el.addEventListener("click", () => {
      write(cycle(read()));
    });
  }

  function bootScript(bootOpts: BootScriptOptions = {}): string {
    const key = JSON.stringify(opts.key);
    const attribute = JSON.stringify(opts.attribute);
    const valuesJson = JSON.stringify(opts.values);
    const defaultLiteral = JSON.stringify(opts.serialize(opts.default));
    const defaultExpr = bootOpts.defaultExpression ?? defaultLiteral;
    const resolveExpr = opts.resolveExpression ?? "stored";
    // Two-stage IIFE: try the localStorage path; on throw, fall back
    // to the default and still apply the attribute so CSS has a state
    // to match. Both stages share the same resolve expression.
    return (
      "(function(){" +
      "var values=" +
      valuesJson +
      ";" +
      "var stored;" +
      "try{stored=localStorage.getItem(" +
      key +
      ");}catch(e){stored=null;}" +
      "if(values.indexOf(stored)===-1){stored=" +
      defaultExpr +
      ";}" +
      "try{document.documentElement.setAttribute(" +
      attribute +
      ",(" +
      resolveExpr +
      "));}catch(e){}" +
      "})();"
    );
  }

  return {
    read,
    write,
    subscribe,
    bindToggle,
    bootScript,
  };
}
