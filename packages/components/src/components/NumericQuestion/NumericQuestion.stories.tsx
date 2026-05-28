import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { NumericQuestion } from "./NumericQuestion.tsx";

const meta = {
  title: "Components/NumericQuestion",
  component: NumericQuestion,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ProfileProvider profile='student'>
        <Story />
      </ProfileProvider>
    ),
  ],
} satisfies Meta<typeof NumericQuestion>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = { course: "storybook", unit: "numeric-question" };

export const Default: Story = {
  args: {
    ...ns,
    id: "nq-period",
    children: (
      <>
        <NumericQuestion.Prompt>
          <p>
            Compute the orbital period T (years) of a planet at a = 4 AU around
            a 1 M<sub>☉</sub> star.
          </p>
        </NumericQuestion.Prompt>
        <NumericQuestion.Answer
          value={8}
          tolerance={0.1}
          toleranceKind='relative'
          unit='yr'
        />
      </>
    ),
  },
};

const withSolutionId = "nq-with-solution";
export const WithSolution: Story = {
  args: {
    ...ns,
    id: withSolutionId,
    children: (
      <>
        <NumericQuestion.Prompt>
          <p>How many AU is 1 parsec? (round to the nearest 1000)</p>
        </NumericQuestion.Prompt>
        <NumericQuestion.Answer
          value={206265}
          tolerance={1000}
          toleranceKind='absolute'
          unit='AU'
        />
        <Solution {...ns} parentId={withSolutionId}>
          <p>1 pc = 206,265 AU (by the definition of the parsec).</p>
        </Solution>
      </>
    ),
  },
};
