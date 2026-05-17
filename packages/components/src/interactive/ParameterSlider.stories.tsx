import type { Meta, StoryObj } from "@storybook/react-vite";
import { ParameterCursor } from "./ParameterCursor.tsx";
import { ParameterSlider } from "./ParameterSlider.tsx";

/**
 * `<ParameterSlider>` is the Radix-backed control surface for an A11
 * parameter cursor (per ADR 0059). It always renders alongside a
 * `<ParameterCursor>` definition that registers the cursor with the
 * page-local store; stories below pair them.
 *
 * Per ADR 0058, the slider is chrome — it has no epistemic role.
 */
const meta = {
  title: "Interactive/ParameterSlider",
  component: ParameterSlider,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ParameterSlider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BlackbodyTemperature: Story = {
  name: "Blackbody temperature (1000–50,000 K, step 100)",
  args: { name: "T", label: "Temperature" },
  decorators: [
    (Story) => (
      <section id='blackbody-spectrum-story'>
        <ParameterCursor
          name='T'
          min={1000}
          max={50000}
          default={5800}
          unit='K'
          step={100}
        />
        <Story />
      </section>
    ),
  ],
};

export const CustomFormat: Story = {
  name: "Custom readout (kilokelvin)",
  args: {
    name: "T",
    label: "Temperature",
    format: (v: number) => `${(v / 1000).toFixed(1)} kK`,
  },
  decorators: [
    (Story) => (
      <section id='blackbody-spectrum-format'>
        <ParameterCursor
          name='T'
          min={1000}
          max={50000}
          default={5800}
          unit='K'
          step={100}
        />
        <Story />
      </section>
    ),
  ],
};

export const StellarMass: Story = {
  name: "Stellar mass (0.1–100 M_sun, log-stepped)",
  args: {
    name: "M",
    label: "Mass",
    ariaLabel: "Stellar mass in solar masses",
    format: (v: number) =>
      v >= 1 ? `${v.toFixed(1)} M_sun` : `${v.toFixed(2)} M_sun`,
  },
  decorators: [
    (Story) => (
      <section id='hr-diagram-story'>
        <ParameterCursor
          name='M'
          min={0.1}
          max={100}
          default={1}
          unit='M_sun'
          step='log'
        />
        <Story />
      </section>
    ),
  ],
};

export const UnregisteredCursor: Story = {
  name: "Unregistered cursor (renders nothing)",
  args: { name: "nonexistent", label: "Ghost" },
};
