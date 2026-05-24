import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./Card.tsx";

const meta = {
  title: "Components/Card",
  component: Card,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    title: { control: { type: "text" } },
    id: { control: { type: "text" } },
    className: { control: { type: "text" } },
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plain: Story = {
  args: {
    children: (
      <p>
        A bare card with no title or slots renders as a non-landmark{" "}
        <code>&lt;div&gt;</code>.
      </p>
    ),
  },
};

export const WithTitle: Story = {
  args: {
    title: "Spectral classification",
    children: (
      <p>
        Stars are classified by surface temperature, from hot O-type through
        cool M-type.
      </p>
    ),
  },
};

export const WithHeaderSlot: Story = {
  args: {
    children: (
      <>
        <Card.Header>
          <strong>Why slot beats prop</strong>
        </Card.Header>
        <p>
          The <code>Card.Header</code> slot wins when both are provided — Q3 of
          the PR 5 design doc.
        </p>
      </>
    ),
  },
};

export const WithHeaderAndFooter: Story = {
  args: {
    title: "Observable: line spectrum",
    children: (
      <>
        <p>
          Each element has a fingerprint of dark lines at characteristic
          wavelengths.
        </p>
        <Card.Footer>
          <em>Source: Kirchhoff &amp; Bunsen, 1859</em>
        </Card.Footer>
      </>
    ),
  },
};

export const FooterOnly: Story = {
  args: {
    children: (
      <>
        <p>
          A card with only a footer slot is still a non-landmark — no header
          means no accessible name to attach to.
        </p>
        <Card.Footer>
          <small>Page 14 of the lecture notes.</small>
        </Card.Footer>
      </>
    ),
  },
};
