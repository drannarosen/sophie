import { act, render, renderHook, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useParameterStore } from "./store.ts";
import { useLinkedParameter } from "./useLinkedParameter.ts";

describe("useLinkedParameter", () => {
  beforeEach(() => {
    useParameterStore.setState({ parameters: {}, values: {} });
  });

  function registerT(overrides: Partial<{ default: number }> = {}) {
    useParameterStore.getState().register({
      name: "T",
      min: 1000,
      max: 50000,
      default: overrides.default ?? 5772,
      unit: "K",
    });
  }

  test("returns current value, setter, and definition for a registered parameter", () => {
    registerT();
    const { result } = renderHook(() => useLinkedParameter("T"));
    const [value, setValue, def] = result.current;
    expect(value).toBe(5772);
    expect(typeof setValue).toBe("function");
    expect(def).toMatchObject({ name: "T", min: 1000, max: 50000, unit: "K" });
  });

  test("returns [undefined, no-op, undefined] when the parameter is not registered", () => {
    const { result } = renderHook(() => useLinkedParameter("ghost"));
    const [value, setValue, def] = result.current;
    expect(value).toBeUndefined();
    expect(def).toBeUndefined();
    // setter is callable; calling it does nothing observable
    expect(() => setValue(42)).not.toThrow();
    expect(useParameterStore.getState().values.ghost).toBeUndefined();
  });

  test("setter writes through to the store and clamps to range", () => {
    registerT();
    const { result } = renderHook(() => useLinkedParameter("T"));
    act(() => result.current[1](10000));
    expect(useParameterStore.getState().values.T).toBe(10000);
    act(() => result.current[1](999999));
    expect(useParameterStore.getState().values.T).toBe(50000);
  });

  test("re-renders subscribers when the named parameter changes", () => {
    registerT();
    const renders: number[] = [];
    function Probe() {
      const [value] = useLinkedParameter("T");
      renders.push(value as number);
      return <output>{value}</output>;
    }
    render(<Probe />);
    expect(renders).toEqual([5772]);
    act(() => useParameterStore.getState().setValue("T", 10000));
    expect(renders).toEqual([5772, 10000]);
  });

  test("does NOT re-render subscribers when an unrelated parameter changes", () => {
    registerT();
    useParameterStore.getState().register({
      name: "M",
      min: 0.1,
      max: 100,
      default: 1,
      unit: "M_sun",
    });
    const renderSpy = vi.fn();
    function Probe() {
      const [value] = useLinkedParameter("T");
      renderSpy(value);
      return <output>{value}</output>;
    }
    render(<Probe />);
    expect(renderSpy).toHaveBeenCalledTimes(1);
    act(() => useParameterStore.getState().setValue("M", 5));
    // No additional render because T didn't change.
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  test("subscribers see updated value after a late registration", () => {
    function Probe() {
      const [value, , def] = useLinkedParameter("T");
      return <output>{def ? value : "unregistered"}</output>;
    }
    render(<Probe />);
    expect(screen.getByRole("status").textContent).toBe("unregistered");
    act(() => registerT());
    expect(screen.getByRole("status").textContent).toBe("5772");
  });

  test("does not leak setters across hook calls — setter is bound to its name", () => {
    registerT();
    useParameterStore.getState().register({
      name: "M",
      min: 0.1,
      max: 100,
      default: 1,
      unit: "M_sun",
    });
    const { result: tResult } = renderHook(() => useLinkedParameter("T"));
    const { result: mResult } = renderHook(() => useLinkedParameter("M"));
    act(() => tResult.current[1](20000));
    act(() => mResult.current[1](5));
    expect(useParameterStore.getState().values.T).toBe(20000);
    expect(useParameterStore.getState().values.M).toBe(5);
  });

  test("unsubscribes on unmount (no errors on subsequent store updates)", () => {
    registerT();
    const { unmount } = renderHook(() => useLinkedParameter("T"));
    unmount();
    // Update after unmount; would warn if subscriber persisted.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    act(() => useParameterStore.getState().setValue("T", 12000));
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test("supports late-registration without a stale closure on the setter", () => {
    // Regression: an early call to useLinkedParameter("T") returned a
    // no-op setter when "T" wasn't yet registered. After registration,
    // the setter must work — i.e., the setter is reactive, not frozen
    // at hook-call time.
    function Probe() {
      const [, setValue, def] = useLinkedParameter("T");
      useEffect(() => {
        if (def) setValue(8000);
      }, [def, setValue]);
      return null;
    }
    render(<Probe />);
    act(() => registerT());
    expect(useParameterStore.getState().values.T).toBe(8000);
  });
});
