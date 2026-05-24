import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dropdown } from "./Dropdown.tsx";

const meta = {
  title: "Components/Dropdown",
  component: Dropdown,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Dropdown>;

export default meta;

type Story = StoryObj<typeof meta>;

const ns = {
  course: "storybook",
  unit: "dropdown",
};

export const Single: Story = {
  args: {
    ...ns,
    id: "single",
    label: "Deep Dive: Hydrogen's Atomic Fingerprint",
    children: (
      <p>The red glow comes from hydrogen's H-alpha transition at 656.3 nm.</p>
    ),
  },
};

export const Multi: Story = {
  args: {
    ...ns,
    id: "multi",
    children: (
      <>
        <Dropdown.Item label='Spectra'>
          <p>Line spectra arise from quantized atomic transitions.</p>
        </Dropdown.Item>
        <Dropdown.Item label='Composition'>
          <p>Line strength encodes elemental abundance.</p>
        </Dropdown.Item>
        <Dropdown.Item label='Temperature'>
          <p>
            Continuum shape constrains effective temperature via Wien's law.
          </p>
        </Dropdown.Item>
      </>
    ),
  },
};

export const MultiWithAllowMultiple: Story = {
  args: {
    ...ns,
    id: "multi-allow-multiple",
    allowMultiple: true,
    defaultOpen: ["spectra", "composition"],
    children: (
      <>
        <Dropdown.Item label='Spectra'>
          <p>Open simultaneously with the others.</p>
        </Dropdown.Item>
        <Dropdown.Item label='Composition'>
          <p>Open simultaneously with the others.</p>
        </Dropdown.Item>
        <Dropdown.Item label='Temperature'>
          <p>Closed by default; open without closing siblings.</p>
        </Dropdown.Item>
      </>
    ),
  },
};

export const MultiDefaultOpen: Story = {
  args: {
    ...ns,
    id: "multi-default-open",
    defaultOpen: ["composition"],
    children: (
      <>
        <Dropdown.Item label='Spectra'>
          <p>Spectra body.</p>
        </Dropdown.Item>
        <Dropdown.Item label='Composition'>
          <p>This item is open on first visit.</p>
        </Dropdown.Item>
      </>
    ),
  },
};
