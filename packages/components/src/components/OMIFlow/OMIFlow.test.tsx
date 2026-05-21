import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { OMIFlow } from "./OMIFlow.tsx";

/**
 * Tests for the `<OMIFlow>` compound primitive (ADR 0063). The
 * extractor (`extractOMIFlows`, PR-A) handles strict-3-slot
 * validation at build time; the renderer trusts well-formed children
 * and focuses on:
 *
 *   - Outer landmark + group semantics (role="group" + labelled-by).
 *   - Three slot sections with their own labels.
 *   - Role-binds-by-component-identity (slot prop "role" does NOT exist).
 *   - Canonical render order regardless of source order (decision #4).
 *   - axe-clean across configurations.
 */

function MinimalFlow() {
  return (
    <OMIFlow id='hr-diagram-flow'>
      <OMIFlow.Observable>
        <p>Plotting luminosity vs surface temperature reveals tight bands.</p>
      </OMIFlow.Observable>
      <OMIFlow.Model>
        <p>A star's structure follows from pressure balancing gravity.</p>
      </OMIFlow.Model>
      <OMIFlow.Inference>
        <p>Mass → temperature → lifetime falls out of the model.</p>
      </OMIFlow.Inference>
    </OMIFlow>
  );
}

describe("<OMIFlow> — root", () => {
  it("renders a group landmark with three labelled sections", () => {
    render(<MinimalFlow />);
    const group = screen.getByRole("group");
    expect(group).toBeInTheDocument();
    const sections = within(group).getAllByRole("region");
    expect(sections).toHaveLength(3);
  });

  it("uses the supplied id as the root element's id", () => {
    render(<MinimalFlow />);
    expect(document.getElementById("hr-diagram-flow")).not.toBeNull();
  });

  it("falls back to a generated id when none is supplied", () => {
    const { container } = render(
      <OMIFlow>
        <OMIFlow.Observable>obs</OMIFlow.Observable>
        <OMIFlow.Model>mod</OMIFlow.Model>
        <OMIFlow.Inference>inf</OMIFlow.Inference>
      </OMIFlow>
    );
    const group = container.querySelector('[role="group"]');
    expect(group).not.toBeNull();
    expect(group?.getAttribute("aria-labelledby")).not.toBeNull();
  });

  it("attaches data-omiflow-concept when concept is supplied", () => {
    render(
      <OMIFlow id='x' concept='stellar-temperature'>
        <OMIFlow.Observable>o</OMIFlow.Observable>
        <OMIFlow.Model>m</OMIFlow.Model>
        <OMIFlow.Inference>i</OMIFlow.Inference>
      </OMIFlow>
    );
    expect(
      document.getElementById("x")?.getAttribute("data-omiflow-concept")
    ).toBe("stellar-temperature");
  });
});

describe("<OMIFlow> — slot canonical order", () => {
  it("renders slots in O → M → I order even when source order is M → O → I", () => {
    render(
      <OMIFlow id='ooo'>
        <OMIFlow.Model>
          <p>model body</p>
        </OMIFlow.Model>
        <OMIFlow.Observable>
          <p>observable body</p>
        </OMIFlow.Observable>
        <OMIFlow.Inference>
          <p>inference body</p>
        </OMIFlow.Inference>
      </OMIFlow>
    );
    const sections = screen.getAllByRole("region");
    expect(sections).toHaveLength(3);
    // First section is observable, second model, third inference.
    expect(sections[0]?.textContent).toMatch(/observable body/i);
    expect(sections[1]?.textContent).toMatch(/model body/i);
    expect(sections[2]?.textContent).toMatch(/inference body/i);
  });

  it("preserves canonical order when authored in canonical order", () => {
    render(<MinimalFlow />);
    const sections = screen.getAllByRole("region");
    expect(sections[0]?.textContent).toMatch(/luminosity vs surface/i);
    expect(sections[1]?.textContent).toMatch(/structure follows from/i);
    expect(sections[2]?.textContent).toMatch(/Mass → temperature/i);
  });

  it("tags each rendered section with its role via data-omi-role", () => {
    render(<MinimalFlow />);
    const sections = screen.getAllByRole("region");
    expect(sections[0]?.getAttribute("data-omi-role")).toBe("observable");
    expect(sections[1]?.getAttribute("data-omi-role")).toBe("model");
    expect(sections[2]?.getAttribute("data-omi-role")).toBe("inference");
  });
});

