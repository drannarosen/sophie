import { z } from "zod";

/**
 * Props for `<BlackbodyExplorer>` — the first interactive figure
 * consumer of ADR 0059's A11 primitive, validating ADR 0058's
 * eight-role epistemic contract.
 *
 * Exercises four roles on a single figure:
 *  - `model`        — Planck curve B_λ(T)
 *  - `observable`   — visible-band shading + color swatch
 *  - `inference`    — Wien peak readout, Stefan-Boltzmann flux,
 *                     spectral classification
 *  - `approximation`— Rayleigh-Jeans + Wien limit overlays
 */
export const BlackbodyExplorerPropsSchema = z.object({
  id: z.string().min(1),

  /** Initial temperature in K. Defaults to the Sun's T_eff (5772). */
  initialTemperatureK: z.number().positive().optional(),

  /** Min temperature for the slider (K). Default 1000. */
  minTemperatureK: z.number().positive().optional(),

  /** Max temperature for the slider (K). Default 50000. */
  maxTemperatureK: z.number().positive().optional(),

  /**
   * Whether to show the Rayleigh-Jeans + Wien approximation overlays
   * as toggleable layers. Default true. Set false for tighter pages
   * where the approximation pedagogy isn't relevant.
   */
  showApproximations: z.boolean().optional(),
});

export type BlackbodyExplorerProps = z.infer<
  typeof BlackbodyExplorerPropsSchema
>;
