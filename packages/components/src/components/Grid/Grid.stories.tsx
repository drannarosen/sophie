import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../Card/Card.tsx";
import { Grid } from "./Grid.tsx";

const meta = {
  title: "Components/Grid",
  component: Grid,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    cols: { control: { type: "select" }, options: [1, 2, 3, 4] },
    responsive: { control: { type: "boolean" } },
    gap: { control: { type: "select" }, options: ["sm", "md", "lg"] },
    id: { control: { type: "text" } },
    className: { control: { type: "text" } },
  },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

const cells = (n: number) =>
  Array.from({ length: n }, (_, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: storybook fixture generator — cell identity IS the array index here.
    <Card key={`cell-${i + 1}`} title={`Cell ${i + 1}`}>
      <p>Grid cell body.</p>
    </Card>
  ));

export const Cols2: Story = {
  args: {
    cols: 2,
    children: cells(4),
  },
};

export const Cols3: Story = {
  args: {
    cols: 3,
    children: cells(6),
  },
};

export const Cols4: Story = {
  args: {
    cols: 4,
    children: cells(8),
  },
};

export const NonResponsive: Story = {
  args: {
    cols: 3,
    responsive: false,
    children: cells(6),
  },
};

export const GapVariants: Story = {
  args: {
    cols: 3,
    gap: "lg",
    children: cells(6),
  },
};
