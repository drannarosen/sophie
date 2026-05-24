import { z } from "zod";
import { type AuditFinding, AuditFindingSchema } from "./audit.js";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `CourseSpecSchema` — Course Spec v0.1. Authoritative design:
 * [`docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md`](../../../../docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md)
 * §"The Course Spec format". Locked by ADR 0080.
 *
 * Single YAML file at the consumer-course repo root:
 * `course.sophie.yaml`. The `.sophie.yaml` extension marks the file
 * Sophie-recognizable. Schema is the source of truth per ADR 0003.
 *
 * Eight non-nesting top-level sections:
 *
 *   1. **identity**        — course metadata + voice reference.
 *   2. **audience**        — student profile, prerequisites,
 *                            assumed-vs-scaffolded skill split (audit
 *                            invariant `QB3` cites this).
 *   3. **pedagogy**        — registered pattern (e.g. OMI), required
 *                            moves, named tools, callouts, multi-track.
 *   4. **terminal_goals**  — what students leave the course able to do.
 *   5. **principles**      — non-negotiables AI authoring + audit honor.
 *   6. **assessment**      — philosophy + grade weights (must sum to
 *                            100) + workflow + exam policy.
 *   7. **quality_bars**    — required (errors) + recommended (warnings)
 *                            audit invariants.
 *   8. **discovery**       — filesystem glob conventions Sophie uses to
 *                            find Sections, Units, Artifacts, registries
 *                            (ADR 0067 hierarchy; amended in ADR 0080
 *                            §"Revisions" 2026-05-26 from the original
 *                            module-shaped doctrine).
 *
 * Plus spec metadata: `spec_version` ("0.1") + `schema` literal
 * (`@sophie/schemas/course-spec@0.1`). The schema id is a logical
 * identifier decoupled from the JS implementation path (currently
 * `@sophie/core/schema`) so a future `@sophie/schemas` extraction does
 * not require consumer YAML changes (ADR 0080 §4).
 *
 * `.strict()` everywhere — silent absorption of `pedaogy:` typos is the
 * failure mode the schema is designed to prevent. Future fields go
 * through explicit `spec_version` bumps (ADR 0080 §5).
 */

// ─── Section 1: identity ────────────────────────────────────────────

const IdentitySchema = z
  .object({
    /** Stable across term-by-term offerings; cross-reference target for audit reports. */
    id: Slug,
    title: NonEmptyString,
    /** Course code as printed in the catalog, e.g. "ASTR 201". */
    code: NonEmptyString,
    term: NonEmptyString,
    institution: NonEmptyString,
    instructor: NonEmptyString,
    /** References `voices/<voice>.yaml` in the consumer-course repo. */
    voice: Slug,
    /** Selects which register from the referenced voice file applies. */
    voice_register: Slug,
    subtitle: NonEmptyString,
    description: NonEmptyString,
  })
  .strict();

// ─── Section 2: audience ────────────────────────────────────────────

const PrerequisitesSchema = z
  .object({
    courses: z.array(Slug).default([]),
    /** Skills students are HOPED to have retained (audit `QB3`). */
    assumed_skills: z.array(Slug).default([]),
    /** Skills re-established inline as needed (audit `QB3` exemption). */
    scaffolded_skills: z.array(Slug).default([]),
  })
  .strict();

const AudienceSchema = z
  .object({
    level: Slug,
    majors_minors: z.array(Slug).default([]),
    enrollment_motivation: NonEmptyString,
    prerequisites: PrerequisitesSchema,
    affective_profile: NonEmptyString,
    /** Optional rich-audience extensions (design doc Q6 (c)). */
    personas: z.array(NonEmptyString).optional(),
    cognitive_load_model: NonEmptyString.optional(),
  })
  .strict();

// ─── Section 3: pedagogy ────────────────────────────────────────────

/**
 * Registered pedagogical patterns. v0.1 ships OMI only; new patterns
 * (e.g. `problem_algorithm_implementation_test` for COMP 521) land via
 * explicit `spec_version` bumps so the audit can verify pattern-specific
 * required moves.
 */
export const PedagogyPatternSchema = z.enum(["observable_model_inference"]);
export type PedagogyPattern = z.infer<typeof PedagogyPatternSchema>;

const NamedToolSchema = z
  .object({
    id: Slug,
    tagline: NonEmptyString,
  })
  .strict();

