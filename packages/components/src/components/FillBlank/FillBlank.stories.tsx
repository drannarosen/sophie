import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { FillBlank } from "./FillBlank.tsx";

const meta = {
  title: "Components/FillBlank",
  component: FillBlank,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ProfileProvider profile='student'>
        <Story />
      </ProfileProvider>
    ),
  ],
} satisfies Meta<typeof FillBlank>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = { course: "storybook", unit: "fill-blank" };

export const SingleBlank: Story = {
  args: {
    ...ns,
    id: "fb-single",
    children: (
      <FillBlank.Prompt>
        <p>
          A star fuses hydrogen into{" "}
          <FillBlank.Slot id='element' correct='helium' /> on the main sequence.
        </p>
      </FillBlank.Prompt>
    ),
  },
};

const twoBlankId = "fb-two";
export const TwoBlanksWithSolution: Story = {
  args: {
    ...ns,
    id: twoBlankId,
    children: (
      <>
        <FillBlank.Prompt>
          <p>
            The HR diagram plots <FillBlank.Slot id='x' correct='temperature' />{" "}
            on the x-axis against <FillBlank.Slot id='y' correct='luminosity' />{" "}
            on the y-axis.
          </p>
        </FillBlank.Prompt>
        <Solution {...ns} parentId={twoBlankId}>
          <p>Temperature (decreasing rightward) vs. luminosity.</p>
        </Solution>
      </>
    ),
  },
};
