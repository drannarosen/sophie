import type { FigureRegistry } from "../../runtime/index.ts";
import { MathText } from "../../runtime/MathText.tsx";
import { withBase } from "../../utils/with-base.ts";
import { lookupCanonicalUsageByName } from "../FigureRef/figure-usages-store.ts";
import styles from "./Figure.module.css.js";
import type { FigureProps } from "./Figure.schema.ts";

export type FigureComponentProps = FigureProps & { registry?: FigureRegistry };

export function Figure(props: FigureComponentProps) {
  if ("name" in props) {
    return (
      <FigureFromRegistry
        name={props.name}
        registry={props.registry}
        caption={props.caption}
        credit={props.credit}
      />
    );
  }
  return (
    <FigureBody
      src={props.src}
      alt={props.alt}
      caption={props.caption}
      credit={props.credit}
    />
  );
}

function FigureFromRegistry({
  name,
  registry,
  caption,
  credit,
}: {
  name: string;
  registry: FigureRegistry | undefined;
  caption?: string;
  credit?: string;
}) {
  const entry = registry?.[name];
  // Sprint F — pull the canonical usage's per-chapter number + display
  // chapter number for the "Figure N.M: " caption prefix. When no
  // usage entry is registered (figure exists but author hasn't wired
  // it through MDX yet), label is omitted and the caption renders as
  // before. Multi-callsite case: every callsite shows the canonical
  // entry's number (v1 limitation; documented in the pilot report).
  const usage = lookupCanonicalUsageByName(name);
  if (entry === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[@sophie/components] <Figure name="${name}"> not found in registry. Pass a registry prop (or wrap chapter content with <Content components={makeStaticComponents({ figures })} />).`
      );
    }
    return (
      <figure className={styles.figure}>
        <div className={styles.missing} role='img' aria-label='Missing figure'>
          Missing figure: <code>{name}</code>
        </div>
      </figure>
    );
  }
  // ADR 0094: a registry entry's `src` is optional — an optimized entry
  // (master in src/figures/) carries no public URL and renders through
  // the route's server-side <FigureImage>. The React path can't optimize,
  // so an optimized-only entry has no image to draw here (this branch is
  // reached only in non-route contexts such as Storybook, where fixtures
  // should supply a `src`).
  if (entry.src === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[@sophie/components] <Figure name="${name}"> is optimized-only (no public src). Render it via a route that maps Figure→FigureImage, or supply a src for non-route contexts.`
      );
    }
    return (
      <figure className={styles.figure}>
        <div
          className={styles.missing}
          role='img'
          aria-label='Figure has no inline source'
        >
          Figure <code>{name}</code> has no inline source
        </div>
      </figure>
    );
  }
  return (
    <FigureBody
      src={entry.src}
      alt={entry.alt}
      caption={caption ?? entry.caption}
      credit={credit ?? entry.credit}
      number={usage?.number}
      chapterNumber={usage?.chapterNumber}
    />
  );
}

function FigureBody({
  src,
  alt,
  caption,
  credit,
  number,
  chapterNumber,
}: {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  number?: number;
  chapterNumber?: number;
}) {
  const label = formatFigureLabel(number, chapterNumber);
  return (
    <figure className={styles.figure}>
      <img
        className={styles.image}
        src={withBase(src)}
        alt={alt}
        loading='lazy'
      />
      {(caption !== undefined || credit !== undefined || label !== null) && (
        <figcaption className={styles.caption}>
          {label !== null && <span className={styles.label}>{label}</span>}
          {caption !== undefined && <MathText>{caption}</MathText>}
          {credit !== undefined && (
            <span className={styles.credit}>{credit}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

function formatFigureLabel(
  number: number | undefined,
  chapterNumber: number | undefined
): string | null {
  if (number === undefined) return null;
  const stem =
    chapterNumber !== undefined ? `${chapterNumber}.${number}` : `${number}`;
  return `Figure ${stem}`;
}
