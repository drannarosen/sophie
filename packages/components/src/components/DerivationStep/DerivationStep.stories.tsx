import type { Meta, StoryObj } from "@storybook/react-vite";
import { DerivationStep } from "./DerivationStep.tsx";

/**
 * <DerivationStep> is a biography child of an equation registry MDX
 * body per ADR 0046 §R9 (added by the ADR 0060 registry-ecosystem
 * brainstorm, 2026-05-18). Renders inside the derivation accordion
 * with a "Step" label, optional author-supplied step title, and the
 * body prose.
 *
 * Dark + light VR baselines come from the data-theme decorator
 * configured in `.storybook/preview.tsx`.
 */
const meta = {
  title: "Components/EquationBiography/DerivationStep",
  component: DerivationStep,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DerivationStep>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithoutLabel: Story = {
  args: {
    children: (
      <p>
        Set <code>∂B/∂λ = 0</code> and solve the transcendental equation
        numerically — the root is approximately{" "}
        <code>hc / λ_peak k_B T ≈ 4.965</code>.
      </p>
    ),
  },
};

export const StartFromPlancksLaw: Story = {
  args: {
    label: "Start from Planck's law",
    children: (
      <p>
        Spectral radiance of a blackbody at temperature <code>T</code>:{" "}
        <code>B_λ(T) = 2hc²/λ⁵ · 1/(e^(hc/λkBT) − 1)</code>.
      </p>
    ),
  },
};

export const DifferentiateAndSetToZero: Story = {
  args: {
    label: "Differentiate and set to zero",
    children: (
      <p>
        Set <code>∂B_λ/∂λ = 0</code> to find the wavelength at which the thermal
        continuum peaks.
      </p>
    ),
  },
};
