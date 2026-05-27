import {
  Aside,
  Callout,
  ChapterRef,
  Due,
  EquationRef,
  Figure,
  FigureRef,
  type FigureRegistry,
  GlossaryTerm,
  KeyEquation,
  OfficeHours,
  Points,
  Reading,
  Video,
  Week,
  WorkedExample,
} from "@sophie/components";

export interface MakeStaticComponentsOptions {
  /**
   * Figure registry passed to every `<Figure name="…">` invocation in
   * MDX. Typically generated from a `figures.ts` or chapter frontmatter.
   */
  figures: FigureRegistry;
}

export interface MakeChromeComponentsOptions {
  /**
   * Figure registry passed to every `<Figure name="…">` invocation in
   * course-info prose MDX (e.g. `prose/syllabus`). Same shape as
   * `MakeStaticComponentsOptions.figures`; named separately so future
   * divergence (e.g. a course-info-only figure scope) is a type-level
   * change rather than a structural refactor.
   */
  figures: FigureRegistry;
}

interface MdxFigureProps {
  name?: string;
  src?: string;
  alt?: string;
  caption?: string;
  credit?: string;
}

/**
 * Inline chrome + course-management chrome shared by `makeStaticComponents`
 * (chapter MDX) and `makeChromeComponents` (course-info prose fragments).
 * None of these carry an `epistemicRole` per ADR 0058 — they organize,
 * label, or cross-reference pedagogical content; they don't carry it.
 *
 * Interactive variants (`<InteractiveCallout>`, persistence-bearing
 * RetrievalCard etc.) must be imported directly inside MDX with
 * `client:load` because Astro's `<Content components>` map cannot carry
 * hydration metadata. Hydration-gated reference components
 * (`<EquationRef>`, `<FigureRef>`, `<ChapterRef>`, `<GlossaryTerm>`,
 * `<KeyEquation>`) appear here as fallbacks: SSR + first client render
 * emit a bare-text shape; full popovers materialize only when the author
 * writes `client:load` on a direct import. The map entry exists so MDX
 * compile doesn't error when authors use the bare form.
 */
function buildChromeSubset({ figures }: { figures: FigureRegistry }) {
  return {
    // Inline chrome (no per-instance state):
    Aside,
    Callout,
    KeyEquation,
    GlossaryTerm,
    EquationRef,
    FigureRef,
    ChapterRef,
    // Static media chrome:
    Video,
    // Course-management chrome (course-info projection per ADR 0080
    // Amendment 2). Reads from `course.sophie.yaml` via the
    // `useCourseSpec()` hook + SSR-setter store; safe in both factories.
    Due,
    OfficeHours,
    Points,
    Reading,
    Week,
    Figure: (props: MdxFigureProps) => {
      if (props.name !== undefined) {
        return (
          <Figure
            name={props.name}
            registry={figures}
            caption={props.caption}
            credit={props.credit}
          />
        );
      }
      if (props.src !== undefined && props.alt !== undefined) {
        return (
          <Figure
            src={props.src}
            alt={props.alt}
            caption={props.caption}
            credit={props.credit}
          />
        );
      }
      // Malformed call: render the same missing-figure placeholder that
      // <Figure> uses for registry-not-found, so the failure is visible
      // rather than silent.
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "[@sophie/astro] <Figure> requires either `name` (registry mode) or `src` + `alt` (inline mode). Got:",
          props
        );
      }
      return (
        <figure>
          <div role='img' aria-label='Missing figure'>
            Missing figure: <code>(invalid props)</code>
          </div>
        </figure>
      );
    },
  };
}

/**
 * Builds the chapter MDX components map for `<Content components={...} />`
 * in `reading.astro`. Full set: chrome subset + pedagogy primitives
 * whose meaning depends on chapter context.
 *
 * Pedagogy primitives currently registered: `<WorkedExample>`. Future
 * primitives (`<OMIFlow>`, `<MultiRep>`, `<Intervention>`) are not yet
 * registered through this factory pending their factory-registration
 * design pass — see ADR 0058 §R-0080-A2 (chrome-vs-pedagogy boundary).
 *
 * Per ADR 0027.
 */
export function makeStaticComponents({ figures }: MakeStaticComponentsOptions) {
  return {
    ...buildChromeSubset({ figures }),
    // WorkedExample is content-only (no per-instance state). Its slot
    // sub-components (Problem/Step/DimCheck/Result) resolve as member
    // access on the mapped component. Per ADR 0027 / ADR 0081.
    WorkedExample,
  };
}

/**
 * Builds the course-info prose-fragment components map consumed by the
 * info-page layouts (`SyllabusPage.astro`, `PoliciesPage.astro`,
 * `InstructorPage.astro`, `AccommodationsPage.astro`). Chrome subset
 * only — pedagogy primitives (`<WorkedExample>`, future `<OMIFlow>` /
 * `<MultiRep>` / `<Intervention>`) are excluded by construction because
 * their meaning depends on chapter context that course-info prose
 * doesn't have.
 *
 * Structural enforcement of the ADR 0058 §R-0080-A2 chrome-vs-pedagogy
 * boundary at the factory layer: pedagogy components aren't merely
 * "discouraged" in prose fragments — they're absent from the map, so
 * an attempt to author them raises a "Component … was not provided"
 * MDX error at compile.
 */
export function makeChromeComponents({ figures }: MakeChromeComponentsOptions) {
  return buildChromeSubset({ figures });
}
