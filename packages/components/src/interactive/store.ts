import { create } from "zustand";

export interface ParameterDefinition {
  name: string;
  min: number;
  max: number;
  default: number;
  unit?: string;
  step?: number | "log";
}

export interface ParameterStoreState {
  parameters: Record<string, ParameterDefinition>;
  values: Record<string, number>;
  register: (def: ParameterDefinition) => void;
  unregister: (name: string) => void;
  setValue: (name: string, value: number) => void;
}

export const useParameterStore = create<ParameterStoreState>((set) => ({
  parameters: {},
  values: {},
  register: (def) =>
    set((s) => ({
      parameters: { ...s.parameters, [def.name]: def },
      values:
        s.values[def.name] === undefined
          ? { ...s.values, [def.name]: def.default }
          : s.values,
    })),
  unregister: (name) =>
    set((s) => {
      const { [name]: _droppedParam, ...parameters } = s.parameters;
      const { [name]: _droppedValue, ...values } = s.values;
      return { parameters, values };
    }),
  setValue: (name, value) =>
    set((s) => {
      const def = s.parameters[name];
      if (!def) return s;
      const clamped = Math.min(Math.max(value, def.min), def.max);
      return { values: { ...s.values, [name]: clamped } };
    }),
}));
