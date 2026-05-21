import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import { MathText } from "../../runtime/MathText.tsx";
import styles from "./OMIFlow.module.css.js";
import type {
  OMIFlowProps,
  OMIFlowSlotPayload,
  OMIFlowSlotProps,
} from "./OMIFlow.schema.ts";

/**
 * `<OMIFlow>` — composite pedagogy primitive (ADR 0063, A8).
 *
 * Three named slots whose role is bound by component identity, not by
 * an author prop (ADR 0063 §Decision 11). Renders a `<div role="group">`
 * landmark with three labelled `<section>` slot regions in canonical
 * observable → model → inference order, regardless of source order
 * (ADR 0063 §Decision 4 — liberal in, strict out; OF-1 audit warns on
 * non-canonical source order).
 *
 * **Two render modes** (mirrors `<MultiRep>` / `<RepVerbal>`,
 * ADR 0043):
 *
 *   - **Extractor-fed mode**: when `observable` / `model` /
 *     `inference` props are set (post-`transformOMIFlow`), bodies are
 *     pre-rendered HTML strings injected via `dangerouslySetInnerHTML`.
 *     This is the production MDX path — `transformOMIFlow` harvests
 *     authored slot children at build time and replaces the parent's
 *     `children` with these explicit props. Without the transform,
 *     Astro's MDX integration evaluates each `<OMIFlow.Observable>`
 *     marker (which returns `null`), discarding the authored content
 *     before the outer `<OMIFlow>` runs (ADR 0027 — "data crosses the
 *     MDX render boundary as props, not as React children").
 *
 *   - **Author mode**: when slot props are absent, the renderer reads
 *     children via `React.Children` + component-identity matching. Used
 *     by Storybook + raw-React unit tests where no MDX build-time
 *     transform is in play. Stays as the documented authoring shape so
 *     stories and tests remain expressive.
 *
 * Strict-3-slot validation is enforced at the EXTRACT phase by
 * `extractOMIFlows` (ADR 0063 strict-3 invariant). The renderer trusts
 * well-formed input; missing slots render as a partial flow so a
 * temporarily mid-edit MDX source doesn't crash the page.
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
 * Shared slot renderer. Accepts either `children` (author mode) or
 * `bodyHtml` (extractor-fed mode) — never both meaningfully. `title`
 * is optional; when omitted the rendered title bar shows only the
 * role label.
 */
