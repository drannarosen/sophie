---
date: 2026-05-21T00:00:00.000Z
tags:
  - ai-authoring
  - cli
  - schema
  - co-author
  - tooling
  - course-website
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0077: AI Authoring Packets — packaged context for the AI co-author panel

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0030](./0030-audience-and-ai-author-model.md) (makes the
  4-role AI co-author panel scalable by packaging its context
  programmatically), [0061](./0061-ai-optimized-codebase-design.md) (extends
  Sophie's "AI as primary author" principle from platform code to
  curriculum content)

:::

## Context

[ADR 0030](./0030-audience-and-ai-author-model.md) commits Sophie to
**AI as primary author of curriculum content**, supervised by the
instructor through a 4-role expert panel (author / pedagogy /
domain / brainstorming). [ADR 0061](./0061-ai-optimized-codebase-design.md)
extends this principle to platform code itself. [ADR 0074
(Instructor authoring-cost SoTL metric)](./0074-instructor-authoring-cost-metric.md)
commits to concrete authoring-cost targets (new Unit < 30 min,
practice-set draft < 15 min, etc.) achievable through this AI co-author
workflow.

But the 4-role panel can only be as good as the *context* it
receives. A practice-set generation prompt of "draft 20 interleaved
problems for Unit X" produces generic LLM output. A prompt that
arrives bundled with the Unit's LOs, prerequisite skills, the
equations already introduced, the misconceptions targeted, the
figures available, the existing reading prose, the instructor's
voice contract, prior practice items (to avoid duplication), known
issues from past semesters, and a target output schema produces
draftable curriculum content. The difference between "useful AI
draft" and "generic LLM output" is essentially the difference between
a well-packaged context and a thin prompt.

Sophie has the data to package. ADR 0038 ships the `PedagogyIndex`
that already aggregates per-Unit metadata. Wedge A landed the
`Artifact` / `Unit` / `Section` schemas with typed cross-references.
The registries (Equations, Misconceptions, Figures, Notations, etc.)
hold the cross-cuts. What's missing is the **packaging step**: a
CLI verb that walks the pedagogy graph for a target authoring task,
gathers the right context slices, and emits a structured packet
the AI co-author panel can consume (either via Sophie's own AI
integration, via the instructor pasting into Claude / ChatGPT, or
via a future Sophie-integrated direct API call).

The trigger is ADR 0074. The authoring-cost targets ADR 0074 commits
to (< 30 min new Unit, < 15 min practice-set) are not achievable
through unaided LLM prompting; they require the LLM to start from
a well-formed context, not a blank context. AI Authoring Packets
are the engineering primitive that makes ADR 0074's targets reachable
in practice — without them, ADR 0074's targets are aspirational; with
them, they are achievable.

This is also the right pattern *generally*: Sophie isn't an
"AI-powered course platform" because it calls an LLM; Sophie is
AI-amplifiable because **it packages the right context and constraints
for AI to work with the platform's grain**. That's a structural
property of the platform, not an integration choice.

## Decision

Ship `sophie export-ai-context` as a first-class CLI verb that
produces structured **AI Authoring Packets** for any target task,
plus a `PacketSchema` Zod type defining the packet shape.

### CLI surface

```bash
sophie export-ai-context --task <task> --target <id> [--output <format>]
```

Supported tasks (initial):

| Task | Target | What gets packaged |
| --- | --- | --- |
| `new-unit` | Section id | Section context + adjacent Units + Section LOs + Section-level Artifacts already authored + recurring models / equations in this Section's pedagogy graph |
| `revise-unit` | Unit id | Full Unit content + LOs + cross-references + prior-revision history + recent audit findings |
| `draft-reading` | Unit id | Unit goals + LOs + prereq skills + equations already in this Section + slides authored for this Unit (if any) + instructor voice contract |
| `draft-slides` | Unit id | Same as draft-reading + the Unit's reading (if authored) + slide-design conventions |
| `practice-set` | Section id | All Units' LOs + equations + misconceptions + difficulty distribution of existing items + interleaving constraints + variant family hints |
| `worked-example` | Equation id (or LO id) | Equation Biography + Notation Registry entry + relevant misconceptions + existing worked examples for context (avoid duplication) |
| `misconception-entry` | concept slug | Concept-graph neighborhood + related misconceptions + existing interventions + cross-discipline manifestations |
| `equation-biography` | Equation id | Equation Registry entry + relevant Section context + related equations + prior worked examples |
| `audit-fix` | finding id | The audit finding + the file context + the surrounding pedagogy + suggested-fix structure |

Output formats: `json` (default, machine-readable), `markdown`
(human-readable, paste-into-chat-friendly), `yaml` (for instructors
who prefer structured prose).

### Packet schema

