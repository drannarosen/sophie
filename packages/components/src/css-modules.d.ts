declare module "*.module.css.js" {
  const styles: Record<string, string>;
  export default styles;
}

// KaTeX ships its stylesheet at a bare-CSS path; the import is
// side-effect-only (no exported value). Used by EqRef.stories so
// the rendered display math in HoverCard popovers picks up
// KaTeX's spacing rules.
declare module "katex/dist/katex.min.css";

// Theme CSS exports — side-effect-only imports from @sophie/theme.
// `/fonts` ships IBM Plex Sans + Mono @font-face declarations via
// the @fontsource packages bundled into dist/fonts.css; `/css` ships
// the design-token CSS custom properties. Used by Storybook
// preview.tsx to wire fonts + tokens into the iframe.
declare module "@sophie/theme/css";
declare module "@sophie/theme/fonts";
declare module "@sophie/theme/math";
