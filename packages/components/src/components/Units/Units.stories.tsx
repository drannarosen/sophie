import type { Meta, StoryObj } from "@storybook/react-vite";
import { Units } from "./Units.tsx";

const meta = {
  title: "Components/EquationBiography/Units",
  component: Units,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Units>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SimpleTemperature: Story = {
  args: { symbol: "T", unit: "K" },
};

export const TexSymbol: Story = {
  args: { symbol: "\\lambda_{peak}", unit: "cm" },
};

export const CompoundUnit: Story = {
  args: { symbol: "F", unit: "erg s^-1 cm^-2" },
};

export const SolarMass: Story = {
  args: { symbol: "M", unit: "M_\\odot" },
};

/**
 * Three Units children stacked horizontally — what authors see when
 * declaring a multi-symbol equation's units strip below the equation body.
 * The first Units (args) renders inside `render`; the rest are siblings.
 */
export const Stacked: Story = {
  args: { symbol: "T", unit: "K" },
  render: (args) => (
    <p>
      <Units {...args} />
      <Units symbol='\\lambda_{peak}' unit='cm' />
      <Units symbol='b' unit='cm K' />
    </p>
  ),
};
