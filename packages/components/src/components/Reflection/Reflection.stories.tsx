import type { Meta, StoryObj } from "@storybook/react-vite";
import { Reflection } from "./Reflection.tsx";

const meta = {
  title: "Components/Reflection",
  component: Reflection,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Reflection>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  chapter: "reflection",
};

export const Default: Story = {
  args: {
    ...ns,
    id: "default",
    prompt:
      "What's one idea from this chapter that connected to something you already knew?",
    placeholder: "Write a sentence or two…",
  },
};

export const NoPlaceholder: Story = {
  args: {
    ...ns,
    id: "no-placeholder",
    prompt: "What surprised you in this section?",
  },
};

export const LongFormPrompt: Story = {
  args: {
    ...ns,
    id: "long-form",
    prompt:
      "Choose one of the three Deep Dives in this chapter and explain why it changed how you think about stellar evolution. Be specific — name the concept and the prior understanding it replaced.",
    placeholder:
      "Take a few minutes — this is the one writing exercise that's not graded.",
  },
};
