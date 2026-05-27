import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Hint } from "./Hint.tsx";

/**
 * Storybook authors pass `course`/`unit`/`parentId` explicitly because
 * Storybook bypasses the Sophie remark plugin that injects these from
 * the wrapping formative parent in MDX.
 */
const meta = {
  title: "Components/Hint",
  component: Hint,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ProfileProvider profile='student'>
        <Story />
      </ProfileProvider>
    ),
  ],
} satisfies Meta<typeof Hint>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  unit: "hint",
  parentId: "demo-problem",
};

export const SingleHint: Story = {
  args: {
    ...ns,
    number: 1,
    children: <p>Start from Kepler's third law: T² ∝ a³ in solar units.</p>,
  },
};

export const CustomLabel: Story = {
  args: {
    ...ns,
    number: 1,
    label: "First nudge",
    children: <p>Think about which conservation law applies first.</p>,
  },
};

export const GraduatedHints: Story = {
  args: { ...ns, number: 1, children: null },
  render: () => (
    <>
      <Hint {...ns} number={1}>
        <p>Identify the dominant force on the orbit.</p>
      </Hint>
      <Hint {...ns} number={2}>
        <p>Set the centripetal acceleration equal to gravitational.</p>
      </Hint>
      <Hint {...ns} number={3}>
        <p>Solve algebraically for v, then substitute orbital parameters.</p>
      </Hint>
    </>
  ),
};
