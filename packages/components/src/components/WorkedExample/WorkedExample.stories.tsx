import type { Meta, StoryObj } from "@storybook/react-vite";
import { WorkedExample } from "./WorkedExample.tsx";

/**
 * <WorkedExample> is a chapter-body compound primitive for step-by-step
 * applied quantitative reasoning (ADR 0081). It carries the structural
 * role ADR 0064 §3 requires — Problem / Step / DimCheck / Result slots —
 * so worked examples are never approximated with a deep-dive Callout.
 *
 * Dark + light VR baselines come from the data-theme decorator in
 * `.storybook/preview.tsx`.
 */
const meta = {
  title: "Components/Pedagogy/WorkedExample",
  component: WorkedExample,
  parameters: { layout: "padded" },
} satisfies Meta<typeof WorkedExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FullExample: Story = {
  args: {
    title: "How Many Earths Fit in the Sun?",
    number: 1,
    children: (
      <>
        <WorkedExample.Problem>
          <p>The Sun's radius is 109× Earth's. How many Earths fit inside?</p>
        </WorkedExample.Problem>
        <WorkedExample.Step label='Volume scales as the cube of radius'>
          <p>
            <code>V ∝ R³</code>, so <code>V_⊙ / V_⊕ = 109³</code>.
          </p>
        </WorkedExample.Step>
        <WorkedExample.DimCheck>
          <p>A ratio of two volumes is dimensionless — no units to carry. ✓</p>
        </WorkedExample.DimCheck>
        <WorkedExample.Result>
          <p>
            <code>≈ 1.3 × 10⁶</code> — over a million Earths.
          </p>
        </WorkedExample.Result>
      </>
    ),
  },
};

export const WithoutNumber: Story = {
  args: {
    title: "Converting 30 km/s to cm/s",
    children: (
      <>
        <WorkedExample.Step label='Chain conversion factors'>
          <p>
            <code>30 km/s × 10³ m/km × 10² cm/m</code>
          </p>
        </WorkedExample.Step>
        <WorkedExample.Result>
          <p>
            <code>= 3 × 10⁶ cm/s</code>
          </p>
        </WorkedExample.Result>
      </>
    ),
  },
};
