import type { SerializedRep } from "@sophie/core/schema";
import { RepEquation } from "../RepEquation/RepEquation.tsx";
import { RepFigure } from "../RepFigure/RepFigure.tsx";
import { RepVerbal } from "../RepVerbal/RepVerbal.tsx";
import styles from "./MultiRep.module.css.js";
import type { MultiRepProps } from "./MultiRep.schema.ts";

/**
 * MultiRep — framed binding card that surfaces multiple representations
 * of one concept (verbal / equation / figure) per ADR 0043 + the
 * 2026-05-17 design hardening.
 *
 * Authoring (MDX): `<MultiRep concept="x">` with Rep children. The
 * build-time `transformMultiRep` extractor (PR-γ) walks children and
 * populates `reps`. The runtime component below sorts `reps` into
 * canonical order (verbal → equation → figure) regardless of source
 * order and dispatches each entry to the matching Rep child component.
 *
 * Canonical render order is the load-bearing pedagogical decision per
 * §D2: readers develop muscle memory for the binding card's shape, so
 * eye-tracking the DeFT translation move (Ainsworth 2006) becomes
 * habit rather than effort. v2 may add `order="source"` to override
 * (schema reserves the slot per §F2).
 *
 * Per ADR 0058, MultiRep carries no `epistemicRole` — role lives on
 * the bound concept's Notation Registry entry (the registry is the
 * canonical concept-catalog for all Reasoning OS components).
 */
const CANONICAL_ORDER: SerializedRep["kind"][] = [
  "verbal",
  "equation",
  "figure",
];

function sortCanonical(reps: SerializedRep[]): SerializedRep[] {
  const rank = (kind: SerializedRep["kind"]): number => {
    const idx = CANONICAL_ORDER.indexOf(kind);
    return idx === -1 ? CANONICAL_ORDER.length : idx;
  };
  return [...reps].sort((a, b) => rank(a.kind) - rank(b.kind));
}

function dispatchRep(rep: SerializedRep, idx: number) {
  switch (rep.kind) {
    case "verbal":
      return <RepVerbal key={`v-${idx}`} body={rep.body} />;
    case "equation":
      return (
        <RepEquation
          key={`e-${idx}-${rep.refKey}`}
          refKey={rep.refKey}
          symbol={rep.symbol}
          equivalent_to={rep.equivalent_to}
          via={rep.via}
        />
      );
    case "figure":
      return (
        <RepFigure
          key={`f-${idx}-${rep.refName}`}
          refName={rep.refName}
          symbolLabel={rep.symbolLabel}
        />
      );
    default: {
      // Forward-compat: unknown kind (e.g., future `kind: "code"`
      // when RepCode ships) degrades gracefully. The discriminatedUnion
      // schema rejects unknown kinds at parse-time, but runtime data
      // may drift across versions — render nothing and log instead of
      // throw.
      const unknown = rep as { kind: string };
      console.warn(`[MultiRep] unknown rep kind: ${unknown.kind}`);
      return null;
    }
  }
}

export function MultiRep({ concept, conceptLabel, id, reps }: MultiRepProps) {
  const anchorId = id ?? `mr-${concept}`;
  const displayLabel = conceptLabel ?? concept;
  const orderedReps = sortCanonical(reps);
  return (
    <section
      id={anchorId}
      aria-labelledby={`${anchorId}-label`}
      className={styles.bindingCard}
      data-multirep-concept={concept}
    >
      <header className={styles.conceptHeader}>
        <span className={styles.conceptKindLabel}>concept</span>
        <span id={`${anchorId}-label`} className={styles.conceptLabel}>
          {displayLabel}
        </span>
      </header>
      <div className={styles.grid}>
        {orderedReps.map((rep, idx) => dispatchRep(rep, idx))}
      </div>
    </section>
  );
}
