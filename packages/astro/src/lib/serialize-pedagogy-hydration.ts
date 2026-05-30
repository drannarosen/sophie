import type {
  CourseSpec,
  FigureRegistryEntry,
  PedagogyIndex,
} from "@sophie/core/schema";

/**
 * The `<script type="application/json">` hydration payloads
 * `TextbookLayout.astro` emits so each role's client-side store can
 * rehydrate after React mount (server-side module state doesn't survive
 * to the wire — without these, `<GlossaryTerm>` / `<EquationRef>` /
 * `<FigureRef>` rerender as bare prose). Split out of the layout per ADR
 * 0061 focused-files; the escape logic is now directly unit-testable.
 */
export interface PedagogyHydrationPayloads {
  definitions: string;
  equations: string;
  equationCitations: string;
  figureRegistry: string;
  figureUsages: string;
  objectives: string;
  sections: string;
  units: string;
  artifacts: string;
  /** `"null"` when the consumer has not authored a course spec. */
  courseSpec: string;
}

/**
 * `JSON.stringify` then escape `<` as `<` so a `</script>`
 * substring inside a payload body cannot terminate the SSR `<script>`
 * tag early — realistic for AI-authored CS/web content (ADR 0030). The
 * escape survives `JSON.parse` on the client (`<` → `<`).
 */
function toScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Build every hydration payload from the accumulated pedagogy index +
 * the consumer-supplied figure registry + the (possibly null) course
 * spec. A null `courseSpec` serializes to the literal `"null"` so the
 * script tag emits valid JSON the client store reads as "no spec".
 */
export function serializePedagogyForHydration(
  pedagogy: PedagogyIndex,
  figureRegistry: ReadonlyArray<FigureRegistryEntry>,
  courseSpec: CourseSpec | null
): PedagogyHydrationPayloads {
  return {
    definitions: toScriptJson(pedagogy.definitions),
    equations: toScriptJson(pedagogy.equations),
    equationCitations: toScriptJson(pedagogy.equationCitations),
    figureRegistry: toScriptJson(figureRegistry),
    figureUsages: toScriptJson(pedagogy.figureUsages),
    objectives: toScriptJson(pedagogy.objectives),
    sections: toScriptJson(pedagogy.sections),
    units: toScriptJson(pedagogy.units),
    artifacts: toScriptJson(pedagogy.artifacts),
    courseSpec: courseSpec ? toScriptJson(courseSpec) : "null",
  };
}
