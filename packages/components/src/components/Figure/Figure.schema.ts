import { z } from "zod";

const RegistryFigureProps = z.object({
  name: z.string().min(1),
  caption: z.string().optional(),
  credit: z.string().optional(),
});

const InlineFigureProps = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
  credit: z.string().optional(),
});

export const FigurePropsSchema = z.union([
  RegistryFigureProps,
  InlineFigureProps,
]);

export type FigureProps = z.infer<typeof FigurePropsSchema>;
