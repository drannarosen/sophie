---
title: "`<InteractiveFigure>` — interactive figures as pedagogical elements"
date: 2026-05-15
status: brainstorm-locked; awaiting ADR draft
phase: Phase 3+ (post-LDS-foundation; substrate-first)
predecessor: overview.md §11 (Interactive figures as pedagogical elements) brainstorm 2026-05-15
successor: future ADR (next available number)
---

# `<InteractiveFigure>` — interactive figures as pedagogical elements (design doc)

## Context

Sophie's `<Figure>` and `<MultiRep>` components today carry static
images, equations, and code; they do not yet carry **animation,
direct manipulation, or scrubbable parameter sweeps** as pedagogical
surfaces. Interactive figures — where a student drags a slider to
vary an orbital parameter and watches the orbit redraw, scrubs a
timeline of stellar evolution, or rotates a 3D spectroscopy diagram
— are the next major pedagogical-component surface
([overview.md §11](../website/overview.md)).

This design doc locks the substrate for v1. **Substrate-first**:
ship the underlying interactive-figure primitive (`<InteractiveFigure>`),
its scene registry, its persistence/audit/a11y plumbing. **Wrappers
deferred**: exploration-as-sandbox (Pattern A) and predict-then-run
coupling (Pattern B) compose later as wrappers over the substrate.

## Decisions locked during brainstorming (2026-05-15)

