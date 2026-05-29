// KaTeX ships its stylesheet separately from the JS renderer; the
// production build pipeline in @sophie/astro pulls it in via
// rehype-katex's default CSS hook. Storybook runs in isolation, so
// we import the stylesheet here so VR baselines reflect the real
// rehype-katex output rather than hand-mocked markup.
import "katex/dist/katex.min.css";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { prerenderEquationFixtures } from "../EquationRef/equation-stories-prerender.ts";
import { __setEquations } from "../EquationRef/equations-store.ts";
import { KeyEquation } from "./KeyEquation.tsx";

// Story-level registry fixture. Post-ADR-0060: KeyEquation resolves
// content via `refId` lookup against the equations store. Storybook
// seeds the store directly via __setEquations (production wires this
// from the pedagogy index at TextbookLayout SSR-merge time).
const fixture = [
  {
    id: "wiens-law",
    title: "Wien's Law",
    tex: "\\lambda_{\\text{peak}} = b \\, T^{-1}",
    symbols: ["T", "\\lambda_{\\text{peak}}"],
    constants: [
      {
        symbol: "b",
        value: "0.29",
        unit: "cm K",
        name: "Wien's displacement constant",
      },
    ],
    biography: {
      observable: {
        body: "Peak wavelength of thermal emission as a function of temperature.",
        epistemicRole: "observable" as const,
      },
      assumptions: [
        {
          body: "Source is in local thermodynamic equilibrium so the Planck distribution applies.",
          type: "thermal-equilibrium",
          epistemicRole: "assumption" as const,
        },
        {
          body: "Source emits as an ideal blackbody — no spectral lines, no continuum absorption shaping the peak.",
          type: "blackbody",
          epistemicRole: "assumption" as const,
        },
      ],
      units: [],
      breaks_when: {
        body: "Non-thermal emission (synchrotron, masers, line emission).",
        epistemicRole: "approximation" as const,
      },
      common_misuses: [
        {
          body: "Applying Wien's law to identify the temperature of an absorption-line spectrum.",
          misconception: "wiens-law-absorption-spectra",
        },
      ],
      derivation_steps: [
        {
          body: "Start from Planck's law for blackbody emission.",
          label: "Start from Planck's law",
          epistemicRole: "model" as const,
        },
        {
          body: "Differentiate with respect to wavelength; set to zero to find the peak.",
          label: "Differentiate and set to zero",
          epistemicRole: "model" as const,
        },
      ],
    },
    related: [
      {
        refId: "stefan-boltzmann",
        kind: "see-also" as const,
        description: "Both connect blackbody temperature to its emission.",
      },
    ],
  },
];

const meta = {
  title: "Components/KeyEquation",
  component: KeyEquation,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => {
      __setEquations(prerenderEquationFixtures(fixture));
      return <Story />;
    },
  ],
} satisfies Meta<typeof KeyEquation>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Default: collapsed derivation, related footer visible. */
export const Default: Story = {
  args: {
    refId: "wiens-law",
  },
};

/** Force-expand the derivation accordion via `showDerivation`. */
export const WithDerivationExpanded: Story = {
  args: {
    refId: "wiens-law",
    showDerivation: true,
  },
};

/** Suppress the related-equations footer. */
export const HideRelated: Story = {
  args: {
    refId: "wiens-law",
    hideRelated: true,
  },
};

/** Chapter-specific framing prose renders at the TOP, before the title bar. */
export const WithChapterFramingProse: Story = {
  args: {
    refId: "wiens-law",
  },
  render: (args) => (
    <KeyEquation {...args}>
      <p>
        We've seen Wien's law in the broader thermal-emission survey; in this
        chapter we apply it specifically to dust thermal emission.
      </p>
    </KeyEquation>
  ),
};

/** Miss fallback: refId doesn't resolve, framing prose renders alone. */
export const MissFallback: Story = {
  args: {
    refId: "not-in-registry",
  },
  render: (args) => (
    <KeyEquation {...args}>
      <p>Framing prose for an equation that isn't in the registry.</p>
    </KeyEquation>
  ),
};
