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

/** Pure-display mode: no checkbox. Used on the /objectives roll-up page. */
export const PureDisplay: Story = {
  args: {
    id: "display-1",
    verb: "Recognize",
    children:
      "the difference between parallax distance and standard-candle distance.",
  },
  render: (args) => (
    <ul>
      <Objective {...args} />
    </ul>
  ),
};

/** Inside `<LearningObjectives>` — the canonical chapter usage. */
export const InsideLearningObjectives: Story = {
  args: {
    id: "inside-1",
    verb: "Recognize",
    children: "the role of parallax in distance measurement.",
  },
  render: () => (
    <ProfileProvider profile='student'>
      <LearningObjectives course='storybook' chapter='objective' id='inside-lo'>
        <Objective id='inside-1' verb='Recognize'>
          the role of parallax in distance measurement.
        </Objective>
        <Objective id='inside-2' verb='Apply'>
          Wien's displacement law to estimate a star's temperature.
        </Objective>
        <Objective id='inside-3' verb='Derive'>
          the Stefan–Boltzmann relation from blackbody principles.
        </Objective>
      </LearningObjectives>
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
    children: "an objective the student has marked as understood.",
  },
  render: (args) => (
    <ul>
      <Objective {...args} />
    </ul>
  ),
};
