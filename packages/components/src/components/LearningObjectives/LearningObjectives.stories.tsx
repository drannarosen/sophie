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
  chapter: "learningobjectives",
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
