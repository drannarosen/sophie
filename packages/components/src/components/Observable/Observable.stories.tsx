import type { Meta, StoryObj } from "@storybook/react-vite";
import { Observable } from "./Observable.tsx";

/**
 * <Observable> is a biography child of <KeyEquation> per ADR 0046.
 * Renders below the equation body with the canonical "Observable"
 * label and free-form prose explaining what the equation measures.
 *
 * Dark + light VR baselines come from the data-theme decorator
 * configured in `.storybook/preview.tsx`.
 */
const meta = {
  title: "Components/EquationBiography/Observable",
  component: Observable,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Observable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WiensLaw: Story = {
  args: {
    children: (
      <p>Peak wavelength of thermal emission as a function of temperature.</p>
    ),
  },
};

export const InverseSquareLaw: Story = {
  args: {
    children: (
      <p>
        How much radiant flux a detector measures from a point source at a given
        distance, given the source's intrinsic luminosity.
      </p>
    ),
  },
};
