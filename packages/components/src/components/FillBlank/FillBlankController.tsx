import { useEffect, useState } from "react";
import { useInteractive } from "../../runtime/useInteractive.ts";
import type { FillBlankControllerProps } from "./FillBlankController.schema.ts";

// Styling note (ADR 0005): the transform-emitted FillBlank markup (the
// prompt prose with inline `<input data-fb-slot>` fields) carries no
// CSS-Module class names — it never reaches React — so its `:global`
// rules live in `_formative/formative.module.css`, which ships via the
// shared `dist/styles.css` bundle (see MCQController.tsx for the full
// rationale). The controller therefore needs NO CSS import.

/**
 * `<FillBlankController>` — the interactivity island for a `<FillBlank>`
 * whose prompt (transformed prose with inline
 * `<input type="text" data-fb-slot data-slot-id>` fields) is emitted as
 * STATIC HTML by `sophieCompoundExpandRemarkPlugin` at MDX-compile time
 * (Task 5). This island renders NOTHING visible and has NO authored
 * children — it is a thin behavior layer over the static inputs, which
 * is what lets the surrounding prompt prose host its own hydrating
 * islands (a `<GlossaryTerm>` in the prompt hydrates as a normal page
 * island).
 *
 * **N-slots-per-FillBlank hook problem (key design choice).** A single
 * `<FillBlank>` may have any number of slots, but the Rules of Hooks
 * forbid calling `useInteractive` in a loop with a dynamic count. So the
 * controller does NOT call `useInteractive` itself: on mount it
 * discovers the slot ids from the static DOM (scoped to its own
 * `<section data-formative-anchor="${id}">`) and renders one
 * `<SlotBinding>` child per discovered slot. Each `<SlotBinding>` calls
 * `useInteractive` exactly once — a stable hook count per child instance
 * — keyed by `slotId`. This keeps the established `useInteractive`
 * persistence pattern (no direct store-API reach-in) while respecting
 * the Rules of Hooks. Each binding is itself null-render; it only wires
 * the existing static `<input>`.
 *
 * Props are typed from `FillBlankControllerPropsSchema` (ADR 0003 — Zod
 * is the source of truth). The transform validates `course`/`unit`/`id`
 * upstream from the authored `<FillBlank>`.
 */
export function FillBlankController({
  course,
  unit,
  id,
}: FillBlankControllerProps) {
  const [slotIds, setSlotIds] = useState<readonly string[]>([]);

  // Discover the slot ids once, from the static DOM, after mount. The
  // controller is rendered inside its own `<section
  // data-formative-anchor="${id}">`, so the inputs are reachable by that
  // anchor; a zero-slot FillBlank (the AS-3 fixture) finds none and
  // renders no bindings.
  useEffect(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>(
      `[data-formative-anchor="${id}"] input[data-fb-slot]`
    );
    const ids: string[] = [];
    for (const input of inputs) {
      const slotId = input.dataset.slotId;
      if (slotId) ids.push(slotId);
    }
    setSlotIds(ids);
  }, [id]);

  return (
    <>
      {slotIds.map((slotId) => (
        <SlotBinding
          key={slotId}
          course={course}
          unit={unit}
          parentId={id}
          slotId={slotId}
        />
      ))}
    </>
  );
}

/**
 * One slot's persistence binding — null-render. Calls `useInteractive`
 * exactly once (stable hook count for this instance) under
 * `fillblank:${parentId}:${slotId}:value`, restores the persisted value
 * onto the matching static `<input>`, and persists raw input on every
 * `input` event. v1 does not grade (ADR 0073 Amendment 1 §10) — the
 * slot's `correct` answer lives only in the pedagogy index, never in
 * this DOM.
 */
function SlotBinding({
  course,
  unit,
  parentId,
  slotId,
}: {
  course: string;
  unit: string;
  parentId: string;
  slotId: string;
}) {
  const { value, setValue } = useInteractive<string>(
    course,
    unit,
    `fillblank:${parentId}:${slotId}:value`,
    ""
  );

  // CRITICAL coupling: the selector MUST match the transform-emitted
  // markup — an `input[data-fb-slot][data-slot-id="${slotId}"]` inside
  // the FillBlank's own `<section data-formative-anchor="${parentId}">`.
  const selector = `[data-formative-anchor="${parentId}"] input[data-fb-slot][data-slot-id="${slotId}"]`;

  // Persist on input: write the live field value through useInteractive.
  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>(selector);
    if (!input) return;
    const onInput = (): void => {
      setValue(input.value);
    };
    input.addEventListener("input", onInput);
    return () => {
      input.removeEventListener("input", onInput);
    };
  }, [selector, setValue]);

  // Reflect the persisted value back onto the static input (after the
  // async IndexedDB read resolves, and on cross-tab updates) — but never
  // clobber a value the student is actively typing.
  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>(selector);
    if (input && input.value !== value && document.activeElement !== input) {
      input.value = value;
    }
  }, [selector, value]);

  return null;
}
