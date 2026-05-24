import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tab, Tabs } from "./Tabs.tsx";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    defaultLabel: { control: { type: "text" } },
    id: { control: { type: "text" } },
    className: { control: { type: "text" } },
  },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Tab label='Line spectra'>
          <p>
            Atomic transitions produce sharp dark or bright lines at
            characteristic wavelengths.
          </p>
        </Tab>
        <Tab label='Composition'>
          <p>
            Line strength encodes the relative abundance of each element in the
            star's photosphere.
          </p>
        </Tab>
      </>
    ),
  },
};

export const WithDefaultLabel: Story = {
  args: {
    defaultLabel: "Composition",
    children: (
      <>
        <Tab label='Line spectra'>
          <p>Spectra body.</p>
        </Tab>
        <Tab label='Composition'>
          <p>
            Composition is the default-open tab when authors set `defaultLabel`.
          </p>
        </Tab>
      </>
    ),
  },
};

export const ManyTabs: Story = {
  args: {
    children: (
      <>
        <Tab label='O'>Hottest stars, blue light.</Tab>
        <Tab label='B'>Blue-white, still very hot.</Tab>
        <Tab label='A'>White stars, strong hydrogen lines.</Tab>
        <Tab label='F'>Yellow-white.</Tab>
        <Tab label='G'>Yellow (Sun is G2V).</Tab>
        <Tab label='K'>Orange.</Tab>
        <Tab label='M'>Red, coolest main-sequence.</Tab>
      </>
    ),
  },
};
