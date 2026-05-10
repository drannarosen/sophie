import type { Meta, StoryObj } from "@storybook/react-vite";
import { KeyEquation } from "./KeyEquation.tsx";

const meta = {
  title: "Components/KeyEquation",
  component: KeyEquation,
  parameters: { layout: "padded" },
} satisfies Meta<typeof KeyEquation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShortForm: Story = {
  args: {
    id: "wiens-law",
    title: "Wien's Law",
    children: (
      <>
        <p>
          The relationship between temperature and peak emission wavelength is
          quantified by <strong>Wien's displacement law</strong>:
        </p>
        <p>
          <em>λ_peak = b T⁻¹</em>
        </p>
        <p>
          where <strong>b</strong> = 0.29 cm·K is Wien's displacement constant.
        </p>
      </>
    ),
  },
};

export const LongForm: Story = {
  args: {
    id: "inverse-square-law",
    title: "The Inverse-Square Law",
    children: (
      <>
        <p>
          We'll develop this properly in a later lecture, but here's the key
          idea.
        </p>
        <p>
          Imagine a star emitting light uniformly in all directions. That light
          spreads out over the surface of an expanding sphere. At distance{" "}
          <em>d</em>, the sphere has surface area 4π<em>d</em>². The same total
          light is now spread over this larger area, so the{" "}
          <strong>flux</strong> (light per unit area) decreases:
        </p>
        <p>
          <em>F = L / (4πd²)</em>
        </p>
        <p>where:</p>
        <ul>
          <li>
            <strong>F</strong> = flux (erg s⁻¹ cm⁻²)
          </li>
          <li>
            <strong>L</strong> = luminosity (erg s⁻¹)
          </li>
          <li>
            <strong>d</strong> = distance (cm)
          </li>
        </ul>
        <p>
          <strong>The key insight:</strong> Flux falls off as 1/<em>d</em>².
          Double the distance → quarter the brightness.
        </p>
      </>
    ),
  },
};

export const EquationFirst: Story = {
  args: {
    id: "kepler-third",
    title: "Kepler's Third Law",
    children: (
      <>
        <p>
          <em>T² = a³</em>
        </p>
        <p>
          Period squared (in years) equals semi-major axis cubed (in AU) for any
          solar-system orbit. The constant is hidden in the units.
        </p>
      </>
    ),
  },
};

export const WithBlockMath: Story = {
  args: {
    id: "stefan-boltzmann",
    title: "Stefan–Boltzmann Law",
    children: (
      <>
        <p>
          The total luminosity of a blackbody radiator is set by surface area
          and temperature:
        </p>
        {/* Hand-crafted .katex-display markup — Storybook doesn't process
         *   MDX, so we mock the rehype-katex output to exercise the CSS
         *   rule that styles the equation block. */}
        <span className='katex-display' data-testid='math'>
          <em>L = 4πR²σT</em>
          <sup>4</sup>
        </span>
        <p>
          where <strong>σ</strong> is the Stefan–Boltzmann constant.
        </p>
      </>
    ),
  },
};