`PacketSchema` per [ADR 0003 (Zod)](./0003-zod-as-source-of-truth.md)
patterns established by Wedge A:

```typescript
PacketSchema = z.object({
  task: TaskKindSchema,                // discriminator
  target: NonEmptyString,               // the id being authored
  generated_at: z.iso.datetime(),
  schema_version: SemverString,
  context: {
    course: CourseContext,              // tier display labels, voice
    section: SectionContext | null,     // when relevant
    unit: UnitContext | null,           // when relevant
    artifacts: ArtifactContext[],       // already-authored siblings
    pedagogy_graph: PedagogyGraphSlice, // LOs + misconceptions + equations cross-cut
    registries: RegistrySlice,          // Equations/Notations/etc. referenced
    voice_contract: InstructorVoice,    // from course pedagogy-contract.yaml
  },
  constraints: {
    output_schema: z.unknown(),         // target schema for AI output (per task)
    must_reference: NonEmptyString[],   // ids the output MUST cite
    must_not_duplicate: NonEmptyString[], // existing items to avoid
    target_word_count: z.number().optional(),
    target_difficulty: DifficultySchema.optional(),
  },
  guidance: {
    pedagogy_intent: NonEmptyString[],  // teaching moves from ADR 0041
    epistemic_role: EpistemicRoleSchema.optional(),  // ADR 0058
    examples: ExampleArtifactRef[],     // "produce something shaped like these"
  },
});
```

### Pedagogy-contract integration

Each consumer course's `pedagogy-contract.yaml`
([ADR 0042](./0042-pedagogy-contract-and-ai-contribution-ledger.md)) declares the
instructor's voice rules (prose style, formality, formula-density
preferences, examples preferences, etc.). The packet auto-pulls
this so every AI-generated draft inherits the course's voice
without per-prompt repetition. Drift between AI-generated content
and the voice contract becomes detectable by curriculum-CI.

### Workflow integration

Three intended use patterns:

1. **Manual paste-into-chat** (Tier 1, simplest): instructor runs
   `sophie export-ai-context --task practice-set --target m2 --output markdown`,
   pastes into Claude / ChatGPT, gets a draft, pastes back into
   the source file, refines, commits.
2. **Sophie-integrated AI** (Tier 2+): Sophie ships an AI co-author
   panel that consumes packets directly via Anthropic API; instructor
   key per ADR 0030; instructor reviews + accepts/rejects suggestions.
3. **Subagent-style automation** (research-frontier): for the
   highest-leverage repetitive tasks (e.g., "audit fix this finding"),
   packets feed a Claude Code subagent that lands a draft commit
   in a feature branch for instructor review.

All three patterns use the same packet schema; the same
`sophie export-ai-context` call generates the context regardless of
which workflow consumes it.

### Versioning

`schema_version` on every packet enables migration as the packet
shape evolves. Packets emitted before a schema bump remain valid
(consumers should reject silently-incompatible mismatches);
the AI co-author Tier-2+ integration carries the `schema_version`
it expects.

## Rationale

The Packet primitive is right to build now because:

1. **It's the load-bearing primitive for ADR 0074's authoring-cost
   claim.** Without packaged context, the AI co-author 4-role panel
   produces generic drafts that take *longer* to fix than to write
   from scratch — making ADR 0074's targets unreachable. With
   packets, the panel starts from a draftable position and the
   targets become realistic.

2. **It's a *thin* primitive on existing data.** The PedagogyIndex
   (ADR 0038), the Wedge A schemas, the registries, and the
   pedagogy-contract.yaml all already exist. The packet packaging
   step is a serialization layer over data Sophie already has —
   not a new data infrastructure. Engineering cost is genuinely
   low.

3. **It's reusable across every authoring task.** A single CLI
   verb (`sophie export-ai-context`) with task-discriminator
   covers ~10 distinct authoring workflows. Build once; benefit
   compounds.

4. **It makes Sophie's AI claim *structural*, not just
   integrationary.** "Sophie is good with AI because it packages
   context well" is a defensible architectural property; "Sophie
   uses an LLM" is not. The Packet primitive is what makes the
   structural claim true.

5. **It plays well with both AI providers and human reviewers.**
   The same packet that feeds an LLM prompt is human-readable
   when rendered as markdown; an instructor reviewing an AI
   draft sees the same context the AI saw. Audit trail by
   construction.

