import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChapterRef } from "./ChapterRef.tsx";
import { __setChapters } from "./chapters-store.ts";
import { __setModules } from "./modules-store.ts";

// Story-level fixtures. Mirror the smoke-target shape so the popover
// renders against realistic content. Decision Q6: self-closing
// `<ChapterRef />` renders the chapter title.
const chapterFixture = [
  {
    slug: "hydrostatic-equilibrium",
    title: "Hydrostatic Equilibrium",
    module: "stellar-structure",
    order: 1,
    description:
      "How a star's pressure gradient balances gravity from core to photosphere.",
    status: "stable" as const,
  },
  {
    slug: "radiative-transfer",
    title: "Radiative Transfer",
    module: "stellar-structure",
    order: 2,
    status: "stable" as const,
    // No description — exercises the popover's skip-when-absent branch.
  },
];

const moduleFixture = [
  {
    slug: "stellar-structure",
    title: "Stellar Structure",
    order: 1,
    description: "Mechanical, energetic, and radiative balance inside stars.",
  },
];

const meta = {
  title: "Components/ChapterRef",
  component: ChapterRef,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    slug: { control: { type: "text" } },
  },
  // Seed the stores before each story. Production populates them
  // via the @sophie/astro <TextbookLayout> SSR→CSR script-tag
  // transfer (ADR 0038); Storybook runs outside that pipeline, so
  // we wire the same setters directly.
  decorators: [
    (Story) => {
      __setChapters(chapterFixture);
      __setModules(moduleFixture);
      return <Story />;
    },
  ],
} satisfies Meta<typeof ChapterRef>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Self-closing default. Trigger text is the chapter title (Q6 —
 * chapters reference concepts named by title, not positions
 * numbered for in-prose lookup).
 */
export const SelfClosingDefault: Story = {
  args: {
    slug: "hydrostatic-equilibrium",
  },
  render: (args) => (
    <p>
      The pressure-gravity balance is developed in <ChapterRef {...args} />.
    </p>
  ),
};

/**
 * Children-form. The link text matches the surrounding prose,
 * preserving readability when the author names the concept in
 * the sentence rather than the chapter title.
 */
export const WithChildrenProse: Story = {
  args: {
    slug: "hydrostatic-equilibrium",
    children: "the pressure-gravity balance",
  },
  render: (args) => (
    <p>
      A star sustains itself by holding <ChapterRef {...args} /> for as long as
      core fusion lasts.
    </p>
  ),
};

/**
 * Chapter without a description. The popover collapses to two
 * lines (module breadcrumb + title); no awkward empty paragraph.
 */
export const WithoutDescription: Story = {
  args: {
    slug: "radiative-transfer",
  },
  render: (args) => (
    <p>
      Photon diffusion through stellar interiors anchors{" "}
      <ChapterRef {...args} />.
    </p>
  ),
};

/**
 * When the slug doesn't match any chapter in the index, the
 * component gracefully falls back to plain prose (no anchor, no
 * popover). PR-C4 audit invariant C1 elevates this to a build-time
 * error; this story keeps in-flight chapters renderable while
 * authoring is underway.
 */
export const MissBareProseFallback: Story = {
  args: {
    slug: "does-not-exist",
    children: "missing chapter",
  },
  render: (args) => (
    <p>
      This paragraph references a <ChapterRef {...args} /> that the pedagogy
      index doesn't know about. Renders as plain prose; check the dev console
      for the warning.
    </p>
  ),
};
