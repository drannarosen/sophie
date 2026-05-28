import { useEffect } from "react";
import { useInteractive } from "../../runtime/useInteractive.ts";
import type { MultiSelectControllerProps } from "./MultiSelectController.schema.ts";

// Styling note (ADR 0005): the transform-emitted MultiSelect markup
// carries no CSS-Module class names — it never reaches React — so its
// `:global` rules live in `_formative/formative.module.css`, which ships
// via the shared `dist/styles.css` bundle (see MCQController.tsx for the
// full rationale). The controller therefore needs NO CSS import.

// Stable initial reference — a fresh `[]` literal on every render would
// retrigger `useInteractive`'s hydration effect (which lists `initial`
// in its dep array) on each render, causing an update loop. (Ported from
// the old Radix MultiSelect's `EMPTY_SELECTION`.)
const EMPTY_SELECTION: readonly string[] = [];

/**
 * `<MultiSelectController>` — the interactivity island for a
 * `<MultiSelect>` whose structure (a `<fieldset>` of native
 * `<input type="checkbox">`) is emitted as STATIC HTML by
 * `sophieCompoundExpandRemarkPlugin` at MDX-compile time (Task 4). This
 * island renders NOTHING visible and has NO children — it is a thin
 * behavior layer over the static checkboxes, which is what lets a choice
 * body host its own hydrating islands (a `<GlossaryTerm>` inside a
 * choice hydrates as a normal page island).
 *
 * Native checkboxes (shared `name="multiselect-${id}"`) provide focus +
 * a11y from the browser, and — unlike radios — allow MULTIPLE to be
 * checked at once. This controller restores + persists the SET of
 * selected slugs via `useInteractive` (key `multi-select:${id}:selected`,
 * a `string[]`), reaching into the static DOM by `name`. v1 does not
 * auto-grade; each correct choice carries a static `data-correct`
 * attribute (CSS reveal).
 *
 * Props are typed from `MultiSelectControllerPropsSchema` (ADR 0003 —
 * Zod is the source of truth). The transform validates `course`/`unit`/
 * `id` upstream from the authored `<MultiSelect>`.
 */
export function MultiSelectController({
  course,
  unit,
  id,
}: MultiSelectControllerProps) {
  const { value: selected, setValue } = useInteractive<readonly string[]>(
    course,
    unit,
    `multi-select:${id}:selected`,
    EMPTY_SELECTION
  );

  // CRITICAL coupling: this MUST equal the `name` the transform stamps
  // on the inputs (`${parent.toLowerCase()}-${id}` in compound-expand.ts).
  const checkboxName = `multiselect-${id}`;

  // Persist the student's selection: toggle the changed checkbox's value
  // in/out of the stored set on each native change event.
  useEffect(() => {
    const checkboxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        `input[type="checkbox"][name="${checkboxName}"]`
      )
    );
    // On any toggle, read the live checked set off the DOM (the browser
    // has already applied the toggle by the time `change` fires) and
    // persist it. This handles add + remove uniformly without tracking
    // which box changed.
    const onChange = (): void => {
      setValue(checkboxes.filter((box) => box.checked).map((box) => box.value));
    };
    for (const box of checkboxes) box.addEventListener("change", onChange);
    return () => {
      for (const box of checkboxes) box.removeEventListener("change", onChange);
    };
  }, [checkboxName, setValue]);

  // Reflect the persisted selection back onto the static checkboxes
  // (after the async IndexedDB read resolves, and on cross-tab updates).
  useEffect(() => {
    for (const box of document.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="${checkboxName}"]`
    )) {
      box.checked = selected.includes(box.value);
    }
  }, [checkboxName, selected]);

  return null;
}
