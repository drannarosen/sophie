import type { Meta, StoryObj } from "@storybook/react-vite";
import { Predict } from "./Predict.tsx";

const meta = {
  title: "Components/Predict",
  component: Predict,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Predict>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  chapter: "predict",
};

export const TwoPrompts: Story = {
  args: {
    ...ns,
    id: "two-prompts",
    description:
      "Before we work the math, write down what you expect — your prediction is the anchor for understanding the actual result.",
    prompts: [
      {
        id: "doubled-distance",
        label:
          "If the distance to a star doubles, what happens to its apparent brightness?",
      },
      {
        id: "tripled-distance",
        label: "What if the distance triples?",
      },
    ],
    closing:
      "Note: if your prediction differs from the result we derive, that's where the learning lives.",
  },
};

export const SinglePromptWithReveal: Story = {
  args: {
    ...ns,
    id: "single-prompt-reveal",
    description:
      "Predict before revealing — the gate forces commitment to a specific answer.",
    prompts: [
      {
        id: "blue-vs-red",
        label:
          "Which star is hotter at the surface: a blue main-sequence star or a red giant?",
      },
    ],
    children: (
      <div>
        <p>
          A blue main-sequence O-type star has Teff ≈ 30,000 K. A red giant
          M-type has Teff ≈ 3,500 K. The blue main-sequence star is far hotter
          at the surface — but the red giant emits more total luminosity because
          of its enormous radius (Stefan–Boltzmann).
        </p>
      </div>
    ),
  },
};

export const ThreePrompts: Story = {
  args: {
    ...ns,
    id: "three-prompts",
    heading: "Predict the Spectrum",
    prompts: [
      {
        id: "peak-wavelength",
        label:
          "Where would the spectrum of a 6,000 K star peak — UV, visible, or IR?",
      },
      {
        id: "intensity",
        label:
          "How does the total radiated power per unit area scale if Teff doubles?",
      },
      {
        id: "color",
        label: "What color would observers describe the star as?",
      },
    ],
  },
};
