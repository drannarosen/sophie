import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Hint } from "../Hint/Hint.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { QuickCheck } from "./QuickCheck.tsx";

/**
 * Storybook bypasses the Sophie remark plugin, so nested `<Hint>` /
 * `<Solution>` instances receive `course`/`unit`/`parentId` explicitly.
 * In compiled MDX the plugin injects these from the wrapping
 * `<QuickCheck>`'s `course`/`unit`/`id` so authors never write them.
 */
const meta = {
  title: "Components/QuickCheck",
  component: QuickCheck,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ProfileProvider profile='student'>
        <Story />
      </ProfileProvider>
    ),
  ],
} satisfies Meta<typeof QuickCheck>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = { course: "storybook", unit: "quick-check" };

export const PromptOnly: Story = {
  args: {
    ...ns,
    id: "qc-prompt-only",
    children: (
      <QuickCheck.Prompt>
        <p>In one sentence, why is the sky blue?</p>
      </QuickCheck.Prompt>
    ),
  },
};

const withSolutionId = "qc-with-solution";
export const WithHintAndSolution: Story = {
  args: {
    ...ns,
    id: withSolutionId,
    children: (
      <>
        <QuickCheck.Prompt>
          <p>Why do nearer stars show a larger parallax angle?</p>
        </QuickCheck.Prompt>
        <Hint {...ns} parentId={withSolutionId} number={1}>
          <p>Hold a finger at arm's length and blink each eye.</p>
        </Hint>
        <Solution {...ns} parentId={withSolutionId}>
          <p>
            For the same baseline, a closer object subtends a larger angle, so
            its apparent shift against the background is greater.
          </p>
        </Solution>
      </>
    ),
  },
};
