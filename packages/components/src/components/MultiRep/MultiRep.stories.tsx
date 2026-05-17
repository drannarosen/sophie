import type { SerializedRep } from "@sophie/core/schema";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MultiRep } from "./MultiRep.tsx";

const meta = {
  title: "Components/MultiRep/MultiRep",
  component: MultiRep,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MultiRep>;

export default meta;

type Story = StoryObj<typeof meta>;

const verbalRep: SerializedRep = {
  kind: "verbal",
  body: "The orbital radius is the instantaneous distance between the orbiting body and the gravitational center it orbits. Imagine an ant walking along the orbit — how far must it travel to reach the central mass?",
};
const equationRep: SerializedRep = {
  kind: "equation",
  refKey: "kepler-3rd-law",
  symbol: "r",
};
const equationEquivalentRep: SerializedRep = {
  kind: "equation",
  refKey: "kepler-3rd-law-au-form",
  symbol: "r_au",
  equivalent_to: "kepler-3rd-law",
  via: "natural-units-substitution",
};
const figureRep: SerializedRep = {
  kind: "figure",
  refName: "orbit-geometry",
  symbolLabel: "r",
};

/**
 * Full binding: verbal + equation + figure. The canonical example
 * from the 2026-05-17 MultiRep design (Kepler's orbital radius).
 * Responsive grid renders side-by-side on wide viewports; stacks on
 * narrow.
 */
export const FullBinding: Story = {
  args: {
    concept: "orbital-radius",
    conceptLabel: "orbital radius",
    reps: [verbalRep, equationRep, figureRep],
  },
};

/**
 * Binding with an equivalent-equation form — Kepler's law in
 * natural-units form alongside the SI form. MR6 INFO audit checks
 * the `equivalent_to` resolves (chapter-scoped at v1).
 */
export const EquivalentEquationForm: Story = {
  args: {
    concept: "orbital-radius",
    conceptLabel: "orbital radius",
    reps: [verbalRep, equationRep, equationEquivalentRep, figureRep],
  },
};

/**
 * Verbal-only binding — the chapter introduces a concept with the
 * verbal handle alone (equation + figure may follow in later sections).
 * The framed card surfaces the handle as a future binding anchor.
 */
export const VerbalOnly: Story = {
  args: {
    concept: "redshift",
    conceptLabel: "redshift",
    reps: [
      {
        kind: "verbal",
        body: "The fractional shift of a photon's wavelength away from its emitted value. Cosmological redshift is the dominant effect for distant galaxies.",
      },
    ],
  },
};

/**
 * Source-order shuffled — passes reps as [figure, equation, verbal]
 * but the renderer sorts to canonical order (verbal → equation →
 * figure). Visual proof that authors don't need to think about
 * ordering at the source.
 */
export const SourceOrderShuffled: Story = {
  args: {
    concept: "orbital-radius",
    conceptLabel: "orbital radius",
    reps: [figureRep, equationRep, verbalRep],
  },
};

/**
 * Concept-label fallback — when conceptLabel is omitted the header
 * shows the slug. PR-γ (extractor) populates conceptLabel via
 * registry lookup; this story shows the v1-without-registry-resolution
 * fallback behavior.
 */
export const SlugFallback: Story = {
  args: {
    concept: "hubble-parameter",
    reps: [
      {
        kind: "verbal",
        body: "Slug fallback when registry resolution isn't wired (pre-PR-γ).",
      },
    ],
  },
};

/**
 * Wien's law dual-form binding — verbal + λ-form + ν-form (equivalent
 * via planck-substitution) + spectrum figure. Common
 * astrophysics-authoring pattern.
 */
export const WiensLawDualForm: Story = {
  args: {
    concept: "peak-thermal-wavelength",
    conceptLabel: "peak thermal wavelength",
    reps: [
      {
        kind: "verbal",
        body: "The peak wavelength of thermal emission for a blackbody at temperature T. Shifts shorter (bluer) as T rises.",
      },
      {
        kind: "equation",
        refKey: "wiens-law-wavelength",
        symbol: "\\lambda_{peak}",
      },
      {
        kind: "equation",
        refKey: "wiens-law-frequency",
        symbol: "\\nu_{peak}",
        equivalent_to: "wiens-law-wavelength",
        via: "planck-substitution",
      },
      {
        kind: "figure",
        refName: "blackbody-spectrum",
        symbolLabel: "\\lambda_{peak}",
      },
    ],
  },
};
