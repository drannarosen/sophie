import type { Meta, StoryObj } from "@storybook/react-vite";
import { CollapsibleCard } from "./CollapsibleCard.tsx";

const meta = {
  title: "Components/CollapsibleCard",
  component: CollapsibleCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CollapsibleCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  chapter: "collapsiblecard",
};

export const Default: Story = {
  args: {
    ...ns,
    id: "default",
    title: "Deep Dive: Hydrogen's Atomic Fingerprint",
    children: (
      <p>
        The red glow comes from hydrogen's "H-alpha" (Hα) transition at 656.3
        nm. When an electron in a hydrogen atom drops from the n=3 to n=2 energy
        level, it releases a photon with exactly this wavelength.
      </p>
    ),
  },
};

export const DefaultOpen: Story = {
  args: {
    ...ns,
    id: "default-open",
    title: "Deep Dive: Wien's Displacement Law",
    defaultOpen: true,
    children: (
      <p>
        Wien's law: <strong>λ_peak T = 2.898 × 10⁻³ m·K</strong>. Hotter stars
        peak at shorter wavelengths. A 30,000 K O-type star peaks in the
        ultraviolet; a 3,500 K M-type peaks in the infrared.
      </p>
    ),
  },
};

export const LongContent: Story = {
  args: {
    ...ns,
    id: "long-content",
    title: "Deep Dive: How the Distance Ladder Works",
    defaultOpen: true,
    children: (
      <>
        <p>The cosmic distance ladder works in steps:</p>
        <ol>
          <li>
            <strong>Radar</strong> (Solar System): Bounce radio waves off
            planets; measure round-trip time → distance directly.
          </li>
          <li>
            <strong>Parallax</strong> (nearby stars): Measure apparent shift as
            Earth orbits Sun → geometry gives distance.
          </li>
          <li>
            <strong>Cepheid variables</strong> (nearby galaxies): Pulsating
            stars whose period correlates with luminosity; measure period →
            infer luminosity → calculate distance.
          </li>
          <li>
            <strong>Type Ia supernovae</strong> (distant universe):
            Thermonuclear explosions with consistent peak luminosity → visible
            across billions of light-years.
          </li>
        </ol>
        <p>
          Each rung calibrates the next. Parallax calibrates Cepheids; Cepheids
          calibrate Type Ia supernovae. Uncertainty propagates upward — errors
          in lower rungs affect all higher rungs.
        </p>
      </>
    ),
  },
};

export const ListContent: Story = {
  args: {
    ...ns,
    id: "list-content",
    title: "Deep Dive: Nucleosynthesis Sites",
    defaultOpen: true,
    children: (
      <ul>
        <li>
          <strong>Big Bang nucleosynthesis</strong>: H, He, trace Li.
        </li>
        <li>
          <strong>Stellar core fusion</strong>: H → He → C → O → … up to Fe.
        </li>
        <li>
          <strong>Type Ia supernovae</strong>: Iron-peak elements.
        </li>
        <li>
          <strong>Core-collapse supernovae</strong>: Up to Fe + heavier via
          rapid neutron capture.
        </li>
        <li>
          <strong>Neutron star mergers</strong>: r-process elements (Au, Pt, U).
        </li>
      </ul>
    ),
  },
};
