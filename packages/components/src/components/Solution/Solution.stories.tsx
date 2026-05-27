import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { Solution } from "./Solution.tsx";

/**
 * Storybook authors pass `course`/`unit`/`parentId` explicitly because
 * Storybook bypasses the Sophie remark plugin that injects these from
 * the wrapping formative parent in MDX. The component surface (props
 * + behavior) is identical to what the plugin emits.
 */
const meta = {
  title: "Components/Solution",
  component: Solution,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ProfileProvider profile='student'>
        <Story />
      </ProfileProvider>
    ),
  ],
} satisfies Meta<typeof Solution>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  unit: "solution",
  parentId: "demo-problem",
};

export const Default: Story = {
  args: {
    ...ns,
    children: (
      <p>
        T = a<sup>3/2</sup> = 1 year (Kepler's third law in solar units).
      </p>
    ),
  },
};

export const CustomLabel: Story = {
  args: {
    ...ns,
    label: "View answer",
    children: (
      <p>The Sun fits about 1.3 × 10⁶ Earths by volume (R ∝ 109 ⇒ V ∝ 109³).</p>
    ),
  },
};

export const RichBody: Story = {
  args: {
    ...ns,
    children: (
      <>
        <p>
          The redshift–distance relation gives v = H₀ d. Solving for d at v = c
          yields the Hubble distance.
        </p>
        <ul>
          <li>Use H₀ ≈ 70 km/s/Mpc.</li>
          <li>Convert to cgs before plugging in.</li>
          <li>Cross-check via unit cancellation.</li>
        </ul>
      </>
    ),
  },
};
