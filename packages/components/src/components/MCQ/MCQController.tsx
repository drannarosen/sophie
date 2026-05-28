import { useEffect } from "react";
import { useInteractive } from "../../runtime/useInteractive.ts";
import type { MCQControllerProps } from "./MCQController.schema.ts";

// Styling note (ADR 0005): the transform-emitted MCQ markup carries no
// CSS-Module class names — it never reaches React — so its `:global`
// rules live in `_formative/formative.module.css`. That file ships via
// the shared `dist/styles.css` bundle, which `build-css-modules.ts`
// builds by globbing EVERY `*.module.css` under src/ (independent of any
// JS import) and which `@sophie/astro/<SophieChapter>` side-effect-
// imports once. The controller therefore needs NO CSS import: a bare
// cross-directory side-effect import (`../_formative/…`) would survive
// into `dist/index.js` as a dangling path (tsup flattens companions to
// dist root but does not rewrite `../`-prefixed module-css imports),
// crashing the consumer barrel at runtime.

/**
 * `<MCQController>` — the interactivity island for an `<MCQ>` whose
 * structure (a `<fieldset>` of native `<input type="radio">`) is emitted
 * as STATIC HTML by `sophieCompoundExpandRemarkPlugin` at MDX-compile
 * time. This island renders NOTHING visible and has NO children — it is
 * a thin behavior layer over the static radios, which is what lets a
 * choice body host its own hydrating islands (the static fieldset is not
 * a React island, so a `<GlossaryTerm>` inside a choice hydrates as a
 * normal page island).
 *
 * Native radios (shared `name="mcq-${id}"`) already provide roving focus,
 * arrow-key navigation, single-select, and a11y from the browser — so no
 * Radix primitive is needed. This controller only restores + persists the
 * student's selection via `useInteractive` (key `mcq:${id}:selected`),
 * reaching into the static DOM by `name`. v1 does not auto-grade; the
 * correct choice carries a static `data-correct` attribute (CSS reveal).
 *
 * Props are typed from `MCQControllerPropsSchema` (ADR 0003 — Zod is the
 * source of truth). The transform that emits this island validates
 * `course`/`unit`/`id` upstream from the authored `<MCQ>`, so the
 * controller types from the schema rather than re-parsing at render.
 */
export function MCQController({ course, unit, id }: MCQControllerProps) {
  const { value: selected, setValue } = useInteractive<string>(
    course,
    unit,
    `mcq:${id}:selected`,
    ""
  );

  const radioName = `mcq-${id}`;

  // Persist the student's pick: listen for native change events on the
  // radio group and write the chosen value through useInteractive.
  useEffect(() => {
    const radios = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        `input[type="radio"][name="${radioName}"]`
      )
    );
    const onChange = (event: Event): void => {
      const target = event.target as HTMLInputElement;
      if (target.checked) setValue(target.value);
    };
    for (const radio of radios) radio.addEventListener("change", onChange);
    return () => {
      for (const radio of radios) radio.removeEventListener("change", onChange);
    };
  }, [radioName, setValue]);

  // Reflect the persisted selection back onto the static radios (after
  // the async IndexedDB read resolves, and on cross-tab updates).
  useEffect(() => {
    for (const radio of document.querySelectorAll<HTMLInputElement>(
      `input[type="radio"][name="${radioName}"]`
    )) {
      radio.checked = radio.value === selected;
    }
  }, [radioName, selected]);

  return null;
}
