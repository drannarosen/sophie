import type { CourseSpec, PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { serializePedagogyForHydration } from "./serialize-pedagogy-hydration.ts";

/**
 * The only behavior worth pinning here is the security-relevant
 * `</script>`-escape (ADR 0030): a payload body containing `</script>`
 * must NOT survive into the serialized JSON as a literal `<`, or it
 * would terminate the SSR `<script>` tag early. The rest is plain
 * `JSON.stringify` round-tripping.
 */

/** Minimal PedagogyIndex with every field the serializer reads. */
const emptyIndex = (overrides: Partial<PedagogyIndex> = {}): PedagogyIndex =>
  ({
    definitions: [],
    equations: [],
    equationCitations: [],
    figureUsages: [],
    objectives: [],
    sections: [],
    units: [],
    artifacts: [],
    ...overrides,
  }) as unknown as PedagogyIndex;

describe("serializePedagogyForHydration", () => {
  it("escapes every `<` as \\u003c so a `</script>` body can't close the tag early", () => {
    const index = emptyIndex({
      definitions: [
        { slug: "x", body: "see <script>alert(1)</script> here" },
      ] as unknown as PedagogyIndex["definitions"],
    });

    const payloads = serializePedagogyForHydration(index, [], null);

    expect(payloads.definitions).not.toContain("</script>");
    expect(payloads.definitions).not.toContain("<");
    expect(payloads.definitions).toContain("\\u003c");
    // The escape survives JSON.parse → the original `<` is recovered.
    expect(JSON.parse(payloads.definitions)[0].body).toBe(
      "see <script>alert(1)</script> here"
    );
  });

  it('serializes a null courseSpec to the literal string "null"', () => {
    const payloads = serializePedagogyForHydration(emptyIndex(), [], null);
    expect(payloads.courseSpec).toBe("null");
  });

  it("serializes a present courseSpec with the same `<` escape", () => {
    const spec = { title: "A <b> course" } as unknown as CourseSpec;
    const payloads = serializePedagogyForHydration(emptyIndex(), [], spec);
    expect(payloads.courseSpec).not.toContain("<");
    expect(JSON.parse(payloads.courseSpec).title).toBe("A <b> course");
  });

  it("escapes `<` inside the figure registry payload too", () => {
    const payloads = serializePedagogyForHydration(
      emptyIndex(),
      [{ name: "f", alt: "<x" }] as unknown as Parameters<
        typeof serializePedagogyForHydration
      >[1],
      null
    );
    expect(payloads.figureRegistry).not.toContain("<");
    expect(payloads.figureRegistry).toContain("\\u003c");
  });
});
