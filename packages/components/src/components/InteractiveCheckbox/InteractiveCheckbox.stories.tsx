import type { Meta, StoryObj } from "@storybook/react-vite";
import { InteractiveCheckbox } from "./InteractiveCheckbox.tsx";

const meta = {
  title: "Components/InteractiveCheckbox",
  component: InteractiveCheckbox,
  parameters: { layout: "padded" },
} satisfies Meta<typeof InteractiveCheckbox>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  chapter: "interactivecheckbox",
};

export const Default: Story = {
  args: {
    ...ns,
    id: "default",
    children: "I have read and understood the inverse-square law.",
  },
};

export const InitiallyChecked: Story = {
  args: {
    ...ns,
    id: "initially-checked",
    initial: true,
    children: "I can derive the Stefan–Boltzmann law from blackbody radiation.",
  },
};

export const LongLabel: Story = {
  args: {
    ...ns,
    id: "long-label",
    children:
      "I understand why a star's effective temperature, luminosity, and radius are linked by L = 4πR²σTeff⁴ — and that this constraint defines the Hertzsprung–Russell diagram's structure.",
  },
};
