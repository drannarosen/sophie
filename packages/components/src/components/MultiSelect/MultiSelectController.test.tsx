import { fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { getStore } from "../../runtime/useInteractive.ts";
import { MultiSelectController } from "./MultiSelectController.tsx";

/**
 * `<MultiSelectController>` is a null-render behavior island over the
 * STATIC `<fieldset>` of native checkboxes that
 * `sophieCompoundExpandRemarkPlugin` emits at MDX-compile time (Task 4).
 * React never renders the checkboxes — so these tests hand-write that
 * static DOM as a fixture (the exact shape the transform produces:
 * `name="multiselect-${id}"`, `value="${slug}"`, `data-correct` on EACH
 * correct choice — multiple may be correct) and mount the controller
 * alongside it. The controller wires the checkboxes by `name` and
 * persists the SELECTED SET via `useInteractive` (key
 * `multi-select:${id}:selected`, a `string[]`).
 *
 * R11: this is a null-render side-effect island with no component-owned
 * DOM to scan, so it's excluded from the axe-on-render gate
 * (`scripts/lint-axe-render.ts`) — mirrors `MCQController` / `ParameterCursor`.
 */

const COURSE = "astr201";
const UNIT = "m1-l2";
const ID = "multi-select-controller-test";
const STORAGE_KEY = `multi-select:${ID}:selected`;

/**
 * The static MultiSelect markup the transform emits, by hand. Two of the
 * three choices are `correct` (multi-correct is the point of the
 * component). The controller is a sibling island; in the real page Astro
 * renders both into the same region, the checkboxes statically and the
 * controller as a hydration-only `client:load` island.
 */
function MultiSelectFixture({ controller }: { controller: ReactNode }) {
  return (
    <ProfileProvider profile='student'>
      <section
        data-pedagogy-role='multi-select'
        aria-labelledby={`${ID}-label`}
      >
        <h3 id={`${ID}-label`}>Select all that apply</h3>
        <fieldset aria-labelledby={`${ID}-label`}>
          <label htmlFor={`${ID}-mercury`}>
            <input
              type='checkbox'
              id={`${ID}-mercury`}
              name={`multiselect-${ID}`}
              value='mercury'
              data-correct='true'
            />
            <span>Mercury</span>
          </label>
          <label htmlFor={`${ID}-jupiter`}>
            <input
              type='checkbox'
              id={`${ID}-jupiter`}
              name={`multiselect-${ID}`}
              value='jupiter'
            />
            <span>Jupiter</span>
          </label>
          <label htmlFor={`${ID}-mars`}>
            <input
              type='checkbox'
              id={`${ID}-mars`}
              name={`multiselect-${ID}`}
              value='mars'
              data-correct='true'
            />
            <span>Mars</span>
          </label>
        </fieldset>
        {controller}
      </section>
    </ProfileProvider>
  );
}

function boxByValue(container: HTMLElement, value: string): HTMLInputElement {
  const el = container.querySelector<HTMLInputElement>(
    `input[name="multiselect-${ID}"][value="${value}"]`
  );
  if (!el) throw new Error(`checkbox value="${value}" not found in fixture`);
  return el;
}

/** Seed a persisted selection the way `useInteractive` writes it. */
async function seedSelection(value: string[]): Promise<void> {
  await getStore(COURSE).set("student", UNIT, STORAGE_KEY, {
    value,
    ts: Date.now(),
  });
}

describe("<MultiSelectController>", () => {
  it("renders nothing of its own (null-render island)", () => {
    const { container } = render(
      <ProfileProvider profile='student'>
        <MultiSelectController course={COURSE} unit={UNIT} id={ID} />
      </ProfileProvider>
    );
    expect(container.innerHTML).toBe("");
  });

  it("restores a persisted multi-selection onto the static checkboxes on mount", async () => {
    await seedSelection(["mercury", "mars"]);
    const { container } = render(
      <MultiSelectFixture
        controller={
          <MultiSelectController course={COURSE} unit={UNIT} id={ID} />
        }
      />
    );
    // After the async IndexedDB read resolves, both persisted boxes check
    // simultaneously (multiple-select).
    await waitFor(() => {
      expect(boxByValue(container, "mercury").checked).toBe(true);
    });
    expect(boxByValue(container, "mars").checked).toBe(true);
    expect(boxByValue(container, "jupiter").checked).toBe(false);
  });

  it("persists an added slug via useInteractive when a checkbox is clicked", async () => {
    const { container } = render(
      <MultiSelectFixture
        controller={
          <MultiSelectController course={COURSE} unit={UNIT} id={ID} />
        }
      />
    );
    fireEvent.click(boxByValue(container, "jupiter"));
    await waitFor(async () => {
      const stored = await getStore(COURSE).get<string[]>(
        "student",
        UNIT,
        STORAGE_KEY
      );
      expect(stored?.value).toEqual(["jupiter"]);
    });
  });

  it("toggling persists add + remove (slug leaves the set on uncheck)", async () => {
    await seedSelection(["mercury", "mars"]);
    const { container } = render(
      <MultiSelectFixture
        controller={
          <MultiSelectController course={COURSE} unit={UNIT} id={ID} />
        }
      />
    );
    // Wait for the seeded selection to reflect onto the DOM.
    await waitFor(() => {
      expect(boxByValue(container, "mars").checked).toBe(true);
    });
    // Uncheck mars → it should leave the persisted set, leaving mercury.
    fireEvent.click(boxByValue(container, "mars"));
    await waitFor(async () => {
      const stored = await getStore(COURSE).get<string[]>(
        "student",
        UNIT,
        STORAGE_KEY
      );
      expect(stored?.value).toEqual(["mercury"]);
    });
  });

  it("supports multiple checkboxes checked simultaneously", async () => {
    const { container } = render(
      <MultiSelectFixture
        controller={
          <MultiSelectController course={COURSE} unit={UNIT} id={ID} />
        }
      />
    );
    fireEvent.click(boxByValue(container, "mercury"));
    fireEvent.click(boxByValue(container, "mars"));
    // Both stay checked — native checkboxes are not mutually exclusive.
    expect(boxByValue(container, "mercury").checked).toBe(true);
    expect(boxByValue(container, "mars").checked).toBe(true);
    await waitFor(async () => {
      const stored = await getStore(COURSE).get<string[]>(
        "student",
        UNIT,
        STORAGE_KEY
      );
      expect(stored?.value).toEqual(["mercury", "mars"]);
    });
  });
});
