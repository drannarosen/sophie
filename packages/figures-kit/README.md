# @sophie/figures-kit

Universal interactive-figure chrome kit for Sophie. Modular primitives
+ cross-figure helpers, designed for **AI-as-primary-author with
instructor as supervisor** (per [ADR 0030](../../docs/website/decisions/0030-audience-and-ai-authoring.md)).

## What's in the kit

| Primitive | Purpose |
| --- | --- |
| `<Figure>` | Outer `<figure>` shell — role attribution + chrome anatomy |
| `<FigureTitle>` | Styled title bar (Lucide icon + Plex Sans semibold). Renders `<header>` |
| `<FigureBody>` | Body container with `layout="single"` or `"two-pane"` |
| `<FigureControls>` | Slider / button row between title and body |
| `<FigurePanel>` | Inner canvas — wraps any backend (Plot / R3F / React Flow / iframe) |
| `<FigureAside>` | Right-hand readouts pane (two-pane layouts) |
| `<FigureFooter>` | Bottom strip — approximation toggles / legend / attribution |
| `<FigureCaption>` | Semantic `<figcaption>` — prose caption with optional numbering |
| `<Readout>` | Role-pill + value + role-color underline |
| `<ValidityToggle>` | Labeled checkbox + dashed amber rule (approximation overlays) |
| `<ResetButton>` | Ghost-style button + optional Lucide icon |
| `<ParameterScrub>` | Sugar over `<ParameterCursor>` + `<ParameterSlider>` (ADR 0059) |
| `<ColorSwatch>` | Round colored swatch (oklch-lerping) |
| `<InlineMath>` | KaTeX wrapper (`output: htmlAndMathml`) |

Plus utility helpers: `useResolvedRoleColor`, `tickPowerOfTen`,
`formatScientificTex`, `useFigureGeometry`.

## Design principles

- **Strict source ordering**: title → controls → body → footer → caption.
  Source order = reading order = DOM order = visual order. AI scaffolds
  don't have to think about layout.
- **Backend-agnostic**: chrome wraps any inner renderer. The kit does
  not impose Observable Plot, React Flow, Three.js, or iframe. Each
  typed figure component (in sub-brand packages like
  `@sophie/figures-astro`) chooses its own backend inside `<FigurePanel>`.
- **Epistemic role attribution** per [ADR 0058](../../docs/website/decisions/0058-epistemic-component-contract.md):
  every `<Figure>` declares a primary `role`; readouts and panels can
  carry their own role. Role tokens come from `@sophie/theme`.
- **Accessibility-first**: axe-core on every primitive; required
  accessible-name rule (a `<Figure>` MUST have at least a
  `<FigureTitle>` or `<FigureCaption>`); `aria-labelledby` wiring is
  automatic.

## Authoring model

Per ADR 0030:

- **Typed figure components** (in `@sophie/figures-astro` etc.) are the
  90% path for chapter authors and AI scaffolding.
- **Compound primitives** (this kit) are the 10% path for custom
  composition. AI uses them when no typed component fits.

## Consumed by

- `@sophie/figures-astro` — domain-typed astronomy figures
  (BlackbodyExplorer, HRDiagram, …)
- Future `@sophie/figures-cs` — Compute domain figures
- Future `@sophie/figures-*` sub-brand packages

## Where Storybook lives

Stories live alongside source (`src/**/*.stories.tsx`); they're
discovered by `@sophie/components`'s central Storybook config
(`packages/components/.storybook/main.ts`) so the whole Sophie surface
browses in one Storybook instance.
