import { render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ParameterCursor } from "./ParameterCursor.tsx";
import { useParameterStore } from "./store.ts";

describe("<ParameterCursor>", () => {
  beforeEach(() => {
    useParameterStore.setState({ parameters: {}, values: {} });
  });

  test("registers the cursor on mount with no visible DOM", () => {
    const { container } = render(
      <ParameterCursor
        name='T'
        min={1000}
        max={50000}
        default={5772}
        unit='K'
      />
    );
    expect(useParameterStore.getState().parameters["T"]).toMatchObject({
      name: "T",
      min: 1000,
      max: 50000,
      default: 5772,
      unit: "K",
    });
    // The mount node is hidden; container has no visible content.
    expect(container.textContent).toBe("");
  });

  test("unregisters the cursor on unmount", () => {
    const { unmount } = render(
      <ParameterCursor name='T' min={1000} max={50000} default={5772} />
    );
    expect(useParameterStore.getState().parameters["T"]).toBeDefined();
    unmount();
    expect(useParameterStore.getState().parameters["T"]).toBeUndefined();
  });

  test("section scope (default) prefixes name with the nearest section[id]", () => {
    render(
      <section id='blackbody'>
        <ParameterCursor name='T' min={1000} max={50000} default={5772} />
      </section>
    );
    expect(
      useParameterStore.getState().parameters["blackbody:T"]
    ).toBeDefined();
    expect(useParameterStore.getState().parameters["T"]).toBeUndefined();
  });

  test("section scope walks up to find article[id] when no section[id]", () => {
    render(
      <article id='ch4'>
        <div>
          <ParameterCursor name='T' min={1000} max={50000} default={5772} />
        </div>
      </article>
    );
    expect(useParameterStore.getState().parameters["ch4:T"]).toBeDefined();
  });

  test("section scope walks up to find figure[id] (PR-2: interactive figures)", () => {
    // The Tier-1+ interactive figure category (ADR 0058) wraps its outer
    // container in <figure> + <figcaption> rather than <section>, so the
    // figure can carry the `figure` ARIA role (NOT a landmark) and multiple
    // instances on the same page don't trip axe's landmark-unique rule.
    // ParameterCursor's scope resolution must honor the figure ancestry.
    render(
      <figure id='blackbody'>
        <figcaption>Blackbody Spectrum Explorer</figcaption>
        <div>
          <ParameterCursor name='T' min={1000} max={50000} default={5772} />
        </div>
      </figure>
    );
    expect(
      useParameterStore.getState().parameters["blackbody:T"]
    ).toBeDefined();
  });

  test("section scope falls back to unprefixed name when no scopable ancestor exists", () => {
    render(<ParameterCursor name='T' min={1000} max={50000} default={5772} />);
    expect(useParameterStore.getState().parameters["T"]).toBeDefined();
  });

  test("scope='page' produces no prefix even inside a section[id]", () => {
    render(
      <section id='blackbody'>
        <ParameterCursor
          name='T'
          min={1000}
          max={50000}
          default={5772}
          scope='page'
        />
      </section>
    );
    expect(useParameterStore.getState().parameters["T"]).toBeDefined();
    expect(
      useParameterStore.getState().parameters["blackbody:T"]
    ).toBeUndefined();
  });

  test("cursorGroup overrides section scope with explicit group prefix", () => {
    render(
      <section id='blackbody'>
        <ParameterCursor
          name='T'
          min={1000}
          max={50000}
          default={5772}
          cursorGroup='solar'
        />
      </section>
    );
    expect(
      useParameterStore.getState().parameters["group:solar:T"]
    ).toBeDefined();
    expect(
      useParameterStore.getState().parameters["blackbody:T"]
    ).toBeUndefined();
  });

  test("two cursors with the same name in different sections are independent", () => {
    render(
      <>
        <section id='blackbody'>
          <ParameterCursor name='T' min={1000} max={50000} default={5772} />
        </section>
        <section id='hr-diagram'>
          <ParameterCursor name='T' min={2500} max={50000} default={5772} />
        </section>
      </>
    );
    const params = useParameterStore.getState().parameters;
    expect(params["blackbody:T"]).toMatchObject({ min: 1000 });
    expect(params["hr-diagram:T"]).toMatchObject({ min: 2500 });
  });

  test("two cursors sharing cursorGroup share state", () => {
    render(
      <>
        <section id='blackbody'>
          <ParameterCursor
            name='T'
            min={1000}
            max={50000}
            default={5772}
            cursorGroup='solar'
          />
        </section>
        <section id='hr-diagram'>
          <ParameterCursor
            name='T'
            min={1000}
            max={50000}
            default={5772}
            cursorGroup='solar'
          />
        </section>
      </>
    );
    // Both register the same key; one wins (last) but values share.
    const params = useParameterStore.getState().parameters;
    expect(params["group:solar:T"]).toBeDefined();
    expect(Object.keys(params)).toHaveLength(1);
  });

  test("invalid props (min >= max) throw via schema validation", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      render(<ParameterCursor name='T' min={50000} max={1000} default={5772} />)
    ).toThrow(/min must be < max/i);
    consoleError.mockRestore();
  });

  test("invalid props (default out of range) throw via schema validation", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      render(<ParameterCursor name='T' min={1000} max={50000} default={100} />)
    ).toThrow(/default must be within/i);
    consoleError.mockRestore();
  });
});
