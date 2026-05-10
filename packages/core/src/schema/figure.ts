import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

export const FigureSchema = z.object({
  name: Slug,
  src: NonEmptyString,
  alt: NonEmptyString,
  caption: z.string().optional(),
  credit: z.string().optional(),
});

export type Figure = z.infer<typeof FigureSchema>;