Seven design questions, each answered through prose Q&A
(per Anna's preference); all locked before drafting this doc.

| # | Question | Decision |
|---|---|---|
| **1** | Primary v1 pedagogical use case | **C — substrate-first**. Exploration-as-sandbox (Pattern A) and predict-then-run wrapping (Pattern B) deferred to a later version; both compose with the substrate when they earn their keep. |
| **2** | Component shape | **New `<InteractiveFigure>` sibling** to `<Figure>`. Pedagogically distinct cognitive acts (read vs. operated); distinct schema, audit invariants, persistence contract. Figure registry stays a static-figure registry. |
| **3** | Authoring surface | **Hybrid — declarative scene-registry as primary path, sidecar `.tsx` as escape hatch**. Universal scenes in `@sophie/commons-universal`; discipline-specific scenes in `@sophie/discipline-astronomy` / `@sophie/discipline-physics` (per ADR 0048 plugin granularity). |
| **4** | Persistence semantics | **Opt-in via `persist` schema flag; ephemeral by default**. When `persist` is set, the runtime uses existing `useInteractive` / `ResponseStore` / IndexedDB + BroadcastChannel LWW plumbing (ADRs 0007 + 0029). |
| **5** | Print / no-JS static rendering | **Author-specified `<StaticState>` with optional `<Filmstrip>` for parameter-sweep figures**. Composes with caption contract; forward-compatible with Phase 5 dual-profile (instructor build). |
| **6** | Reduced-motion + a11y posture | **`motionRole="decorative" \| "essential"` schema attribute**, default `"decorative"`. Decorative + reduced-motion = suppress animation, preserve interactivity (Motion's `useReducedMotion`). Essential + reduced-motion = swap in `<StaticState>` / `<Filmstrip>`. |
| **7** | Animation library | **[Motion](https://motion.dev) (formerly Framer Motion; standalone React + vanilla split as of 2025)**. Native `prefers-reduced-motion` support; React 19 composable; declarative animation primitives that match the scene-registry pattern. |

## Schema sketch (Zod)

The `<InteractiveFigure>` schema lives in `@sophie/core/schema`
alongside the existing pedagogy schemas. Sketch (final shape to land
in the ADR):

```typescript
// @sophie/core/schema/interactive-figure.ts

const ParameterSchema = z.object({
  name: NonEmptyString,           // slug-shaped id; binds to scene
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  default: z.number(),
  label: NonEmptyString,           // human-readable; a11y name source
  unit: z.string().optional(),     // e.g., "AU", "Hz"
  scale: z.enum(["linear", "log"]).default("linear"),
});

const SceneRefSchema = z.object({
  from: NonEmptyString,            // e.g., "@sophie/discipline-astronomy"
  component: NonEmptyString,       // e.g., "OrbitPlot"
  concept_ref: z.string().optional(), // ADR 0043 NR alignment hook
});

const StaticStateSchema = z.record(z.string(), z.number());
// e.g., { e: 0.6, a: 5 }

const FilmstripSchema = z.object({
  parameter: NonEmptyString,       // which parameter to sweep
  frames: z.array(z.number()).min(2).max(8),
});

const InteractiveFigureSchema = z.object({
  id: NonEmptyString,              // unique within chapter; persistence key
  scene: SceneRefSchema,
  parameters: z.array(ParameterSchema).min(1),  // IF3: ≥ 1 parameter
  caption: NonEmptyString,          // IF1: required
  staticState: StaticStateSchema.optional(),
  filmstrip: FilmstripSchema.optional(),
  motionRole: z.enum(["decorative", "essential"]).default("decorative"),
  persist: z.boolean().default(false),
  // Schema-level constraint: exactly one of staticState/filmstrip
  //   may be set (IF6); enforced via .refine().
});
```

The React component `<InteractiveFigure>` is the MDX surface; its
children (`<Parameter>`, `<Scene>`, `<Caption>`, `<StaticState>`,
`<Filmstrip>`) are sugar that compile down to the schema above via
the existing AI-authoring-friendly children-extraction pattern (per
ADR 0049 / ADR 0042's pattern for `<KeyEquation>` biography).

## Authoring examples

### Declarative scene-registry (primary AI-author path)

```mdx
import { InteractiveFigure, Parameter, Scene, Caption, StaticState }
  from "@sophie/components";

<InteractiveFigure id="orbit-eccentricity" persist motionRole="decorative">
  <Parameter name="e" min={0} max={0.99} step={0.01}
    default={0.3} label="Eccentricity" />
  <Parameter name="a" min={1} max={10} step={0.1}
    default={3} label="Semi-major axis" unit="AU" />
  <Scene from="@sophie/discipline-astronomy" component="OrbitPlot"
    concept_ref="concept:orbital-eccentricity" />
  <StaticState e={0.6} a={5} />
  <Caption>
    The shape of an orbit at varying eccentricity, semi-major axis fixed.
  </Caption>
</InteractiveFigure>
```

### Parameter-sweep (filmstrip print rendering)

```mdx
<InteractiveFigure id="redshift-sweep" motionRole="decorative">
  <Parameter name="z" min={0} max={5} step={0.1}
    default={0.5} label="Redshift" />
  <Scene from="@sophie/discipline-astronomy" component="SpectrumScrubber"
    concept_ref="concept:cosmological-redshift" />
  <Filmstrip parameter="z" frames={[0, 0.5, 1.5, 3]} />
  <Caption>
    A galaxy spectrum at redshifts z = 0, 0.5, 1.5, and 3.
  </Caption>
</InteractiveFigure>
```

### Sidecar (escape hatch for novel scenes)

```mdx
<InteractiveFigure id="coupled-oscillators" src="./coupled-oscillators.tsx"
  motionRole="essential">
  <Parameter name="k1" min={0.1} max={5} step={0.1} default={1}
    label="Spring constant k₁" unit="N/m" />
  <Parameter name="k2" min={0.1} max={5} step={0.1} default={1}
    label="Coupling constant k₂" unit="N/m" />
  <StaticState k1={1} k2={0.3} />
  <Caption>
    Two masses coupled by a third spring; vary the spring constants to
    explore mode mixing.
  </Caption>
</InteractiveFigure>
```

The sidecar (`coupled-oscillators.tsx`) imports Sophie's
plumbing hooks (`useInteractive`, `useReducedMotion`,
`useFigureParams`) and renders a Motion-driven SVG. The MDX still
declares parameters + caption + static state declaratively; only
the *rendering* is bespoke.

## Architecture / data flow

`<InteractiveFigure>` is a **React 19 island** (per ADR 0027
`<SophieChapter client:load>` boundary). Composition:

```
<SophieChapter>                            <!-- ADR 0027 -->
  <InteractiveFigure>                      <!-- new -->
    <InteractiveFigureProvider>            <!-- new: state context -->
      <ParameterControls />                <!-- a11y-instrumented sliders -->
      <SceneRenderer>                      <!-- resolves scene from registry -->
        <OrbitPlot />                      <!-- discipline-plugin scene -->
      </SceneRenderer>
      <FigureCaption />
    </InteractiveFigureProvider>
  </InteractiveFigure>
</SophieChapter>
```

`InteractiveFigureProvider` is the state-context boundary —
parameters live in a single React context per figure; the scene
subscribes via `useFigureParams()`; controls update via
`useFigureParamSetter()`. This makes the scene-registry contract
narrow: scenes consume params, emit visual output, optionally emit
concept-ref alignment hooks. They do not manage state themselves.

Motion integration: `SceneRenderer` configures a Motion `LazyMotion`
or `motion.div` per scene, using Motion's `useReducedMotion` hook
to switch between animated and instant transitions. Motion's
declarative API composes with the scene-registry pattern — each
scene's parameter-to-visual mapping is a Motion `variants` /
`animate` prop, not imperative animation code.

## Persistence flow

### `persist={false}` (default)

- Parameters live in React state only.
- No `useInteractive` invocation, no `ResponseStore` writes, no
  BroadcastChannel chatter.
- Page reload → fresh defaults.
- Storage cost: zero.

### `persist={true}`

- `useInteractive({ id, schema: parametersSchema })` returns the
  current parameter snapshot.
- Parameter changes debounced (300ms suggested; final value tuned
  during implementation) before writing to `ResponseStore`.
- IndexedDB row keyed by `${chapterSlug}:${id}` (matches existing
  `<Predict>` / `<Reflection>` pattern).
- BroadcastChannel LWW per ADR 0029 syncs the latest snapshot across
  open tabs.
- `MemoryResponseStore` runtime fallback (per ADR 0053 §CF5) covers
  IndexedDB-unavailable environments — ephemeral but session-local.

The `persist` schema flag is the *only* declaration needed; the
runtime branches on it. Authors who want persistence don't author
hook calls or response IDs by hand.

## Static-rendering flow

Three trigger paths converge on the static rendering:

1. **Print** (PR 10 `@media print`) — interactive controls hidden;
   `SceneRenderer` checks for `<StaticState>` or `<Filmstrip>` and
   renders accordingly. If neither is present and `motionRole === "decorative"`,
   fall back to default-parameter rendering. If `motionRole === "essential"`,
   the audit ERRORs at build time (IF6) so this case never reaches print.

2. **No-JS / SSR initial paint** — same path as print. Scene
   components ship an SSR-friendly static-renderer (probably an
   `<svg>` snapshot at the static-state parameter values). Once the
   island hydrates, the interactive controls swap in.

3. **Reduced-motion + `motionRole="essential"`** — the runtime
   detects `prefers-reduced-motion: reduce` and swaps the interactive
   tree for the static rendering. Same scene-component contract: each
   scene exports both an interactive renderer and a static renderer.

The contract for scene authors (registry or sidecar): each scene
exports `{ Interactive, Static }` — two renderers from one component
module. The MDX surface stays oblivious to which renders.

## Reduced-motion flow (decorative)

When `motionRole === "decorative"` (default) AND
`prefers-reduced-motion: reduce`:

- Interactivity is preserved (parameter controls still operable;
  keyboard, touch, pointer all work).
- Motion's `useReducedMotion()` hook returns `true`; the scene's
  Motion primitives use instant transitions (`duration: 0`) instead
  of tweens.
- The visual result: dragging a slider instantly re-renders the
  scene at the new parameter values, no tween animation.

This is the canonical Motion-recommended posture for decorative
animation. The pedagogical signal (slider → result) is preserved;
the vestibular-trigger animation is suppressed.

## Audit invariants (v1)

All 12 invariants ship in v1 per the 2026-05-15 brainstorm. Two
ship with caveats: IF11 as INFO until real-chapter data justifies a
WARNING threshold; IF12 as opt-in (fires only when scene declares
`concept_ref`).

| Code | Check | Severity | Notes |
|---|---|---|---|
| **IF1** | `<Caption>` required on every `<InteractiveFigure>` | ERROR | Mirrors F1; accessible name + pedagogical context. |
| **IF2** | `id` required + unique within chapter | ERROR | Composes with future `<InteractiveFigureRef>`; gates `persist` key stability (IF7). |
| **IF3** | ≥ 1 `<Parameter>` declared | ERROR | Zero-parameter "interactive" figure is just `<Figure>`; lint redirects. |
| **IF4** | `<Scene from="..." component="...">` reference resolves at build time | ERROR | Catches plugin/scene typos at audit time, not at runtime. |
| **IF5** | `<StaticState>` / `<Filmstrip>` parameter values within declared `<Parameter>` bounds | ERROR | Catches `<StaticState e={1.5}>` when `<Parameter name="e" max={0.99}>`. |
| **IF6** | Static fallback present: `<StaticState>` or `<Filmstrip>` | WARNING if `motionRole="decorative"`; ERROR if `motionRole="essential"` | Decorative falls back to live-instant; essential *requires* static representation for reduced-motion + print. |
| **IF7** | If `persist === true`, `id` matches stable response-id format | ERROR | Persistence keys must be stable across builds. |
| **IF8** | Accessible name present (caption text or `aria-label`) | ERROR | Universal a11y floor; mirrors axe-core mandate (ADR 0004). |
| **IF9** | Scene-registry contract declares `keyboardSupport: true` | ERROR | Build-time check that the scene module exports the keyboard-support marker; runtime enforcement layered on top. |
| **IF10** | `motionRole="essential"` redundancy with IF6 | — | Folded into IF6 ERROR-grade; not a separate invariant. |
| **IF11** | `<Filmstrip frames={[...]}>` frame-count threshold | INFO in v1; promote to WARNING when threshold has real-chapter data (likely > 8) | Surfaces frame count on every audit run for data collection; doesn't block authoring. |
| **IF12** | Concept-ref alignment cross-check (per ADR 0043 NR/MR) | INFO; opt-in (fires only when scene declares `concept_ref`) | Composes with existing alignment audit; no duplication of NR/MR checks. |

Severity philosophy follows
[explanation/audit-and-ai-authoring.md](../website/explanation/audit-and-ai-authoring.md):
ERROR = catastrophic-if-deployed; WARNING = reviewable accumulator;
INFO = surfaced exception.

## Scene registry contract

Scenes are TypeScript modules exporting a uniform shape — the
universal-vs-discipline plugin distinction (ADR 0048) determines
the package only; the contract is shared:

```typescript
// @sophie/discipline-astronomy/src/scenes/OrbitPlot.tsx (example)

export const OrbitPlotMetadata: SceneMetadata = {
  id: "OrbitPlot",
  package: "@sophie/discipline-astronomy",
  parameters: ["e", "a"],                     // required by scene
  keyboardSupport: true,                       // IF9 marker
  conceptRefs: ["concept:orbital-eccentricity"],
};

export function OrbitPlotInteractive({ params }: SceneProps): JSX.Element {
  const reduceMotion = useReducedMotion();
  return (
    <motion.svg /* ... */>
      <motion.path
        d={orbitPath(params.e, params.a)}
        animate={{ /* shaped by reduceMotion */ }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring" }}
      />
    </motion.svg>
  );
}

export function OrbitPlotStatic({ params }: SceneProps): JSX.Element {
  return <svg /* server-renderable; no Motion */ />;
}

export const OrbitPlot: SceneComponent = {
  metadata: OrbitPlotMetadata,
  Interactive: OrbitPlotInteractive,
  Static: OrbitPlotStatic,
};
```

A separate `scene-index.ts` per plugin package registers all
scenes (`commons-universal/scene-index.ts`,
`discipline-astronomy/scene-index.ts`, etc.). The MDX surface
references scenes by string identifier (`from + component`); the
runtime resolver walks the registered scene-index tables.

The contract for **sidecar scenes** is identical except the
`<Scene>` element is replaced by `<InteractiveFigure src="./X.tsx">`
and the sidecar module exports the same `{ metadata, Interactive,
Static }` shape. The audit invariants apply uniformly.

## Test strategy

Per ADR 0004 (component contract) + ADR 0023 (vertical-slice-first):

- **Unit tests** in `@sophie/components` cover:
  - `<InteractiveFigure>` schema validation (each invariant has a
    failing fixture + a passing fixture).
  - `<InteractiveFigureProvider>` state-context behavior (param
    updates, debounce, reset).
  - Scene resolver (registered vs. missing vs. sidecar).
  - Persistence flow (persist=false bypasses store; persist=true
    writes through `useInteractive`).
- **axe-core** mandate (ADR 0004) — each registered scene + the
  `<InteractiveFigure>` composition itself.
- **e2e (Playwright)** in `examples/smoke`:
  - Keyboard reachability (Tab to slider, arrow-key nudge, shift+
    arrow large-step, Home/End extremes).
  - `prefers-reduced-motion: reduce` browser flag → animation
    suppressed but interactivity preserved (decorative); static
    fallback rendered (essential).
  - Cross-tab BroadcastChannel sync (open figure in two tabs,
    drag in one, verify the other receives the LWW update).
  - Print snapshot via the existing print-mode pattern from
    [PR 10](2026-05-15-pr-10-print-polish-design.md).
- **Audit invariant tests** in `@sophie/astro`:
  - One fixture chapter per invariant fires the right severity.
  - Composability with existing F-family + NR/MR invariants
    (when scenes declare `concept_ref`).
- **Visual-regression (deferred to Phase 5)** — interactive figures
  are good Chromatic candidates once the VR-baseline ADR lands.

Coverage target: parity with existing components
(`@sophie/components` line coverage ≥ 80%; `@sophie/astro` ≥ 90%).

## Open questions for follow-up ADR

These don't block the substrate; they're surface decisions the ADR
draft will need to lock:

1. **Composition with `<MultiRep>`.** When a scene declares a
   `concept_ref` AND the chapter has a `<MultiRep>` for the same
   concept, what's the relationship? Three options: (a) automatic
   cross-link in caption text, (b) explicit `<MultiRep mode="interactive">`
   nesting, (c) no automatic composition, alignment handled purely
   via NR/MR audit.
2. **Scene-registry plugin contract.** Where does the
   `scene-index.ts` registration table live exactly? Plugin
   `package.json` entry? Auto-discovery via convention? ADR 0048's
   plugin contract doesn't yet name a registration surface for
   scene families.
3. **Performance budgets.** What's the right ceiling on per-scene
   bundle size? When does the lazy-load (via Motion's `LazyMotion`)
   kick in vs. inline? IF11's filmstrip threshold needs real-chapter
   data.
4. **Multi-scene `<InteractiveFigure>`.** Can a single
   `<InteractiveFigure>` host multiple `<Scene>` children (e.g., a
   coupled "orbit + spectrum" view where one slider drives two
   renderings)? v1 says no (single scene per figure); v2+ ADR may
   revisit if a chapter needs it.
5. **AI authoring kit integration.** Once the figure-authoring kit
   (overview §7 skill group E `figure-generator`) ships, it needs to
   know which scenes are available in which discipline plugins.
   Likely a CLI surface (`sophie scenes list --discipline astronomy`)
   that the chapter-drafter skill consumes.
6. **Concept-ref alignment** (IF12 cross-check details) — how the
   audit decides "scene's `concept_ref` aligns with the chapter's
   `<KeyEquation>` / `<MultiRep>` references." Likely just "same
   concept slug in `concept_ref` and any `concept_refs` on
   nearby pedagogy components."
7. **Touch-gesture parity.** Sliders, rotation, and scrubber gestures
   all need touch equivalents. Motion's gesture API covers this but
   the scene-registry contract should explicitly declare
   `touchSupport: true` similar to `keyboardSupport`. Defer to ADR.

## Validation hooks (placeholder)

Validation tracking for `<InteractiveFigure>` will hook into the
forthcoming **validation-tracker website feature** (separate
brainstorm 2026-05-15, post this design lock; tracked as a v1+
addition to the docs site). Once that lands:

- This design doc gets a `validation: { status: "unvalidated", ... }`
  frontmatter block.
- The future ADR gets the same.
- The reference doc (`reference/interactive-figure-component.md` or
  similar) gets the same.
- The status page surfaces the validation state for each contract
  and provides the SoTL Paper #1 (ADR 0047) with an evidence-
  collection mechanism.

Until the validation tracker lands, validation evidence is captured
ad-hoc in commit messages + this doc's eventual successor ADR's
Revisions section.

## References

- [overview.md §11](../website/overview.md) — the v1 vision context;
  this design doc closes the seven open questions there.
- [ADR 0001](../website/decisions/0001-platform-not-monorepo.md) —
  `@sophie/*` package boundaries.
- [ADR 0002](../website/decisions/0002-renderer-astro-mdx.md) —
  Astro 6 + MDX + React 19 renderer.
- [ADR 0003](../website/decisions/0003-zod-as-source-of-truth.md) —
  Zod schema source of truth.
- [ADR 0004](../website/decisions/0004-component-contract.md) —
  axe-core mandate + `useInteractive` + composition rules.
- [ADR 0005](../website/decisions/0005-theming-three-layers.md) —
  TS tokens → CSS vars + Tailwind preset.
- [ADR 0007](../website/decisions/0007-persistence-indexeddb.md) —
  IndexedDB via `ResponseStore` repository.
- [ADR 0027](../website/decisions/0027-sophie-chapter-boundary.md) —
  `<SophieChapter client:load>` boundary for islands.
- [ADR 0029](../website/decisions/0029-broadcastchannel-lww-timestamps.md) —
  BroadcastChannel LWW per-write timestamps.
- [ADR 0030](../website/decisions/0030-audience-and-ai-author-model.md) —
  AI-primary authoring model.
- [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md) —
  pedagogy-index pattern; registry-by-build-time-extractor pattern
  that the scene-registry pattern follows.
- [ADR 0043](../website/decisions/0043-notation-registry-multirep-alignment-audit.md) —
  notation registry + `<MultiRep>` + alignment audit; IF12 composes.
- [ADR 0047](../website/decisions/0047-empirical-validation-plan.md) —
  empirical validation plan; this design doc's validation hooks
  serve Paper #1's evidence layer.
- [ADR 0048](../website/decisions/0048-sophie-lds-content-plugins.md) —
  `@sophie/commons-universal` + `@sophie/discipline-*` plugin
  granularity; scene-registry distribution matches this.
- [ADR 0053](../website/decisions/0053-conformance-failure-modes.md) —
  CF5 runtime fallbacks (IndexedDB + BroadcastChannel) carry through
  to interactive-figure persistence.
- [Motion](https://motion.dev) — animation library;
  `useReducedMotion`, declarative `variants` / `animate` API,
  React 19 compatibility.
- [overview.md §11](../website/overview.md) — Anna's flagged design
  topic for this brainstorm.
- Predecessor design docs in the same shape:
  [`<Aside>`](2026-05-13-aside-design.md),
  [`<KeyEquation>`](2026-05-10-key-equation-design.md).
