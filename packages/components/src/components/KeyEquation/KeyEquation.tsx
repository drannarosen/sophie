import katex from "katex";
import { Sigma } from "lucide-react";
import { type ReactNode, useId, useMemo } from "react";
import { useHydrated } from "../../runtime/useHydrated.ts";
import { lookupCanonicalCitationByRefId } from "../EquationRef/equation-citations-store.ts";
import { lookupEquation } from "../EquationRef/equations-store.ts";
import styles from "./KeyEquation.module.css.js";
import type { KeyEquationProps } from "./KeyEquation.schema.ts";

/**
 * Render an arbitrary LaTeX fragment as inline KaTeX HTML. Used for
 * constants rows (symbol, value, unit) where the registry holds the
 * fragments as raw LaTeX strings — KaTeX expects pre-wrapped math,
 * not the `$...$` markdown shorthand. Returns a `<span>` with
 * dangerouslySetInnerHTML so the rendered math sits inline.
 */
function InlineTex({ tex }: { tex: string }): ReactNode {
  const html = katex.renderToString(tex, {
    displayMode: false,
    throwOnError: false,
    output: "html",
  });
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: tex rendered by katex from registry-validated source.
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/**
 * Wrap a unit string for `\text{}` rendering. Author-friendly units
 * like "cm s^{-1}" mix prose ("cm", "s") and math ("^{-1}").
 * Wrapping the whole thing in `\text{}` preserves whitespace but
 * makes `^{-1}` literal; not wrapping kills whitespace ("cms-1").
 * The fix: re-enter math mode inside `\text{}` for each
 * `^{...}` / `_{...}` segment via `$...$`.
 */
function formatUnitTex(unit: string): string {
  const mathified = unit.replace(/([_^])(\{[^}]+\}|\S)/g, "$$$1$2$$");
  return `\\text{${mathified}}`;
}

/**
 * Humanize a slug-form epistemic-role term ("vacuum-propagation",
 * "rest-frame-known") for display as a definition title. Replaces
 * hyphens/underscores with spaces and capitalizes each word.
 */
