import { useCallback } from "react";
import { type ParameterDefinition, useParameterStore } from "./store.ts";

/**
 * Subscribe to a named A11 parameter cursor.
 *
 * Returns a 3-tuple: current value, setter (clamps to the parameter's
 * declared range), and the parameter definition. All three are
 * `undefined` until a sibling `<ParameterCursor name={...}>` registers
 * the parameter with the page store.
 *
 * The setter is stable across renders for a given `name` and remains
 * usable across late registrations — calling it before the cursor is
 * registered is a no-op; calling it after registration writes through.
 *
 * Per ADR 0058, the hook does not enforce or read epistemic role —
 * subscribers declare their role separately (component-level
 * `epistemicRole` prop) per ADR 0058 §3.
 */
export function useLinkedParameter(
  name: string
): readonly [
  value: number | undefined,
  setValue: (value: number) => void,
  definition: ParameterDefinition | undefined,
] {
  const value = useParameterStore((s) => s.values[name]);
  const definition = useParameterStore((s) => s.parameters[name]);
  const setValue = useCallback(
    (v: number) => useParameterStore.getState().setValue(name, v),
    [name]
  );
  return [value, setValue, definition] as const;
}
