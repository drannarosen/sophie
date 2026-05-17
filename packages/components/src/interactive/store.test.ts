import { beforeEach, describe, expect, test } from "vitest";
import { useParameterStore } from "./store.ts";

describe("ParameterStore", () => {
  beforeEach(() => {
    useParameterStore.setState({ parameters: {}, values: {} });
  });

  test("register adds a parameter and seeds its value with the default", () => {
    useParameterStore.getState().register({
      name: "blackbody:T",
      min: 1000,
      max: 50000,
      default: 5772,
      unit: "K",
    });

    const state = useParameterStore.getState();
    expect(state.parameters["blackbody:T"]).toMatchObject({
      name: "blackbody:T",
      min: 1000,
      max: 50000,
      default: 5772,
      unit: "K",
    });
    expect(state.values["blackbody:T"]).toBe(5772);
  });

  test("setValue updates a registered parameter's value", () => {
    const store = useParameterStore.getState();
    store.register({ name: "T", min: 1000, max: 50000, default: 5772 });
    store.setValue("T", 10000);
    expect(useParameterStore.getState().values.T).toBe(10000);
  });

  test("setValue clamps to min", () => {
    const store = useParameterStore.getState();
    store.register({ name: "T", min: 1000, max: 50000, default: 5772 });
    store.setValue("T", -500);
    expect(useParameterStore.getState().values.T).toBe(1000);
  });

  test("setValue clamps to max", () => {
    const store = useParameterStore.getState();
    store.register({ name: "T", min: 1000, max: 50000, default: 5772 });
    store.setValue("T", 999999);
    expect(useParameterStore.getState().values.T).toBe(50000);
  });

  test("setValue is a no-op for unregistered parameter names", () => {
    const store = useParameterStore.getState();
    store.setValue("nonexistent", 42);
    expect(useParameterStore.getState().values.nonexistent).toBeUndefined();
  });

  test("register preserves existing value if parameter was re-registered with same name", () => {
    // Scenario: a <ParameterCursor> re-mounts (e.g., React strict mode
    // double-invocation, or hot reload). The current value should not
    // reset to the default just because the cursor unmounted+remounted.
    const store = useParameterStore.getState();
    store.register({ name: "T", min: 1000, max: 50000, default: 5772 });
    store.setValue("T", 10000);
    store.register({ name: "T", min: 1000, max: 50000, default: 5772 });
    expect(useParameterStore.getState().values.T).toBe(10000);
  });

  test("unregister removes a parameter and its value", () => {
    const store = useParameterStore.getState();
    store.register({ name: "T", min: 1000, max: 50000, default: 5772 });
    store.setValue("T", 8000);
    store.unregister("T");
    const state = useParameterStore.getState();
    expect(state.parameters.T).toBeUndefined();
    expect(state.values.T).toBeUndefined();
  });
});
