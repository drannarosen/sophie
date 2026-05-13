import {
  Aside,
  Callout,
  Figure,
  type FigureRegistry,
  KeyEquation,
  MiniGlossary,
} from "@sophie/components";

export interface MakeStaticComponentsOptions {
  /**
   * Figure registry passed to every `<Figure name="…">` invocation in
   * MDX. Typically generated from a `figures.ts` or chapter frontmatter.
   */
  figures: FigureRegistry;
}

interface MdxFigureProps {
  name?: string;
  src?: string;
  alt?: string;
  caption?: string;
  credit?: string;
}

/**
 * Builds the components map for `<Content components={...} />`. Static
 * Sophie components — `<Callout>` (no persistence) and `<Figure>` —
 * resolve through this map. Interactive variants (`<InteractiveCallout>`,
 * etc.) must be imported directly inside the MDX file with `client:load`
 * directives because Astro's `<Content components>` map cannot carry
 * hydration metadata.
 *
 * Per ADR 0027.
 */
export function makeStaticComponents({ figures }: MakeStaticComponentsOptions) {
  return {
    // <Aside> is content-only (static; no state). PR 6.
    Aside,
    Callout,
    // KeyEquation is content-only (no per-instance state, no client:load).
    // Flows through the static components map alongside Callout/Figure.
    KeyEquation,
    // MiniGlossary is content-only too — direct pass-through, no
    // registry prop, no client:load. Per ADR 0027.
    MiniGlossary,
    Figure: (props: MdxFigureProps) => {
      if (props.name !== undefined) {
        return (
          <Figure
            name={props.name}
            registry={figures}
            caption={props.caption}
            credit={props.credit}
          />
        );
      }
      if (props.src !== undefined && props.alt !== undefined) {
        return (
          <Figure
            src={props.src}
            alt={props.alt}
            caption={props.caption}
            credit={props.credit}
          />
        );
      }
      // Malformed call: render the same missing-figure placeholder that
      // <Figure> uses for registry-not-found, so the failure is visible
      // rather than silent.
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "[@sophie/astro] <Figure> requires either `name` (registry mode) or `src` + `alt` (inline mode). Got:",
          props
        );
      }
      return (
        <figure>
          <div role='img' aria-label='Missing figure'>
            Missing figure: <code>(invalid props)</code>
          </div>
        </figure>
      );
    },
  };
}
