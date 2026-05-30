/** A master image's path and intrinsic dimensions (read via sharp). */
export interface FigureDimensions {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

/** A planned downscale: the source dims plus the capped target dims. */
export interface DownscalePlan extends FigureDimensions {
  readonly targetWidth: number;
  readonly targetHeight: number;
}

/**
 * Plan which masters exceed `maxEdge` on their long edge and the target
 * dimensions to shrink them to (ADR 0094). Pure aspect-ratio math; the
 * `downscale` command feeds the plan to sharp.
 *
 * Aspect ratio is preserved: the long edge becomes `maxEdge`, the short
 * edge scales proportionally and is rounded to the nearest integer.
 * Masters already within the cap are omitted (no needless re-encode).
 */
export function planDownscale(
  images: readonly FigureDimensions[],
  maxEdge: number
): DownscalePlan[] {
  const plan: DownscalePlan[] = [];
  for (const img of images) {
    const longEdge = Math.max(img.width, img.height);
    if (longEdge <= maxEdge) continue;
    const scale = maxEdge / longEdge;
    plan.push({
      ...img,
      targetWidth: Math.round(img.width * scale),
      targetHeight: Math.round(img.height * scale),
    });
  }
  return plan;
}
