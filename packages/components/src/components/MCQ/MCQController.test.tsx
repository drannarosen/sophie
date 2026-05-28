import { fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { getStore } from "../../runtime/useInteractive.ts";
import { MCQController } from "./MCQController.tsx";

/**
 * `<MCQController>` is a null-render behavior island over the STATIC
 * `<fieldset>` of native radios that `sophieCompoundExpandRemarkPlugin`
 * emits at MDX-compile time (Task 3). React never renders the radios —
 * so these tests hand-write that static DOM as a fixture (the exact
 * shape the transform produces: `name="mcq-${id}"`, `value="${slug}"`,
 * `data-correct` on the correct choice) and mount the controller
 * alongside it. The controller wires the radios by `name` and persists
 * the selection via `useInteractive` (key `mcq:${id}:selected`).
 *
 * R11: this is a null-render side-effect island with no component-owned
 * DOM to scan, so it's excluded from the axe-on-render gate
 * (`scripts/lint-axe-render.ts`) — mirrors `ParameterCursor`.
 */

const COURSE = "astr201";
const UNIT = "m1-l2";
const ID = "mcq-controller-test";
const STORAGE_KEY = `mcq:${ID}:selected`;

/**
 * The static MCQ markup the transform emits, by hand. The controller is
 * a sibling island; in the real page Astro renders both into the same
 * region, the radios statically and the controller as a hydration-only
 * `client:load` island.
 */
function McqFixture({ controller }: { controller: ReactNode }) {
  return (
    <ProfileProvider profile='student'>
      <section data-pedagogy-role='mcq' aria-labelledby={`${ID}-label`}>
        <h3 id={`${ID}-label`}>Multiple choice</h3>
        {/* biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: faithful reproduction of the static markup sophieCompoundExpandRemarkPlugin emits at MDX-compile time — the transform output is HTML, not JSX, so this rule never fires on the real markup; the fixture must match it byte-for-byte for the controller's `name`-based wiring to be exercised. `radiogroup` on `<fieldset>` is valid ARIA. */}
        <fieldset role='radiogroup' aria-labelledby={`${ID}-label`}>
          <label htmlFor={`${ID}-alpha`}>
            <input
              type='radio'
              id={`${ID}-alpha`}
              name={`mcq-${ID}`}
              value='alpha'
            />
            <span>Alpha</span>
          </label>
          <label htmlFor={`${ID}-beta`}>
            <input
              type='radio'
              id={`${ID}-beta`}
              name={`mcq-${ID}`}
              value='beta'
              data-correct='true'
            />
            <span>Beta</span>
          </label>
          <label htmlFor={`${ID}-gamma`}>
            <input
              type='radio'
              id={`${ID}-gamma`}
              name={`mcq-${ID}`}
              value='gamma'
            />
            <span>Gamma</span>
          </label>
        </fieldset>
        {controller}
      </section>
    </ProfileProvider>
  );
}

function radioByValue(container: HTMLElement, value: string): HTMLInputElement {
  const el = container.querySelector<HTMLInputElement>(
    `input[name="mcq-${ID}"][value="${value}"]`
  );
  if (!el) throw new Error(`radio value="${value}" not found in fixture`);
  return el;
}

/** Seed a persisted selection the way `useInteractive` writes it. */
async function seedSelection(value: string): Promise<void> {
  await getStore(COURSE).set("student", UNIT, STORAGE_KEY, {
    value,
    ts: Date.now(),
  });
}

describe("<MCQController>", () => {
  it("renders nothing of its own (null-render island)", () => {
    const { container } = render(
      <ProfileProvider profile='student'>
        <MCQController course={COURSE} unit={UNIT} id={ID} />
      </ProfileProvider>
    );
    expect(container.innerHTML).toBe("");
  });

  it("restores a persisted selection onto the static radios on mount", async () => {
    await seedSelection("gamma");
    const { container } = render(
      <McqFixture
        controller={<MCQController course={COURSE} unit={UNIT} id={ID} />}
      />
    );
    // After the async IndexedDB read resolves, the persisted radio checks.
    await waitFor(() => {
      expect(radioByValue(container, "gamma").checked).toBe(true);
    });
    expect(radioByValue(container, "alpha").checked).toBe(false);
    expect(radioByValue(container, "beta").checked).toBe(false);
  });

  it("persists the value via useInteractive when a radio is clicked", async () => {
    const { container } = render(
      <McqFixture
        controller={<MCQController course={COURSE} unit={UNIT} id={ID} />}
      />
    );
    // Wait for hydration (the change listener is attached in an effect).
    const beta = radioByValue(container, "beta");
    fireEvent.click(beta);
    // The controller's change handler writes the value through the store.
    await waitFor(async () => {
      const stored = await getStore(COURSE).get<string>(
        "student",
        UNIT,
        STORAGE_KEY
      );
      expect(stored?.value).toBe("beta");
    });
  });

  it("reflects an updated persisted value onto the radios", async () => {
    await seedSelection("alpha");
    const { container } = render(
      <McqFixture
        controller={<MCQController course={COURSE} unit={UNIT} id={ID} />}
      />
    );
    await waitFor(() => {
      expect(radioByValue(container, "alpha").checked).toBe(true);
    });
    // A later write (e.g., a cross-tab update or a fresh selection) must
    // re-reflect onto the static radios via the controller's effect.
    fireEvent.click(radioByValue(container, "gamma"));
    await waitFor(() => {
      expect(radioByValue(container, "gamma").checked).toBe(true);
    });
    expect(radioByValue(container, "alpha").checked).toBe(false);
  });
});
