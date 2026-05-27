import type { Meta, StoryObj } from "@storybook/react-vite";
import { Video } from "./Video.tsx";

const meta = {
  title: "Components/Video",
  component: Video,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    provider: {
      control: { type: "select" },
      options: ["youtube", "vimeo", "raw"],
    },
    title: { control: { type: "text" } },
    caption: { control: { type: "text" } },
    credit: { control: { type: "text" } },
  },
} satisfies Meta<typeof Video>;

export default meta;

type Story = StoryObj<typeof meta>;

export const YouTube: Story = {
  args: {
    provider: "youtube",
    id: "dQw4w9WgXcQ",
    title: "Crash Course Astronomy: Galaxies",
    caption:
      "Tour of galactic morphology — spirals, ellipticals, and irregulars.",
    credit: "Crash Course Astronomy",
  },
};

export const Vimeo: Story = {
  args: {
    provider: "vimeo",
    id: "76979871",
    title: "ESO supernova remnant flythrough",
    caption: "Volumetric rendering of a young supernova remnant.",
    credit: "ESO / L. Calçada",
  },
};

export const Raw: Story = {
  args: {
    provider: "raw",
    src: "https://media.example.edu/lecture-04.mp4",
    title: "Self-hosted lecture clip",
    caption:
      "Lecture 4 segment — institutional video host, no third-party tracking.",
  },
};
