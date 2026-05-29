// KaTeX ships its stylesheet separately from the JS renderer; the
// production build pipeline in @sophie/astro pulls it in via
// rehype-katex's default CSS hook. Storybook runs in isolation, so
// we import the stylesheet here to make rendered display math
// visually correct in the popover.
import "katex/dist/katex.min.css";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { EquationRef } from "./EquationRef.tsx";
import { prerenderEquationFixtures } from "./equation-stories-prerender.ts";
import { __setEquations } from "./equations-store.ts";

// Story-level fixture. Mirrors the smoke-target equations so the
// popover renders against realistic content. Post-ADR-0060: registry-
// shaped EquationEntry (id / title / tex / symbols + optional biography).
const fixture = [
  {
    id: "inverse-square-law",
    title: "The Inverse-Square Law",
    tex: "F = \\frac{L}{4\\pi d^2}",
    symbols: ["F", "L", "d"],
  },
  {
    id: "wiens-law",
    title: "Wien's Law",
    tex: "\\lambda_{\\text{peak}} = b \\, T^{-1}",
    symbols: ["T", "\\lambda_{\\text{peak}}"],
  },
];

const meta = {
  title: "Components/EquationRef",
  component: EquationRef,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    refId: { control: { type: "text" } },
  },
  // Seed the equations store before each story. Production
  // populates the store via the @sophie/astro <TextbookLayout>
  // SSR→CSR script-tag transfer (ADR 0038); Storybook runs
  // outside that pipeline, so we wire the same setter directly.
  decorators: [
    (Story) => {
      __setEquations(prerenderEquationFixtures(fixture));
      return <Story />;
    },
  ],
} satisfies Meta<typeof EquationRef>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Self-closing default. Trigger text is the equation's registry title
 * (e.g. "The Inverse-Square Law"). Useful for in-prose mentions
 * where the author wants the equation's canonical name surfaced.
 */
export const SelfClosingDefault: Story = {
  args: {
    refId: "inverse-square-law",
  },
  render: (args) => (
    <p>
      The brightness of a distant star at Earth follows{" "}
      <EquationRef {...args} />: doubling the distance quarters the flux.
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
    refId: "wiens-law",
    children: "Wien's law",
  },
  render: (args) => (
    <p>
      A blackbody's emission peak shifts with temperature according to{" "}
      <EquationRef {...args} />: hotter stars peak bluer, cooler stars redder.
    </p>
  ),
};

/**
 * Inline-in-paragraph showcase. Multiple EquationRefs in a single
 * paragraph mimic real authoring; verifies the inline-flex trigger
 * keeps baseline alignment.
 */
export const InAParagraph: Story = {
  args: {
    refId: "inverse-square-law",
  },
  render: () => (
    <p>
      Two relationships anchor stellar measurement. The first,{" "}
      <EquationRef refId='inverse-square-law'>
        the inverse-square law
      </EquationRef>
      , converts apparent flux into intrinsic luminosity given distance. The
      second, <EquationRef refId='wiens-law' />, turns a peak wavelength into a
      temperature.
    </p>
  ),
};

/**
 * Popover-open baseline (#57). The four stories above capture the
 * inline pill trigger but not the KaTeX-rendered math + biography
 * inside the Radix HoverCard popover (which renders into a portal and
 * stays closed until hover). This story uses Storybook's `play()`
 * lifecycle to hover the trigger before the test-runner takes its
 * screenshot, so the VR baseline includes a regression gate on the
 * popover's mathematical content + biography summary layout.
 *
 * Per ADR 0057 §"Dual purpose": the most important visual content
 * of an EquationRef (the math) belongs in the baseline so polish PRs
 * touching this component have a real regression gate, not just a
 * trigger-pill gate.
 */
export const PopoverOpen: Story = {
  args: {
    refId: "inverse-square-law",
  },
  render: (args) => (
    <p>
      Popover-open baseline:{" "}
      <EquationRef {...args}>the inverse-square law</EquationRef> exposes title,
      KaTeX-rendered tex, and biography summary on hover.
    </p>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole("link", {
      name: /inverse-square law/i,
    });
    await userEvent.hover(trigger);
    // Wait on Radix's own state-machine signal rather than an arbitrary
    // timeout. Radix HoverCard adds `data-state="open"` to its Content
    // element when it opens; we paired that with the component's own
    // `data-sophie-equation-popover` attribute so this selector
    // identifies our popover unambiguously even if other hover-cards
    // share the DOM in future MultiRep / KeyEquation hover stacks.
    // Portal content lives at document.body, NOT inside canvasElement —
    // hence the document.querySelector instead of within(canvas).
    await waitFor(() => {
      const popover = document.querySelector(
        '[data-sophie-equation-popover][data-state="open"]'
      );
      expect(popover).not.toBeNull();
    });
  },
};

/**
 * When the refId doesn't match any equation in the index, the
 * component gracefully falls back to plain prose (no anchor, no
 * popover). Build-time audit invariant R1 (Batch 6) elevates this
 * to a build warning.
 */
export const MissBareProseFallback: Story = {
  args: {
    refId: "does-not-exist",
    children: "missing equation",
  },
  render: (args) => (
    <p>
      This paragraph references a <EquationRef {...args} /> that the pedagogy
      index doesn't know about. Renders as plain prose; check the dev console
      for the warning.
    </p>
  ),
};
