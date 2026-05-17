import * as Plot from "@observablehq/plot";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ParameterCursor } from "../../interactive/ParameterCursor.tsx";
import { ParameterSlider } from "../../interactive/ParameterSlider.tsx";
import { useParameterStore } from "../../interactive/store.ts";
import { useLinkedParameter } from "../../interactive/useLinkedParameter.ts";
import styles from "./BlackbodyExplorer.module.css.js";
import {
  type BlackbodyExplorerProps,
  BlackbodyExplorerPropsSchema,
} from "./BlackbodyExplorer.schema.ts";
import { blackbodyToSrgb } from "./chromaticity.ts";
import { spectralClassification } from "./classification.ts";
import { InlineMath } from "./InlineMath.tsx";
import {
  nmToCm,
  planckLambda,
  rayleighJeansLambda,
  stefanBoltzmannFlux,
  wienApproxLambda,
  wienPeakWavelengthCm,
} from "./physics.ts";

// Astronomy constants in the figure scope.
const T_SUN = 5772; // IAU 2015 nominal solar effective temperature.
const VISIBLE_BAND_NM_MIN = 380;
const VISIBLE_BAND_NM_MAX = 740;
const PLOT_LAMBDA_NM_MIN = 10; // 0.01 µm — extreme UV
const PLOT_LAMBDA_NM_MAX = 10000; // 10 µm — far IR

interface PlanckSample {
  lambdaNm: number;
  B: number;
  curve: "planck" | "rayleigh-jeans" | "wien";
}

function buildCurveData(
  T_K: number,
  variant: "planck" | "rayleigh-jeans" | "wien",
  nPoints = 240
): PlanckSample[] {
  const logMin = Math.log10(PLOT_LAMBDA_NM_MIN);
  const logMax = Math.log10(PLOT_LAMBDA_NM_MAX);
  const samples: PlanckSample[] = [];
  for (let i = 0; i < nPoints; i++) {
    const logL = logMin + (logMax - logMin) * (i / (nPoints - 1));
    const lambdaNm = 10 ** logL;
    const lambdaCm = nmToCm(lambdaNm);
    const B =
      variant === "planck"
        ? planckLambda(T_K, lambdaCm)
        : variant === "rayleigh-jeans"
          ? rayleighJeansLambda(T_K, lambdaCm)
          : wienApproxLambda(T_K, lambdaCm);
    if (Number.isFinite(B) && B > 0) {
      samples.push({ lambdaNm, B, curve: variant });
    }
  }
  return samples;
}

function formatScientificTex(value: number): string {
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / 10 ** exponent;
  return `${mantissa.toFixed(2)} \\times 10^{${exponent}}`;
}

interface SpectrumPlotProps {
  T_K: number;
  showRayleighJeans: boolean;
  showWien: boolean;
}

