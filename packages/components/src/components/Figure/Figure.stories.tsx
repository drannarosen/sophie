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

const sampleRegistry = {
  "milky-way-from-atacama": {
    name: "milky-way-from-atacama",
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Milky_Way_Galaxy_taken_from_the_Atacama_Desert%2C_Chile_at_an_altitude_of_5%2C100_meters.jpg/640px-Milky_Way_Galaxy_taken_from_the_Atacama_Desert%2C_Chile_at_an_altitude_of_5%2C100_meters.jpg",
    alt: "The Milky Way galactic plane arcing across a star-saturated sky over the Atacama Desert.",
    caption:
      "The Milky Way as seen from the Atacama Desert at 5,100 m elevation.",
    credit: "Photo: Bruno Gilli / ESO.",
  },
};

export const Inline: Story = {
  args: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/HST-SM4.jpeg/640px-HST-SM4.jpeg",
    alt: "Hubble Space Telescope photographed against Earth's limb during Servicing Mission 4.",
    caption:
      "Hubble Space Telescope, photographed by the STS-125 crew during Servicing Mission 4 in 2009.",
    credit: "NASA.",
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
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/HST-SM4.jpeg/640px-HST-SM4.jpeg",
    alt: "Hubble Space Telescope above Earth.",
  },
};
