import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConfidenceCheck } from "./ConfidenceCheck.tsx";

const meta = {
  title: "Components/ConfidenceCheck",
  component: ConfidenceCheck,
  parameters: { layout: "padded" },
  argTypes: {
    scale: { control: { type: "radio" }, options: [5, 7] },
  },
} satisfies Meta<typeof ConfidenceCheck>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  chapter: "confidencecheck",
};

export const FivePoint: Story = {
  args: {
    ...ns,
    id: "five-point",
    prompt:
      "How confident are you that you can apply the Stefan–Boltzmann law to a new star?",
    scale: 5,
  },
};

export const SevenPoint: Story = {
  args: {
    ...ns,
    id: "seven-point",
    prompt:
      "How confident are you that you can derive Wien's law from Planck's blackbody curve?",
    scale: 7,
  },
};

export const ShortPrompt: Story = {
  args: {
    ...ns,
    id: "short-prompt",
    prompt: "Confidence in this week's material?",
  },
};
