import katex from "katex";
import { Sigma } from "lucide-react";
import { useId, useMemo } from "react";
import { lookupEquation } from "../EquationRef/equations-store.ts";
import styles from "./KeyEquation.module.css.js";
import type { KeyEquationProps } from "./KeyEquation.schema.ts";

/**
 * Named-equation content block per ADR 0060. Resolves the registry
 * entry via `refId` and renders the full card from the entry's data.
 *
 * Visual hierarchy (top to bottom):
 *   1. Chapter framing prose (from children, if any)
 *   2. Title bar (Sigma icon + entry.title)
 *   3. Primary `$$tex$$` (KaTeX-rendered)
 *   4. Biography Tier-3 cards (Observable + Assumption×N + BreaksWhen
 *      + CommonMisuse×N) — rendered via the existing biography
 *      components when the registry entry carries a biography.
 *   5. Rearranged forms (KaTeX-rendered list, if any).
 *   6. Related-equations footer (if any AND not hideRelated).
 *   7. Derivation accordion (collapsed by default; expanded when
 *      `showDerivation` is set).
 *
 * Miss fallback (refId doesn't resolve): renders framing prose only
 * with a dev `console.warn`. Build-time audit invariant R1 (Batch 6)
 * elevates this to a build error.
 */
export function KeyEquation({
  refId,
  showDerivation,
  hideRelated,
  children,
}: KeyEquationProps) {
  const entry = lookupEquation(refId);
  const titleId = useId();

  const texHtml = useMemo(() => {
    if (!entry?.tex) return "";
    return katex.renderToString(entry.tex, {
      displayMode: true,
      throwOnError: false,
      output: "html",
    });
  }, [entry?.tex]);

  const rearrangedHtml = useMemo(() => {
    if (!entry?.rearranged_forms || entry.rearranged_forms.length === 0) {
      return [];
    }
    return entry.rearranged_forms.map((form) => ({
      tex: katex.renderToString(form.tex, {
        displayMode: true,
        throwOnError: false,
        output: "html",
      }),
      solves_for: form.solves_for,
      label: form.label,
    }));
  }, [entry?.rearranged_forms]);

  if (!entry) {
    if (
      typeof process === "undefined" ||
      process.env?.NODE_ENV !== "production"
    ) {
      console.warn(
        `[KeyEquation] No equation found for refId "${refId}". Rendering framing prose only.`
      );
    }
    return <>{children}</>;
  }

  const biography = entry.biography;

  return (
    <section id={entry.id} aria-labelledby={titleId} className={styles.section}>
      {children !== undefined && children !== null ? (
        <div className={styles.framing}>{children}</div>
      ) : null}
      <header className={styles.titleBar}>
        <Sigma className={styles.icon} size={20} aria-hidden />
        <span id={titleId} className={styles.title}>
          {entry.title}
        </span>
      </header>
      <div className={styles.body}>
        <div
          className={styles.tex}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: tex is rendered by katex.renderToString from registry-validated TeX source (not user-supplied content).
          dangerouslySetInnerHTML={{ __html: texHtml }}
        />

        {entry.constants && entry.constants.length > 0 && (
          <dl
            className={styles.constants}
            aria-label={`Constants for ${entry.title}`}
          >
            {entry.constants.map((c) => (
              <div key={c.symbol} className={styles.constantRow}>
                <dt className={styles.constantSymbol}>{c.symbol}</dt>
                <dd className={styles.constantValue}>
                  {c.value}
                  {c.unit ? ` ${c.unit}` : ""}
                  {c.name ? ` — ${c.name}` : ""}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {biography?.observable ? (
          <div
            className={styles.bioCard}
            data-epistemic-role='observable'
            // biome-ignore lint/security/noDangerouslySetInnerHtml: body is pre-rendered HTML from the extractor (registry MDX body) — not user input.
            dangerouslySetInnerHTML={{
              __html: `<strong>Observable.</strong> ${biography.observable.body}`,
            }}
          />
        ) : null}

        {biography?.assumptions?.map((a, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable order from extractor; entries have no unique id.
            key={`assumption-${i}`}
            className={styles.bioCard}
            data-epistemic-role='assumption'
            data-assumption-type={a.type}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: body is pre-rendered HTML from the registry MDX body.
            dangerouslySetInnerHTML={{
              __html: `<strong>Assumption${a.type ? ` (${a.type})` : ""}.</strong> ${a.body}`,
            }}
          />
        ))}

        {biography?.breaks_when ? (
          <div
            className={styles.bioCard}
            data-epistemic-role='approximation'
            // biome-ignore lint/security/noDangerouslySetInnerHtml: body is pre-rendered HTML from the registry MDX body.
            dangerouslySetInnerHTML={{
              __html: `<strong>Breaks when.</strong> ${biography.breaks_when.body}`,
            }}
          />
        ) : null}

        {biography?.common_misuses?.map((m, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable order from extractor.
            key={`misuse-${i}`}
            className={styles.bioCard}
            data-misconception-ref={m.misconception}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: body is pre-rendered HTML from the registry MDX body.
            dangerouslySetInnerHTML={{
              __html: `<strong>Common misuse.</strong> ${m.body}`,
            }}
          />
        ))}

        {rearrangedHtml.length > 0 && (
          <div className={styles.rearrangedForms}>
            <h3 className={styles.subheading}>Rearranged forms</h3>
            {rearrangedHtml.map((form) => (
              <div key={form.solves_for} className={styles.rearrangedRow}>
                <span className={styles.rearrangedLabel}>
                  {form.label ?? `Solves for ${form.solves_for}`}
                </span>
                <div
                  className={styles.rearrangedTex}
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: tex rendered by katex from registry-validated source.
                  dangerouslySetInnerHTML={{ __html: form.tex }}
                />
              </div>
            ))}
          </div>
        )}

        {!hideRelated && entry.related && entry.related.length > 0 && (
          <nav
            className={styles.related}
            aria-label={`Related equations for ${entry.title}`}
          >
            <span className={styles.relatedLabel}>Related:</span>
            <ul className={styles.relatedList}>
              {entry.related.map((r) => (
                <li key={r.refId} className={styles.relatedItem}>
                  <a href={`/equations/${r.refId}`} data-kind={r.kind}>
                    {r.refId}
                  </a>
                  {r.description ? (
                    <span className={styles.relatedDescription}>
                      {" "}
                      — {r.description}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>
        )}

        {biography?.derivation_steps &&
          biography.derivation_steps.length > 0 && (
            <details
              className={styles.derivation}
              open={showDerivation === true}
            >
              <summary className={styles.derivationSummary}>
                Derivation ({biography.derivation_steps.length}{" "}
                {biography.derivation_steps.length === 1 ? "step" : "steps"})
              </summary>
              <ol className={styles.derivationList}>
                {biography.derivation_steps.map((step, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable order from extractor.
                    key={`step-${i}`}
                    className={styles.derivationStep}
                  >
                    {step.label ? (
                      <strong className={styles.derivationLabel}>
                        {step.label}.
                      </strong>
                    ) : null}{" "}
                    <span
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: body is pre-rendered HTML from the registry MDX body.
                      dangerouslySetInnerHTML={{ __html: step.body }}
                    />
                  </li>
                ))}
              </ol>
            </details>
          )}
      </div>
    </section>
  );
}
