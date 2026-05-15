import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { ObjectivePropsSchema } from "./Objective.schema.ts";
import { Objective } from "./Objective.tsx";

describe("<Objective>", () => {
  it("renders an <li> with id 'lo-<id>', the verb, and the body", () => {
    render(
      <ul>
        <Objective
          id='thesis'
          verb='State'
          body='the course thesis in one sentence'
        />
      </ul>
    );
    const item = document.getElementById("lo-thesis");
    expect(item).not.toBeNull();
    expect(item?.tagName).toBe("LI");
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(
      screen.getByText("the course thesis in one sentence")
    ).toBeInTheDocument();
  });

  it("renders body as HTML via dangerouslySetInnerHTML", () => {
    render(
      <ul>
        <Objective
          id='html-body'
          verb='Recognize'
          body='inline <em>emphasis</em> survives'
        />
      </ul>
    );
    const em = document.querySelector("#lo-html-body em");
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe("emphasis");
  });

  it("renders a checkbox bound to checked/onToggle when both props are provided", () => {
    const onToggle = vi.fn();
    render(
      <ul>
        <Objective
          id='check-1'
          verb='Recognize'
          body='something to recognize'
          checked={false}
          onToggle={onToggle}
        />
      </ul>
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    checkbox.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders a checked checkbox when checked={true} is provided", () => {
    render(
      <ul>
        <Objective
          id='check-2'
          verb='Recognize'
          body='something already learned'
          checked={true}
          onToggle={() => undefined}
        />
      </ul>
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("renders no checkbox in pure-display mode (no checked/onToggle)", () => {
    render(
      <ul>
        <Objective id='display' verb='Apply' body='a pure-display objective' />
      </ul>
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("schema rejects empty id, empty verb, and empty body", () => {
    expect(
      ObjectivePropsSchema.safeParse({
        id: "",
        verb: "Recognize",
        body: "body",
      }).success
    ).toBe(false);
    expect(
      ObjectivePropsSchema.safeParse({
        id: "lo-1",
        verb: "",
        body: "body",
      }).success
    ).toBe(false);
    expect(
      ObjectivePropsSchema.safeParse({
        id: "lo-1",
        verb: "Recognize",
        body: "",
      }).success
    ).toBe(false);
    expect(
      ObjectivePropsSchema.safeParse({
        id: "lo-1",
        verb: "Recognize",
        body: "body",
      }).success
    ).toBe(true);
  });

  it("has zero axe violations in pure-display mode", async () => {
    const { container } = render(
      <ul>
        <Objective
          id='axe-display'
          verb='Recognize'
          body='a pure-display objective'
        />
      </ul>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("has zero axe violations in checkbox mode", async () => {
    const { container } = render(
      <ul>
        <Objective
          id='axe-checkbox'
          verb='Recognize'
          body='an interactive objective'
          checked={false}
          onToggle={() => undefined}
        />
      </ul>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
