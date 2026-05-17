import { z } from "zod";

/**
 * Props for `<ParameterSlider>` — a Radix-backed control surface for
 * an A11 parameter cursor (per ADR 0059). The slider reads + writes
 * the named cursor's value. Per ADR 0058, sliders are chrome.
 */
export const ParameterSliderPropsSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  ariaLabel: z.string().optional(),
});

export type ParameterSliderProps = z.infer<
  typeof ParameterSliderPropsSchema
> & {
  /**
   * Override the inline value readout next to the slider. Receives the
   * raw cursor value; should return a display string (units, precision,
   * formatting). Not in the Zod schema because functions don't
   * serialize cleanly; runtime-only.
   */
  format?: (value: number) => string;
};
