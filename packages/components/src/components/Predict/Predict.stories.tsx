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

// Multi-prompt + reveal — the combinatorial coverage gap between
// SinglePromptWithReveal (1 prompt + reveal) and ThreePrompts (3
// prompts, no reveal). Validates the gated-discussion contract under
// the "all prompts must be filled before Reveal enables" rule across
// multiple prompts.
export const MultiPromptWithReveal: Story = {
  args: {
    ...ns,
    id: "multi-reveal",
    heading: "Predict the Outcome",
    description:
      "Before we work through the derivation, commit to a specific prediction for each. The Reveal button enables once all are filled.",
    prompts: [
      {
        id: "doubled-temperature",
        label:
          "If a star's effective temperature doubles, how does its total luminosity change?",
      },
      {
        id: "doubled-radius",
        label:
          "If only the star's radius doubles (Teff held constant), how does luminosity change?",
      },
    ],
    children: (
      <div>
        <p>
          From the Stefan–Boltzmann relation L = 4πR²σTeff⁴: doubling Teff
          multiplies L by 2⁴ = 16; doubling R multiplies L by 2² = 4. The
          temperature dependence dominates — a small change in Teff produces a
          large luminosity swing, which is why hot massive stars vastly
          out-luminate cooler ones of comparable size.
        </p>
      </div>
    ),
  },
};

// Long prompts — edge case for textarea wrapping and prompt-label
// vertical flow. Complements the existing short-prompt stories by
// stressing the typographic measure inside each prompt row.
export const LongPrompts: Story = {
  args: {
    ...ns,
    id: "long-prompts",
    description:
      "These prompts are deliberately long-form — write a sentence or two for each, not a single number.",
    prompts: [
      {
        id: "thermodynamic-limit",
        label:
          "Imagine a star at the edge of where the Stefan–Boltzmann law still applies — what physical condition do you think would cause the relation L = 4πR²σTeff⁴ to break down, and what would have to be true about the star for that to happen?",
      },
      {
        id: "observational-limit",
        label:
          "Now consider the same question from an observer's perspective: under what observational conditions would you doubt a luminosity inferred from the Stefan–Boltzmann relation, even if you had perfect measurements of R and Teff?",
      },
    ],
  },
};
