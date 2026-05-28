import { fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProfileProvider } from "../../runtime/ProfileContext.tsx";
import { getStore } from "../../runtime/useInteractive.ts";
import { FillBlankController } from "./FillBlankController.tsx";

/**
 * `<FillBlankController>` is a null-render behavior island over the
 * STATIC prompt prose + inline `<input data-fb-slot>` fields that
 * `sophieCompoundExpandRemarkPlugin` emits at MDX-compile time (Task 5).
 * React never renders the inputs — so these tests hand-write that static
 * DOM as a fixture (the exact shape the transform produces:
 * `<section data-formative-anchor="${id}">` → prose with
 * `<input type="text" data-fb-slot data-slot-id="…">` fields, and
 * CRITICALLY no `correct` answer anywhere in the DOM) and mount the
 * controller alongside it. The controller discovers the slots by anchor,
 * renders one null-render `<SlotBinding>` per slot, and persists each
 * slot's raw value via `useInteractive` under
 * `fillblank:${id}:${slotId}:value`.
 *
 * R11: this is a null-render side-effect island with no component-owned
 * DOM to scan, so it's excluded from the axe-on-render gate
 * (`scripts/lint-axe-render.ts`) — mirrors `MCQController` /
 * `MultiSelectController` / `ParameterCursor`.
 */

const COURSE = "astr201";
const UNIT = "m1-l2";
const ID = "fill-blank-controller-test";
const KEY = (slotId: string) => `fillblank:${ID}:${slotId}:value`;

/**
 * The static FillBlank markup the transform emits, by hand. Two inline
 * slots (`lambda`, `nlower`) inside the prompt prose. The controller is
 * a sibling island; in the real page Astro renders both into the same
 * section, the prose statically and the controller as a hydration-only
 * `client:load` island.
 */
function FillBlankFixture({ controller }: { controller: ReactNode }) {
  return (
    <ProfileProvider profile='student'>
      <section
        data-pedagogy-role='fill-blank'
        data-formative-anchor={ID}
        aria-labelledby={`${ID}-label`}
      >
        <h3 id={`${ID}-label`}>Fill in the blank</h3>
        <p>
          {"The H-alpha line has wavelength "}
          <input
            type='text'
            data-fb-slot=''
            data-slot-id='lambda'
            aria-label='blank lambda'
          />
          {" nm and ends at "}
          <input
            type='text'
            data-fb-slot=''
            data-slot-id='nlower'
            aria-label='blank nlower'
          />
          .
        </p>
        {controller}
      </section>
    </ProfileProvider>
  );
}

function inputBySlot(container: HTMLElement, slotId: string): HTMLInputElement {
  const el = container.querySelector<HTMLInputElement>(
    `input[data-fb-slot][data-slot-id="${slotId}"]`
  );
  if (!el) throw new Error(`slot input data-slot-id="${slotId}" not found`);
  return el;
}

/** Seed a persisted slot value the way `useInteractive` writes it. */
async function seedSlot(slotId: string, value: string): Promise<void> {
  await getStore(COURSE).set("student", UNIT, KEY(slotId), {
    value,
    ts: Date.now(),
  });
}

describe("<FillBlankController>", () => {
  it("renders nothing of its own when there are no slots (null-render island)", () => {
    const { container } = render(
      <ProfileProvider profile='student'>
        <section data-formative-anchor={ID}>
          <FillBlankController course={COURSE} unit={UNIT} id={ID} />
        </section>
      </ProfileProvider>
    );
    // No inputs in the section → no bindings → no rendered DOM beyond the
    // fixture's own <section>.
    expect(container.querySelectorAll("input")).toHaveLength(0);
  });

  it("restores persisted slot values onto the static inputs on mount", async () => {
    await seedSlot("lambda", "656.3");
    await seedSlot("nlower", "2");
    const { container } = render(
      <FillBlankFixture
        controller={<FillBlankController course={COURSE} unit={UNIT} id={ID} />}
      />
    );
    await waitFor(() => {
      expect(inputBySlot(container, "lambda").value).toBe("656.3");
    });
    expect(inputBySlot(container, "nlower").value).toBe("2");
  });

  it("persists a slot's raw value via useInteractive on input", async () => {
    const { container } = render(
      <FillBlankFixture
        controller={<FillBlankController course={COURSE} unit={UNIT} id={ID} />}
      />
    );
    // Wait for slot discovery (bindings mount) before typing.
    const lambda = inputBySlot(container, "lambda");
    fireEvent.input(lambda, { target: { value: "656.3" } });
    await waitFor(async () => {
      const stored = await getStore(COURSE).get<string>(
        "student",
        UNIT,
        KEY("lambda")
      );
      expect(stored?.value).toBe("656.3");
    });
  });

  it("persists two slots independently", async () => {
    const { container } = render(
      <FillBlankFixture
        controller={<FillBlankController course={COURSE} unit={UNIT} id={ID} />}
      />
    );
    fireEvent.input(inputBySlot(container, "lambda"), {
      target: { value: "656.3" },
    });
    fireEvent.input(inputBySlot(container, "nlower"), {
      target: { value: "2" },
    });
    await waitFor(async () => {
      const lambdaStored = await getStore(COURSE).get<string>(
        "student",
        UNIT,
        KEY("lambda")
      );
      expect(lambdaStored?.value).toBe("656.3");
    });
    const nlowerStored = await getStore(COURSE).get<string>(
      "student",
      UNIT,
      KEY("nlower")
    );
    expect(nlowerStored?.value).toBe("2");
  });
});
