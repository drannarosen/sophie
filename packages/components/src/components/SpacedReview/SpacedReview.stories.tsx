import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { SpacedReview } from "./SpacedReview.tsx";

const meta = {
  title: "Components/SpacedReview",
  component: SpacedReview,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ProfileProvider profile='student'>
        <Story />
      </ProfileProvider>
    ),
  ],
} satisfies Meta<typeof SpacedReview>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  unit: "spacedreview",
};

export const EmptyDefault: Story = {
  args: {
    ...ns,
    target: "topic:logarithms",
    max: 3,
  },
};

export const EmptyOverride: Story = {
  args: {
    ...ns,
    target: "topic:logarithms",
    max: 3,
    children: (
      <SpacedReview.Empty>
        Practice ahead on logarithms? They'll show up here once you've worked a
        few prompts above.
      </SpacedReview.Empty>
    ),
  },
};

export const SectionScopeStub: Story = {
  args: {
    ...ns,
    section: "m1-foundations",
    max: 5,
  },
};
