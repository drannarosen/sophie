import type { Meta, StoryObj } from "@storybook/react-vite";
import { LearningObjectives } from "./LearningObjectives.tsx";

const meta = {
  title: "Components/LearningObjectives",
  component: LearningObjectives,
  parameters: { layout: "padded" },
} satisfies Meta<typeof LearningObjectives>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  unit: "learningobjectives",
};

export const ThreeObjectives: Story = {
  args: {
    ...ns,
    id: "three-objectives",
    objectives: [
      {
        id: "isq",
        verb: "Apply",
        body: "the inverse-square law to compute apparent brightness from intrinsic luminosity.",
      },
      {
        id: "wien",
        verb: "Use",
        body: "Wien's displacement law to estimate a star's temperature from its peak wavelength.",
      },
      {
        id: "sb",
        verb: "Derive",
        body: "the Stefan–Boltzmann relation L = 4πR²σTeff⁴ from blackbody radiation principles.",
      },
    ],
  },
};

export const SingleObjective: Story = {
  args: {
    ...ns,
    id: "single",
    objectives: [
      {
        id: "hr",
        verb: "Place",
        body: "a main-sequence star on the Hertzsprung–Russell diagram given its luminosity and effective temperature.",
      },
    ],
  },
};

export const FiveObjectivesCustomHeading: Story = {
  args: {
    ...ns,
    id: "five-objectives",
    heading: "Today's Objectives",
    objectives: [
      {
        id: "obs",
        verb: "Observe",
        body: "the night sky and identify three constellations visible at this latitude.",
      },
      {
        id: "model",
        verb: "Model",
        body: "the apparent motion of stars as Earth's rotation and orbit.",
      },
      {
        id: "predict",
        verb: "Predict",
        body: "where Polaris would appear from a 30° N latitude.",
      },
      {
        id: "compare",
        verb: "Compare",
        body: "the spectra of an O-type and an M-type main-sequence star.",
      },
      {
        id: "explain",
        verb: "Explain",
        body: "why redder stars are typically cooler — and the exception cases.",
      },
    ],
  },
};

// Long-bodied objectives — verifies that wrapping inside each
// objective row respects the typographic measure and the Bloom verb
// stays vertically aligned with the first line of body text. Edge
// case for chapters with conceptually-dense objectives.
export const LongObjectiveBodies: Story = {
  args: {
    ...ns,
    id: "long-bodies",
    objectives: [
      {
        id: "synthesize",
        verb: "Synthesize",
        body: "the four pieces of observational evidence for an expanding universe — Hubble recession, CMB blackbody spectrum, primordial light-element abundances, and large-scale structure formation — into a single coherent narrative that a non-physicist sibling could follow over dinner.",
      },
      {
        id: "critique",
        verb: "Critique",
        body: "a popular-press article claiming that the discovery of dark energy 'overturned everything we knew' about cosmology, identifying where the claim is consistent with the evidence and where it overstates the case.",
      },
    ],
  },
};

// Two objectives, default heading — fills the 1/2/3/5 count gap and
// exercises the default "By the end of this lesson…" heading copy
// (vs the SingleObjective story which also uses the default).
export const TwoObjectivesDefaultHeading: Story = {
  args: {
    ...ns,
    id: "two-default",
    objectives: [
      {
        id: "distinguish",
        verb: "Distinguish",
        body: "parallax-derived distance from standard-candle distance, naming the regime where each is most reliable.",
      },
      {
        id: "compute",
        verb: "Compute",
        body: "the distance to a Cepheid variable given its period and apparent magnitude.",
      },
    ],
  },
};
