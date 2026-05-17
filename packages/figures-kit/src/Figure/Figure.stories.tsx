import type { Meta, StoryObj } from "@storybook/react-vite";
import { Figure } from "./Figure.tsx";

/**
 * `<Figure>` — root chrome primitive. Standalone in Phase B.1; the
 * full chrome shell composes here in Phase B.2–B.8 as
 * `<FigureTitle>` / `<FigureControls>` / `<FigureBody>` /
 * `<FigureFooter>` / `<FigureCaption>` land.
 *
 * Stories use bare `<header>` + `<figcaption>` children with no
 * padding or styling of their own — they exist only to exercise the
 * slot composition and `aria-labelledby` plumbing before the
 * downstream primitives exist. Once those primitives land, each
 * supplies its own padding/typography via its CSS module.
 */
const meta = {
  title: "Figures Kit/Figure",
  component: Figure,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Figure>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bare: Story = {
  name: "Bare (no role, label via aria-labelledby)",
  args: {
    id: "figure-bare",
    "aria-labelledby": "figure-bare-title",
    children: (
      <>
        <header id='figure-bare-title'>A bare figure</header>
        <p>
          The smallest valid Figure: a labelled root with no chrome children
          yet. Phase B.2 introduces <code>&lt;FigureTitle&gt;</code> so this
          shape becomes self-labelling.
        </p>
      </>
    ),
  },
};

export const WithModelRole: Story = {
  name: "Epistemic role: model (4px left rule)",
  args: {
    id: "figure-model",
    epistemicRole: "model",
    "aria-labelledby": "figure-model-title",
    children: (
      <>
        <header id='figure-model-title'>Planck spectrum (placeholder)</header>
        <p>
          The optional <code>epistemicRole</code> prop surfaces as{" "}
          <code>data-epistemic-role="model"</code>, which the CSS module keys on
          for the 4px role-coloured left rule.
        </p>
      </>
    ),
  },
};

export const WithObservableRole: Story = {
  name: "Epistemic role: observable",
  args: {
    id: "figure-observable",
    epistemicRole: "observable",
    "aria-labelledby": "figure-observable-title",
    children: (
      <header id='figure-observable-title'>
        Observed spectrum (placeholder)
      </header>
    ),
  },
};

export const WithCaption: Story = {
  name: "Labelled via <figcaption>",
  args: {
    id: "figure-caption",
    "aria-labelledby": "figure-caption-cap",
    children: (
      <>
        <p>Body content above the caption.</p>
        <figcaption id='figure-caption-cap'>
          <strong>Figure 1.</strong> A caption-labelled figure.
        </figcaption>
      </>
    ),
  },
};
