# Content Schema

Zod schemas for the platform's content. **Zod is the source of truth.**
TypeScript types are inferred via `z.infer<typeof X>`; JSON Schema is
generated via `zod-to-json-schema` for VSCode YAML autocomplete and
external authoring tools. Astro Content Collections consume the same
Zod schemas natively.

Status: **draft**. Needs to be exercised by writing one real chapter's
frontmatter against it (recommended: ASTR 201
flux/luminosity/distance or blackbody radiation) before being
committed.

## Design decisions worth flagging

1. **Zod as source of truth.** Hand-written TS types and Zod schemas
   would drift; one source eliminates the foot-gun. `z.infer` produces
   the TS types; `zodToJsonSchema()` produces the JSON Schema. Bundle
   size is moot — Zod isn't shipped to the browser, only validated
   payloads are.
2. **Framing is a discriminated union** (`'OMI' | 'PMI' | 'custom'`),
   not a string. Lets ASTR 201 ship OMI and COMP 536 ship PMI without
   forking. Audit dispatches on `kind`.
3. **Body is MDX, not in the schema.** The schema validates frontmatter
   and the *contract* (which components must appear). Body content is
   free MDX.
4. **`MediaAsset.source` is a tagged union with `generated` kind.**
   Generated assets carry their generator script reference, so the
   audit knows which assets are stale when source changes.
5. **Misconceptions are first-class entities.** They drive the AI audit:
   "this chapter declares concept X; X has misconceptions A/B/C; does
   the body address them?"
6. **Course is separated from Chapter.** A canonical chapter is owned
   by one course but can be referenced/scheduled by many Course
   instances (sp26, sp27). Content is not duplicated per semester.
7. **`primaryVideo` is in chapter frontmatter**, not buried in MDX.
   Given the "lecture less / content creator" goal, video deserves
   first-class layout treatment and audit visibility.
8. **`Chapter.runtime.python` declares Pyodide needs upfront.** No
   auto-install at runtime. Audit can warn on undeclared imports.
9. **Persistence is IndexedDB-backed via the `ResponseStore`
   repository abstraction.** See `design-notes.md` §Persistence.
   Mission responses, prediction responses, and code-cell run records
   are stored client-side per-course; the v3 sync seam is the same
   interface with a different implementation.
10. **Profile field is in the schema from day one, but v1 only builds
    the student target.** `Chapter.profiles` and `Mission.profiles`
    default to `['student', 'instructor']`. Inline MDX components
    (`<SolutionKey>`, `<InstructorNote>`) exist and strip in v1; v2
    activates the second build target without chapter changes.
    See `dual-profile-builds.md`.
11. **`schemaVersion` discipline.** Every persisted record (responses
    in `ResponseStore`, every entity in chapter frontmatter) carries a
    `schemaVersion` integer. Migrations are forward-only and run on
    read; original recorded fields are preserved (no retroactive
    backfill). The `sophia upgrade` CLI ships in v1 (no-op until the
    first breaking change) so consumers get a stable migration story
    from day one.
12. **Component prop schemas are colocated with the component**, not
    in this central schema. `Prediction`'s prop Zod schema lives at
    `@sophia/components/src/Prediction/Prediction.schema.ts`. Only
    *content* entities (Chapter, Mission, MediaAsset, Concept, Skill,
    Misconception, Course) live in `@sophia/schema`.
13. **`lang` is reserved for future i18n.** v1 is English-only;
    `Chapter.lang` defaults to `'en'`. Real string externalization is
    deferred to v3+ — reserving the field is light insurance against
    a low-probability event.

## Schema

