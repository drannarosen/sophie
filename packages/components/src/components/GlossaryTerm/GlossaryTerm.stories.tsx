import type { Meta, StoryObj } from "@storybook/react-vite";
import { GlossaryTerm } from "./GlossaryTerm.tsx";

const meta = {
  title: "Components/GlossaryTerm",
  component: GlossaryTerm,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    name: { control: { type: "text" } },
  },
} satisfies Meta<typeof GlossaryTerm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Inline glossary reference. Hover or click the underlined term
 * to see the canonical definition; click navigates to the
 * definition's source chapter + anchor.
 */
export const InProse: Story = {
  args: {
    name: "Standard candle",
    children: "standard candle",
  },
  render: (args) => (
    <p>
      To measure distance to a far galaxy, astronomers look for a{" "}
      <GlossaryTerm {...args} />: an object whose intrinsic brightness can be
      established independently, so observed flux maps to distance via the
      inverse-square law.
    </p>
  ),
};

export const Parallax: Story = {
  args: {
    name: "Parallax",
    children: "parallax",
  },
  render: (args) => (
    <p>
      Within a few kiloparsecs, Gaia's measurements of{" "}
      <GlossaryTerm {...args} /> establish the first rung of the cosmic distance
      ladder.
    </p>
  ),
};

/**
 * When the displayed prose is an inflection of the canonical
 * term (here, "redshifts" plural), the `children` slot carries
 * the surface form and `name` carries the canonical term.
 */
export const InflectedProse: Story = {
  args: {
    name: "Redshift",
    children: "redshifts",
  },
  render: (args) => (
    <p>
      Distant galaxies show systematic <GlossaryTerm {...args} /> proportional
      to their distance — the signature of cosmic expansion.
    </p>
  ),
};

/**
 * When the term name doesn't match any definition in the index,
 * the component gracefully falls back to plain prose (no anchor,
 * no popover). PR-C4's audit will surface this as a build-time
 * warning; PR-C1 keeps in-flight chapters renderable while
 * authoring is underway.
 */
export const UndefinedTerm: Story = {
  args: {
    name: "Not in index",
    children: "missing term",
  },
  render: (args) => (
    <p>
      This paragraph references a <GlossaryTerm {...args} /> that the pedagogy
      index doesn't know about. Renders as plain prose; check the dev console
      for the warning.
    </p>
  ),
};
