import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import styles from "./OMIFlow.module.css.js";
import type { OMIFlowProps, OMIFlowSlotProps } from "./OMIFlow.schema.ts";

/**
 * `<OMIFlow>` — composite pedagogy primitive (ADR 0063, A8).
 *
 * Three named slots whose role is bound by component identity, not by
 * an author prop (ADR 0063 §Decision 11). The renderer:
 *
 *   1. Scans children for the three slot components (`OMIFlow.Observable`,
 *      `OMIFlow.Model`, `OMIFlow.Inference`).
 *   2. Sorts them into canonical observable → model → inference order
 *      regardless of source order (ADR 0063 §Decision 4 — liberal in
 *      input, strict in output; OF-1 audit warns on out-of-order source).
 *   3. Emits an outer `<div role="group" aria-labelledby="…">` with the
 *      three slots as labelled `<section role="region">` children.
 *
 * Strict-3-slot validation lives in the extractor (`extractOMIFlows`,
 * ADR 0063 PR-A). The renderer trusts well-formed input; missing slots
 * render as a partial flow (forgiving at runtime so a temporarily
 * mid-edit MDX source doesn't crash the page).
 */

type SlotKind = "observable" | "model" | "inference";

const ROLE_LABEL: Record<SlotKind, string> = {
  observable: "Observable",
  model: "Model",
  inference: "Inference",
};

function slotClassFor(role: SlotKind): string {
  switch (role) {
    case "observable":
      return styles.slotObservable ?? "";
    case "model":
      return styles.slotModel ?? "";
    case "inference":
      return styles.slotInference ?? "";
  }
}

/**
 * Internal slot component shared by all three role-bound exports.
 * Renders the role-labelled `<section>` wrapper + the author's body.
 * Authors never construct this directly — they use
 * `<OMIFlow.Observable>`, `<OMIFlow.Model>`, or `<OMIFlow.Inference>`,
 * which set the `role` prop via the binding below.
 */
function OMIFlowSlotImpl({
  role,
  titleId,
  title,
  children,
}: {
  role: SlotKind;
  titleId: string;
  title: string | undefined;
  children: ReactNode;
}) {
  const trimmed = title?.trim();
  return (
    <section
      aria-labelledby={titleId}
      className={`${styles.slot} ${slotClassFor(role)}`.trim()}
      data-omi-role={role}
    >
      <header className={styles.titleBar}>
        <span id={titleId} className={styles.roleLabel}>
          {ROLE_LABEL[role]}
        </span>
        {trimmed !== undefined && trimmed.length > 0 ? (
          <>
            <span aria-hidden className={styles.titleSep}>
              —
            </span>
            <span className={styles.userTitle}>{trimmed}</span>
          </>
        ) : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

/**
 * Marker slot components used to identify each slot via `child.type`.
 * Exported so the .d.ts can reference them as `OMIFlow.Observable` etc.
 * Authors reach them via the compound-component syntax
 * (`<OMIFlow.Observable>`); the standalone exports exist purely so the
 * TS declaration emitter can name them.
 */
export function OMIFlowObservable(_: OMIFlowSlotProps): ReactNode {
  // Never invoked directly — `<OMIFlow>` reads the children and
  // delegates to `OMIFlowSlotImpl`. Returning null keeps Storybook
  // happy if someone authors `<OMIFlow.Observable>` outside an
  // enclosing `<OMIFlow>`.
  return null;
}
OMIFlowObservable.displayName = "OMIFlow.Observable";

export function OMIFlowModel(_: OMIFlowSlotProps): ReactNode {
  return null;
}
OMIFlowModel.displayName = "OMIFlow.Model";

export function OMIFlowInference(_: OMIFlowSlotProps): ReactNode {
  return null;
}
OMIFlowInference.displayName = "OMIFlow.Inference";

const SLOT_COMPONENTS: Record<
  SlotKind,
  (props: OMIFlowSlotProps) => ReactNode
> = {
  observable: OMIFlowObservable,
  model: OMIFlowModel,
  inference: OMIFlowInference,
};

const CANONICAL_ORDER: ReadonlyArray<SlotKind> = [
  "observable",
  "model",
  "inference",
];

function identifySlot(child: ReactNode): SlotKind | undefined {
  if (!isValidElement(child)) return undefined;
  const type = (child as ReactElement).type;
  for (const kind of CANONICAL_ORDER) {
    if (type === SLOT_COMPONENTS[kind]) return kind;
  }
  return undefined;
}

export function OMIFlow({ id, concept, children }: OMIFlowProps) {
  const fallbackId = useId();
  const rootId = id ?? fallbackId;
  const titleId = `${rootId}-label`;

  const slots: Partial<Record<SlotKind, OMIFlowSlotProps>> = {};
  Children.forEach(children, (child) => {
    const kind = identifySlot(child);
    if (kind === undefined) return;
    const el = child as ReactElement<OMIFlowSlotProps>;
    // Last-write-wins on duplicate slots — extractor's exactly-one
    // invariant catches this at build time; runtime is forgiving.
    slots[kind] = el.props;
  });

  return (
    // biome-ignore lint/a11y/useSemanticElements: outer landmark is role="group" on a <div> on purpose. <fieldset> is form-only; <section> here would compete with the three slot <section> children. The composite-of-labelled-regions shape needs the explicit group role on a non-section parent.
    <div
      id={rootId}
      role='group'
      aria-labelledby={titleId}
      className={styles.omiFlow}
      {...(concept !== undefined ? { "data-omiflow-concept": concept } : {})}
    >
      <span id={titleId} hidden>
        {concept ?? "Observable, Model, Inference flow"}
      </span>
      {CANONICAL_ORDER.flatMap((kind, idx) => {
        const slot = slots[kind];
        if (slot === undefined) return [];
        const slotTitleId = `${rootId}-${kind}-label`;
        const slotEl = (
          <OMIFlowSlotImpl
            key={kind}
            role={kind}
            titleId={slotTitleId}
            title={slot.title}
          >
            {slot.children}
          </OMIFlowSlotImpl>
        );
        // Add a decorative chevron between slots (not before the first,
        // not after the last). Chevron rotation to ↓ on mobile/print
        // lives in CSS.
        const isLast = idx === CANONICAL_ORDER.length - 1;
        if (isLast) return [slotEl];
        return [
          slotEl,
          <span key={`${kind}-chevron`} aria-hidden className={styles.chevron}>
            ›
          </span>,
        ];
      })}
    </div>
  );
}

OMIFlow.Observable = OMIFlowObservable;
OMIFlow.Model = OMIFlowModel;
OMIFlow.Inference = OMIFlowInference;
