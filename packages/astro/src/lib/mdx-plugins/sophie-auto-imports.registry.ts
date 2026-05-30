import {
  SOPHIE_COMPONENTS_PACKAGE,
  SOPHIE_FIGURES_PACKAGE,
} from "./_shared/jsx-attrs.ts";

/**
 * Registry data for the Sophie auto-imports plugin (split from
 * `sophie-auto-imports.ts` per ADR 0061 focused-files): the component
 * sets that drive auto-import / `client:load` / formative-prop
 * threading, plus the per-component import-source map. The AST-walking
 * logic + the remark plugin live in `sophie-auto-imports.ts`, which
 * imports the symbols it needs from here.
 */

/**
 * Components that need an auto-injected `import { … } from
 * "@sophie/components"` AND an auto-injected `client:load` directive
 * — i.e., authored in chapter or registry MDX AND hydration-bearing
 * (state hook, IndexedDB persistence, Radix interactive primitive, or
 * runtime popover with linked-parameter / glossary store).
 *
 * Three classes of barrel-exported components are deliberately
 * absent from this set:
 *
 *  1. **Static-mapped** (`Aside`, `Callout`, `Figure`, `KeyEquation`,
 *     `Video`, `WorkedExample`, `Due`, `OfficeHours`, `Points`,
 *     `Reading`, `Week`). These flow through the `<Content
 *     components>` map (`makeStaticComponents` /
 *     `makeChromeComponents` in `components.tsx`) per ADR 0027,
 *     so Astro binds them at render time without needing an explicit
 *     import. `KeyEquation` is in the static map even though its
 *     popover is hydration-bearing — chapter authors who need the
 *     full interactive popover write the import + `client:load`
 *     directly. The reference primitives (`<EquationRef>`,
 *     `<FigureRef>`, `<ChapterRef>`, `<GlossaryTerm>`) appear in
 *     BOTH the static map (SSR fallback: bare text) AND the
 *     interactive set below (auto-import + `client:load`
 *     materializes the popover); the auto-import branch wins when
 *     the author actually uses the component.
 *
 *  2. **Content-only auto-imports** (the biography children, layout
 *     primitives, MultiRep slots, etc.) — see
 *     `SOPHIE_CONTENT_AUTO_IMPORT` below. They need the auto-import
 *     for ergonomics (zero-import author surface, ADR 0061 Rule 4)
 *     but DO NOT need hydration: rendering as SSR'd HTML is the
 *     complete contract. Putting `client:load` on them would
 *     hydrate a tree that has no client-side behavior — wasteful
 *     and confusing.
 *
 *  3. **Non-MDX-authored exports** (`IndexedDBResponseStore`,
 *     `SearchModal`, `ProfileProvider`, the course-info projection
 *     shells `HeroWithModules` / `ProseWithToc` / `SimpleList` /
 *     `ContactCard` / `GradingTable` / `PrereqsList` /
 *     `ObjectivesSection` / `AccessibilitySection` /
 *     `OfficeHoursTable` / `SectionLanding` / `ChromeTitleBar`).
 *     These are imported by `.astro` layouts directly, never by
 *     chapter MDX. They're outside this plugin's surface.
 *
 * `NumericQuestion` and `QuickCheck` ship as React components (PRs 6–9
 * of the formative-assessment plan) — they auto-import + `client:load`
 * here.
 *
 * `MCQ`, `MultiSelect`, `FillBlank`, AND `Tabs` / `Tab` are deliberately
 * ABSENT from this set: all are virtual authoring tags, expanded at
 * MDX-compile time by `sophieCompoundExpandRemarkPlugin` into static
 * markup + a childless controller island (`<MCQController>` /
 * `<MultiSelectController>` / `<FillBlankController>` /
 * `<TabsController>`; Tasks 3–6 of the compound-island transform). That
 * transform self-injects each controller's `import` + `client:load`
 * because it runs LAST in the chain (after this plugin); the auto-
 * import path is never used for the controllers. `MCQ` / `MultiSelect`
 * / `FillBlank` stay in `SOPHIE_FORMATIVE_PARENTS` below so the
 * threading job still wires `course`/`unit`/`parentId` onto nested
 * `<Solution>` / `<Hint>` children before the expansion runs; `Tabs` /
 * `Tab` are chrome (NOT formative parents — no namespace, no
 * threading), so they don't appear in any registry here.
 */
export const SOPHIE_INTERACTIVE_COMPONENTS: ReadonlySet<string> = new Set([
  "BlackbodyExplorer",
  "ChapterRef",
  "ComprehensionGate",
  "ConfidenceCheck",
  "Dropdown",
  "EffortLog",
  "EquationRef",
  "FigureRef",
  "GlossaryTerm",
  "Hint",
  "InteractiveCallout",
  "InteractiveCheckbox",
  "LearningObjectives",
  "NumericQuestion",
  "Objective",
  "ParameterCursor",
  "ParameterSlider",
  "PracticeProblem",
  "Predict",
  "QuickCheck",
  "Reflection",
  "RetrievalPrompt",
  "SkillReview",
  "Solution",
  "SpacedReview",
]);