describe("<OMIFlow> — slot titles", () => {
  it("shows the role label as the default slot title", () => {
    render(<MinimalFlow />);
    const sections = screen.getAllByRole("region");
    expect(
      within(sections[0] as HTMLElement).getByText(/Observable/i)
    ).toBeInTheDocument();
    expect(
      within(sections[1] as HTMLElement).getByText(/Model/i)
    ).toBeInTheDocument();
    expect(
      within(sections[2] as HTMLElement).getByText(/Inference/i)
    ).toBeInTheDocument();
  });

  it("composes the role label with the author-supplied title", () => {
    render(
      <OMIFlow id='t'>
        <OMIFlow.Observable title='H-α emission line'>
          <p>x</p>
        </OMIFlow.Observable>
        <OMIFlow.Model title='Hydrogen Balmer series'>
          <p>x</p>
        </OMIFlow.Model>
        <OMIFlow.Inference title='Hot stars show Balmer'>
          <p>x</p>
        </OMIFlow.Inference>
      </OMIFlow>
    );
    const sections = screen.getAllByRole("region");
    expect(sections[0]?.textContent).toMatch(/Observable.*H-α emission line/);
    expect(sections[1]?.textContent).toMatch(/Model.*Hydrogen Balmer series/);
    expect(sections[2]?.textContent).toMatch(
      /Inference.*Hot stars show Balmer/
    );
  });

  it("each section is aria-labelledby its own title span", () => {
    render(<MinimalFlow />);
    const sections = screen.getAllByRole("region");
    for (const section of sections) {
      const labelId = section.getAttribute("aria-labelledby");
      expect(labelId).not.toBeNull();
      const labelEl = labelId ? document.getElementById(labelId) : null;
      expect(labelEl).not.toBeNull();
    }
  });
});

describe("<OMIFlow> — Fragment-wrapped children (Storybook args shape)", () => {
  it("descends transparently into a single Fragment wrapping the 3 slots", () => {
    // Storybook stories pass `children: <>X Y Z</>` via `args` — the
    // Fragment is a single React child until we walk into it. Without
    // explicit Fragment handling, React.Children.forEach yields the
    // Fragment as one opaque element and no slots are matched.
    render(
      <OMIFlow id='frag-flow'>
        {/* biome-ignore lint/complexity/noUselessFragments: the Fragment
            is load-bearing — this test exercises OMIFlow's
            Children.forEach descent into Fragment wrappers (the
            Storybook `args.children` shape). Removing it defeats the
            test. */}
        <>
          <OMIFlow.Observable title='HR diagram'>
            <p>obs body</p>
          </OMIFlow.Observable>
          <OMIFlow.Model title='Hydrostatic'>
            <p>mod body</p>
          </OMIFlow.Model>
          <OMIFlow.Inference title='Mass-lifetime'>
            <p>inf body</p>
          </OMIFlow.Inference>
        </>
      </OMIFlow>
    );
    const sections = screen.getAllByRole("region");
    expect(sections).toHaveLength(3);
    expect(sections[0]?.textContent).toMatch(/HR diagram/);
    expect(sections[1]?.textContent).toMatch(/Hydrostatic/);
    expect(sections[2]?.textContent).toMatch(/Mass-lifetime/);
  });

  it("descends into nested Fragments", () => {
    render(
      <OMIFlow id='nested-frag-flow'>
        {/* biome-ignore lint/complexity/noUselessFragments: outer
            Fragment is load-bearing — tests Children.forEach descent
            into Fragment-wrapped slots (Storybook args shape). */}
        <>
          <OMIFlow.Observable>obs</OMIFlow.Observable>
          {/* biome-ignore lint/complexity/noUselessFragments: inner
              Fragment is load-bearing — tests Children.forEach descent
              into NESTED Fragment wrappers. */}
          <>
            <OMIFlow.Model>mod</OMIFlow.Model>
            <OMIFlow.Inference>inf</OMIFlow.Inference>
          </>
        </>
      </OMIFlow>
    );
    const sections = screen.getAllByRole("region");
    expect(sections).toHaveLength(3);
  });
});

describe("<OMIFlow> — a11y (axe)", () => {
  it("renders zero violations in the minimal shape", async () => {
    const { container } = render(<MinimalFlow />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("renders zero violations with rich nested content", async () => {
    const { container } = render(
      <OMIFlow id='rich' concept='stellar-temperature'>
        <OMIFlow.Observable title='HR diagram'>
          <p>Luminosity vs effective temperature.</p>
          <p>Main sequence, giants, white dwarfs cluster into bands.</p>
        </OMIFlow.Observable>
        <OMIFlow.Model title='Hydrostatic equilibrium + radiation'>
          <p>Pressure balances gravity; energy flows out by radiation.</p>
        </OMIFlow.Model>
        <OMIFlow.Inference title='Mass-lifetime relation'>
          <p>More massive stars burn hotter and die younger.</p>
        </OMIFlow.Inference>
      </OMIFlow>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("renders zero violations with non-canonical source order", async () => {
    const { container } = render(
      <OMIFlow id='ooo-axe'>
        <OMIFlow.Inference>
          <p>inference</p>
        </OMIFlow.Inference>
        <OMIFlow.Model>
          <p>model</p>
        </OMIFlow.Model>
        <OMIFlow.Observable>
          <p>observable</p>
        </OMIFlow.Observable>
      </OMIFlow>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