6. **It anchors Curriculum-CI's AI-quality audits.** Future drift
   detection ("does this AI-generated practice item actually
   target the LOs the packet asked it to?") needs a packet to
   compare against. The packet IS the contract the AI was
   supposed to fulfill.

## Alternatives considered

- **Per-task ad-hoc context-gathering scripts.** Pros: faster
  initial build; less schema discipline. Cons: every task
  re-invents context-gathering; no shared schema; AI drafts'
  quality varies wildly by task; no audit trail. Rejected
  because Sophie's whole value is *typed contracts*, and ad-hoc
  context-gathering violates the spirit.

- **Defer AI integration entirely to Tier 3.** Pros: simpler
  Tier 1+2. Cons: ADR 0030 already commits Sophie to AI-as-
  primary-author; deferring the tooling that makes it work means
  ADR 0030 remains aspirational for years. Rejected.

- **Build the AI integration first; add packets later if
  authoring quality is poor.** Pros: ships AI sooner. Cons: known
  failure mode — generic LLM prompts produce drafts that take
  longer to fix than to write; instructors give up; the
  AI-as-primary-author claim becomes "AI as a sometimes-useful
  toy." Rejected; better to ship the contract that makes AI
  *good* than to ship AI that isn't.

- **Schema-less / freeform packet.** Pros: maximally flexible.
  Cons: no migration story; no audit; no curriculum-CI hooks;
  defeats Sophie's typed-pedagogy ethos. Rejected.

## Consequences

What this decision makes:

- **Easier**:
  - ADR 0074's authoring-cost targets become *achievable* through
    the AI co-author workflow instead of aspirational.
  - The 4-role expert panel from ADR 0030 gains a real interface
    to act through.
  - Cross-instructor / cross-course AI workflow becomes possible
    (same Packet schema; different voice contracts).
  - Curriculum-CI can audit AI-generated content against the
    Packet that specified it ("did the output meet the constraints
    block?").
  - Instructor mental model becomes "Sophie hands me draftable
    AI output," not "Sophie hosts an LLM I have to babysit."
  - Future SoTL Paper #1 evidence (per ADR 0047) gains a
    measurable AI-authoring effectiveness axis: packet-driven
    authoring time + acceptance rate vs. unaided LLM time +
    acceptance rate.

- **Harder**:
  - Maintaining the Packet schema as a stable contract — bumps
    must respect backward-compatibility for outstanding packets
    in flight.
  - Engineering the right context-slicing per task (too much
    context wastes tokens; too little produces generic drafts).
    This is a tuning problem with real research interest.
  - Each new authoring task requires a paired
    task-discriminator and context-slicer; that's deliberate
    engineering, not one-off scripting.
  - Voice-contract drift between AI output and the contract is
    a real measurement problem; curriculum-CI must catch it,
    which means a new audit pass to design.

- **Triggers**:
  - **Wedge G** scope clarifies: ships `sophie export-ai-context` +
    `PacketSchema` + initial task-discriminators (new-unit /
    revise-unit / practice-set / worked-example / misconception
    / equation-biography / audit-fix).
  - New `@sophie/packets` package (proposed): houses the
    `PacketSchema`, the context-slicer per task, the CLI hook
    for `sophie export-ai-context`. Depends on `@sophie/core`
    schemas + `@sophie/cli` plumbing.
  - Future ADR for the Sophie-integrated AI co-author Tier-2+
    integration (when the API + provider choice + key
    management get scoped).
  - Future ADR for the curriculum-CI AI-quality audit pass
    (when the packet → output diff machinery gets designed).
  - The `pedagogy-contract.yaml` schema (ADR 0042) gains a
    `voice:` block if not already present; packets read from it.

## References

- [ADR 0030 — Audience + AI Author Model](./0030-audience-and-ai-author-model.md) (this ADR amends; makes ADR 0030's 4-role panel programmatically usable)
- [ADR 0061 — Codebase optimized for AI-assisted coding](./0061-ai-optimized-codebase-design.md) (this ADR extends ADR 0061's principle from platform code to curriculum content)
- [ADR 0038 — Pedagogy-index pattern](./0038-pedagogy-index-pattern.md) (provides the per-Unit metadata packets consume)
- [ADR 0042 — Pedagogy Contract + AI Ledger](./0042-pedagogy-contract-and-ai-contribution-ledger.md) (provides the instructor voice contract packets carry)
- [ADR 0074 — Instructor authoring-cost SoTL metric](./0074-instructor-authoring-cost-metric.md) (this ADR is the engineering primitive that makes ADR 0074's targets achievable)
- [ADR 0058 — Epistemic Component Contract](./0058-epistemic-component-contract.md) (packets carry epistemic-role guidance for AI output)
- [ADR 0041 — Teaching Move Library](./0041-teaching-move-library.md) (packets carry teaching-move intent for AI output)
- [ADR 0003 — Zod as source of truth](./0003-zod-as-source-of-truth.md) (`PacketSchema` follows the existing Zod-everywhere convention)
- [course-website-roadmap.md § Future capabilities — Tier A](../status/course-website-roadmap.md) (this ADR is Tier A item #1)