/**
 * Components that need an auto-injected import but DO NOT need
 * `client:load` — content-only barrel exports authored inside chapter
 * or equation-registry MDX. The plugin folds the union of these and
 * `SOPHIE_INTERACTIVE_COMPONENTS` into a single ESM import line at the
 * top of the MDX file; the difference is the `client:load` pass below
 * skips them.
 *
 * Membership rationale per family:
 *  - **Biography children** authored inside equation-registry MDX
 *    (`Assumption`, `BreaksWhen`, `CommonMisuse`, `DerivationStep`):
 *    Tier-3 chrome cards rendered inline by `<KeyEquation>`; no
 *    per-instance state.
 *  - **Reasoning-OS primitives** (`Intervention`, `MultiRep`,
 *    `Observable`, `OMIFlow`, `RepEquation`, `RepFigure`,
 *    `RepVerbal`): pure-display pedagogy primitives per ADR 0058 §M5;
 *    the OMI taxonomy lives in serialized HTML, no client-side state.
 *  - **Layout primitives** (`Card`, `Grid`): SSR'd flex/grid wrappers.
 *  - **Equation-registry metadata** (`Units`): inline (symbol, unit)
 *    pairs displayed below `<KeyEquation>` bodies.
 *
 * Tests below enforce the disjointness invariant (no component in
 * both sets) and barrel-coverage (every barrel-exported MDX-authored
 * component is in one set, the static map, or the documented
 * exclusion list).
 */
export const SOPHIE_CONTENT_AUTO_IMPORT: ReadonlySet<string> = new Set([
  "Assumption",
  "BreaksWhen",
  "Card",
  "CommonMisuse",
  "DerivationStep",
  "Grid",
  "Intervention",
  "MultiRep",
  "OMIFlow",
  "Observable",
  "RepEquation",
  "RepFigure",
  "RepVerbal",
  "Units",
]);

/**
 * Union — every component the plugin will auto-import. Computed once
 * at module load.
 */
export const SOPHIE_AUTO_IMPORTED_COMPONENTS: ReadonlySet<string> = new Set([
  ...SOPHIE_INTERACTIVE_COMPONENTS,
  ...SOPHIE_CONTENT_AUTO_IMPORT,
]);

/**
 * Per-component import source. Components NOT listed here default to the
 * main `@sophie/components` barrel; listed components import from a subpath
 * entry instead. Today the only subpath is `@sophie/components/figures`,
 * which isolates @observablehq/plot + d3 from the main barrel's module
 * graph (ADR 0022 amendment). `injectAutoImports` groups used components by
 * source and emits one import per distinct source. Adding a future subpath
 * component is a one-line map entry.
 */
export const SOPHIE_COMPONENT_IMPORT_SOURCE: ReadonlyMap<string, string> =
  new Map([["BlackbodyExplorer", SOPHIE_FIGURES_PACKAGE]]);

export function importSourceFor(name: string): string {
  return SOPHIE_COMPONENT_IMPORT_SOURCE.get(name) ?? SOPHIE_COMPONENTS_PACKAGE;
}

/**
 * Components that own a `(course, unit, id)` namespace and thread it
 * to formative-child descendants at compile time.
 *
 * The v1 formative family per ADR 0073 Amendment 1. "Parent" status is
 * orthogonal to how a parent renders: `<MCQ>` / `<MultiSelect>` /
 * `<FillBlank>` are virtual authoring tags (expanded to static markup +
 * a controller island by `sophieCompoundExpandRemarkPlugin`), while
 * `<NumericQuestion>` / `<QuickCheck>` / `<PracticeProblem>` ship as
 * React components. All six are listed here so the threading job has a
 * stable contract regardless of render strategy — the plugin is the
 * source of truth for "parent" status, not the implementations. The
 * threading runs BEFORE compound-island expansion, so nested
 * `<Solution>` / `<Hint>` children get `course`/`unit`/`parentId`
 * whether or not the parent is later expanded away.
 */
export const SOPHIE_FORMATIVE_PARENTS: ReadonlySet<string> = new Set([
  "FillBlank",
  "MCQ",
  "MultiSelect",
  "NumericQuestion",
  "PracticeProblem",
  "QuickCheck",
]);

/**
 * Components that receive `course` / `unit` / `parentId` from the
 * nearest formative-parent ancestor at MDX-compile time.
 */
export const SOPHIE_FORMATIVE_CHILDREN: ReadonlySet<string> = new Set([
  "Hint",
  "Solution",
]);
