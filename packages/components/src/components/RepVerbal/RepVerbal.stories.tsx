import type { Meta, StoryObj } from "@storybook/react-vite";
import { RepVerbal } from "./RepVerbal.tsx";

const meta = {
  title: "Components/MultiRep/RepVerbal",
  component: RepVerbal,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RepVerbal>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Author-mode usage: inline MDX children. Most common shape.
 */
export const AuthorMode: Story = {
  args: {
    children: (
      <>
        The orbital radius is the instantaneous distance between the orbiting
        body and the gravitational center it orbits.
      </>
    ),
  },
};

/**
 * Extractor-fed mode: `body` string prop. What the runtime
 * `<MultiRep>` parent passes after the build-time `transformMultiRep`
 * extractor (PR-γ) serializes MDX children into the parent's `reps`
 * array.
 */
export const ExtractorMode: Story = {
  args: {
    body: "The peak wavelength of thermal emission as a function of temperature.",
  },
};

/**
 * Intuition framing belongs in `<RepVerbal>` prose (the dropped
 * `<RepIntuition>` primitive from the 2026-05-14 hardening). Leading
 * "Imagine…" / "Think of this as…" sentences surface embodied
 * intuition without a separate component.
 */
export const WithIntuitionFraming: Story = {
  args: {
    children: (
      <>
        The orbital radius is the distance from the central mass to the orbiting
        body. Imagine an ant walking along the orbit — how far must it travel to
        reach the central mass?
      </>
    ),
  },
};

/**
 * Multi-paragraph body — when the chapter wants substantial verbal
 * scaffolding alongside an equation + figure binding.
 */
export const MultiParagraph: Story = {
  args: {
    children: (
      <>
        <p>
          The Hubble parameter <em>H</em> measures the local expansion rate of
          the universe at a given cosmic time. Its value today is <em>H₀</em> ≈
          70 km/s/Mpc — every megaparsec of distance adds about 70 km/s of
          recession.
        </p>
        <p>
          The parameter is local because cosmic expansion is uniform but
          time-dependent; chapters that distinguish <em>H</em> (general) from{" "}
          <em>H₀</em> (today's value) use this binding to anchor the distinction
          visually.
        </p>
      </>
    ),
  },
};

/**
 * Empty-body case — the schema accepts both `children` and `body` as
 * optional, so authoring stubs (e.g., AI-scaffolded blocks awaiting
 * prose) render an empty role-pilled card. Useful for in-progress
 * authoring visualization.
 */
export const EmptyAuthoringStub: Story = {
  args: {},
};
