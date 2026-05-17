import type { Meta, StoryObj } from "@storybook/react-vite";
import { CommonMisuse } from "./CommonMisuse.tsx";

const meta = {
  title: "Components/EquationBiography/CommonMisuse",
  component: CommonMisuse,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CommonMisuse>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithMisconceptionCrossRef: Story = {
  args: {
    misconception: "wiens-law-absorption-spectra",
    children: (
      <p>
        Applying Wien's law to identify the temperature of an absorption-line
        spectrum. The peak position depends on the continuum, not the absorption
        features.
      </p>
    ),
  },
};

export const WithoutCrossRef: Story = {
  args: {
    children: (
      <p>
        Using inverse-square scaling on an extended source — the geometric
        argument only holds for point sources.
      </p>
    ),
  },
};
