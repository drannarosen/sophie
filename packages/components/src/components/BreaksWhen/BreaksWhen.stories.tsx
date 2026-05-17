import type { Meta, StoryObj } from "@storybook/react-vite";
import { BreaksWhen } from "./BreaksWhen.tsx";

const meta = {
  title: "Components/EquationBiography/BreaksWhen",
  component: BreaksWhen,
  parameters: { layout: "padded" },
} satisfies Meta<typeof BreaksWhen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WiensLaw: Story = {
  args: {
    children: (
      <p>
        Non-thermal emission (synchrotron, masers, line emission);
        optically-thin sources without thermal coupling.
      </p>
    ),
  },
};

export const InverseSquareLaw: Story = {
  args: {
    children: (
      <p>
        Extended sources at distances comparable to their size; observations
        through optically-thick media where photons scatter before reaching the
        detector.
      </p>
    ),
  },
};
