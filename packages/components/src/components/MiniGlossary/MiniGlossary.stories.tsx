import type { Meta, StoryObj } from "@storybook/react-vite";
import { MiniGlossary } from "./MiniGlossary.tsx";

const meta = {
  title: "Components/MiniGlossary",
  component: MiniGlossary,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MiniGlossary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SmokeLike: Story = {
  args: {
    id: "mini-glossary",
    title: "Mini-Glossary (Orientation Only)",
    lede: "This glossary is here to help you recognize terms when you see them—not to memorize them. Every term below will be reintroduced later, in context, with time to understand it properly. For now, just scan and move on.",
    terms: [
      {
        term: "Photon",
        definition:
          'A "packet" of light; the quantum of electromagnetic radiation.',
      },
      {
        term: "Wavelength (λ)",
        definition:
          'The spatial period of a light wave; determines the "type" of light.',
      },
      {
        term: "Spectrum",
        definition: "Brightness measured as a function of wavelength.",
      },
      {
        term: "Flux",
        definition:
          "Light energy per unit time per unit area reaching your detector.",
      },
      {
        term: "Luminosity",
        definition: "Total light energy emitted by a source per unit time.",
      },
      {
        term: "Emission",
        definition: "Light produced and sent out by a source.",
      },
      {
        term: "Absorption",
        definition: "Light removed from a beam by intervening material.",
      },
      {
        term: "Extinction",
        definition:
          "Dimming of light by dust (absorption + scattering combined).",
      },
      {
        term: "Ionized",
        definition:
          "An atom that has lost one or more electrons; electrically charged.",
      },
      {
        term: "Neutral",
        definition:
          "An atom with equal numbers of protons and electrons; no net charge.",
      },
      {
        term: "Thermal radiation",
        definition:
          "Light emitted due to an object's temperature (all hot objects glow).",
      },
      {
        term: "Dark matter",
        definition:
          "Invisible matter detected through gravity; outweighs visible matter ~5:1.",
      },
      {
        term: "Dark energy",
        definition:
          "The unknown driver of accelerating cosmic expansion; ~68% of the universe.",
      },
      {
        term: "Redshift",
        definition:
          "Stretching of light wavelengths; for distant galaxies, caused by cosmic expansion.",
      },
    ],
  },
};

export const ShortForm: Story = {
  args: {
    id: "short-glossary",
    title: "Three Key Terms",
    terms: [
      { term: "Photon", definition: "A packet of light." },
      { term: "Flux", definition: "Light energy per unit time per area." },
      {
        term: "Luminosity",
        definition: "Total light energy emitted per time.",
      },
    ],
  },
};

export const SingleTerm: Story = {
  args: {
    id: "single-term",
    title: "Just One Term",
    terms: [
      {
        term: "Parsec",
        definition:
          "A distance of about 3.26 light-years; the distance at which 1 AU subtends 1 arcsecond.",
      },
    ],
  },
};

export const WithEmphasizedDefinitions: Story = {
  args: {
    id: "emphasized",
    title: "Definitions With Inline Emphasis",
    lede: "Definitions can contain strong and italic emphasis; Greek letters render inline.",
    terms: [
      {
        term: "Wien's Law",
        definition:
          "The peak wavelength λ_peak is inversely proportional to temperature T.",
      },
      {
        term: "Stefan–Boltzmann",
        definition:
          "Total emitted power scales as σT⁴, where σ is the Stefan–Boltzmann constant.",
      },
      {
        term: "Hubble's Law",
        definition:
          "Recession velocity v is proportional to distance d: v = H₀ × d.",
      },
    ],
  },
};

export const TwoOnOnePage: Story = {
  args: {
    id: "alpha-glossary",
    title: "Optics Terms",
    terms: [
      { term: "Photon", definition: "A packet of light." },
      { term: "Wavelength", definition: "Spatial period of a wave." },
    ],
  },
  render: (args) => (
    <>
      <MiniGlossary {...args} />
      <MiniGlossary
        id='beta-glossary'
        title='Dynamics Terms'
        terms={[
          { term: "Photon", definition: "Same term, different glossary." },
          { term: "Flux", definition: "Light per unit area per unit time." },
        ]}
      />
    </>
  ),
};
