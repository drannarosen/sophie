import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

/**
 * Landing-page configuration. `layout` selects a built-in shipped by
 * `@sophie/components` OR `"custom"` (per Anna's H2 decision) — when
 * `"custom"`, `info-page.astro` dispatches to the integration-supplied
 * override (`defineSophieIntegration({ landings: { course: MyComp } })`).
 *
 * The enum + "custom" reconcile schema declaration with integration
 * override: with `"custom"` declared, the override path is explicit;
 * without it, the schema enum picks one of the three built-ins. One
 * declarative locus of truth, not two.
 */
const HeroSchema = z
  .object({
    title: z.string().optional(),
    tagline: z.string().optional(),
    image_ref: z.string().optional(),
    cta: z
      .object({
        label: NonEmptyString,
        href: NonEmptyString,
      })
      .strict()
      .optional(),
  })
  .strict();

export const LandingSchema = z
  .object({
    layout: z
      .enum(["hero-with-modules", "simple-list", "prose-with-toc", "custom"])
      .default("simple-list"),
    hero: HeroSchema.optional(),
    show_announcements: z.boolean().optional(),
  })
  .strict();

export type Landing = z.infer<typeof LandingSchema>;
