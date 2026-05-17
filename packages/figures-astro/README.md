# @sophie/figures-astro

Domain-typed astronomy figures for Sophie. Each component is a typed
wrapper over `@sophie/figures-kit` chrome primitives — the 90% MDX
authoring surface for astronomy chapters (and Sophie Astro sub-brand
content per [ADR 0001](../../docs/website/decisions/0001-platform-not-monorepo.md)).

## Public surface

| Component | What it does |
| --- | --- |
| `<BlackbodyExplorer>` | Scrubbable Planck-curve plot with role-attributed readouts (Wien peak, Stefan–Boltzmann flux, spectral classification, chromaticity swatch). |
| _(future)_ `<HRDiagram>` | Hertzsprung–Russell scatter plot |
| _(future)_ `<LightCurve>` | Variable-star light curves |

## Composition pattern

Each typed figure is implemented in terms of `@sophie/figures-kit`
chrome primitives:

```tsx
import {
  Figure, FigureTitle, FigureControls, FigureBody,
  FigurePanel, FigureAside, FigureFooter, FigureCaption,
  Readout, ValidityToggle, ResetButton, ParameterScrub,
} from "@sophie/figures-kit";

export function BlackbodyExplorer({ id, initialT = 5772 }) {
  // ... domain state via useLinkedParameter ...
  return (
    <Figure id={id} role="model">
      <FigureTitle icon="Telescope">Blackbody Spectrum Explorer</FigureTitle>
      <FigureControls>
        <ParameterScrub name="T" min={1000} max={50000} default={initialT} unit="K" />
        <ResetButton icon="Sun" onClick={resetToSun}>Reset to Sun</ResetButton>
      </FigureControls>
      <FigureBody layout="two-pane">
        <FigurePanel role="model">{/* Plot rendered here */}</FigurePanel>
        <FigureAside>{/* Readouts here */}</FigureAside>
      </FigureBody>
      <FigureFooter>{/* ValidityToggles */}</FigureFooter>
    </Figure>
  );
}
```

## Authoring (MDX)

```mdx
<BlackbodyExplorer id="bb-sun" initialT={5772} />
```

Chapter authors / AI scaffolding stay at this one-line surface. The
chrome inside is `@sophie/figures-kit`'s problem — `figures-astro`
just provides the domain-typed surface.
