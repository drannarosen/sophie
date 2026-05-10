import type { Meta, StoryObj } from "@storybook/react-vite";
import { EffortLog } from "./EffortLog.tsx";

const meta = {
  title: "Components/EffortLog",
  component: EffortLog,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EffortLog>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  chapter: "effortlog",
};

export const Default: Story = {
  args: {
    ...ns,
    id: "default",
    prompt: "How did you engage with this chapter?",
  },
};

export const WeeklyPrompt: Story = {
  args: {
    ...ns,
    id: "weekly",
    prompt:
      "Reflect honestly: how did you study for this week's stellar evolution material?",
  },
};
