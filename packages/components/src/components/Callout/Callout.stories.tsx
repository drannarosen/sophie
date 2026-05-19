import type { Meta, StoryObj } from "@storybook/react-vite";
import { Callout } from "./Callout.tsx";

const meta = {
  title: "Components/Callout",
  component: Callout,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: [
        "info",
        "warning",
        "tip",
        "caution",
        "roadmap",
        "summary",
        "key-insight",
        "misconception",
        "deep-dive",
        "the-more-you-know",
      ],
    },
    title: { control: { type: "text" } },
  },
} satisfies Meta<typeof Callout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: "info",
    children: (
      <p>
        Stars can outshine entire galaxies during their final supernova moments.
      </p>
    ),
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    children: (
      <p>Never look directly at the Sun without an approved solar filter.</p>
    ),
  },
};

export const Tip: Story = {
  args: {
    variant: "tip",
    children: (
      <p>
        Use averted vision: faint objects appear brighter when you look slightly
        to the side of them.
      </p>
    ),
  },
};

export const Caution: Story = {
  args: {
    variant: "caution",
    children: (
      <p>
        The inverse-square law assumes an isotropic emitter — beamed sources
        break this scaling.
      </p>
    ),
  },
};

export const Roadmap: Story = {
  args: {
    variant: "roadmap",
    children: (
      <p>
        Over the next three weeks we'll move from blackbody radiation to stellar
        atmospheres to spectral classification.
      </p>
    ),
  },
};

export const Summary: Story = {
  args: {
    variant: "summary",
    children: (
      <p>
        A star's luminosity, radius, and effective temperature are linked by the
        Stefan–Boltzmann law: <em>L = 4πR²σT⁴</em>.
      </p>
    ),
  },
};

export const KeyInsight: Story = {
  name: "Key insight",
  args: {
    variant: "key-insight",
    children: (
      <p>
        Hotter stars peak at shorter wavelengths — Wien's displacement law in
        one sentence.
      </p>
    ),
  },
};

export const Misconception: Story = {
  args: {
    variant: "misconception",
    children: (
      <p>
        Seasons are <em>not</em> caused by Earth's distance from the Sun. They
        result from the 23.5° tilt of Earth's axis, which changes how directly
        sunlight strikes each hemisphere through the year.
      </p>
    ),
  },
};

export const WithCustomTitle: Story = {
  args: {
    variant: "info",
    title: "Why this matters",
    children: (
      <p>
        The accessible name comes from the explicit <code>title</code> prop when
        provided, otherwise from the variant default.
      </p>
    ),
  },
};

// ─── Session 9 P3: collapsible depth + enrichment variants ───

export const DeepDive: Story = {
  args: {
    variant: "deep-dive",
    title: "How the distance ladder works",
    children: (
      <p>
        Parallax measures distances to nearby stars by triangulation, then
        standard candles like Cepheid variables extend the calibration to other
        galaxies, then redshift extends it to cosmological scales. Each rung is
        anchored to the one below — a single failure propagates.
      </p>
    ),
  },
};

export const TheMoreYouKnow: Story = {
  args: {
    variant: "the-more-you-know",
    title: "Hubble's redshift puzzle",
    children: (
      <p>
        When Edwin Hubble first measured galactic redshifts in the 1920s, he
        nearly named what he found "the recession effect" instead of connecting
        it to spacetime expansion. The conceptual leap to "space itself is
        stretching" came years later — observation, then model.
      </p>
    ),
  },
};

export const DeepDiveNoTitle: Story = {
  args: {
    variant: "deep-dive",
    children: <p>Without an explicit title, the variant label is the label.</p>,
  },
};

export const TheMoreYouKnowNoTitle: Story = {
  args: {
    variant: "the-more-you-know",
    children: <p>Same fallback behavior on the enrichment variant.</p>,
  },
};