const MultiTrackReadingTrackSchema = z
  .object({
    id: Slug,
    label: NonEmptyString,
    /** Free-form duration label (e.g., "20_min", "30_min"). */
    target_time: NonEmptyString,
    deeper: z.boolean().optional(),
  })
  .strict();

const MultiTrackReadingsSchema = z
  .object({
    enabled: z.boolean(),
    tracks: z.array(MultiTrackReadingTrackSchema).default([]),
  })
  .strict();

const CalloutSchema = z
  .object({
    id: Slug,
    /** Role slug; free-form at v0.1 (gateway, navigation, formative, …). */
    role: Slug,
    use: NonEmptyString,
  })
  .strict();

const PedagogySchema = z
  .object({
    pattern: PedagogyPatternSchema,
    /** Pattern-specific stage descriptors (OMI: observable / model / inference / assumption_audit). */
    required_moves: z.record(Slug, NonEmptyString),
    named_tools: z.array(NamedToolSchema).default([]),
    multi_track_readings: MultiTrackReadingsSchema.optional(),
    callouts: z.array(CalloutSchema).default([]),
  })
  .strict();

// ─── Section 4: terminal_goals ──────────────────────────────────────

const TerminalGoalSchema = z
  .object({
    /** Author-convention id (e.g. "TG1"); free-form NonEmptyString. */
    id: NonEmptyString,
    /** Short kebab-Slug tag (e.g. "infer-physical-property"). */
    tag: Slug,
    statement: NonEmptyString,
    contributing_modules: z.array(Slug).min(1),
  })
  .strict();

// ─── Section 5: principles ──────────────────────────────────────────

const PrincipleSchema = z
  .object({
    /** Author-convention id (e.g. "P1"); free-form NonEmptyString. */
    id: NonEmptyString,
    statement: NonEmptyString,
    rationale: NonEmptyString,
  })
  .strict();

// ─── Section 6: assessment ──────────────────────────────────────────

const GradeWeightSchema = z
  .object({
    category: Slug,
    /** Weighted percentage; the full set must sum to 100 (refine below). */
    weight: z.number().nonnegative(),
    count: z.number().int().positive().optional(),
    label: NonEmptyString,
  })
  .strict();

const HomeworkRubricSchema = z
  .object({
    scale: NonEmptyString,
    weighted_factors: z.array(Slug).min(1),
  })
  .strict();

const GradeMemoSchema = z
  .object({
    cadence: Slug,
    due: Slug,
    purpose: Slug,
  })
  .strict();

const HomeworkWorkflowSchema = z
  .object({
    submission_day: Slug,
    solutions_posted: Slug,
    grade_memo: GradeMemoSchema,
    rubric: HomeworkRubricSchema,
  })
  .strict();

const GrowthMemosSchema = z
  .object({
    cadence: Slug,
    count: z.number().int().positive(),
    purpose: Slug,
    scored: z.boolean(),
    rubric_dimension: Slug,
  })
  .strict();

const ExamPolicySchema = z
  .object({
    note_policy: Slug,
    formula_sheet: Slug,
    final_cumulative: z.boolean(),
  })
  .strict();

const AssessmentSectionSchema = z
  .object({
    philosophy: NonEmptyString,
    grade_weights: z.array(GradeWeightSchema).min(1),
    homework_workflow: HomeworkWorkflowSchema.optional(),
    growth_memos: GrowthMemosSchema.optional(),
    exam_policy: ExamPolicySchema.optional(),
  })
  .strict()
  .refine(
    (a) => a.grade_weights.reduce((sum, w) => sum + w.weight, 0) === 100,
    {
      message: "grade_weights must sum to 100",
      path: ["grade_weights"],
    }
  );

// ─── Section 7: quality_bars ────────────────────────────────────────

/**
 * `scope:` accepts either a single Slug or an array of Slugs. Preprocessed
 * to always-array so downstream consumers walk a uniform shape.
 */
const ScopeFieldSchema = z.preprocess(
  (v) => (typeof v === "string" ? [v] : v),
  z.array(Slug).min(1)
);

const QualityBarSchema = z
  .object({
    /** Author-convention id (e.g. "QB1-accessibility"); free-form NonEmptyString. */
    id: NonEmptyString,
    scope: ScopeFieldSchema,
    check: NonEmptyString,
  })
  .strict();

