import type { Meta, StoryObj } from "@storybook/react-vite";
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
  chapter: "comprehensiongate",
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
