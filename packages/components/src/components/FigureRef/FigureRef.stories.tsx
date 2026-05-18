import type { Meta, StoryObj } from "@storybook/react-vite";
import { FigureRef } from "./FigureRef.tsx";
import { __setFigureRegistry } from "./figure-registry-store.ts";
import { __setFigureUsages } from "./figure-usages-store.ts";

// Story-level fixture. Mirrors the smoke-target figures so the
// popover renders against realistic content. Decision #13:
// self-closing `<FigureRef />` renders "Fig. {number}" from the
// canonical usage entry; decision #3: two-tier (registry +
// usages) means two setters are wired in lockstep.
const registryFixture = [
  {
    name: "cosmic-distance-ladder",
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Cosmic_distance_ladder.jpg/640px-Cosmic_distance_ladder.jpg",
    alt: "Schematic of the cosmic distance ladder: parallax → standard candles → redshift.",
    caption: "The cosmic distance ladder — each rung calibrates the next.",
    credit: "NASA / ESA / A. Feild (STScI)",
  },
  {
    name: "m51-optical-radio",
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Messier51_sRGB.jpg/640px-Messier51_sRGB.jpg",
    alt: "Optical view of the Whirlpool Galaxy (M51).",
    caption: "M51 in optical light.",
  },
];

const usagesFixture = [
  {
    name: "cosmic-distance-ladder",
    chapter: "spoiler-alerts",
    anchor: "fig-cosmic-distance-ladder",
    number: 1,
    canonical: true,
  },
  {
    name: "m51-optical-radio",
    chapter: "spoiler-alerts",
    anchor: "fig-m51-optical-radio",
    number: 2,
    canonical: true,
    captionOverride: "Optical (HST) vs. 21-cm radio (VLA).",
  },
];

const meta = {
  title: "Components/FigureRef",
  component: FigureRef,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    name: { control: { type: "text" } },
  },
  // Seed both figure stores before each story. Production
  // populates the stores via the @sophie/astro <TextbookLayout>
  // SSR→CSR script-tag transfer (ADR 0038); Storybook runs outside
  // that pipeline, so we wire both setters directly. Synchronous
  // so the trigger resolves on the first render (no
  // useEffect-after-paint lag). Matches EquationRef.stories decorator
  // pattern.
  decorators: [
    (Story) => {
      __setFigureRegistry(registryFixture);
      __setFigureUsages(usagesFixture);
      return <Story />;
    },
  ],
} satisfies Meta<typeof FigureRef>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Self-closing default. Trigger text is "Fig. <number>" derived
 * from the canonical usage entry (decision #13). Useful for
 * in-prose mentions like "see Fig. 1".
 */
export const SelfClosingDefault: Story = {
  args: {
    name: "cosmic-distance-ladder",
  },
  render: (args) => (
    <p>
      Distance in astronomy is built one rung at a time —{" "}
      <FigureRef {...args} /> shows how parallax calibrates standard candles,
      which in turn calibrate redshift.
    </p>
  ),
};

/**
 * Children-form. The link text matches the surrounding prose,
 * preserving readability when the author names the figure in the
 * sentence ("this comparison", "the figure below").
 */
export const WithChildrenProse: Story = {
  args: {
    name: "m51-optical-radio",
    children: "this comparison",
  },
  render: (args) => (
    <p>
      Galaxies look different at different wavelengths — <FigureRef {...args} />{" "}
      makes the contrast vivid: optical light traces stars, radio traces cold
      hydrogen.
    </p>
  ),
};

/**
 * Inline-in-paragraph showcase. Multiple FigureRefs in a single
 * paragraph mimic real authoring; verifies the inline-flex
 * trigger keeps baseline alignment.
 */
export const InAParagraph: Story = {
  args: {
    name: "cosmic-distance-ladder",
  },
  render: () => (
    <p>
      Two figures anchor this chapter. The first,{" "}
      <FigureRef name='cosmic-distance-ladder'>the distance ladder</FigureRef>,
      sets up the calibration chain. The second,{" "}
      <FigureRef name='m51-optical-radio' />, illustrates how the same galaxy
      looks in different windows of the electromagnetic spectrum.
    </p>
  ),
};

/**
 * When the name doesn't match any figure in the registry (or no
 * canonical usage exists), the component gracefully falls back to
 * plain prose (no anchor, no popover). PR-C4's audit will surface
 * this as a build-time warning; PR-C3 keeps in-flight chapters
 * renderable while authoring is underway.
 */
export const MissBareProseFallback: Story = {
  args: {
    name: "does-not-exist",
    children: "missing figure",
  },
  render: (args) => (
    <p>
      This paragraph references a <FigureRef {...args} /> that the pedagogy
      index doesn't know about. Renders as plain prose; check the dev console
      for the warning.
    </p>
  ),
};
