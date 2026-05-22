import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { RetrievalPrompt } from "./RetrievalPrompt.tsx";

const meta = {
  title: "Components/RetrievalPrompt",
  component: RetrievalPrompt,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ProfileProvider profile='student'>
        <Story />
      </ProfileProvider>
    ),
  ],
} satisfies Meta<typeof RetrievalPrompt>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  chapter: "retrievalprompt",
};

export const Default: Story = {
  args: {
    ...ns,
    target: "eq:stefan-boltzmann",
    children: (
      <>
        <RetrievalPrompt.Prompt>
          A star doubles its radius at fixed temperature. How does its
          luminosity change?
        </RetrievalPrompt.Prompt>
        <RetrievalPrompt.Answer>
          Luminosity goes up by <strong>4×</strong>, since <em>L = 4πR²σT⁴</em>{" "}
          and L ∝ R² at fixed T.
        </RetrievalPrompt.Answer>
      </>
    ),
  },
};

export const KeyInsightTarget: Story = {
  args: {
    ...ns,
    target: "ki:luminosity-scales-r2",
    children: (
      <>
        <RetrievalPrompt.Prompt>
          What's the key insight tying luminosity to radius at fixed
          temperature?
        </RetrievalPrompt.Prompt>
        <RetrievalPrompt.Answer>
          L scales as <strong>R²</strong> because the radiating surface area
          itself scales as R² — the per-unit-area flux (σT⁴) is held constant.
        </RetrievalPrompt.Answer>
      </>
    ),
  },
};

export const MisconceptionTarget: Story = {
  args: {
    ...ns,
    target: "misc:luminosity-is-brightness",
    children: (
      <>
        <RetrievalPrompt.Prompt>
          Why is "luminosity" not the same as "how bright a star looks"?
        </RetrievalPrompt.Prompt>
        <RetrievalPrompt.Answer>
          Luminosity is the star's intrinsic energy output (erg/s). Apparent
          brightness depends on distance via the inverse-square law.
        </RetrievalPrompt.Answer>
      </>
    ),
  },
};