function humanizeTermSlug(slug: string): string {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  // Hydration-gate (Phase 1.5 evidence, 2026-05-25). Packed-copy
  // consumers populate the equation store AFTER island SSR — the
  // server pass sees an empty store and emits framing-prose-only,
  // while the client's first render sees the script-tag-auto-hydrated
  // store and emits the full <section> card. Same component, two tree
  // shapes → React #418. Gating render on `useHydrated` forces SSR +
  // first client render to emit only the framing children regardless
  // of store state; the full card appears once the mount-effect flips
  // the gate.
  const hydrated = useHydrated();

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

  if (!hydrated) {
    return <>{children}</>;
  }

  if (!entry) {
    // Dev-only authoring-drift warning. Post-gate → always client (ADR 0038 § A2.2).
    if (process.env?.NODE_ENV !== "production") {
      console.warn(
        `[KeyEquation] No equation found for refId "${refId}". Rendering framing prose only.`
      );
    }
    return <>{children}</>;
  }

  const biography = entry.biography;
  // Sprint E — pull the canonical citation for this equation to render
  // the "(C.N)" margin label. Multi-citation case: every callsite shows
  // the canonical (lowest-chapter) citation's number (v1 limitation;
  // documented in the pilot report). When no citation is registered,
  // the label is omitted.
  const citation = lookupCanonicalCitationByRefId(refId);
  const eqLabel = citation
    ? citation.chapterNumber !== undefined
      ? `(${citation.chapterNumber}.${citation.number})`
      : `(${citation.number})`
    : null;

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
        <div className={styles.texRow}>
          <div
            className={styles.tex}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: tex is rendered by katex.renderToString from registry-validated TeX source (not user-supplied content).
            dangerouslySetInnerHTML={{ __html: texHtml }}
          />
          {eqLabel !== null && (
            <span className={styles.eqLabel} aria-hidden>
              {eqLabel}
            </span>
          )}
        </div>

        {entry.constants && entry.constants.length > 0 && (
          <dl
            className={styles.constants}
            aria-label={`Constants for ${entry.title}`}
          >
            {entry.constants.map((c) => (
              <div key={c.symbol} className={styles.constantRow}>
                <dt className={styles.constantSymbol}>
                  <InlineTex tex={c.symbol} />
                </dt>
                <dd className={styles.constantValue}>
                  <InlineTex tex={c.value} />
                  {c.unit ? (
                    <>
                      {" "}
                      <InlineTex tex={formatUnitTex(c.unit)} />
                    </>
                  ) : null}
                  {c.name ? (
                    <span className={styles.constantName}> — {c.name}</span>
                  ) : null}
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

        {biography?.assumptions &&
          biography.assumptions.length > 0 &&
          (biography.assumptions.length === 1 && biography.assumptions[0] ? (
            <div
              className={styles.bioCard}
              data-epistemic-role='assumption'
              data-assumption-type={biography.assumptions[0].type}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: body is pre-rendered HTML from the registry MDX body.
              dangerouslySetInnerHTML={{
                __html: `<strong>Assumption${biography.assumptions[0].type ? ` (${biography.assumptions[0].type})` : ""}.</strong> ${biography.assumptions[0].body}`,
              }}
            />
          ) : (
            <section
              className={styles.bioGroup}
              data-epistemic-role='assumption'
              // No aria-label: avoid creating a duplicate "region"
              // landmark per equation (axe `landmark-unique` violation
              // when multiple KeyEquations sit on the page). The inner
              // <h3>Assumptions</h3> provides the heading-level
              // structure screen readers use for traversal; the outer
              // KeyEquation <section aria-labelledby={refId}-heading> is
              // the landmark that scopes "this is the inverse-square
              // law's assumptions." 2026-05-21 hardening pass.
            >
              <h3 className={styles.bioGroupHeading}>Assumptions</h3>
              <dl className={styles.bioGroupList}>
                {biography.assumptions.map((a, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable order from extractor.
                    key={`assumption-${i}`}
                    className={styles.bioGroupItem}
                    data-assumption-type={a.type}
                  >
                    <dt className={styles.bioGroupTerm}>
                      {humanizeTermSlug(a.type ?? "general")}
                    </dt>
                    <dd
                      className={styles.bioGroupBody}
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: body is pre-rendered HTML from the registry MDX body.
                      dangerouslySetInnerHTML={{ __html: a.body }}
                    />
                  </div>
                ))}
              </dl>
            </section>
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

        {biography?.common_misuses &&
          biography.common_misuses.length > 0 &&
          (biography.common_misuses.length === 1 &&
          biography.common_misuses[0] ? (
            <div
              className={styles.bioCard}
              data-epistemic-role='misconception'
              data-misconception-ref={biography.common_misuses[0].misconception}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: body is pre-rendered HTML from the registry MDX body.
              dangerouslySetInnerHTML={{
                __html: `<strong>Common misuse.</strong> ${biography.common_misuses[0].body}`,
              }}
            />
          ) : (
            <section
              className={styles.bioGroup}
              data-epistemic-role='misconception'
              // No aria-label — same rationale as the Assumptions
              // group above. Heading-level <h3> is sufficient
              // structure; the outer KeyEquation landmark scopes it.
            >
              <h3 className={styles.bioGroupHeading}>Common misuses</h3>
              <dl className={styles.bioGroupList}>
                {biography.common_misuses.map((m, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable order from extractor.
                    key={`misuse-${i}`}
                    className={styles.bioGroupItem}
                    data-misconception-ref={m.misconception}
                  >
                    <dt className={styles.bioGroupTerm}>
                      {humanizeTermSlug(m.misconception ?? "general")}
                    </dt>
                    <dd
                      className={styles.bioGroupBody}
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: body is pre-rendered HTML from the registry MDX body.
                      dangerouslySetInnerHTML={{ __html: m.body }}
                    />
                  </div>
                ))}
              </dl>
            </section>
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
