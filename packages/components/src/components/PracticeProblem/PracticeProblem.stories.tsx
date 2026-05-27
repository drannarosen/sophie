import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Hint } from "../Hint/Hint.tsx";
import { Solution } from "../Solution/Solution.tsx";
import { PracticeProblem } from "./PracticeProblem.tsx";

/**
 * Storybook bypasses the Sophie remark plugin, so nested `<Hint>` and
 * `<Solution>` instances receive their `course`/`unit`/`parentId`
 * explicitly. In compiled MDX, the plugin injects these from the
 * wrapping `<PracticeProblem>`'s `course`/`unit`/`id` so authors
 * never write them.
 */
const meta = {
  title: "Components/PracticeProblem",
  component: PracticeProblem,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ProfileProvider profile='student'>
        <Story />
      </ProfileProvider>
    ),
  ],
} satisfies Meta<typeof PracticeProblem>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = { course: "storybook", unit: "practice-problem" };

export const PromptOnly: Story = {
  args: {
    ...ns,
    id: "pp-prompt-only",
    children: (
      <PracticeProblem.Prompt>
        <p>
          A satellite orbits Earth at altitude h = 400 km. Compute its orbital
          period in minutes.
        </p>
      </PracticeProblem.Prompt>
    ),
  },
};

const withHintSolutionId = "pp-with-hint-solution";
export const WithHintAndSolution: Story = {
  args: {
    ...ns,
    id: withHintSolutionId,
    children: (
      <>
        <PracticeProblem.Prompt>
          <p>
            Compute the orbital period T of a planet at semi-major axis a = 1 AU
            around a 1 M<sub>⊙</sub> star.
          </p>
        </PracticeProblem.Prompt>
        <Hint {...ns} parentId={withHintSolutionId} number={1}>
          <p>Use Kepler's third law in solar units: T² = a³.</p>
        </Hint>
        <Solution {...ns} parentId={withHintSolutionId}>
          <p>T = a^(3/2) = 1 year.</p>
        </Solution>
      </>
    ),
  },
};

/**
 * Confirms the prompt slot is structurally optional — `<PracticeProblem>`
 * accepts `<Hint>` / `<Solution>` as direct children with no
 * `<PracticeProblem.Prompt>` wrapper. Author surface for problems where
 * the prompt is supplied by surrounding chapter prose (e.g., a "Try this
 * yourself" callout) and the shell only owns hint/solution scaffolding.
 */
const noPromptId = "pp-no-prompt";
export const WithoutPromptSlot: Story = {
  args: {
    ...ns,
    id: noPromptId,
    children: (
      <>
        <Hint {...ns} parentId={noPromptId} number={1}>
          <p>Start from F = ma and identify the dominant force.</p>
        </Hint>
        <Solution {...ns} parentId={noPromptId}>
          <p>
            Gravitational acceleration g ≈ 9.8 m/s² dominates at Earth's
            surface; air resistance is negligible at low speeds.
          </p>
        </Solution>
      </>
    ),
  },
};

const multiHintId = "pp-multi-hint";
export const MultiHintGraduated: Story = {
  args: {
    ...ns,
    id: multiHintId,
    children: (
      <>
        <PracticeProblem.Prompt>
          <p>
            A photon is emitted at λ = 656 nm in the rest frame of a galaxy
            receding at v = 0.01 c. What is the observed wavelength?
          </p>
        </PracticeProblem.Prompt>
        <Hint {...ns} parentId={multiHintId} number={1}>
          <p>
            Non-relativistic limit applies (v ≪ c). Use the classical Doppler
            formula.
          </p>
        </Hint>
        <Hint {...ns} parentId={multiHintId} number={2}>
          <p>Δλ / λ = v / c, and observed wavelength is λ + Δλ.</p>
        </Hint>
        <Hint {...ns} parentId={multiHintId} number={3}>
          <p>Substitute and check the result has units of length.</p>
        </Hint>
        <Solution {...ns} parentId={multiHintId}>
          <p>λ_obs ≈ 656 nm × (1 + 0.01) ≈ 663 nm.</p>
        </Solution>
      </>
    ),
  },
};
