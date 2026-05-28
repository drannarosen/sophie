import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { MultiSelect } from "./MultiSelect.tsx";

const meta = {
  title: "Components/MultiSelect",
  component: MultiSelect,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ProfileProvider profile='student'>
        <Story />
      </ProfileProvider>
    ),
  ],
} satisfies Meta<typeof MultiSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = { course: "storybook", unit: "multi-select" };

export const Default: Story = {
  args: {
    ...ns,
    id: "ms-terrestrial",
    children: (
      <>
        <MultiSelect.Prompt>
          <p>Which of these are terrestrial (rocky) planets?</p>
        </MultiSelect.Prompt>
        <MultiSelect.Choice correct>Mercury</MultiSelect.Choice>
        <MultiSelect.Choice>Jupiter</MultiSelect.Choice>
        <MultiSelect.Choice correct>Mars</MultiSelect.Choice>
        <MultiSelect.Choice>Neptune</MultiSelect.Choice>
      </>
    ),
  },
};

const withSolutionId = "ms-with-solution";
export const WithSolution: Story = {
  args: {
    ...ns,
    id: withSolutionId,
    children: (
      <>
        <MultiSelect.Prompt>
          <p>Which observations support an expanding universe?</p>
        </MultiSelect.Prompt>
        <MultiSelect.Choice correct>Galaxy redshifts</MultiSelect.Choice>
        <MultiSelect.Choice correct>
          Cosmic microwave background
        </MultiSelect.Choice>
        <MultiSelect.Choice>Stellar parallax</MultiSelect.Choice>
        <Solution {...ns} parentId={withSolutionId}>
          <p>
            Redshift and the CMB are cosmological; parallax is a local distance
            tool.
          </p>
        </Solution>
      </>
    ),
  },
};
