---
title: Component Contract
short_title: Component contract
description: The TypeScript interface every Sophie pedagogy component implements.
tags:
  - components
  - contract
  - reference
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
status: shipped
---

# Component contract

The TypeScript interface every pedagogy component in Sophie implements.
Drives the renderer, the content audit, and the AI authoring kit
uniformly. One source of truth.

:::{seealso}
The shape revisions captured in this contract (`serialize` lifted out
of `modes`; accessibility-as-tests-not-data; `useInteractive`
runtime helper; composition rules) are recorded in
[ADR 0004](../decisions/0004-component-contract-revisions.md).
:::

This page covers:

1. What the contract is and why it exists
2. The contract itself (TypeScript)
3. Three render modes + a serialize function
4. State vs. response, and the `useInteractive` runtime helper
5. Cross-component protocol (`refs.consumes` / `refs.produces`)
6. Audit hooks (three tiers)
7. The v1 component set
8. Worked example: `<Prediction>` end-to-end
9. Adding a new component (checklist)
10. Open design questions

## 1. Why a contract

Every pedagogy component (`<OMI>`, `<Prediction>`, `<UnitCheck>`,
`<FigureReading>`, ...) needs to satisfy three consumers
simultaneously:

- The **renderer** has to produce HTML in three modes (textbook page,
  slide deck, print handout) and decide whether the component is
  static or needs client hydration.
- The **content audit** has to verify the component's pedagogical
  contract is met (correct fields present, references resolve, no
  orphan IDs, AI-driven quality checks).
- The **AI authoring kit** has to introspect the component to scaffold
  new chapters, suggest fixes, and run quality checks against a
  structured representation.

The contract is the shape every component fills in so all three of
those things work without special-case logic. Adding a new component
means filling in the contract — no central renderer or audit code
changes required.

The contract lives in `@sophie/components/src/contract.ts`.

## 2. The contract (TypeScript)

```typescript
import { z, ZodSchema } from 'zod';
import type { ComponentType } from 'react';

export interface PedagogyComponent<Props, State = void, Response = void> {
  /** Unique identifier for this component kind ('prediction', 'omi', 'unit-check', ...) */
  kind: string;

  /** Zod schema validating component props at build time */
  schema: ZodSchema<Props>;

  /** HTML/JSX render. `read` is required; others optional with sensible defaults. */
  render: {
    read: ComponentType<Props>;            // textbook chapter (required)
    slide?: ComponentType<Props>;          // Reveal.js presenter
                                           //   default: read wrapped in slide layout
    print?: ComponentType<Props>;          // PDF / handout
                                           //   default: read with .print class
  };

  /**
   * Structured representation for the AI audit. Separate from `render`
   * because it produces an AuditNode, not HTML.
   * Default: serialize props directly as { kind, id, semantics: props }.
   */
  serialize?: (props: Props) => AuditNode;

  /** If interactive, declare what gets persisted and exported. */
  interactive?: {
    /** Ephemeral UI state (what's currently selected/typed/etc.) */
    state: ZodSchema<State>;
    /** Persistent record (what gets stored via ResponseStore / exported to Canvas) */
    response: ZodSchema<Response>;
    /** Default state when student first encounters the component */
    initialState: State;
  };

  /** Cross-component protocol — see section 5. */
  refs?: {
    consumes?: string[];   // kinds of components that may reference this one
    produces?: string[];   // kinds of components this one may reference
  };

  /** Composition rules — audit Tier 2 enforces. */
  composition?: {
    containedIn?: string[];        // kinds this component MAY appear inside
    forbidsContaining?: string[];  // kinds this component MUST NOT contain
  };

  /** What the audit verifies — see section 6. */
  audit?: {
    requiredFields?: string[];                          // tier-1 fields
    pedagogyChecks?: PedagogyCheck<Props>[];            // tier-2 contract checks
    aiPrompts?: Record<string, AIQualityCheckPrompt>;   // tier-3 quality checks
  };
}
```

A component is registered by calling `registerComponent(definition)`,
which validates the contract shape, registers the component with the
MDX renderer, and adds it to the audit's known-components list.

:::{important} Two notable design points
1. `audit` is no longer a render mode. It's a top-level `serialize`
   function that produces structured data — a different operation
   from producing HTML, even though both consume the same props.
