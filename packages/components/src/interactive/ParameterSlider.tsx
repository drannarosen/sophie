import * as Slider from "@radix-ui/react-slider";
import { useId } from "react";
import styles from "./ParameterSlider.module.css.js";
import {
  type ParameterSliderProps,
  ParameterSliderPropsSchema,
} from "./ParameterSlider.schema.ts";
import { useLinkedParameter } from "./useLinkedParameter.ts";

function defaultFormat(value: number, unit: string | undefined): string {
  const formatted =
    Math.abs(value) >= 100
      ? value.toFixed(0)
      : Math.abs(value) >= 10
        ? value.toFixed(1)
        : value.toFixed(2);
  return unit ? `${formatted} ${unit}` : formatted;
}

function defaultStep(def: {
  min: number;
  max: number;
  step?: number | "log";
}): number {
  if (def.step === "log") return (def.max - def.min) / 200;
  if (typeof def.step === "number") return def.step;
  return (def.max - def.min) / 100;
}

/**
 * Radix-backed control surface for an A11 parameter cursor (per
 * ADR 0059). Reads the named cursor's current value, renders a label
 * + readout, and dispatches updates to the store on drag/keyboard.
 *
 * Renders nothing if the named cursor has not been registered yet
 * (e.g., `<ParameterCursor>` mounts later in render order, or never).
 *
 * Per ADR 0058, `<ParameterSlider>` is chrome — it controls cursors;
 * the cursors carry the epistemic content.
 */
export function ParameterSlider(
  rawProps: ParameterSliderProps
): React.ReactNode {
  ParameterSliderPropsSchema.parse({
    name: rawProps.name,
    label: rawProps.label,
    ariaLabel: rawProps.ariaLabel,
  });

  const { name, label, ariaLabel, format } = rawProps;
  const [value, setValue, def] = useLinkedParameter(name);
  const readoutId = useId();

  if (def === undefined || value === undefined) return null;

  const step = defaultStep(def);
  const readout = format ? format(value) : defaultFormat(value, def.unit);

  return (
    <div className={styles.root}>
      <label className={styles.label} htmlFor={readoutId}>
        {label}
      </label>
      <output className={styles.readout} id={readoutId}>
        {readout}
      </output>
      <Slider.Root
        className={styles.slider}
        value={[value]}
        min={def.min}
        max={def.max}
        step={step}
        onValueChange={(v: number[]) => {
          const next = v[0];
          if (next !== undefined) setValue(next);
        }}
        aria-label={ariaLabel ?? label}
      >
        <Slider.Track className={styles.track}>
          <Slider.Range className={styles.range} />
        </Slider.Track>
        <Slider.Thumb
          className={styles.thumb}
          aria-label={ariaLabel ?? label}
        />
      </Slider.Root>
    </div>
  );
}
