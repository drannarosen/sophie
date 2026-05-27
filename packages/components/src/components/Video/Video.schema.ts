import { NonEmptyString } from "@sophie/core/schema";
import { z } from "zod";

/**
 * `VideoProvider` — selects the host whose embed URL shape `<Video>` resolves to.
 *
 *   - `youtube`  Default. Resolves to the privacy-enhanced
 *                `youtube-nocookie.com/embed/<id>` host with
 *                `rel=0&modestbranding=1` params. Requires `id`.
 *   - `vimeo`    Resolves to `player.vimeo.com/video/<id>?dnt=1`
 *                (do-not-track). Requires `id`.
 *   - `raw`      Authors supply a full `src` URL (e.g. self-hosted
 *                MP4 stream, institutional video service). Requires
 *                `src`; ignores `id`.
 */
export const VideoProviderSchema = z.enum(["youtube", "vimeo", "raw"]);
export type VideoProvider = z.infer<typeof VideoProviderSchema>;

/**
 * Props for `<Video>`. Static (Astro-rendered) embed primitive that
 * closes the ADR 0064 video-as-link workaround gap.
 *
 * Privacy-light defaults are non-negotiable:
 *   - `youtube` provider uses the `youtube-nocookie.com` host;
 *   - `vimeo` provider passes `?dnt=1`;
 *   - the rendered iframe sets `loading="lazy"` and
 *     `referrerpolicy="strict-origin-when-cross-origin"`.
 *
 * Required fields for axe-cleanliness:
 *   - `title` becomes the iframe's `title` attribute (axe's
 *     `frame-title` rule).
 *   - `caption` becomes the `<figcaption>` content; the `<figure>`
 *     is labelled by it via `aria-labelledby` (R10).
 *
 * The refinement enforces the provider→source-field contract:
 * `youtube`/`vimeo` require `id`; `raw` requires `src`.
 */
export const VideoPropsSchema = z
  .object({
    id: NonEmptyString.optional(),
    src: z.string().url().optional(),
    /**
     * Use `.optional()` (not `.default("youtube")`) so JSX callers can
     * omit `provider` without it being type-required. The component
     * narrows `provider ?? "youtube"` at render. Matches the
     * `<Intervention>` pattern documented inline at that schema.
     */
    provider: VideoProviderSchema.optional(),
    title: NonEmptyString,
    caption: NonEmptyString,
    credit: NonEmptyString.optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .strict()
  .refine(
    (v) => (v.provider === "raw" ? v.src !== undefined : v.id !== undefined),
    {
      message:
        "Video: provider='raw' requires `src`; provider='youtube'|'vimeo' requires `id`.",
    }
  );

export type VideoProps = z.infer<typeof VideoPropsSchema>;