function SpectrumPlot({ T_K, showRayleighJeans, showWien }: SpectrumPlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const planckCurve = buildCurveData(T_K, "planck");
    const overlays: PlanckSample[] = [];
    if (showRayleighJeans) {
      overlays.push(...buildCurveData(T_K, "rayleigh-jeans"));
    }
    if (showWien) {
      overlays.push(...buildCurveData(T_K, "wien"));
    }

    const wienPeakNm = wienPeakWavelengthCm(T_K) * 1e7;
    const yMax = Math.max(...planckCurve.map((p) => p.B), 1);
    const yMin = yMax * 1e-8;

    const chart = Plot.plot({
      width: 480,
      height: 300,
      marginLeft: 60,
      marginBottom: 44,
      x: {
        type: "log",
        label: "λ (nm)",
        domain: [PLOT_LAMBDA_NM_MIN, PLOT_LAMBDA_NM_MAX],
      },
      y: {
        type: "log",
        label: "B_λ (erg s⁻¹ cm⁻² sr⁻¹ cm⁻¹)",
        domain: [yMin, yMax * 2],
      },
      marks: [
        Plot.rectX(
          [
            {
              x1: VISIBLE_BAND_NM_MIN,
              x2: VISIBLE_BAND_NM_MAX,
              y1: yMin,
              y2: yMax * 2,
            },
          ],
          {
            x1: "x1",
            x2: "x2",
            y1: "y1",
            y2: "y2",
            fill: "rgba(255, 220, 100, 0.18)",
            stroke: "none",
            ariaLabel: null,
            ariaHidden: "true",
          }
        ),
        Plot.line(planckCurve, {
          x: "lambdaNm",
          y: "B",
          stroke: "#2563eb",
          strokeWidth: 2,
          ariaLabel: null,
          ariaHidden: "true",
        }),
        Plot.line(
          overlays.filter((p) => p.curve === "rayleigh-jeans"),
          {
            x: "lambdaNm",
            y: "B",
            stroke: "#94a3b8",
            strokeDasharray: "4 3",
            strokeWidth: 1.5,
            ariaLabel: null,
            ariaHidden: "true",
          }
        ),
        Plot.line(
          overlays.filter((p) => p.curve === "wien"),
          {
            x: "lambdaNm",
            y: "B",
            stroke: "#475569",
            strokeDasharray: "2 3",
            strokeWidth: 1.5,
            ariaLabel: null,
            ariaHidden: "true",
          }
        ),
        Plot.ruleX([wienPeakNm], {
          stroke: "#818cf8",
          strokeDasharray: "6 4",
          strokeWidth: 1.5,
          ariaLabel: null,
          ariaHidden: "true",
        }),
      ],
    }) as SVGElement;

    chart.setAttribute("role", "img");
    chart.setAttribute(
      "aria-label",
      `Blackbody spectrum: T = ${T_K.toFixed(0)} K, peak wavelength ${wienPeakNm.toFixed(0)} nm. Visible band shaded.`
    );
    node.replaceChildren(chart);
    return () => {
      chart.remove();
    };
  }, [T_K, showRayleighJeans, showWien]);

  return <div ref={containerRef} className={styles.plotContainer} />;
}

/**
 * `<BlackbodyExplorer>` — first interactive figure consumer of ADR 0059's
 * A11 primitive. Exercises four ADR 0058 epistemic roles on one page:
 *
 *  - `model`        : the Planck curve B_λ(T)
 *  - `observable`   : visible-band shading + chromaticity swatch
 *  - `inference`    : Wien peak readout, Stefan-Boltzmann flux, spectral class
 *  - `approximation`: Rayleigh-Jeans + Wien limit overlays with validity hints
 *
 * The figure is self-namespacing: its root `<section id={id}>` provides the
 * cursor scope, so multiple `<BlackbodyExplorer>` instances on one page
 * carry independent T cursors.
 *
 * Domain-specific (astronomy); long-term this graduates to a Sophie Astro
 * sub-brand package per ADR 0001's standalone-platform shape. v1 ships
 * here as the canonical demonstration of the Reasoning-OS contract.
 */
