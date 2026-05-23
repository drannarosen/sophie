import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { LearningObjectives } from "../LearningObjectives/LearningObjectives.tsx";
import { Objective } from "./Objective.tsx";

const meta = {
  title: "Components/Objective",
  component: Objective,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Objective>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Pure-display mode: no checkbox. Used on the `/library/objectives` roll-up page. */
export const PureDisplay: Story = {
  args: {
    id: "display-1",
    verb: "Recognize",
    body: "the difference between parallax distance and standard-candle distance.",
  },
  render: (args) => (
    <ul>
      <Objective {...args} />
    </ul>
  ),
};

/**
 * Inside `<LearningObjectives>` — the canonical chapter usage.
 *
 * In production, authors write `<Objective>` JSX children in MDX; the
 * remark transform harvests them into the parent's `objectives` prop
 * before the React island runs. Storybook has no remark pass, so this
 * story passes the same `objectives` array directly — mirroring the
 * post-extraction runtime shape that `<LearningObjectives>` consumes.
 */
export const InsideLearningObjectives: Story = {
  args: {
    id: "inside-1",
    verb: "Recognize",
    body: "the role of parallax in distance measurement.",
  },
  render: () => (
    <ProfileProvider profile='student'>
      <LearningObjectives
        course='storybook'
        unit='objective'
        id='inside-lo'
        objectives={[
          {
            id: "inside-1",
            verb: "Recognize",
            body: "the role of parallax in distance measurement.",
          },
          {
            id: "inside-2",
            verb: "Apply",
            body: "Wien's displacement law to estimate a star's temperature.",
          },
          {
            id: "inside-3",
            verb: "Derive",
            body: "the Stefan–Boltzmann relation from blackbody principles.",
          },
        ]}
      />
    </ProfileProvider>
  ),
};

/** Checked-state visual — shown standalone for visual review. */
export const Checked: Story = {
  args: {
    id: "checked-1",
    verb: "Recognize",
    checked: true,
    onToggle: () => undefined,
    body: "an objective the student has marked as understood.",
  },
  render: (args) => (
    <ul>
      <Objective {...args} />
    </ul>
  ),
};
