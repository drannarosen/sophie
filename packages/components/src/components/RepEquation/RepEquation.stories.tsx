import type { Meta, StoryObj } from "@storybook/react-vite";
import { RepEquation } from "./RepEquation.tsx";

const meta = {
  title: "Components/MultiRep/RepEquation",
  component: RepEquation,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RepEquation>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Most common usage: refKey + symbol. Resolves to a `<KeyEquation>`
 * declared elsewhere in the chapter via the equation index (PR-γ).
 */
export const Basic: Story = {
  args: {
    refKey: "kepler-3rd-law",
    symbol: "r",
  },
};

/**
 * LaTeX-symbol form — the `symbol` prop is a raw symbol literal;
 * KaTeX rendering of the *equation itself* lives in the original
 * `<KeyEquation>` block. RepEquation displays only the binding handle.
 */
export const LaTeXSymbol: Story = {
  args: {
    refKey: "wiens-law-wavelength",
    symbol: "\\lambda_{peak}",
  },
};

/**
 * Equivalent-form declaration: Wien's law λ-form vs ν-form. The
 * MR6 INFO audit checks `equivalent_to` resolves; `via` names the
 * substitution (free-form slug at v1, no platform catalog).
 */
export const EquivalentForm: Story = {
  args: {
    refKey: "wiens-law-frequency",
    symbol: "\\nu_{peak}",
    equivalent_to: "wiens-law-wavelength",
    via: "planck-substitution",
  },
};

/**
 * Unit-system equivalence: SI vs CGS forms of the same law. Common
 * astrophysics-authoring pattern when chapters bridge teaching units
 * (cgs) with display units (SI, AU, etc.).
 */
export const UnitSystemConversion: Story = {
  args: {
    refKey: "hubble-law-cgs",
    symbol: "v",
    equivalent_to: "hubble-law-si",
    via: "unit-system-conversion",
  },
};

/**
 * Approximation form: full relativistic Hubble vs low-z approximation.
 * The bridging `via="small-z-limit"` declares what assumption gets
 * dropped to derive the simpler form.
 */
export const ApproximationForm: Story = {
  args: {
    refKey: "hubble-law-low-z",
    symbol: "z",
    equivalent_to: "hubble-law-relativistic",
    via: "small-z-limit",
  },
};