export function BlackbodyExplorer(rawProps: BlackbodyExplorerProps) {
  const props = BlackbodyExplorerPropsSchema.parse(rawProps);
  const {
    id,
    initialTemperatureK = T_SUN,
    minTemperatureK = 1000,
    maxTemperatureK = 50000,
    showApproximations = true,
  } = props;

  const cursorKey = `${id}:T`;
  const [storedT] = useLinkedParameter(cursorKey);
  const T_K = storedT ?? initialTemperatureK;

  const [showRJ, setShowRJ] = useState(false);
  const [showWien, setShowWien] = useState(false);
  const rjId = useId();
  const wienId = useId();

  const swatch = useMemo(() => blackbodyToSrgb(T_K), [T_K]);
  const lambdaPeakNm = useMemo(() => wienPeakWavelengthCm(T_K) * 1e7, [T_K]);
  const flux = useMemo(() => stefanBoltzmannFlux(T_K), [T_K]);
  const klass = useMemo(() => spectralClassification(T_K), [T_K]);

  const handleSolarReset = () => {
    useParameterStore.getState().setValue(cursorKey, T_SUN);
  };

  return (
    <section id={id} className={styles.root}>
      <ParameterCursor
        name='T'
        min={minTemperatureK}
        max={maxTemperatureK}
        default={initialTemperatureK}
        unit='K'
        step={100}
      />

      <div className={styles.figureHeader}>
        <div className={styles.sliderWrapper}>
          <ParameterSlider
            name={cursorKey}
            label='Blackbody temperature'
            ariaLabel='Blackbody effective temperature in kelvin'
            format={(v) => `${v.toFixed(0)} K`}
          />
        </div>
        <button
          type='button'
          className={styles.solarAnchor}
          onClick={handleSolarReset}
        >
          Reset to Sun (5772 K)
        </button>
      </div>

      <div className={styles.plotPanel} data-epistemic-role='model'>
        <SpectrumPlot
          T_K={T_K}
          showRayleighJeans={showRJ}
          showWien={showWien}
        />
      </div>

      <aside className={styles.aside}>
        <div className={styles.readoutGroup} data-epistemic-role='observable'>
          <span className={styles.readoutLabel}>What you would see</span>
          <span className={styles.readoutValue}>
            <span
              data-testid='color-swatch'
              className={styles.colorSwatch}
              style={
                {
                  "--swatch-color": `rgb(${swatch.r}, ${swatch.g}, ${swatch.b})`,
                } as React.CSSProperties
              }
              aria-hidden='true'
            />
            <span>
              chromaticity at this T (visible band shaded on the plot)
            </span>
          </span>
        </div>

        <div className={styles.readoutGroup} data-epistemic-role='inference'>
          <span className={styles.readoutLabel}>Wien peak (inferred)</span>
          <span className={styles.readoutValue} data-testid='wien-peak-readout'>
            <InlineMath>
              {`\\lambda_\\text{peak} = ${lambdaPeakNm.toFixed(0)}\\,\\mathrm{nm}`}
            </InlineMath>
          </span>
        </div>

        <div className={styles.readoutGroup} data-epistemic-role='inference'>
          <span className={styles.readoutLabel}>
            Stefan-Boltzmann flux (inferred)
          </span>
          <span className={styles.readoutValue} data-testid='flux-readout'>
            <InlineMath>
              {`F = ${formatScientificTex(flux)}\\,\\mathrm{erg\\,s^{-1}\\,cm^{-2}}`}
            </InlineMath>
          </span>
        </div>

        <div className={styles.readoutGroup} data-epistemic-role='inference'>
          <span className={styles.readoutLabel}>
            Spectral classification (inferred)
          </span>
          <span
            className={styles.readoutValue}
            data-testid='classification-readout'
          >
            {klass}-type
          </span>
        </div>

        {showApproximations && (
          <div
            className={styles.approximationToggles}
            data-epistemic-role='approximation'
          >
            <label className={styles.approximationLabel} htmlFor={rjId}>
              <input
                id={rjId}
                type='checkbox'
                checked={showRJ}
                onChange={(e) => setShowRJ(e.target.checked)}
                aria-describedby={`${rjId}-hint`}
              />
              Rayleigh-Jeans limit
            </label>
            {showRJ && (
              <span id={`${rjId}-hint`} className={styles.validityHint}>
                Valid only at long wavelength (
                <InlineMath>{String.raw`\lambda \gg \lambda_\text{peak}`}</InlineMath>
                ); diverges in the UV.
              </span>
            )}

            <label className={styles.approximationLabel} htmlFor={wienId}>
              <input
                id={wienId}
                type='checkbox'
                checked={showWien}
                onChange={(e) => setShowWien(e.target.checked)}
                aria-describedby={`${wienId}-hint`}
              />
              Wien approximation
            </label>
            {showWien && (
              <span id={`${wienId}-hint`} className={styles.validityHint}>
                Valid only at short wavelength (
                <InlineMath>{String.raw`\lambda \ll \lambda_\text{peak}`}</InlineMath>
                ); underpredicts in the IR.
              </span>
            )}
          </div>
        )}
      </aside>
    </section>
  );
}