function OMIFlowSlotImpl({
  role,
  titleId,
  title,
  bodyHtml,
  children,
}: {
  role: SlotKind;
  titleId: string;
  title: string | undefined;
  bodyHtml?: string;
  children?: ReactNode;
}) {
  // Sprint D refactor (2026-05-20): role-gutter stack layout. The
  // outer <section> uses `display: contents` so its `<header>` and
  // `<div>` children land directly on the parent OMIFlow grid (role
  // label in left gutter, title+body in main column). Mobile fallback
  // (in OMIFlow.module.css) collapses gutter to inline label.
  //
  // a11y: aria-labelledby still points at the role label span; role
  // label remains the section's accessible name. Slot identity
  // (data-omi-role) preserved for OF-1 / OF-2 audit DOM checks.
  const trimmed = title?.trim();
  return (
    <section
      aria-labelledby={titleId}
      className={`${styles.slot} ${slotClassFor(role)}`.trim()}
      data-omi-role={role}
    >
      <header className={styles.gutter}>
        <span id={titleId} className={styles.roleLabel}>
          {ROLE_LABEL[role]}
        </span>
      </header>
      <div className={styles.main}>
        {trimmed !== undefined && trimmed.length > 0 ? (
          <MathText as='h3' className={styles.userTitle}>
            {trimmed}
          </MathText>
        ) : null}
        {bodyHtml !== undefined ? (
          <div
            className={styles.body}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: bodyHtml is build-time-serialized author MDX from renderChildrenToHtml (same trust boundary as <RepVerbal>'s body / <Objective>'s body) — never runtime input
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : (
          <div className={styles.body}>{children}</div>
        )}
      </div>
    </section>
  );
}

/**
 * Marker slot components used by the author-mode children-identity
 * branch. Exported so the .d.ts can name them as `OMIFlow.Observable`
 * etc. They render `null` directly — the outer `<OMIFlow>` reads
 * their props by identity-matching the React children. In MDX
 * production this branch is unreachable because `transformOMIFlow`
 * hoists slot data into explicit `observable` / `model` / `inference`
 * props before Astro compiles the MDX.
 */
export function OMIFlowObservable(_: OMIFlowSlotProps): ReactNode {
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

interface ResolvedSlot {
  title?: string;
  /** When set: post-transform HTML string injected via dangerouslySetInnerHTML. */
  bodyHtml?: string;
  /** When set: author-mode React children passed through directly. */
  children?: ReactNode;
}

function resolveSlots(
  props: OMIFlowProps
): Partial<Record<SlotKind, ResolvedSlot>> {
  const out: Partial<Record<SlotKind, ResolvedSlot>> = {};

  // Extractor-fed mode wins when ANY slot payload is set. Per-slot
  // resolution: if a slot has a payload, use it; if it doesn't but
  // children-mode would supply it, fall through. (Production MDX
  // always sets all three; mixed mode is for forward-compat.)
  if (props.observable !== undefined) {
    out.observable = {
      title: props.observable.title,
      bodyHtml: props.observable.body,
    };
  }
  if (props.model !== undefined) {
    out.model = { title: props.model.title, bodyHtml: props.model.body };
  }
  if (props.inference !== undefined) {
    out.inference = {
      title: props.inference.title,
      bodyHtml: props.inference.body,
    };
  }

  // Author mode: scan children for slot-component identity matches.
  // Skips slots already resolved from extractor-fed props.
  //
  // React.Children.forEach does NOT descend into Fragments — it treats
  // a Fragment as a single opaque child. So `<OMIFlow><>X Y Z</></OMIFlow>`
  // would yield ONE iteration (the Fragment) where identifySlot returns
  // undefined and no slot is found. We walk Fragments transparently so
  // the authoring shape is uniform regardless of whether the author
  // wraps slot children in a Fragment (common in Storybook args).
  visitChildrenWithFragments(props.children, (child) => {
    const kind = identifySlot(child);
    if (kind === undefined) return;
    if (out[kind] !== undefined) return;
    const el = child as ReactElement<OMIFlowSlotProps>;
    out[kind] = { title: el.props.title, children: el.props.children };
  });

  return out;
}

/**
 * Walk children, descending transparently into any `<Fragment>`
 * children so each leaf JSX element is visited exactly once. Used by
 * the author-mode slot detection so a Fragment-wrapped slot set
 * `<><OMIFlow.Observable>…</OMIFlow.Observable>…</>` matches the same
 * as bare children.
 */
function visitChildrenWithFragments(
  children: ReactNode,
  visit: (child: ReactNode) => void
): void {
  Children.forEach(children, (child) => {
    if (isValidElement(child) && (child as ReactElement).type === Fragment) {
      const fragChildren = (child as ReactElement<{ children?: ReactNode }>)
        .props.children;
      visitChildrenWithFragments(fragChildren, visit);
      return;
    }
    visit(child);
  });
}

export function OMIFlow(props: OMIFlowProps) {
  const { id, concept } = props;
  const fallbackId = useId();
  const rootId = id ?? fallbackId;
  const titleId = `${rootId}-label`;

  const slots = resolveSlots(props);

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
      {CANONICAL_ORDER.flatMap((kind) => {
        const slot = slots[kind];
        if (slot === undefined) return [];
        const slotTitleId = `${rootId}-${kind}-label`;
        const slotEl = (
          <OMIFlowSlotImpl
            key={kind}
            role={kind}
            titleId={slotTitleId}
            title={slot.title}
            bodyHtml={slot.bodyHtml}
          >
            {slot.children}
          </OMIFlowSlotImpl>
        );
        // Sprint D refactor: chevrons between slots removed. The new
        // role-gutter stack uses ↓ arrow connectors INSIDE each
        // gutter (per OMIFlow.module.css `.gutter::after`), which sit
        // in the role color and align with the vertical rule. No
        // separator elements between slots — each <section> renders
        // its gutter + main directly on the parent grid via
        // display:contents.
        return [slotEl];
      })}
    </div>
  );
}

OMIFlow.Observable = OMIFlowObservable;
OMIFlow.Model = OMIFlowModel;
OMIFlow.Inference = OMIFlowInference;

// Re-export the slot payload type so downstream consumers (transform,
// orchestrator) reference one canonical shape.
export type { OMIFlowSlotPayload };
