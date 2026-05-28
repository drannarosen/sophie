import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { MCQ } from "./MCQ.tsx";

const meta = {
  title: "Components/MCQ",
  component: MCQ,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ProfileProvider profile='student'>
        <Story />
      </ProfileProvider>
    ),
  ],
} satisfies Meta<typeof MCQ>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = { course: "storybook", unit: "mcq" };

export const Default: Story = {
  args: {
    ...ns,
    id: "mcq-fusion",
    children: (
      <>
        <MCQ.Prompt>
          <p>Which process powers a main-sequence star?</p>
        </MCQ.Prompt>
        <MCQ.Choice>Gravitational contraction</MCQ.Choice>
        <MCQ.Choice correct>Hydrogen fusion</MCQ.Choice>
        <MCQ.Choice>Chemical burning</MCQ.Choice>
      </>
    ),
  },
};

const withSolutionId = "mcq-with-solution";
export const WithSolution: Story = {
  args: {
    ...ns,
    id: withSolutionId,
    children: (
      <>
        <MCQ.Prompt>
          <p>Which spectral class is hottest?</p>
        </MCQ.Prompt>
        <MCQ.Choice correct>O</MCQ.Choice>
        <MCQ.Choice>G</MCQ.Choice>
        <MCQ.Choice>M</MCQ.Choice>
        <Solution {...ns} parentId={withSolutionId}>
          <p>
            O stars are the hottest, with surface temperatures above 30,000 K.
          </p>
        </Solution>
      </>
    ),
  },
};
