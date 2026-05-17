import type { Meta, StoryObj } from "@storybook/react-vite";
import { BlackbodyExplorer } from "./BlackbodyExplorer.tsx";

/**
 * `<BlackbodyExplorer>` — first interactive figure consumer of the
 * A11 linked-representation primitive (per ADR 0059). Exercises
 * four ADR 0058 epistemic roles on a single figure:
 *
 *  - `model`         : the Planck curve
 *  - `observable`    : visible-band shading + chromaticity swatch
 *  - `inference`     : Wien peak / Stefan-Boltzmann / spectral class
 *  - `approximation` : Rayleigh-Jeans + Wien-limit overlays
 *
 * Stories below cover canonical stellar regimes (Sun, M dwarf, hot
 * blue star) and the multi-instance independence case.
 */
const meta = {
  title: "Figures/BlackbodyExplorer",
  component: BlackbodyExplorer,
  parameters: { layout: "padded" },
} satisfies Meta<typeof BlackbodyExplorer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Sun: Story = {
  name: "Sun (T_eff = 5772 K, G2-type)",
  args: { id: "sun" },
};

export const CoolMDwarf: Story = {
  name: "Cool M dwarf (T = 3000 K)",
  args: { id: "m-dwarf", initialTemperatureK: 3000 },
};

export const HotBStar: Story = {
  name: "Hot B-type star (T = 20000 K)",
  args: { id: "b-star", initialTemperatureK: 20000 },
};

export const NoApproximationOverlays: Story = {
  name: "Without approximation overlays",
  args: { id: "no-approx", showApproximations: false },
};

export const TwoStarsCompared: Story = {
  name: "Two stars side by side (independent cursors)",
  args: { id: "cmp-sun" }, // unused; render overrides
  render: () => (
    <>
      <BlackbodyExplorer id='cmp-sun' initialTemperatureK={5772} />
      <BlackbodyExplorer id='cmp-sirius' initialTemperatureK={9940} />
    </>
  ),
};