2. `accessibility` declarations as data are **gone**. A component
   declaring `requiresLiveRegion: true` doesn't make it implement
   one; the truth lives in the rendered DOM, not in metadata. Every
   component ships axe-core tests in Storybook + Playwright; the
   audit calls `pnpm test:a11y` instead of introspecting
   declarations. See [ADR 0004](../decisions/0004-component-contract-revisions.md).
:::

(three-render-modes-plus-serialize)=
## 3. Three render modes + a serialize function

Components declare which `render` modes they support. The renderer
dispatches based on `import.meta.env.MODE` (set per build invocation,
same pattern as the dual-profile `PROFILE` variable; see
[Set up dual-profile](../how-to/set-up-dual-profile.md)).

### `read` — textbook chapter (required)

The default. What appears in the published chapter pages on the
public site. Static for non-interactive components; client-hydrated
React island for interactive ones.

### `slide` — Reveal.js presenter (optional, defaults to read)

The component as it appears when the chapter is rendered as a slide
deck. Different layout, often progressive reveal. Speaker notes
allowed. No persistence — predictions made on slides don't write to
the `ResponseStore` (the audience isn't a single student).

Components without a `slide` implementation render `read` wrapped in
the slide layout. Most components don't need their own.

### `print` — PDF / handout (optional, defaults to read)

What appears in printable handouts. No interactivity, no JavaScript,
no animations, no color-only information. Predictions render as
worksheet bubbles with blank lines for free response. Components
without a `print` implementation render `read` with a `.print` class
that strips animation/interaction via CSS.

### `serialize` — structured representation for AI (separate from render)

Not HTML; not a render mode. `serialize(props): AuditNode` produces a
structured `AuditNode` (JSON-like tree) that AI quality checks consume.
It strips presentation entirely and exposes pedagogical structure:
what the question is, what the choices are, what the declared answer
is, what skill is exercised.

This is what Claude reads when running tier-3 audit checks. It lets
the AI reason about *what the component means* rather than what it
*looks like*.

Default behavior when `serialize` isn't implemented: emit
`{ kind, id: props.id, semantics: props }`. Components override when
prop shape doesn't match audit needs (e.g., flatten nested prop
structures, or omit fields irrelevant to the audit).

```typescript
type AuditNode = {
  kind: string;                          // component kind
  id?: string;                           // if the component has an ID
  semantics: Record<string, unknown>;    // structured pedagogical content
  children?: AuditNode[];                // for nested components
};
```

## 4. State vs. response (interactive components)

Two distinct shapes for interactive components.

| Concept | Lifetime | Purpose | Storage |
|---|---|---|---|
| **State** | Ephemeral | What's in the UI right now (selected option, draft text, current confidence slider value) | React state, drafted into IndexedDB on changes via `ResponseStore.draft()` |
| **Response** | Persistent record | What the student committed when they hit Submit | IndexedDB via `ResponseStore`; exported to Canvas |

Why both:

- State changes constantly while the student is interacting; we don't
  want to write every keystroke to a permanent record.
- Response is the immutable artifact of student work. It gets
  exported, audited, used for calibration. It must not change after
  submit.

