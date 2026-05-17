import type { Meta, StoryObj } from "@storybook/react-vite";
import { RepFigure } from "./RepFigure.tsx";

const meta = {
  title: "Components/MultiRep/RepFigure",
  component: RepFigure,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RepFigure>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Minimum-valid usage: just the figure refName. The figure itself
 * is rendered by the original `<Figure>` block elsewhere in the
 * chapter — RepFigure surfaces only the binding handle.
 */
export const Basic: Story = {
  args: {
    refName: "orbit-geometry",
  },
};

/**
 * With symbolLabel — declares the symbol that appears IN the figure
 * (axis label, diagram annotation). The MR4 INFO audit nudges
 * authors when the figure's alt text doesn't mention this label
 * (or the concept's verbal_label).
 */
export const WithSymbolLabel: Story = {
  args: {
    refName: "orbit-geometry",
    symbolLabel: "r",
  },
};

/**
 * Plot-style figure with axis-label symbol — common for figures
 * derived from data (light curves, Hertzsprung-Russell diagrams,
 * Hubble-flow plots).
 */
export const AxisLabel: Story = {
  args: {
    refName: "hubble-diagram",
    symbolLabel: "v",
  },
};

/**
 * LaTeX symbolLabel for figures annotating Greek letters.
 */
export const LaTeXSymbolLabel: Story = {
  args: {
    refName: "blackbody-spectrum",
    symbolLabel: "\\lambda_{peak}",
  },
};
