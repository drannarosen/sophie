import type { Meta, StoryObj } from "@storybook/react-vite";
import { Aside } from "./Aside.tsx";

const meta = {
  title: "Components/Aside",
  component: Aside,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    kind: {
      control: { type: "select" },
      options: ["note", "definition", "digression", "key-insight"],
    },
    title: { control: { type: "text" } },
  },
} satisfies Meta<typeof Aside>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Note: Story = {
  args: {
    kind: "note",
    children: (
      <p>
        Most stars we see at night are within a few hundred parsecs of the Sun.
        The Milky Way extends thousands of times further.
      </p>
    ),
  },
};

export const Definition: Story = {
  args: {
    kind: "definition",
    title: "Parallax",
    children: (
      <p>
        The apparent shift in a star's position due to Earth's motion around the
        Sun. The first rung of the cosmic distance ladder, calibrated by Gaia
        for stars out to a few kiloparsecs.
      </p>
    ),
  },
};

export const Digression: Story = {
  args: {
    kind: "digression",
    title: "Aristarchus's heliocentric model",
    children: (
      <p>
        Around 270 BCE, Aristarchus proposed that Earth orbits the Sun — 18
        centuries before Copernicus. His geometric argument from lunar eclipses
        didn't catch on; cultural inertia, not bad math, kept the geocentric
        view dominant.
      </p>
    ),
  },
};

export const KeyInsight: Story = {
  args: {
    kind: "key-insight",
    children: (
      <p>
        Every distance method in astronomy ultimately rests on geometric
        parallax. Subsequent rungs (standard candles, redshift) are calibrated
        against parallax-measured distances of nearby objects.
      </p>
    ),
  },
};

export const NoteWithTitle: Story = {
  args: {
    kind: "note",
    title: "Why this matters",
    children: <p>Sample body content with a title above it.</p>,
  },
};

export const LongBody: Story = {
  args: {
    kind: "digression",
    title: "Stellar parallax history",
    children: (
      <>
        <p>
          Bessel measured the first stellar parallax in 1838 (61 Cygni at 0.3
          arcseconds). The result was so small that earlier astronomers had been
          unable to detect it, sparking centuries of debate about whether the
          Earth moved at all.
        </p>
        <p>
          Today, the Gaia satellite measures parallaxes to milliarcsecond
          precision, mapping the geometric distances to over a billion stars.
        </p>
      </>
    ),
  },
};
