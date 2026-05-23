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
  unit: "reflection",
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

// Minimal prompt — verifies the Tier-1 card-strong chrome (icon +
// title bar + body) reads correctly even when the prompt is a single
// word. Edge case for the rendered baseline.
export const MinimalPrompt: Story = {
  args: {
    ...ns,
    id: "minimal",
    prompt: "Reflect.",
  },
};

// Multi-sentence placeholder — verifies the textarea placeholder
// wraps gracefully when the hint guides an extended response.
// Complements LongFormPrompt by lengthening the placeholder rather
// than the prompt itself.
export const ExtendedResponseHint: Story = {
  args: {
    ...ns,
    id: "extended-hint",
    prompt: "What was the most surprising idea in this section?",
    placeholder:
      "Aim for 3–5 sentences. Name the idea, explain why it surprised you, and connect it to one thing you already knew. There's no wrong answer — just a thoughtful one.",
  },
};
