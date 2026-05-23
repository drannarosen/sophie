import type {
  ArtifactEntry,
  SectionEntry,
  UnitEntry,
} from "@sophie/core/schema";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { __setArtifacts } from "../../runtime/artifacts-store.ts";
import { __setSections } from "../../runtime/sections-store.ts";
import { __setUnits } from "../../runtime/units-store.ts";
import { ChapterRef } from "./ChapterRef.tsx";

// Story-level fixtures. W2/D3 graduation — populate the W2 stores
// (artifactStore + unitStore + sectionStore) directly. Production
// hydration runs via @sophie/astro <TextbookLayout>'s SSR→CSR
// script-tag transfer (ADR 0038); Storybook runs outside that
// pipeline.
const artifactFixture: ArtifactEntry[] = [
  {
    id: "hydrostatic-equilibrium",
    type: "reading",
    scope: "unit",
    title: "Hydrostatic Equilibrium — reading",
    source_path:
      "src/content/sections/stellar-structure/units/hydrostatic-equilibrium/reading.mdx",
    references: {},
    section_id: "stellar-structure",
    unit_id: "hydrostatic-equilibrium",
  },
  {
    id: "radiative-transfer",
    type: "reading",
    scope: "unit",
    title: "Radiative Transfer — reading",
    source_path:
      "src/content/sections/stellar-structure/units/radiative-transfer/reading.mdx",
    references: {},
    section_id: "stellar-structure",
    unit_id: "radiative-transfer",
  },
];

const unitFixture: UnitEntry[] = [
  {
    id: "hydrostatic-equilibrium",
    type: "lecture",
    title: "Hydrostatic Equilibrium",
    order: 1,
    prereqs: [],
    section_id: "stellar-structure",
    chapter: "hydrostatic-equilibrium",
    status: "stable",
    description:
      "How a star's pressure gradient balances gravity from core to photosphere.",
  },
  {
    id: "radiative-transfer",
    type: "lecture",
    title: "Radiative Transfer",
    order: 2,
    prereqs: [],
    section_id: "stellar-structure",
    chapter: "radiative-transfer",
    status: "stable",
    // No description — exercises the popover's skip-when-absent branch.
  },
];

const sectionFixture: SectionEntry[] = [
  {
    type: "module",
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
    chapter: { control: { type: "text" } },
  },
  decorators: [
    (Story) => {
      __setArtifacts(artifactFixture);
      __setUnits(unitFixture);
      __setSections(sectionFixture);
      return <Story />;
    },
  ],
} satisfies Meta<typeof ChapterRef>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Self-closing default. Trigger text is the unit title (W2/D3 —
 * chapters reference concepts named by title, not positions
 * numbered for in-prose lookup).
 */
export const SelfClosingDefault: Story = {
  args: {
    chapter: "hydrostatic-equilibrium",
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
 * the sentence rather than the unit title.
 */
export const WithChildrenProse: Story = {
  args: {
    chapter: "hydrostatic-equilibrium",
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
 * Unit without a description. The popover collapses to two
 * lines (section breadcrumb + title); no awkward empty paragraph.
 */
export const WithoutDescription: Story = {
  args: {
    chapter: "radiative-transfer",
  },
  render: (args) => (
    <p>
      Photon diffusion through stellar interiors anchors{" "}
      <ChapterRef {...args} />.
    </p>
  ),
};

/**
 * When the `chapter` prop doesn't match any reading artifact in the
 * index, the component gracefully falls back to plain prose (no
 * anchor, no popover). Audit invariant C1 elevates this to a
 * build-time error; this story keeps in-flight chapters renderable
 * while authoring is underway.
 */
export const MissBareProseFallback: Story = {
  args: {
    chapter: "does-not-exist",
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
