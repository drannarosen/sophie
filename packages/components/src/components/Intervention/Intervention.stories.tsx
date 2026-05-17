import type { Meta, StoryObj } from "@storybook/react-vite";
import { Intervention } from "./Intervention.tsx";

/**
 * Stories cover the four authored shapes per ADR 0044 + 2026-05-17
 * design §D4–§D5 — nested-in-misconception (the default and most
 * common form), nested with explicit limits (Clement 1993 bridging-
 * analogy pattern), standalone with leading addresses header, and
 * custom (course-specific name without canonical citation).
 *
 * Dark + light VR baselines come from the data-theme decorator
 * configured in `.storybook/preview.tsx` (PR-77 pattern).
 */

const meta = {
  title: "Components/Intervention",
  component: Intervention,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Intervention>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NestedContrastingCases: Story = {
  args: {
    type: "contrasting-cases",
    addresses: "this",
    children: (
      <p>
        Predict what you'd observe if the universe had a center, then compare to
        the actual observation: isotropic Hubble flow from every vantage point.
      </p>
    ),
  },
};

export const NestedBridgingAnalogyWithLimits: Story = {
  args: {
    type: "bridging-analogy",
    addresses: "this",
    limits: "Bread has an outside; the universe doesn't.",
    children: (
      <p>
        Bread baking with raisins: from any raisin's perspective, every other
        raisin recedes — no raisin is "the center."
      </p>
    ),
  },
};

export const StandaloneRefutationText: Story = {
  args: {
    type: "refutation-text",
    addresses: "universe-with-a-center",
    children: (
      <p>
        Despite the everyday intuition that any expansion needs a center point,
        the universe's expansion is fundamentally different from a firework:
        every observer in every galaxy sees the same isotropic flow.
      </p>
    ),
  },
};

export const StandaloneMultiTarget: Story = {
  args: {
    type: "refutation-text",
    addresses: ["universe-with-a-center", "redshift-as-ordinary-doppler"],
    children: (
      <p>
        These two misconceptions share a common root: assuming the universe's
        expansion behaves like familiar local motion. The same refutation
        applies to both.
      </p>
    ),
  },
};

export const CustomScaleComparison: Story = {
  args: {
    type: "custom",
    name: "scale-comparison",
    addresses: "stars-are-points",
    children: (
      <p>
        Compare the scale of a typical galaxy (~10²¹ m) to the average
        inter-galaxy distance (~10²³ m). The gap between stars is proportionally
        similar to the gap between galaxies — stars are not points; they're
        spheres separated by enormous voids.
      </p>
    ),
  },
};

export const SelfExplanation: Story = {
  args: {
    type: "self-explanation-against-misconception",
    addresses: "this",
    depth: "substantial",
    children: (
      <p>
        In your own words: why is it tempting to say brighter sources are always
        closer? And why does that intuition fail for stars of different
        intrinsic luminosities?
      </p>
    ),
  },
};
