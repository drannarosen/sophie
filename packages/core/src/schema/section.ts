import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

export const SectionSchema = z.object({
  id: Slug,
  heading: NonEmptyString,
});

export type Section = z.infer<typeof SectionSchema>;
