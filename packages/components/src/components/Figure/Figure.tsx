import type { FigureRegistry } from "../../runtime/index.ts";
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
  return (
    <FigureBody
      src={entry.src}
      alt={entry.alt}
      caption={caption ?? entry.caption}
      credit={credit ?? entry.credit}
    />
  );
}

function FigureBody({
  src,
  alt,
  caption,
  credit,
}: {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
}) {
  return (
    <figure className={styles.figure}>
      <img className={styles.image} src={src} alt={alt} loading='lazy' />
      {(caption !== undefined || credit !== undefined) && (
        <figcaption className={styles.caption}>
          {caption}
          {credit !== undefined && (
            <span className={styles.credit}>{credit}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
