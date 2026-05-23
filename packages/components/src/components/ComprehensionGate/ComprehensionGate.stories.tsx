import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import { ComprehensionGate } from "./ComprehensionGate.tsx";

const meta = {
  title: "Components/ComprehensionGate",
  component: ComprehensionGate,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ComprehensionGate>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  unit: "comprehensiongate",
};

export const Default: Story = {
  args: {
    ...ns,
    id: "default",
    prompt: "How confident do you feel about this section on stellar parallax?",
  },
};

export const QuestionPrompt: Story = {
  args: {
    ...ns,
    id: "question-prompt",
    prompt: "Can you explain why parsecs are defined the way they are?",
  },
};

export const GotItSelected: Story = {
  args: {
    ...ns,
    id: "got-it-selected",
    prompt: "How confident do you feel about this section on stellar parallax?",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByLabelText("I got it"));
  },
};

export const RevisitSelected: Story = {
  args: {
    ...ns,
    id: "revisit-selected",
    prompt: "How confident do you feel about this section on stellar parallax?",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByLabelText("I need to revisit"));
  },
};

export const StuckSelected: Story = {
  args: {
    ...ns,
    id: "stuck-selected",
    prompt: "How confident do you feel about this section on stellar parallax?",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByLabelText("I'm stuck"));
  },
};
