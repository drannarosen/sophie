import type { Meta, StoryObj } from "@storybook/react-vite";
import { Figure } from "./Figure.tsx";

const meta = {
  title: "Components/Figure",
  component: Figure,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Figure>;

export default meta;

type Story = StoryObj<typeof meta>;

// Storybook-only fixtures use self-hosted SVG placeholders served
// from .storybook/static/figures/ (issue #131 — external CDN URLs
// caused VR baseline fragility). Captions describe what the
// production image *would* show; the placeholder is clearly marked
// as such in-image.
const sampleRegistry = {
  "milky-way-from-atacama": {
    name: "milky-way-from-atacama",
    src: "/figures/milky-way-atacama.svg",
    alt: "Placeholder: stylized Milky Way over a horizon, used as a Storybook fixture.",
    caption:
      "Placeholder for: the Milky Way as seen from the Atacama Desert at 5,100 m elevation.",
    credit: "Storybook placeholder (SVG).",
  },
};

export const Inline: Story = {
  args: {
    src: "/figures/hubble-st-sm4.svg",
    alt: "Placeholder: stylized telescope diagram against a starfield, used as a Storybook fixture.",
    caption:
      "Placeholder for: Hubble Space Telescope, photographed by the STS-125 crew during Servicing Mission 4.",
    credit: "Storybook placeholder (SVG).",
  },
};

export const FromRegistry: Story = {
  args: {
    name: "milky-way-from-atacama",
    registry: sampleRegistry,
  },
};

export const RegistryWithCaptionOverride: Story = {
  args: {
    name: "milky-way-from-atacama",
    registry: sampleRegistry,
    caption:
      "Override caption: the night sky over Chile shows ~10⁴ stars to the unaided eye.",
  },
};

export const MissingFromRegistry: Story = {
  args: {
    name: "no-such-figure",
    registry: sampleRegistry,
  },
};

export const InlineWithoutCaption: Story = {
  args: {
    src: "/figures/hubble-st-sm4.svg",
    alt: "Placeholder: stylized telescope above a starfield.",
  },
};
