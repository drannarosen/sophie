import type { ReactNode } from "react";
import { z } from "zod";

/**
 * RepVerbal — prose representation child of `<MultiRep>` per
 * ADR 0043 + the 2026-05-17 MultiRep design hardening.
 *
 * Authoring shape (MDX): plain prose body.
 * Runtime shape (after extraction): `{ body: string }` serialized
 * into the parent's `reps` array. The component itself accepts
 * `children` for the authoring/Storybook path and `body` for the
 * extractor-fed path; the renderer uses whichever is present.
 *
 * Intuition framing belongs in prose here — the dropped
 * `<RepIntuition>` primitive (2026-05-14 hardening) collapsed into
 * `<RepVerbal>`.
 */
export const RepVerbalPropsSchema = z.object({
  /** Author-mode: inline MDX children rendered verbatim. */
  children: z.custom<ReactNode>().optional(),
  /** Extractor-mode: prose body string serialized from MDX children. */
  body: z.string().min(1).optional(),
});

export type RepVerbalProps = z.infer<typeof RepVerbalPropsSchema>;
