import * as Plot from "@observablehq/plot";
import { Sun, Telescope } from "lucide-react";
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

const UNICODE_SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
};

// Format a log-axis tick value as 10ⁿ using Unicode superscripts —
// publication-standard convention for scientific axes (matplotlib +
// matplotlib-rendered ApJ figures use the same form). Tick labels live
// inside SVG <text> elements where KaTeX cannot be rendered without
// <foreignObject>, which is unstable across Linux/Mac VR per Section 4
// of interactive-figure-target.md. Returns an empty string for non-
// decade values so Plot's minor ticks remain as marks without labels.
function tickPowerOfTen(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  const exp = Math.round(Math.log10(value));
  if (Math.abs(value - 10 ** exp) > 1e-9 * value) return "";
  const expStr = String(exp);
  const superscript = Array.from(expStr)
    .map((c) => UNICODE_SUPERSCRIPTS[c] ?? c)
    .join("");
  return `10${superscript}`;
}

interface SpectrumPlotProps {
  T_K: number;
  showRayleighJeans: boolean;
  showWien: boolean;
}

const PLOT_WIDTH = 480;
const PLOT_HEIGHT = 300;
const PLOT_MARGIN_LEFT = 60;
const PLOT_MARGIN_BOTTOM = 44;

function SpectrumPlot({ T_K, showRayleighJeans, showWien }: SpectrumPlotProps) {
  const svgHostRef = useRef<HTMLDivElement | null>(null);
  const [wienXpx, setWienXpx] = useState<number | null>(null);
  const wienPeakNm = wienPeakWavelengthCm(T_K) * 1e7;

  useEffect(() => {
    const node = svgHostRef.current;
    if (!node) return;

    const planckCurve = buildCurveData(T_K, "planck");
    const overlays: PlanckSample[] = [];
    if (showRayleighJeans) {
      overlays.push(...buildCurveData(T_K, "rayleigh-jeans"));
    }
    if (showWien) {
      overlays.push(...buildCurveData(T_K, "wien"));
    }

    const yMax = Math.max(...planckCurve.map((p) => p.B), 1);
    const yMin = yMax * 1e-8;

    const chart = Plot.plot({
      width: PLOT_WIDTH,
      height: PLOT_HEIGHT,
      marginLeft: PLOT_MARGIN_LEFT,
      marginBottom: PLOT_MARGIN_BOTTOM,
      x: {
        type: "log",
        label: null,
        domain: [PLOT_LAMBDA_NM_MIN, PLOT_LAMBDA_NM_MAX],
        ticks: [10, 100, 1000, 10000],
        tickFormat: tickPowerOfTen,
      },
      y: {
        type: "log",
        label: null,
        domain: [yMin, yMax * 2],
        ticks: 5,
        tickFormat: tickPowerOfTen,
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
      ],
    }) as SVGElement;

    chart.setAttribute("role", "img");
    chart.setAttribute(
      "aria-label",
      `Blackbody spectrum: T = ${T_K.toFixed(0)} K, peak wavelength ${wienPeakNm.toFixed(0)} nm. Visible band shaded.`
    );
    node.replaceChildren(chart);

    // Position the Wien-peak HTML overlay via Plot's x-scale. The scale's
    // .apply() returns a pixel coordinate in the SVG's own coordinate
    // space; since the SVG fills the host div, the same number is the
    // overlay's `left` value relative to .plotContainer.
    const xScale = (
      chart as unknown as {
        scale?: (name: string) => { apply?: (v: number) => number };
      }
    ).scale?.("x");
    const px = xScale?.apply?.(wienPeakNm);
    setWienXpx(Number.isFinite(px) ? (px as number) : null);

    return () => {
      chart.remove();
    };
  }, [T_K, showRayleighJeans, showWien, wienPeakNm]);

  return (
    <div className={styles.plotContainer}>
      <div ref={svgHostRef} className={styles.plotSvgHost} />
      <span className={styles.axisLabelY}>
        <InlineMath>
          {String.raw`B_\lambda(T)\;(\mathrm{erg\,s^{-1}\,cm^{-2}\,sr^{-1}\,cm^{-1}})`}
        </InlineMath>
      </span>
      <span className={styles.axisLabelX}>
        <InlineMath>{String.raw`\lambda\;(\mathrm{nm})`}</InlineMath>
      </span>
      {wienXpx !== null && (
        <div
          className={styles.wienPeakOverlay}
          data-wien-peak-overlay
          style={{ left: `${wienXpx}px` } as React.CSSProperties}
        >
          <span className={styles.wienPeakLabel}>
            <InlineMath>
              {`\\lambda_\\text{peak} = ${wienPeakNm.toFixed(0)}\\,\\mathrm{nm}`}
            </InlineMath>
          </span>
          <span aria-hidden='true' className={styles.wienPeakTick} />
        </div>
      )}
    </div>
  );
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

  const titleId = useId();

  return (
    <section id={id} aria-labelledby={titleId} className={styles.root}>
      <ParameterCursor
        name='T'
        min={minTemperatureK}
        max={maxTemperatureK}
        default={initialTemperatureK}
        unit='K'
        step={100}
      />

      <header className={styles.titleBar}>
        <Telescope
          aria-hidden
          className={styles.titleBarIcon}
          focusable={false}
          size={20}
        />
        <span id={titleId} className={styles.titleBarTitle}>
          Blackbody Spectrum Explorer
        </span>
      </header>

      <div className={styles.sliderRow}>
        <div className={styles.sliderRowSlider}>
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
          <Sun
            aria-hidden
            className={styles.solarAnchorIcon}
            focusable={false}
            size={14}
          />
          Reset to Sun
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.plotPanel} data-epistemic-role='model'>
          <SpectrumPlot
            T_K={T_K}
            showRayleighJeans={showRJ}
            showWien={showWien}
          />
        </div>

        <div className={styles.aside}>
          <div className={styles.readoutGroup} data-epistemic-role='observable'>
            <span className={styles.readoutPill}>Observable</span>
            <div className={styles.chromaticityReadoutBody}>
              <span
                aria-hidden='true'
                className={styles.colorSwatch}
                data-testid='color-swatch'
                style={
                  {
                    "--swatch-color": `rgb(${swatch.r}, ${swatch.g}, ${swatch.b})`,
                  } as React.CSSProperties
                }
              />
              <span className={styles.chromaticityCaption}>
                chromaticity at{" "}
                <InlineMath>{`T = ${T_K.toFixed(0)}\\,\\mathrm{K}`}</InlineMath>
              </span>
            </div>
          </div>

          <div className={styles.readoutGroup} data-epistemic-role='inference'>
            <span className={styles.readoutPill}>Wien peak</span>
            <span
              className={styles.readoutValue}
              data-testid='wien-peak-readout'
            >
              <InlineMath>
                {`\\lambda_\\text{peak} = ${lambdaPeakNm.toFixed(0)}\\,\\mathrm{nm}`}
              </InlineMath>
            </span>
          </div>

          <div className={styles.readoutGroup} data-epistemic-role='inference'>
            <span className={styles.readoutPill}>Stefan–Boltzmann flux</span>
            <span className={styles.readoutValue} data-testid='flux-readout'>
              <InlineMath>
                {`F = ${formatScientificTex(flux)}\\,\\mathrm{erg\\,s^{-1}\\,cm^{-2}}`}
              </InlineMath>
            </span>
          </div>

          <div className={styles.readoutGroup} data-epistemic-role='inference'>
            <span className={styles.readoutPill}>Spectral class</span>
            <span
              className={styles.readoutValue}
              data-testid='classification-readout'
            >
              {klass}-type
            </span>
          </div>
        </div>
      </div>

      {showApproximations && (
        <div
          className={styles.approxToggles}
          data-epistemic-role='approximation'
        >
          <label className={styles.approxLabel} htmlFor={rjId}>
            <input
              aria-describedby={`${rjId}-hint`}
              checked={showRJ}
              id={rjId}
              onChange={(e) => setShowRJ(e.target.checked)}
              type='checkbox'
            />
            Rayleigh–Jeans limit
          </label>
          {showRJ && (
            <span className={styles.validityHint} id={`${rjId}-hint`}>
              Valid only at long wavelength (
              <InlineMath>
                {String.raw`\lambda \gg \lambda_\text{peak}`}
              </InlineMath>
              ); diverges in the UV.
            </span>
          )}

          <label className={styles.approxLabel} htmlFor={wienId}>
            <input
              aria-describedby={`${wienId}-hint`}
              checked={showWien}
              id={wienId}
              onChange={(e) => setShowWien(e.target.checked)}
              type='checkbox'
            />
            Wien approximation
          </label>
          {showWien && (
            <span className={styles.validityHint} id={`${wienId}-hint`}>
              Valid only at short wavelength (
              <InlineMath>
                {String.raw`\lambda \ll \lambda_\text{peak}`}
              </InlineMath>
              ); underpredicts in the IR.
            </span>
          )}
        </div>
      )}
    </section>
  );
}