```typescript
import { z } from 'zod';

// ─── ID brands (kebab-case validated) ────────────────────────────────
const KebabId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case');

const ChapterId       = KebabId.brand<'ChapterId'>();
const MissionId       = KebabId.brand<'MissionId'>();
const DemoId          = KebabId.brand<'DemoId'>();
const AssetId         = KebabId.brand<'AssetId'>();
const ConceptId       = KebabId.brand<'ConceptId'>();
const SkillId         = KebabId.brand<'SkillId'>();
const MisconceptionId = KebabId.brand<'MisconceptionId'>();
const CourseId        = KebabId.brand<'CourseId'>();
const CitationKey     = z.string().min(1).brand<'CitationKey'>();

// ─── Shared taxonomy ─────────────────────────────────────────────────
const Bloom = z.enum([
  'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create',
]);

// Visibility profile. v1 builds only the student target; field is still
// authored so v2 migration is purely additive. v2 drives entity-level
// build-time filtering AND body-level <SolutionKey> / <InstructorNote>.
const Profile = z.enum(['student', 'instructor']);

const LearningGoalSchema = z.object({
  text: z.string().min(1),
  bloom: Bloom,
  skills: z.array(SkillId),
});

// Pluggable pedagogy framing. Discriminated union. Audit dispatches on `kind`.
const FramingSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('OMI'),
    observable: z.string().min(1),
    model: z.string().min(1),
    inference: z.string().min(1),
  }),
  z.object({
    kind: z.literal('PMI'),
    problem: z.string().min(1),
    model: z.string().min(1),
    implementation: z.string().min(1),
    interpretation: z.string().min(1),
  }),
  z.object({
    kind: z.literal('custom'),
    type: z.string().min(1),
    fields: z.record(z.string(), z.string()),
  }),
]);

// ─── Chapter ─────────────────────────────────────────────────────────
export const ChapterSchema = z.object({
  schemaVersion: z.literal(1),

  id: ChapterId,
  title: z.string().min(1),
  lang: z.string().default('en'),               // reserved for future i18n
  course: CourseId,                              // canonical owner
  unit: z.string().optional(),
  audience: z.string().min(1),
  estimatedReadingMinutes: z.number().int().positive(),
  profiles: z.array(Profile).default(['student', 'instructor']),

  framing: FramingSchema,
  goals: z.array(LearningGoalSchema),
  concepts: z.array(ConceptId),
  skills: z.array(SkillId),
  prerequisites: z.object({
    concepts: z.array(ConceptId).optional(),
    chapters: z.array(ChapterId).optional(),
  }).default({}),

  // Multimedia first-class
  primaryVideo: AssetId.optional(),
  primaryPodcast: AssetId.optional(),
  videos: z.array(AssetId).default([]),
  figures: z.array(AssetId).default([]),
  demos: z.array(DemoId).default([]),
  missions: z.array(MissionId).default([]),

  citations: z.array(CitationKey).default([]),
  misconceptions: z.array(MisconceptionId).default([]),

  // Optional Pyodide runtime declaration (COMP chapters)
  runtime: z.object({
    python: z.object({
      packages: z.array(z.string()).default([]),
      pyodideVersion: z.string().optional(),
      shareKernelAcrossCells: z.boolean().default(true),
    }).optional(),
  }).optional(),

  slides: z.object({
    enabled: z.boolean(),
    deckId: z.string().optional(),
  }).optional(),

  canvas: z.object({
    module: z.string(),
    estimatedTime: z.string(),
    exportable: z.boolean(),
  }).optional(),

  version: z.string(),
  status: z.enum(['draft', 'review', 'published', 'deprecated']),
});
export type Chapter = z.infer<typeof ChapterSchema>;

// ─── Mission ─────────────────────────────────────────────────────────
const MissionStepSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('prediction'),
    question: z.string(), choices: z.array(z.string()).optional(),
    answer: z.string().optional(), skill: SkillId,
  }),
  z.object({
    kind: z.literal('demo-interaction'),
    demoState: z.record(z.string(), z.unknown()).optional(),
    prompt: z.string(),
  }),
  z.object({
    kind: z.literal('inference-prompt'),
    prompt: z.string(), rubric: z.string().optional(),
  }),
  z.object({ kind: z.literal('assumption-check'), prompt: z.string() }),
  z.object({
    kind: z.literal('free-response'),
    prompt: z.string(), minWords: z.number().int().positive().optional(),
  }),
  z.object({ kind: z.literal('reflection'), prompt: z.string() }),
  z.object({
    kind: z.literal('code-execution'),
    cellId: z.string(), prompt: z.string(), rubric: z.string().optional(),
  }),
  // Pre-mortem (added per pedagogical-innovations.md, item 6)
  z.object({
    kind: z.literal('pre-mortem'),
    prompt: z.string(),
    failureModeRubric: z.string().optional(),
  }),
]);

export const MissionSchema = z.object({
  schemaVersion: z.literal(1),
  id: MissionId,
  title: z.string().min(1),
  scenario: z.string().min(1),
  concepts: z.array(ConceptId),
  skills: z.array(SkillId),
  estimatedMinutes: z.number().int().positive(),
  demoId: DemoId.optional(),
  profiles: z.array(Profile).default(['student', 'instructor']),
  steps: z.array(MissionStepSchema),
  exports: z.object({
    canvas: z.object({
      kind: z.enum(['assignment', 'discussion', 'quiz']),
      rubric: z.string().optional(),
    }).optional(),
  }).default({}),
});
export type Mission = z.infer<typeof MissionSchema>;

// ─── Code cells (Pyodide-runnable) ───────────────────────────────────
// CodeCell is a *component*, so its prop schema lives next to the
// component at @sophia/components/src/CodeCell/CodeCell.schema.ts.
// Reproduced here as the canonical pedagogical-kind enum:
export const CodeCellPedagogicalKind = z.enum([
  'illustrative',
  'predict-then-run',
  'fill-in-blank',
  'parameter-sweep',
  'compare',
]);

// ─── MediaAsset ──────────────────────────────────────────────────────
const GeneratorRefSchema = z.object({
  language: z.enum(['python', 'manim', 'svg', 'js']),
  scriptPath: z.string(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  outputPath: z.string(),
});

const MediaAssetSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('local'),     path: z.string() }),
  z.object({
    kind: z.literal('youtube'),
    videoId: z.string(),
    start: z.number().nonnegative().optional(),
    end: z.number().nonnegative().optional(),
  }),
  z.object({ kind: z.literal('cdn'),       url: z.string().url() }),
  z.object({ kind: z.literal('generated'), generator: GeneratorRefSchema }),
]);

const TranscriptSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('inline'), text: z.string() }),
  z.object({ kind: z.literal('file'),   path: z.string() }),
  z.object({ kind: z.literal('auto') }),
]);

export const MediaAssetSchema = z.object({
  schemaVersion: z.literal(1),
  id: AssetId,
  kind: z.enum(['figure', 'video', 'audio', 'animation']),
  title: z.string(),
  caption: z.string().optional(),
  source: MediaAssetSourceSchema,
  alt: z.string(),
  longDescription: z.string().optional(),
  transcript: TranscriptSchema.optional(),
  captions: z.array(z.object({
    lang: z.string(),
    path: z.string(),
  })).default([]),
  concepts: z.array(ConceptId).default([]),
  license: z.string().optional(),
  attribution: z.string().optional(),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

// ─── Concept / Skill / Misconception ─────────────────────────────────
export const ConceptSchema = z.object({
  schemaVersion: z.literal(1),
  id: ConceptId,
  name: z.string().min(1),
  shortDescription: z.string().min(1),
  prerequisites: z.array(ConceptId).default([]),
  relatedSkills: z.array(SkillId).default([]),
  glossaryEntry: z.string().optional(),
});
export type Concept = z.infer<typeof ConceptSchema>;

export const SkillSchema = z.object({
  schemaVersion: z.literal(1),
  id: SkillId,
  name: z.string().min(1),
  description: z.string().min(1),
  domain: z.string().min(1),    // 'general' | 'astronomy' | 'computational' | extension
  bloom: Bloom.optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const MisconceptionSchema = z.object({
  schemaVersion: z.literal(1),
  id: MisconceptionId,
  concept: ConceptId,
  description: z.string().min(1),
  whyStudentsHoldIt: z.string().min(1),
  diagnosticPrompt: z.string().optional(),
  remediation: z.string().min(1),
});
export type Misconception = z.infer<typeof MisconceptionSchema>;

// ─── Course (semester instance) ──────────────────────────────────────
const WeekEntrySchema = z.object({
  week: z.number().int().positive(),
  title: z.string(),
  readings: z.array(ChapterId),
  missions: z.array(MissionId).optional(),
  demos: z.array(DemoId).optional(),
  videos: z.array(AssetId).optional(),
  canvasAssignmentRef: z.string().optional(),
});

export const CourseSchema = z.object({
  schemaVersion: z.literal(1),
  id: CourseId,
  title: z.string().min(1),
  semester: z.string().optional(),       // 'sp26'; absent for canonical
  parent: CourseId.optional(),           // semester instance → canonical
  schedule: z.array(WeekEntrySchema).optional(),
  textbookChapters: z.array(ChapterId).default([]),
  missions: z.array(MissionId).default([]),
});
export type Course = z.infer<typeof CourseSchema>;
```

