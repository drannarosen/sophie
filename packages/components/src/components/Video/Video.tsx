import { useId } from "react";
import styles from "./Video.module.css.js";
import { type VideoProps, VideoPropsSchema } from "./Video.schema.ts";

/**
 * `<Video>` — privacy-light iframe embed primitive.
 *
 * Closes the ADR 0064 video-as-link workaround gap (four+ ASTR 201
 * Modules 1–4 readings shipped link Callouts because no embedded-video
 * component existed). Static (Astro-rendered) — no IDB, no React
 * island, no client hydration required.
 *
 * Privacy-light defaults:
 *   - YouTube → `youtube-nocookie.com/embed/<id>?rel=0&modestbranding=1`
 *   - Vimeo   → `player.vimeo.com/video/<id>?dnt=1` (do-not-track)
 *   - Raw     → author-supplied `src` URL (self-hosted / institutional)
 *
 * The iframe carries `loading="lazy"` and
 * `referrerpolicy="strict-origin-when-cross-origin"` unconditionally.
 *
 * Per R10: the `<figure>` is labelled by its `<figcaption>` via
 * `aria-labelledby`; the figure is nested under the page `<main>`
 * landmark (chapter layout), so `<figure>` is the right named region
 * shape (`<main>` would collide, `<section>` is heavier than needed
 * for a single-media block). The required `title` prop gives axe its
 * `frame-title` rule.
 *
 * Misuse (missing `id` for hosted providers, missing `src` for raw)
 * throws a curated Zod error at render time from the schema's
 * `.refine()` — fail loud, fail early.
 */
export function Video(props: VideoProps) {
  const parsed = VideoPropsSchema.parse(props);
  const captionId = useId();
  const src = resolveSrc(parsed);

  return (
    <figure className={styles.root} aria-labelledby={captionId}>
      <div className={styles.frame}>
        <iframe
          src={src}
          title={parsed.title}
          width={parsed.width}
          height={parsed.height}
          loading='lazy'
          referrerPolicy='strict-origin-when-cross-origin'
          allow='accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
          allowFullScreen
        />
      </div>
      <figcaption id={captionId} className={styles.caption}>
        {parsed.caption}
        {parsed.credit !== undefined && (
          <span className={styles.credit}> — {parsed.credit}</span>
        )}
      </figcaption>
    </figure>
  );
}

function resolveSrc(p: VideoProps): string {
  // The schema refinement guarantees the per-provider source-field
  // invariant (`raw` → `src` set; `youtube`/`vimeo` → `id` set), but
  // TypeScript can't narrow on a `.refine()`. Branch defensively and
  // throw on the impossible-by-refinement path; the throw is
  // structurally unreachable but defends against future schema
  // mutations + documents the invariant.
  if (p.provider === "raw") {
    if (p.src === undefined) {
      throw new Error("Video: provider='raw' requires `src`.");
    }
    return p.src;
  }
  if (p.id === undefined) {
    throw new Error("Video: provider='youtube'|'vimeo' requires `id`.");
  }
  if (p.provider === "vimeo") {
    return `https://player.vimeo.com/video/${p.id}?dnt=1`;
  }
  return `https://www.youtube-nocookie.com/embed/${p.id}?rel=0&modestbranding=1`;
}
