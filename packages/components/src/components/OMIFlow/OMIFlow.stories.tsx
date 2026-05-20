import type { Meta, StoryObj } from "@storybook/react-vite";
import { OMIFlow } from "./OMIFlow.tsx";

const meta = {
  title: "Components/OMIFlow",
  component: OMIFlow,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof OMIFlow>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Minimal canonical shape — three slots with the role labels rendered
 * automatically. No author titles, no concept binding. The shortest
 * legal `<OMIFlow>`.
 */
export const Minimal: Story = {
  args: {
    id: "minimal-flow",
    children: (
      <>
        <OMIFlow.Observable>
          <p>
            Plotting luminosity vs surface temperature reveals tight bands — the
            main sequence, giants, white dwarfs.
          </p>
        </OMIFlow.Observable>
        <OMIFlow.Model>
          <p>
            A star's structure follows from pressure balancing gravity, energy
            transport via radiation or convection, and a known equation of
            state.
          </p>
        </OMIFlow.Model>
        <OMIFlow.Inference>
          <p>
            The model predicts that more massive stars sit hotter on the main
            sequence and burn through their fuel faster.
          </p>
        </OMIFlow.Inference>
      </>
    ),
  },
};

/**
 * With `concept=` bound to a Notation Registry slug — the forward-
 * compatible MultiRep ↔ OMIFlow cross-link surface (ADR 0063
 * §Decision 6 + ADR 0043). v1 has no audit invariant on this prop;
 * it travels through to the pedagogy index for future consumers.
 */
export const WithConcept: Story = {
  args: {
    id: "stellar-temperature-flow",
    concept: "stellar-temperature",
    children: (
      <>
        <OMIFlow.Observable title='HR diagram'>
          <p>Luminosity vs effective temperature.</p>
        </OMIFlow.Observable>
        <OMIFlow.Model title='Hydrostatic equilibrium + radiative transport'>
          <p>Pressure balances gravity; energy flows out by radiation.</p>
        </OMIFlow.Model>
        <OMIFlow.Inference title='Mass-lifetime relation'>
          <p>More massive stars burn hotter and die younger.</p>
        </OMIFlow.Inference>
      </>
    ),
  },
};

/**
 * Each slot carries richer nested content — multi-paragraph prose, math
 * inline. Demonstrates the body pane handling real chapter-density
 * content rather than one-liners.
 */
export const WithRichContent: Story = {
  args: {
    id: "rich-flow",
    concept: "stellar-spectra",
    children: (
      <>
        <OMIFlow.Observable title='Absorption lines in stellar spectra'>
          <p>
            Splitting starlight through a prism reveals dark lines at specific
            wavelengths. The pattern is universal: hot stars show Balmer
            hydrogen lines strongly, cool stars show molecular bands.
          </p>
          <p>
            The line pattern is the empirical signature — observable without any
            theoretical commitment about what's producing it.
          </p>
        </OMIFlow.Observable>
        <OMIFlow.Model title='Boltzmann excitation + Saha ionization'>
          <p>
            A stellar atmosphere's level populations follow Boltzmann
            statistics; ionization fractions follow Saha. Together they predict
            which transitions are accessible at a given temperature.
          </p>
        </OMIFlow.Model>
        <OMIFlow.Inference title='Spectrum → temperature → composition'>
          <p>
            Inverting the model: measured line strengths constrain the
            temperature; secondary line ratios then constrain composition. One
            observation, two physical parameters.
          </p>
        </OMIFlow.Inference>
      </>
    ),
  },
};

/**
 * Slots authored in non-canonical source order (M → O → I). The
 * renderer reorders to O → M → I. OF-1 audit warns in build but the
 * rendered output remains canonical.
 */
export const OutOfSourceOrder: Story = {
  args: {
    id: "ooo-flow",
    children: (
      <>
        <OMIFlow.Model>
          <p>Model (authored second, rendered second).</p>
        </OMIFlow.Model>
        <OMIFlow.Observable>
          <p>Observable (authored second, rendered first).</p>
        </OMIFlow.Observable>
        <OMIFlow.Inference>
          <p>Inference (authored third, rendered third).</p>
        </OMIFlow.Inference>
      </>
    ),
  },
};

/**
 * Long slot titles to validate header wrap behavior. Triggers the
 * `flex-wrap` on the title bar so role label + separator + user title
 * wrap to a new line rather than truncating.
 */
export const LongTitles: Story = {
  args: {
    id: "long-titles-flow",
    children: (
      <>
        <OMIFlow.Observable title='A particularly long observable title that should wrap onto a second line on narrow viewports'>
          <p>Body.</p>
        </OMIFlow.Observable>
        <OMIFlow.Model title='An equally long mechanistic-model title designed to test wrap behavior across the three slot columns'>
          <p>Body.</p>
        </OMIFlow.Model>
        <OMIFlow.Inference title='A correspondingly verbose inferential conclusion title that mirrors the lengths of its siblings'>
          <p>Body.</p>
        </OMIFlow.Inference>
      </>
    ),
  },
};
