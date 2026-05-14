declare module "*.module.css.js" {
  const styles: Record<string, string>;
  export default styles;
}

// KaTeX ships its stylesheet at a bare-CSS path; the import is
// side-effect-only (no exported value). Used by EqRef.stories so
// the rendered display math in HoverCard popovers picks up
// KaTeX's spacing rules.
declare module "katex/dist/katex.min.css";
