import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { SkillReview } from "./SkillReview.tsx";

const meta = {
  title: "Components/SkillReview",
  component: SkillReview,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ProfileProvider profile='student'>
        <Story />
      </ProfileProvider>
    ),
  ],
} satisfies Meta<typeof SkillReview>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  chapter: "skillreview",
};

export const ExplicitContent: Story = {
  args: {
    ...ns,
    target: "topic:logarithms",
    children: (
      <>
        <SkillReview.Prompt>
          Quick check: what is log10(1000)?
        </SkillReview.Prompt>
        <SkillReview.Answer>
          <strong>3</strong> — because 10³ = 1000.
        </SkillReview.Answer>
      </>
    ),
  },
};

export const ExplicitWithReviewMore: Story = {
  args: {
    ...ns,
    target: "topic:logarithms",
    children: (
      <>
        <SkillReview.Prompt>
          Quick check: what is log10(1000)?
        </SkillReview.Prompt>
        <SkillReview.Answer>3 — because 10³ = 1000.</SkillReview.Answer>
        <SkillReview.ReviewMore>
          <a href='#library/logarithms'>Refresher on logarithms →</a>
        </SkillReview.ReviewMore>
      </>
    ),
  },
};

export const LibraryPlaceholder: Story = {
  args: {
    ...ns,
    target: "topic:exponents",
  },
};

export const PlaceholderWithReviewMore: Story = {
  args: {
    ...ns,
    target: "topic:exponents",
    children: (
      <SkillReview.ReviewMore>
        <a href='#library/exponents'>Refresher on exponents →</a>
      </SkillReview.ReviewMore>
    ),
  },
};
