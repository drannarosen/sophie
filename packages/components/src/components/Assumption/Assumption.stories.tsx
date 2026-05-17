import type { Meta, StoryObj } from "@storybook/react-vite";
import { Assumption } from "./Assumption.tsx";

const meta = {
  title: "Components/EquationBiography/Assumption",
  component: Assumption,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Assumption>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Typed: Story = {
  args: {
    type: "thermal-equilibrium",
    children: (
      <p>
        Source is in local thermodynamic equilibrium so the Planck distribution
        applies.
      </p>
    ),
  },
};

export const Untyped: Story = {
  args: {
    children: (
      <p>
        Source emits as an ideal blackbody — no spectral lines, no continuum
        absorption shaping the peak.
      </p>
    ),
  },
};