The `response` schema includes a `submittedAt` timestamp and a
`schemaVersion` field. Schema migrations are forward-only: if the
shape changes, old records are migrated on read; the original
recorded fields are preserved (we don't retroactively backfill).

(useinteractive-runtime-helper)=
### 4.1 The `useInteractive` runtime helper

Every interactive component would re-implement: read draft from store
on mount, write on change, freeze on submit, schema-migrate on read,
hydration safety (SSR/Astro islands), cross-tab sync. That's
boilerplate × every interactive component, with silent-data-corruption
risk if anyone gets it wrong.

`@sophie/components` ships a single hook that owns all of it:

```ts
import { useInteractive } from '@sophie/components/runtime';

const { state, setState, response, submit, isSubmitted, reset } = useInteractive({
  componentKind: 'prediction',
  questionId: props.id,
  chapterId,
  schema: PredictionResponseSchema,
  initialState,
  buildResponse: (state, meta) => ({
    ...state,
    submittedAt: meta.now,
    schemaVersion: 1,
    questionSnapshot: props.question,
  }),
});
```

Under the hood the hook:

- Reads the chapter context (provided by `@sophie/astro`).
- Subscribes to the `ResponseStore` for this `(componentKind, id)` pair.
- Persists draft state to IndexedDB on every `setState`.
- Freezes the response on `submit()` — subsequent state changes don't
  mutate the persisted record.
- Honors `BroadcastChannel` cross-tab updates.
- Migrates old records via the `response` schema's `schemaVersion`.

Components consume the hook; they never touch IndexedDB or the
`ResponseStore` interface directly. Authors of interactive components
write zero persistence code.

The corresponding `defineInteractive<S, R>()` helper composes the
`interactive: { state, response, initialState }` block of the
component contract from a single declarative call, in the same spirit
as Astro `defineCollection`.

## 5. Cross-component protocol (`refs.consumes` / `refs.produces`)

Some components reference others by ID. Examples:

- `<SolutionKey for="flux-distance-doubles">` consumes a
  `<Prediction id="flux-distance-doubles">`.
- `<CalibrationCurve>` consumes all `<Prediction>` responses on the
  page.
- `<MissionStep kind="prediction" predictionId="...">` references a
  Prediction.
- `<MisconceptionGuide for="flux-equals-luminosity">` consumes a
  `Misconception` declared in chapter frontmatter.

The contract makes these references first-class (under the `refs`
field) so the audit can verify the graph:

```typescript
// Prediction declares it can be consumed by others:
{
  kind: 'prediction',
  refs: { consumes: [], produces: [] },   // Prediction itself doesn't reference others
}

// SolutionKey declares it consumes Predictions:
{
  kind: 'solution-key',
  refs: { consumes: ['prediction'], produces: [] },
}

// CalibrationCurve aggregates Predictions:
{
  kind: 'calibration-curve',
  refs: { consumes: ['prediction'], produces: [] },
}
```

The audit walks the chapter AST, builds a graph of component
references by ID, and verifies:

- Every consumer's reference target exists.
- Every component declared as `produces` has at least one consumer
  somewhere (orphan warning, not error).
- Reference cycles are flagged.
- The student build doesn't reference instructor-only entities.

## 6. Audit hooks (three tiers)

Each component declares what the audit can verify about it. The audit
runs three tiers, in increasing cost order.

### Tier 1: Deterministic structural checks

Run on every save. Fast (milliseconds). No AI calls.

```typescript
audit: {
  requiredFields: ['id', 'question'],   // present in props
}

// Audit verifies:
// - props match Zod schema
// - required fields are non-empty
// - ID is unique within chapter (for components with IDs)
// - referenced asset/concept/skill IDs resolve
```

These are unit-test-style assertions on the parsed AST.

### Tier 2: Pedagogy-contract checks

Run on PR. Deterministic but more expensive (walks the AST
structurally). No AI.

```typescript
audit: {
  pedagogyChecks: [
    {
      id: 'has-skill-declaration',
      message: 'Prediction should declare which skill it exercises',
      check: (props, chapter) => props.skill !== undefined,
      severity: 'warning',
    },
    {
      id: 'has-solution-key',
      message: 'Prediction with answer should have a paired SolutionKey',
      check: (props, chapter) =>
        !props.answer || chapter.findByKind('solution-key', { for: props.id }),
      severity: 'warning',
    },
  ],
}

// Audit-level checks (not per-component):
// - Prediction cadence: ≥1 per ~700 words, ≤1 per ~200 words
// - Predictions distributed (not clumped)
// - At least one free-response per chapter
// - Required components present per pedagogical contract
// - Composition rules (containedIn / forbidsContaining)
```

### Tier 3: AI-driven quality checks

Run on PR or on demand. The Sophie CLI does *not* make AI calls. It
**emits structured prompt files** that AI tools (Claude Code, Codex,
or any other) consume. See
[Audit and AI authoring](../explanation/audit-and-ai-authoring.md).

```typescript
audit: {
  aiPrompts: {
    questionClarity: {
      systemPrompt: `You are reviewing a student-facing prediction
        question for clarity. ...`,
      input: (props) => `Question: ${props.question}\n` +
                       (props.choices ? `Choices: ${props.choices.join(', ')}` : ''),
    },
    answerCorrectness: {
      systemPrompt: `Verify the declared answer is physically correct
        given the question. ...`,
      input: (props) => `Question: ${props.question}\n` +
                       `Answer: ${props.answer}`,
    },
  },
}
```

Each AI prompt template is stored alongside the component. When `sophie
audit` runs in Tier 3 mode, it emits prompts to `.sophie-tasks/`.
See [Audit and AI authoring](../explanation/audit-and-ai-authoring.md)
for the full architecture, slash commands, and skills.

## 7. The v1 component set

Fifteen components in v1, organized into six tiers.

### Tier 1: Chapter framing — exactly one per chapter

| Component | Purpose | Required props |
|---|---|---|
| `<OMI>` | Astronomy framing: Observable → Model → Inference | observable, model, inference |
| `<PMI>` | Computational framing: Problem → Model → Implementation → Interpretation | problem, model, implementation, interpretation |

### Tier 2: Active commitment — interactive

| Component | Purpose |
|---|---|
| `<Prediction>` | Multiple-choice or free-response prediction with optional confidence |
| `<FigureReading>` | Active prompt around a figure: slope, axes, asymptotic behavior |

### Tier 3: Annotation — sense-making aids

| Component | Purpose |
|---|---|
| `<UnitCheck>` | Inline dimensional reasoning |
| `<Assumption>` | Explicit named assumption underlying a model |
| `<ModelLimit>` | Where this model breaks |

### Tier 4: Callouts — styled prose containers

| Component | Purpose | Notes |
|---|---|---|
| `<Example>` | Worked example | Optional `kind` (worked / anti-example / applied) |
| `<CheckYourself>` | Pause-and-reflect | May contain a `<Prediction>` or stand alone |
| `<MoreYouKnow>` | Optional enrichment | Defaults to collapsed |

### Tier 5: Profile-aware — instructor inline

| Component | Purpose | v1 behavior |
|---|---|---|
| `<SolutionKey for={id}>` | Worked solution paired with Prediction | Renders to `null` |
| `<InstructorNote>` | Inline teaching guidance | Renders to `null` |

### Tier 6: Asset references

| Component | Purpose |
|---|---|
| `<Figure>` | Image asset wrapper with required alt + caption |
| `<Demo>` | Cosmic Playground demo embed by ID |
| `<Video>` | YouTube embed (with optional `<VideoPrompt>` children for v3) |

### Plus: generic structural callouts

`<Note>`, `<Tip>`, `<Warning>`. Visual-only, no pedagogical contract.
Available for general use; not counted as pedagogy components.

(worked-example-prediction)=
## 8. Worked example: `<Prediction>` end-to-end

The most architecturally complex of the v1 components. Walking
through it stress-tests the contract.

### 8.1 Authoring (what an author writes)

```mdx
{/* Multiple-choice */}
<Prediction
  id="flux-distance-doubles"
  question="If the distance to a star doubles, what happens to the measured flux?"
  choices={[
    "Doubles",
    "Halves",
    "Decreases by a factor of 4",
    "Stays the same"
  ]}
  answer="Decreases by a factor of 4"
  skill="scaling-reasoning"
/>

{/* Paired with SolutionKey */}
<Prediction id="..." question="..." choices={[...]} answer="..." />
<SolutionKey for="...">
  Flux scales as 1/d², so distance doubling drops flux to 1/4.
  Common student misconception: treating flux as proportional to
  distance rather than inverse-square.
</SolutionKey>
```

### 8.2 Schema (colocated with component)

```typescript
// @sophie/components/src/Prediction/Prediction.schema.ts
export const PredictionPropsSchema = z.object({
  id: z.string()
    .regex(/^[a-z0-9-]+$/, 'must be kebab-case')
    .min(3),
  question: z.string().min(10),
  kind: z.enum(['multiple-choice', 'free-response']).optional(),
  choices: z.array(z.string().min(1)).min(2).optional(),
  answer: z.string().optional(),
  rubric: z.string().optional(),
  minWords: z.number().optional(),
  skill: z.string().optional(),
  concepts: z.array(z.string()).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  enableConfidence: z.boolean().optional().default(false),
})
.refine(p => p.kind !== 'multiple-choice' ||
              (p.choices && p.choices.length >= 2),
  { message: 'multiple-choice predictions need ≥2 choices' })
.refine(p => !p.answer || (p.choices?.includes(p.answer) ?? false),
  { message: '`answer` must be one of `choices`' });
```

### 8.3 State and response

```typescript
interface PredictionState {
  selectedChoice: string | null;
  freeResponseDraft: string;
  confidence: number | null;     // 0-100; null until set
  isSubmitted: boolean;
}

interface PredictionResponse {
  questionId: string;
  chapterId: string;
  questionSnapshot: string;       // captured at submit; immune to chapter edits
  choice?: string;
  freeResponse?: string;
  confidence?: number;
  correct?: boolean;              // computed at submit, never retroactively
  submittedAt: string;            // ISO 8601
  timeToSubmit: number;           // seconds; for fatigue/skim detection
  schemaVersion: 1;
}
```

Storage:

- IndexedDB (per-course database, e.g. `sophie:astr201`) via the
  `ResponseStore` repository abstraction. Components consume
  `useInteractive`; they never touch IndexedDB directly.
- Indexed by `(componentKind, questionId)` for fast lookup; secondary
  index on `chapterId` for chapter-level export.
- Quota: hundreds of MB in practice. No size cap or eviction needed
  for the prediction-response volume.
- Forward-only schema migration via `schemaVersion` field on the
  record. `ResponseStore.migrate()` runs on first load of a new
  Sophie version.
- Cross-tab sync via `BroadcastChannel`.

### 8.4 Component tree (Astro + React islands)

```
Astro page (server-rendered HTML)
  ↓
MDX content (server-compiled)
  ↓
<Prediction client:load>     ← React hydration boundary
  ├─ PredictionRoot
  ├─ PredictionHeader (question text)
  ├─ PredictionInput (multiple-choice or free-response)
  ├─ ConfidenceSlider (if enableConfidence)
  ├─ PredictionSubmit
  └─ PredictionFeedback (after submit)
```

`client:load` hydrates the island on page load; `client:visible`
defers until scrolled into view (an optimization for chapters with
many predictions). The wrapper is provided by `@sophie/astro` —
authors write `<Prediction />` and the platform decides what to
hydrate.

### 8.5 Render modes

```typescript
export const Prediction = registerComponent({
  kind: 'prediction',
  schema: PredictionPropsSchema,
  render: {
    read: PredictionInteractive,    // full client island
    slide: PredictionSlide,         // commit-then-reveal in presenter
    print: PredictionPrint,         // worksheet-style, no interactivity
  },
  serialize: predictionToAuditNode, // structured representation for AI
  interactive: {
    state: PredictionStateSchema,
    response: PredictionResponseSchema,
    initialState: { selectedChoice: null, freeResponseDraft: '',
                    confidence: null, isSubmitted: false },
  },
  refs: { consumes: [], produces: [] },
  composition: {
    forbidsContaining: ['prediction'],   // no Prediction-in-Prediction
  },
  audit: {
    requiredFields: ['id', 'question'],
    pedagogyChecks: [
      hasMatchingSolutionKey,
      hasSkillDeclaration,
      cadenceOK,
      multipleChoiceCount,
    ],
    aiPrompts: {
      questionClarity: questionClarityPrompt,
      answerCorrectness: answerCorrectnessPrompt,
      choicesDistinctness: choicesDistinctnessPrompt,
    },
  },
});
// Accessibility is enforced via Storybook + Playwright + axe-core,
// not via metadata declarations. See Prediction.stories.tsx.
```

### 8.6 Profile pairing with `<SolutionKey>`

`<SolutionKey for="..." />` pairs by ID with `<Prediction>`. In v1
both render to `null` in the student build. In v2 the SolutionKey
appears immediately below the Prediction in the instructor build,
styled distinctly. See
[Set up dual-profile](../how-to/set-up-dual-profile.md).

The audit verifies:

- Every Prediction with `answer` has a paired SolutionKey by ID
  (warning, not error — sometimes the answer is enough).
- Every SolutionKey has a Prediction with the matching ID (error —
  orphan SolutionKey is a bug).
- No SolutionKey content appears in the student bundle (post-build
  grep).

### 8.7 Calibration extension (v3, designed in v1)

The confidence slider is in the schema and component tree from v1
but rendered only when `enableConfidence: true`.

- v1: authors can opt in per-Prediction; chapter-level default `false`.
- v3: chapter-level default flips to `true`; `<CalibrationCurve />`
  aggregator added.

Zero refactor at v3 — purely additive.

### 8.8 Audit checks

Tier 1 (every save):

- Schema validation: id, question, choices/answer consistency.
- Unique IDs within chapter.
- Skill / concept IDs resolve.

Tier 2 (PR):

- Every Prediction with `answer` has a SolutionKey by ID.
- Cadence: ≥1 per ~700 words, ≤1 per ~200 words.
- ≥1 free-response per chapter.
- No multiple-choice with >6 options.
- Predictions distributed, not clumped.

Tier 3 (PR or on demand, AI-driven):

- Question text unambiguous.
- Choices pedagogically distinct (no two test the same misconception).
- Declared `answer` matches the physics.
- Free-response rubric specific enough to grade against.
- Skill mapping is plausible.

### 8.9 Canvas export

Per-Prediction export format:

```text
Chapter: Flux, Luminosity, and Distance
Question (flux-distance-doubles):
  "If the distance to a star doubles, what happens to the measured flux?"

Your answer: Decreases by a factor of 4
Confidence: 70%
Submitted: 2026-05-09 14:23:11

[Correct]
```

Multiple format options: plain text (paste), HTML (rich paste), JSON
(Canvas API in v3). Per-chapter export bundles all responses.

### 8.10 Accessibility

WCAG 2.1 AA from day one. Enforced by axe-core in Storybook stories
and Playwright tests; the `audit` checks `pnpm test:a11y` rather than
introspecting declarative metadata. Truth lives in the rendered DOM.

What Prediction implements (verified per check, in test files):

- Keyboard: Tab + Enter/Space; choices are radio-group semantics.
- Screen reader: `<fieldset>` + `<legend>`; choices are
  `<label>`-wrapped radio inputs; live region announces feedback.
- Reduced motion: feedback animations honor `prefers-reduced-motion`.
- Color: no information by color alone; correct/incorrect uses icon
  and text label as well.
- Focus: visible focus ring (consumes design tokens).
- Touch targets: ≥44×44 px.

### 8.11 Theming

Components consume design tokens via CSS custom properties; never
hardcode values. CSS Modules scope styles per-component. See
[ADR 0005](../decisions/0005-theming-three-layers.md).

```tsx
// Prediction.module.css
.predictionRoot {
  background: var(--color-prediction-bg);
  border: 1px solid var(--color-prediction-border);
  border-radius: var(--radius-md);
}
```

CSS custom properties resolve to different values in light vs. dark
mode (set by `data-theme` on `<html>`). Per-component token namespacing
(`--color-prediction-*`) lets Predictions be re-themed without
affecting other components.

In `print` mode, all interactive styling is stripped: question as
plain text, choices as bulleted list with checkbox glyphs, no color
or shadow.

### 8.12 Edge cases and failure modes

- **Offline mid-chapter**: IndexedDB writes work offline; works.
  Submit-to-Canvas queues for next online window.
- **Two devices**: v1 doesn't sync; per-device data. v3 cross-device
  sync arrives via `SyncedResponseStore` (same interface). See
  [Persistence model](../explanation/persistence-model.md).
- **Question text changes after student submits**: `questionSnapshot`
  preserves what they saw. `correct` doesn't retroactively flip.
- **Chapter deleted**: housekeeping pass deletes responses with
  unresolved chapterId on next load.
- **Skim/click-through**: `timeToSubmit` is recorded; v3 calibration
  excludes <2 second submissions from accuracy curves.
- **Privacy**: confidence data is more sensitive than correctness.
  Default local-only; opt-in for cohort aggregation; opt-in for
  instructor view.

(adding-a-new-component-checklist)=
## 9. Adding a new component (checklist)

When adding a component to the platform:

**Required:**

- [ ] Pick a `kind` (lowercase, kebab-case, unique).
- [ ] Define a Zod schema for props (`Component.schema`) colocated at
      `<Name>.schema.ts`.
- [ ] Implement `render.read` (React component).
- [ ] Register via `registerComponent(...)`.
- [ ] Add Storybook stories for all render modes the component supports.
- [ ] Add axe-core tests in Storybook + Playwright. **Non-negotiable.**

**Required if interactive:**

- [ ] Define `state` and `response` Zod schemas.
- [ ] Define `initialState`.
- [ ] Use `useInteractive` for persistence — never touch IndexedDB directly.

**Required if it references other components by ID:**

- [ ] Declare `refs.consumes` (component kinds you reference).
- [ ] Use the platform's `findByKind` helper, not direct DOM queries.

**Required if it has nesting constraints:**

- [ ] Declare `composition.containedIn` and/or `composition.forbidsContaining`.

**Strongly recommended:**

- [ ] Implement `render.slide` (or accept a slide-card-wrapped read default).
- [ ] Implement `render.print` (or accept a `.print`-class-wrapped read default).
- [ ] Implement `serialize` (or accept the default props-as-AuditNode).
- [ ] Declare `audit.requiredFields`.
- [ ] Declare `audit.pedagogyChecks`.

**Optional:**

- [ ] Tier-3 AI prompt templates for quality checks.
- [ ] Component-specific theming tokens (consume `--color-<kind>-*` namespace).
- [ ] Per-chapter or per-course defaults via Chapter schema.

## 10. Open design questions

### 10.1 Composition rules — decided

Each component declares `composition.containedIn` (kinds it MAY appear
inside) and/or `composition.forbidsContaining` (kinds it MUST NOT
contain). Audit Tier 2 walks the AST and enforces both. The seed rules:

- `<Prediction>` inside `<CheckYourself>` callout — yes.
- `<Prediction>` inside another `<Prediction>` — no
  (`Prediction.composition.forbidsContaining: ['prediction']`).
- `<FigureReading>` inside `<OMI>` — no (OMI is a frame, not a
  container).
- `<UnitCheck>` inside `<Example>` — yes.
- `<SolutionKey>` inside `<Prediction>` — no (sibling pairing by ID,
  enforced by `<Prediction>` forbidding it and `<SolutionKey>` having
  empty `containedIn`).

Rules grow as authoring surfaces violations.

### 10.2 Cross-page references

The current `refs.consumes` / `refs.produces` protocol assumes
references are within a chapter. What about cross-chapter?

- A Mission references a Demo by ID — same chapter or any chapter?
- A `<ConceptRef>` (deferred to v2) references a glossary entry
  globally.

Need a graph-level audit that handles both intra- and inter-chapter
references with different rules.

### 10.3 The `serialize` contract — decided

`serialize(props): AuditNode` is a separate top-level function on the
component contract (not a render mode). Resolved questions:

- **Shape**: `AuditNode` is uniform across components: `{ kind, id?,
  semantics: Record<string, unknown>, children? }`. The `semantics`
  field's shape is component-specific.
- **AI consumption**: prompt files (see
  [Audit and AI authoring](../explanation/audit-and-ai-authoring.md))
  embed the serialized JSON in the prompt body. Structured response
  is parsed back into the audit report.
- **Prose context**: `serialize` returns structured data only.
  Sophie's prompt-emission layer adds chapter-level prose context
  separately when an AI check needs it.

### 10.4 Schema versioning at the component level

Component schemas evolve. If `<Prediction>` adds a new field in v2:

- How do v1 chapters migrate? (They don't if the field is optional.)
- How do v1 stored responses migrate? (`schemaVersion` field; on-read
  migration.)
- How do we deprecate fields without breaking existing chapters?

A general policy needed: additive changes are fine, removals require
a deprecation cycle and migration script.

### 10.5 Plugin / extension API for v3

When the platform opens to other instructors, third parties will want
to add custom pedagogy components. The contract is already designed
for this — they just call `registerComponent` — but the registration
mechanism needs:

- Conflict resolution (two plugins claim the same `kind`).
- Theme namespace coordination.
- Audit-rule validation (third-party components shouldn't crash the
  audit).

See [Plugin API reference](plugin-api.md) for the v1 surface.

## What this contract gives us

- **Renderer uniformity**: same dispatch logic for every component
  across read/slide/print/serialize.
- **Audit uniformity**: every check is declared by the component it
  applies to. Adding a component doesn't require central audit code
  changes.
- **AI authoring**: Claude/Codex can introspect any component via the
  contract — knows what props it takes, what it produces in serialize
  output, what its quality criteria are.
- **Migration safety**: schema versioning at multiple levels (props,
  state, response, components) means content authored today survives
  changes years out.
- **Extensibility**: third-party components in v3 just fill in the
  contract.

The contract is the load-bearing abstraction for Sophie.
