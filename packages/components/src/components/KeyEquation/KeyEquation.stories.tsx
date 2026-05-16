// KaTeX ships its stylesheet separately from the JS renderer; the
// production build pipeline in @sophie/astro pulls it in via
// rehype-katex's default CSS hook. Storybook runs in isolation, so
// we import the stylesheet here so VR baselines reflect the real
// rehype-katex output rather than hand-mocked markup.
import "katex/dist/katex.min.css";
import type { Meta, StoryObj } from "@storybook/react-vite";
import katex from "katex";
import { KeyEquation } from "./KeyEquation.tsx";

/**
 * Render TeX via KaTeX. Stories use this to mirror what production
 * gets through rehype-katex in the MDX pipeline (ADR 0002), so VR
 * baselines reflect real chapter rendering rather than mocked
 * `<em>`/`<sup>` markup.
 *
 * `display=true` emits the `.katex-display` block wrapper KaTeX
 * uses for set-off equations; `display=false` (default) emits the
 * inline `.katex` span suitable for in-prose math.
 */
function TeX({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
  });
  // katex.renderToString returns trusted HTML built from a fixed TeX
  // literal in the story args (no user input); the inner-HTML escape
  // is required to preserve KaTeX's nested span/MathML structure.
  return display ? (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX output is trusted; story-only TeX input.
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX output is trusted; story-only TeX input.
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}

const meta = {
  title: "Components/KeyEquation",
  component: KeyEquation,
  parameters: { layout: "padded" },
} satisfies Meta<typeof KeyEquation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShortForm: Story = {
  args: {
    id: "wiens-law",
    title: "Wien's Law",
    children: (
      <>
        <p>
          The relationship between temperature and peak emission wavelength is
          quantified by <strong>Wien's displacement law</strong>:
        </p>
        <p>
          <TeX tex='\lambda_{\text{peak}} = b \, T^{-1}' />
        </p>
        <p>
          where <strong>b</strong> = 0.29 cm·K is Wien's displacement constant.
        </p>
      </>
    ),
  },
};

export const LongForm: Story = {
  args: {
    id: "inverse-square-law",
    title: "The Inverse-Square Law",
    children: (
      <>
        <p>
          We'll develop this properly in a later lecture, but here's the key
          idea.
        </p>
        <p>
          Imagine a star emitting light uniformly in all directions. That light
          spreads out over the surface of an expanding sphere. At distance{" "}
          <TeX tex='d' />, the sphere has surface area 4π
          <TeX tex='d^2' />. The same total light is now spread over this larger
          area, so the <strong>flux</strong> (light per unit area) decreases:
        </p>
        <TeX tex='F = \dfrac{L}{4\pi d^2}' display />
        <p>where:</p>
        <ul>
          <li>
            <strong>F</strong> = flux (erg s⁻¹ cm⁻²)
          </li>
          <li>
            <strong>L</strong> = luminosity (erg s⁻¹)
          </li>
          <li>
            <strong>d</strong> = distance (cm)
          </li>
        </ul>
        <p>
          <strong>The key insight:</strong> Flux falls off as{" "}
          <TeX tex='1/d^2' />. Double the distance → quarter the brightness.
        </p>
      </>
    ),
  },
};

export const EquationFirst: Story = {
  args: {
    id: "kepler-third",
    title: "Kepler's Third Law",
    children: (
      <>
        <TeX tex='T^2 = a^3' display />
        <p>
          Period squared (in years) equals semi-major axis cubed (in AU) for any
          solar-system orbit. The constant is hidden in the units.
        </p>
      </>
    ),
  },
};

export const WithBlockMath: Story = {
  args: {
    id: "stefan-boltzmann",
    title: "Stefan–Boltzmann Law",
    children: (
      <>
        <p>
          The total luminosity of a blackbody radiator is set by surface area
          and temperature:
        </p>
        {/* `data-testid='math'` is preserved on a wrapping div for the
         *   "renders children verbatim, including math-block markup" unit
         *   test (KeyEquation.test.tsx). The real .katex-display wrapper
         *   is emitted by KaTeX itself via display=true. */}
        <div data-testid='math'>
          <TeX tex='L = 4\pi R^2 \sigma T^4' display />
        </div>
        <p>
          where <strong>σ</strong> is the Stefan–Boltzmann constant.
        </p>
      </>
    ),
  },
};