const QualityBarsSchema = z
  .object({
    required: z.array(QualityBarSchema).default([]),
    recommended: z.array(QualityBarSchema).default([]),
  })
  .strict();

// ─── Section 8: discovery + spec metadata ───────────────────────────

/**
 * Discovery globs align with ADR 0067's Section → Subsection → Unit →
 * Artifact content hierarchy (inline-amended in ADR 0080 §"Revisions"
 * 2026-05-26). The three required top-level globs match the on-disk
 * layout demonstrated by `examples/smoke/src/content.config.ts`:
 *
 *   - `sections`: per-Section JSON files (one per ADR 0067 Section).
 *   - `units`: per-Unit JSON files (one per ADR 0067 Unit).
 *   - `artifacts`: MDX/JSON for typed Artifacts. Recursive glob catches
 *     BOTH section-level artifacts (`sections/<sec>/<artifact>.mdx`)
 *     AND unit-level artifacts (`sections/<sec>/units/<unit>/<artifact>.mdx`).
 *
 * `registries` carries two REQUIRED keys (`equations`, `figures` — both
 * shipped registries today) plus two OPTIONAL keys (`topics` per
 * ADR 0079; `misconceptions` per ADR 0060) that courses may opt into.
 * `.strict()` rejects unknown registry keys, preserving the contract
 * discipline.
 *
 * Out of scope for v0.1: assessment surfaces (`assignments`, `exams`,
 * `diagnostics`) — these require ADR 0073 to ship first. The old
 * v0.1 doctrine included them as required; the inline amendment dropped
 * them entirely rather than leaving forward-declared stubs that can't
 * be rendered.
 */
const DiscoveryRegistriesSchema = z
  .object({
    equations: NonEmptyString,
    figures: NonEmptyString,
    topics: NonEmptyString.optional(),
    misconceptions: NonEmptyString.optional(),
  })
  .strict();

const DiscoverySchema = z
  .object({
    sections: NonEmptyString,
    units: NonEmptyString,
    artifacts: NonEmptyString,
    registries: DiscoveryRegistriesSchema,
  })
  .strict();

// ─── Top-level CourseSpecSchema ─────────────────────────────────────

/**
 * v0.1 only. ADR 0080 locks this string; future versions are explicit
 * `spec_version` bumps that ship new schema files (no in-place
 * mutation of the v0.1 surface).
 */
export const COURSE_SPEC_VERSION = "0.1" as const;

/**
 * v0.1 logical schema id. Decoupled from the JS implementation path
 * (currently `@sophie/core/schema`) so a future `@sophie/schemas`
 * package extraction does not break consumer YAML (ADR 0080 §4).
 */
export const COURSE_SPEC_SCHEMA_ID = "@sophie/schemas/course-spec@0.1" as const;

export const CourseSpecSchema = z
  .object({
    identity: IdentitySchema,
    audience: AudienceSchema,
    pedagogy: PedagogySchema,
    terminal_goals: z.array(TerminalGoalSchema).min(1),
    principles: z.array(PrincipleSchema).default([]),
    assessment: AssessmentSectionSchema,
    quality_bars: QualityBarsSchema,
    discovery: DiscoverySchema,
    spec_version: z.literal(COURSE_SPEC_VERSION),
    schema: z.literal(COURSE_SPEC_SCHEMA_ID),
  })
  .strict();

export type CourseSpec = z.infer<typeof CourseSpecSchema>;

// ─── validateCourseSpec helper ──────────────────────────────────────

/**
 * Validates a parsed YAML object against `CourseSpecSchema` and returns
 * the audit-pipeline finding shape (`AuditFinding[]`). Operates over a
 * **JS object**, not a YAML string — the YAML I/O boundary stays in
 * `@sophie/cli` so `@sophie/core` keeps its framework-pure runtime
 * deps (ADR 0001).
 *
 * Findings are ERROR-severity (a Course Spec violation fails CI). Each
 * Zod issue is mapped 1:1 to a finding with `code: "COURSE-SPEC"` and
 * a path-prefixed message so authors can find the offending section.
 *
 * Returns `[]` on success. Empty findings = valid.
 */
export function validateCourseSpec(input: unknown): AuditFinding[] {
  const result = CourseSpecSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => {
    const path = issue.path.map(String).join(".") || "<root>";
    return AuditFindingSchema.parse({
      severity: "ERROR",
      code: "COURSE-SPEC",
      message: `${path}: ${issue.message}`,
    });
  });
}
