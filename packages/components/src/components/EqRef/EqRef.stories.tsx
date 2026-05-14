// KaTeX ships its stylesheet separately from the JS renderer; the
// production build pipeline in @sophie/astro pulls it in via
// rehype-katex's default CSS hook. Storybook runs in isolation, so
// we import the stylesheet here to make rendered display math
// visually correct in the popover.
import "katex/dist/katex.min.css";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EqRef } from "./EqRef.tsx";
import { __setEquations } from "./equations-store.ts";

// Story-level fixture. Mirrors the smoke-target equations so the
// popover renders against realistic content. Decision #13:
// self-closing `<EqRef />` renders "Eq. {number}".
const fixture = [
  {
    slug: "inverse-square-law",
    title: "The Inverse-Square Law",
    number: 1,
    tex: "F = \\frac{L}{4\\pi d^2}",
    body: "<p>Flux falls off as the inverse square of the distance to a point source — the geometric consequence of light spreading over an ever-expanding sphere.</p>",
    chapter: "spoiler-alerts",
    anchor: "inverse-square-law",
  },
  {
    slug: "wiens-law",
    title: "Wien's Law",
    number: 2,
    tex: "\\lambda_{\\text{peak}} = b \\, T^{-1}",
    body: "<p>The peak wavelength of a blackbody's emission scales inversely with temperature — hotter sources peak bluer; cooler sources peak redder.</p>",
    chapter: "spoiler-alerts",
    anchor: "wiens-law",
  },
];

const meta = {
  title: "Components/EqRef",
  component: EqRef,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    slug: { control: { type: "text" } },
  },
  // Seed the equations store before each story. Production
  // populates the store via the @sophie/astro <TextbookLayout>
  // SSR→CSR script-tag transfer (ADR 0038); Storybook runs
  // outside that pipeline, so we wire the same setter directly.
  // Synchronous so the trigger resolves on the first render
  // (no useEffect-after-paint lag).
  decorators: [
    (Story) => {
      __setEquations(fixture);
      return <Story />;
    },
  ],
} satisfies Meta<typeof EqRef>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Self-closing default. Trigger text is "Eq. <number>" derived
 * from the index entry's per-chapter number (decision #13).
 * Useful for in-prose mentions like "see Eq. 1".
 */
export const SelfClosingDefault: Story = {
  args: {
    slug: "inverse-square-law",
  },
  render: (args) => (
    <p>
      The brightness of a distant star at Earth follows <EqRef {...args} />:
      doubling the distance quarters the flux.
    </p>
  ),
};

/**
 * Children-form. The link text matches the surrounding prose,
 * preserving readability when the author names the equation in
 * the sentence (e.g. "Wien's law tells us…").
 */
export const WithChildrenProse: Story = {
  args: {
    slug: "wiens-law",
    children: "Wien's law",
  },
  render: (args) => (
    <p>
      A blackbody's emission peak shifts with temperature according to{" "}
      <EqRef {...args} />: hotter stars peak bluer, cooler stars redder.
    </p>
  ),
};

/**
 * Inline-in-paragraph showcase. Multiple EqRefs in a single
 * paragraph mimic real authoring; verifies the inline-flex
 * trigger keeps baseline alignment.
 */
export const InAParagraph: Story = {
  args: {
    slug: "inverse-square-law",
  },
  render: () => (
    <p>
      Two relationships anchor stellar measurement. The first,{" "}
      <EqRef slug='inverse-square-law'>the inverse-square law</EqRef>, converts
      apparent flux into intrinsic luminosity given distance. The second,{" "}
      <EqRef slug='wiens-law' />, turns a peak wavelength into a temperature.
    </p>
  ),
};

/**
 * When the slug doesn't match any equation in the index, the
 * component gracefully falls back to plain prose (no anchor, no
 * popover). PR-C4's audit will surface this as a build-time
 * warning; PR-C2 keeps in-flight chapters renderable while
 * authoring is underway.
 */
export const MissBareProseFallback: Story = {
  args: {
    slug: "does-not-exist",
    children: "missing equation",
  },
  render: (args) => (
    <p>
      This paragraph references a <EqRef {...args} /> that the pedagogy index
      doesn't know about. Renders as plain prose; check the dev console for the
      warning.
    </p>
  ),
};
