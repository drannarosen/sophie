import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
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
  unit: "effortlog",
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

export const SkimmedSelected: Story = {
  args: {
    ...ns,
    id: "skimmed-selected",
    prompt: "How did you engage with this chapter?",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByLabelText("Skimmed"));
  },
};

export const ReadSelected: Story = {
  args: {
    ...ns,
    id: "read-selected",
    prompt: "How did you engage with this chapter?",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByLabelText("Read"));
  },
};

export const StudiedSelected: Story = {
  args: {
    ...ns,
    id: "studied-selected",
    prompt: "How did you engage with this chapter?",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByLabelText("Studied"));
  },
};