Each schema's `z.infer<typeof X>` produces the TypeScript type. The
build emits a JSON Schema artifact via `zod-to-json-schema(X)` for
VSCode YAML autocomplete on chapter frontmatter.

## What's deliberately not in the *content* schema

- **Demo schema.** `DemoId` resolves through `@sophia/cosmic-playground`'s
  manifest, which is a separate schema (validated by
  `manifest-schema.ts` in that adapter package). Demos are external
  resources Sophia validates references to, not content Sophia owns.
  See `design-notes.md` §"Open design questions" item 3 for the
  resolved integration design.
- **Slide deck schema.** Slides are *generated* from chapters via the
  `@sophia/astro` slide adapter (Reveal.js + h2-as-slide-boundary).
  Not a top-level entity unless decks become independent of chapters.
- **Canvas export schema.** Transformation output, not a content type.
- **Citations.** CSL-JSON; consumer-config selects citation style
  (ApJ default for ASTR, APA for COMP). `Chapter.citations[]` is the
  audit's reference list; `bibliography.json` (or `.bib` converted to
  CSL-JSON at build) is the resolution target.
- **Glossary.** `{ term, definition, concept? }` — sketch when needed.
- **Component prop schemas** (Prediction, OMI, FigureReading, etc.).
  Colocated with each component in `@sophia/components/src/<Name>/<Name>.schema.ts`.
- **Persisted response records** (PredictionResponse, CodeCellRun,
  MissionCompletion). Colocated with the components that produce them,
  consumed via the `ResponseStore` interface at
  `@sophia/components/runtime/responseStore.ts`. See `design-notes.md`
  §Persistence.
- **Public plugin / extension API.** Architecturally specified in v1
  (`registerComponent`, `registerAuditCheck`, `registerPromptTemplate`,
  `extendChapterSchema`, theme token namespacing) but the *registration
  metadata schema* (third-party plugin manifest) is documented when
  the first external plugin is being onboarded.

## Next step

Pick a chapter that's already been taught (recommended: ASTR 201
flux/luminosity/distance or blackbody radiation) and fill out the schema by
hand. That exercise will surface every missing field, over-specified type, and
ambiguous boundary in 30 minutes.
