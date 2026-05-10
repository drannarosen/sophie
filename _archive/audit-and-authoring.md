# Audit & Authoring Stack

Sophia's AI surface — how the platform integrates with Claude Code,
Codex, and other AI tools without making its own AI calls.

This is the AI-native differentiator vs. MyST/Quarto/JupyterBook. But
Sophia itself is provider-agnostic: the CLI is deterministic, and the
AI work happens in tools you already pay for (Claude Max, ChatGPT
Pro, etc.).

This doc covers:

1. The architecture model (sharp boundary between Sophia and AI)
2. The Sophia CLI surface
3. The prompt file format (the contract between CLI and AI tools)
4. Sophia skills (Claude Code skill files)
5. Slash commands
6. Subagents
7. Cowork plugin packaging
8. Workflow examples
9. Trust, reproducibility, caching
10. Open design questions

---

## 1. Architecture model

```
┌───────────────────────────────────────────────────┐
│  Sophia CLI (deterministic, in-process)           │
│                                                    │
│  ✓ Schema validation                              │
│  ✓ Reference resolution                           │
│  ✓ Asset freshness                                │
│  ✓ Pedagogy contract checks (cadence, pairing)    │
│  ✓ Cross-component graph verification             │
│  ─ Emits Tier-3 prompt files (does not run them)  │
└───────────────────────────────────────────────────┘
                        │
                        ▼
        prompt files in .sophia-tasks/
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
    ┌──────────────┐        ┌──────────────┐
    │  Claude Code │        │     Codex    │
    │              │        │              │
    │  Skills      │        │  Slash cmds  │
    │  Subagents   │        │  Plain       │
    │  Slash cmds  │        │  prompts     │
    │  TodoWrite   │        │              │
    └──────────────┘        └──────────────┘
```

The boundary is sharp: Sophia handles everything *deterministic*; AI
tools handle everything *generative or judgment-based*. The interface
is structured prompt files in a known format.

**Why this architecture is right:**

- **No API keys** in the platform. Sophia ships without provider
  credentials.
- **No per-call costs.** Authors use their existing subscriptions.
- **Provider-agnostic.** Today Claude Code + Codex; tomorrow a local
  Ollama setup or whatever else exists. The prompt format is the
  contract.
- **Reproducibility lives at the AI tool layer.** Sophia produces
  the same prompt every time; the AI tool produces non-deterministic
  output, but that's expected and bounded.
- **Author always in the loop.** Sophia never silently writes content;
  the AI tool produces drafts/diffs the author reviews.

---

## 2. The Sophia CLI surface

The CLI is purely deterministic. Five commands cover the whole
surface:

### `sophia audit`

```bash
sophia audit chapter <id>                  # all checks + Tier 3 prompts
sophia audit chapter <id> --fast           # Tier 1+2 only
sophia audit chapter <id> --tier=2         # specific tier
sophia audit chapter <id> --tier=3-only    # emit only Tier 3 prompts
sophia audit course <id>                   # all chapters
sophia audit --since=main                  # only changed chapters
sophia audit --output=json                 # machine-readable
sophia audit --output=claude-code          # TodoWrite-compatible
sophia audit --output=github               # GH PR annotations
sophia audit --output=prompts <dir>        # write Tier 3 prompts to dir
```

Exit codes:

- `0` — no errors (warnings allowed; configurable to fail on warnings)
- `1` — Tier 1 errors (schema, references, structure)
- `2` — Tier 2 errors (pedagogy contract)
- `3` — Tier 3 prompts generated (informational, not a failure)

### `sophia validate`

```bash
sophia validate chapter <id>     # subset of audit: schema only
sophia validate course <id>      # all chapters in course
sophia validate --strict         # fail on any warning
```

A strict subset of `audit` — schema validation only. Fastest check.

### `sophia build`

```bash
sophia build                     # student profile, ./dist/
sophia build --profile=student
sophia build --profile=instructor
sophia build --profile=both
sophia build --course=astr201
```

Wrapper around the underlying Astro build, sets the `PROFILE` env
var, runs the audit (errors fail the build), produces `dist/`.

### `sophia preview`

```bash
sophia preview                   # local dev server
sophia preview --profile=instructor
```

Astro preview, pinned to a profile.

### `sophia fmt`

```bash
sophia fmt chapter <id>          # format MDX consistently
sophia fmt course <id>           # all chapters
sophia fmt --check               # error if formatting differs
```

Auto-formats MDX: prop indentation, frontmatter ordering, component
spacing. Like Prettier for chapters.

### `sophia eval`

```bash
sophia eval prompts                       # run all Tier 3 prompts against a fixture set
sophia eval prompts --check=<id>          # run a specific prompt template
sophia eval prompts --provider=claude     # run against a specific provider
sophia eval prompts --provider=codex
sophia eval prompts --baseline=<sha>      # diff against a baseline run
sophia eval prompts --output=junit        # CI-friendly output
```

Prompt-regression testing. The platform ships fixture files (a tiny
chapter, a Prediction with a known-good answer, etc.) and the
expected-shape responses for each Tier 3 check. `sophia eval` runs
the prompts through configured providers and reports drift in
quality, format, or shape.

This is how the AI surface stays trustworthy as Sophia versions evolve.
Without it, prompt edits have no regression signal and quality silently
degrades.

That's the entire CLI. **No `sophia generate`, `sophia fix`, `sophia
refactor`** — those live as Claude Code slash commands and skills,
because they need an AI in the loop.

---

## 3. The prompt file format

The contract between the CLI and any AI tool. A prompt file is a
self-contained Markdown document with structured frontmatter.

```yaml
---
sophia-task: question-clarity
sophia-version: 1.0.0
chapter: flux-luminosity-distance
component: prediction
component-id: flux-distance-doubles
severity-if-found: warning
expected-response: structured-json
---

# Sophia Task: Question Clarity Check

## Context

You are reviewing a student-facing prediction question in an
astronomy textbook chapter. The audience is **first-year astronomy
majors** (estimated reading level: grade 12-13).

The chapter's framing is OMI (Observable → Model → Inference):
- Observable: Flux measured at Earth
- Model: Inverse-square spreading of light
- Inference: Luminosity if distance is known

## Your task

Evaluate this prediction question for clarity. Flag any ambiguity,
missing context, or assumed knowledge that a first-year student
would not have at this point in the chapter.

## Component being reviewed

```mdx
<Prediction
  id="flux-distance-doubles"
  question="If the distance to a star doubles, what happens to the
            measured flux?"
  choices={["Doubles", "Halves",
            "Decreases by a factor of 4", "Stays the same"]}
  answer="Decreases by a factor of 4"
  skill="scaling-reasoning"
/>
```

## Expected response

Return JSON in this shape:

```json
{
  "score": 0-10,
  "issues": [
    {
      "severity": "error" | "warning" | "info",
      "concern": "...",
      "suggestion": "..."
    }
  ],
  "verdict": "ok" | "needs-revision" | "rewrite"
}
```

## Sophia metadata (do not include in response)

- Cache key: chapter-hash + component-id + check-id
- Severity for issues: maps to audit `severity` field
```

Every Tier 3 check produces a file in this format. The frontmatter
is machine-parseable; the body is human + LLM readable; the expected
response is structured so it can be parsed back into the audit
report.

**Why this format works for any AI tool:**

- Claude Code reads it natively (it's just Markdown with frontmatter).
- Codex reads it via paste or file upload.
- A custom script can pipe it through any LLM API.
- The structured response can be parsed automatically.

---

## 4. Sophia skills (Claude Code skill files)

Each skill is a `SKILL.md` file with a system prompt, examples, and
constraints. Skills get installed in Claude Code (or in Cowork via
the plugin system) and become available when working on Sophia
content.

### v1 skills

```
sophia.plugin/skills/
  sophia-chapter-author/SKILL.md
  sophia-figure-annotator/SKILL.md
  sophia-quality-reviewer/SKILL.md
  sophia-misconception-researcher/SKILL.md
  sophia-mission-generator/SKILL.md
  sophia-transcript-curator/SKILL.md
  sophia-fix-applier/SKILL.md
```

Each one is single-purpose. Description of v1 set:

**`sophia-chapter-author`** — Scaffolds new chapter drafts.

- Trigger: "scaffold a chapter on X"; "draft a new chapter for COMP 536".
- Tools: read schema, read related chapters, read concept registry.
- Output: a `.mdx` file conforming to the Sophia chapter schema, with
  required components (OMI/PMI), declared concepts, declared
  misconceptions, prose stubs for the author to fill in.
- Constraints: never invent facts; always mark prose stubs explicitly
  as "TODO author"; reference real misconceptions if known.

**`sophia-figure-annotator`** — Generates alt text and FigureReading
prompts.

- Trigger: "annotate this figure"; "write alt text for X".
- Tools: read the figure (image), read surrounding chapter context.
- Output: `alt`, optional `longDescription`, suggested `FigureReading`
  prompts.
- Constraints: alt text must be specific (no "diagram of star"); long
  description for complex figures; always explain what the figure
  *teaches*, not just what it shows.

**`sophia-quality-reviewer`** — Runs Tier 3 audit checks.

- Trigger: "review this chapter"; `/sophia-review-chapter`.
- Tools: read chapter, read Sophia prompt files, read pedagogical
  contract.
- Output: structured findings (one per Tier 3 check), with
  suggestions and severity.
- Constraints: cite specific lines; don't make stylistic
  recommendations beyond pedagogy; flag uncertainty explicitly when
  unsure.

**`sophia-misconception-researcher`** — Finds and documents common
misconceptions for a concept.

- Trigger: "what misconceptions do students have about X"; "research
  misconceptions for this chapter".
- Tools: web search (when allowed), read existing misconception
  database, read related chapters.
- Output: structured `Misconception` entries (description, why
  students hold it, diagnostic prompt, suggested remediation).
- Constraints: distinguish documented research-based misconceptions
  from speculative ones; cite sources where possible.

**`sophia-mission-generator`** — Drafts a mission for a chapter.

- Trigger: "create a mission for this chapter"; "/sophia-generate-mission".
- Tools: read chapter, read available demos, read concept/skill registry.
- Output: a Mission .mdx file with prediction → demo-interaction →
  inference-prompt → reflection sequence.
- Constraints: mission must exercise concepts declared in the chapter;
  demo must exist; total estimated time within the chapter's mission
  budget.

**`sophia-transcript-curator`** — Generates transcripts and
VideoPrompt timestamps for lecture videos.

- Trigger: "transcribe this video"; "add prompts to this lecture".
- Tools: Whisper-style transcription (via Claude Code's tools or
  external), read chapter context for the video.
- Output: transcript file, suggested `VideoPrompt` timestamps with
  prediction text.
- Constraints: prompts pace at one per ~4-7 minutes; questions tie
  to chapter concepts; never insert a prompt mid-sentence.

**`sophia-fix-applier`** — Applies suggested fixes from an audit.

- Trigger: "apply these fixes"; `/sophia-fix <issue-id>`.
- Tools: read chapter, write diffs (via Claude Code's edit tools).
- Output: a diff per fix, presented for review before apply.
- Constraints: never apply fixes silently; preserve author's voice;
  one diff per logical change.

---

## 5. Slash commands

Shortcuts that wrap common workflows. Each is a thin orchestration:
runs the relevant CLI command, formats output, hands the right
context to the right skill.

```
/sophia-audit <chapter-id>
  → runs `sophia audit chapter <id>`
  → loads results into Claude Code's task list
  → suggests next action

/sophia-fix <issue-id>
  → invokes sophia-fix-applier skill
  → produces a diff for review

/sophia-scaffold-chapter <topic>
  → invokes sophia-chapter-author skill
  → produces a draft chapter

/sophia-review-chapter <chapter-id>
  → invokes sophia-quality-reviewer
  → reads Tier 3 prompts from .sophia-tasks/
  → produces a review report

/sophia-figure <figure-path>
  → invokes sophia-figure-annotator
  → produces alt text + FigureReading

/sophia-mission <chapter-id>
  → invokes sophia-mission-generator
  → produces a mission file

/sophia-transcript <video-url>
  → invokes sophia-transcript-curator
  → produces transcript + VideoPrompts

/sophia-misconceptions <concept>
  → invokes sophia-misconception-researcher
  → produces Misconception entries
```

All slash commands are reviewable: output is presented for the
author to accept, modify, or reject. Nothing writes silently.

---

## 6. Subagents

For complex multi-step tasks, Sophia ships subagent definitions that
Claude Code can dispatch to.

```
sophia.plugin/agents/
  chapter-scaffolder.md    # full chapter creation pipeline
  quality-reviewer.md      # full Tier 3 review pipeline
  refactor-agent.md        # cross-chapter refactoring
```

A subagent is an autonomous worker with its own task and context;
the parent Claude Code session dispatches and waits for results.

Example: `chapter-scaffolder` is the full pipeline of:

1. Research misconceptions (calls `sophia-misconception-researcher`).
2. Identify related chapters and prerequisite concepts.
3. Draft chapter structure with required components.
4. Write prose stubs.
5. Suggest figures (paths or generation scripts).
6. Run Sophia audit on the draft.
7. Iterate until audit passes.
8. Return final draft for author review.

Subagents work for multi-skill workflows; slash commands work for
single-skill invocations.

---

## 7. Cowork plugin packaging

Sophia ships as a Cowork plugin so installation is one step. The
plugin manifest:

```json
{
  "name": "sophia",
  "version": "1.0.0",
  "description": "AI-assisted authoring for Sophia textbooks",
  "skills": [
    "sophia-chapter-author",
    "sophia-figure-annotator",
    "sophia-quality-reviewer",
    "sophia-misconception-researcher",
    "sophia-mission-generator",
    "sophia-transcript-curator",
    "sophia-fix-applier"
  ],
  "commands": [
    "sophia-audit",
    "sophia-fix",
    "sophia-scaffold-chapter",
    "sophia-review-chapter",
    "sophia-figure",
    "sophia-mission",
    "sophia-transcript",
    "sophia-misconceptions"
  ],
  "agents": [
    "chapter-scaffolder",
    "quality-reviewer",
    "refactor-agent"
  ],
  "requires": {
    "sophia-cli": "^1.0.0"
  }
}
```

Installation:

```bash
# 1. Install Sophia CLI globally
pnpm add -g @astrobytes-edu/sophia

# 2. Install Sophia Cowork plugin
cowork plugin install @astrobytes-edu/sophia-plugin
```

After this, working in any Sophia chapter activates the skills,
slash commands, and subagents in Claude Code.

---

## 8. Workflow examples

Three concrete workflows showing how the pieces fit together.

### Authoring a new chapter from scratch

```
Author: "I want to write a chapter on stellar parallax for ASTR 201."

In Claude Code:
> /sophia-scaffold-chapter "stellar parallax" --course=astr201 --framing=omi

→ chapter-scaffolder subagent runs:
  - researches parallax misconceptions
  - reads related chapters (light-as-information, distance-measurement)
  - drafts chapter with OMI framing
  - declares concepts: parallax-angle, baseline, trig-distance
  - creates prediction stubs
  - suggests figures
  - runs sophia audit on draft
  - iterates until audit passes

→ produces: src/content/chapters/stellar-parallax.mdx
→ presents diff for author review

Author reviews, edits prose stubs, accepts.

In terminal:
$ sophia audit chapter stellar-parallax
✓ schema valid
✓ pedagogy contract met
→ 3 Tier 3 prompts generated for review

In Claude Code:
> /sophia-review-chapter stellar-parallax

→ quality-reviewer reads .sophia-tasks/stellar-parallax/
→ produces review with suggestions

Author iterates with Claude Code on suggestions.
```

### Auditing an existing chapter

```
$ sophia audit chapter flux-luminosity-distance
✗ Tier 1: 1 error
  - Missing required field `framing` in frontmatter (line 5)
✓ Tier 2: passed
→ Tier 3: 5 prompts generated in .sophia-tasks/flux-luminosity-distance/

In Claude Code:
> /sophia-fix flux-luminosity-distance:framing-missing

→ sophia-fix-applier reads the issue
→ proposes adding framing to frontmatter (diff shown)
→ author accepts

> /sophia-review-chapter flux-luminosity-distance

→ quality-reviewer runs through Tier 3 prompts
→ flags one issue: question-clarity for prediction
  flux-distance-doubles
  → Issue: Choice "Halves" is ambiguous;
    students may interpret it as "at half the distance" rather than
    "half the original flux."
  → Suggestion: Reword to "Drops to half the original flux"

Author accepts via /sophia-fix.

$ sophia audit chapter flux-luminosity-distance --fast
✓ all checks pass
```

### Refactoring across chapters

```
Author: "I want to rename the concept 'inverse-square-law' to
'flux-distance-relation' across all ASTR 201 chapters."

In Claude Code:
> Use refactor-agent to rename concept inverse-square-law to
  flux-distance-relation across course astr201

→ refactor-agent runs:
  - finds all uses of the concept across chapters
  - generates diffs for each chapter
  - presents per-chapter diffs for review
  - applies accepted diffs
  - runs sophia audit on every modified chapter
  - reports summary

Author reviews and approves.
```

---

## 9. Trust, reproducibility, caching

### Trust calibration

AI checks are not perfect. Some are highly reliable (alt text
quality, reading level estimation). Others are flaky (judging
whether multiple-choice options are pedagogically distinct).

Each Tier 3 check has a confidence band:

- **High confidence**: surfaced as warnings.
- **Medium confidence**: surfaced as info.
- **Low confidence**: surfaced as suggestions for human review only.

Confidence bands are declared per-check in the prompt frontmatter:

```yaml
---
sophia-task: choices-distinctness
confidence: medium
---
```

Only Tier 1 + Tier 2 checks can block CI. Tier 3 issues never
fail a build by default.

### Reproducibility

Sophia produces the same prompt every time. The AI tool produces
non-deterministic output. Mitigations:

- Pin `sophia-version` in prompt frontmatter — changing the prompt
  bumps the version, makes the change visible.
- Authors should run Tier 3 audits with consistent settings (same
  model, same temperature) when possible.
- For critical checks (e.g., answer correctness), require
  multi-pass agreement: the check is "verified" only if 2/3 runs
  agree.

### Caching

Sophia caches Tier 3 prompts by content hash:

```
.sophia-cache/
  prompts/
    {chapter-hash}/
      {check-id}.md          # the prompt
      {check-id}.response.md  # the cached AI response (if any)
```

The cache key is `chapter-content-hash + check-id + sophia-version`.
Cache invalidates when any of these changes.

Note: Sophia caches *prompts* (which are deterministic). The author
or AI tool caches *responses* (which are not). Claude Code's own
context caching handles response-side caching automatically.

---

## 10. Open design questions

### 10.1 Slash command vs. skill

When does a workflow live as a slash command vs. a skill? Current
heuristic:

- **Slash command** for fast, well-defined operations (audit, fix,
  scaffold).
- **Skill** for general capabilities that may be invoked any way
  (annotate, research, review).

Could be wrong. Need experience with real workflows to refine.

### 10.2 Multi-tool support — resolved by `sophia eval`

Validating that prompts work across providers (Claude Code, Codex,
local models) ships in v1 as `sophia eval prompts`. See section 2.

Open sub-questions to resolve as `sophia eval` matures:

- Per-provider configuration: where do API credentials live? (Author's
  shell environment; Sophia never stores them.)
- Acceptance thresholds: how much drift between providers is "drift"
  vs. "expected stochastic variance"? Tune empirically.
- Fixture maintenance: keep the eval fixtures small and authored, not
  scraped from real chapter content (privacy + reproducibility).

### 10.3 Local LLM fallback

Long-term, Tier 3 should support local models (Ollama + a fine-tuned
small model) for privacy and cost. Architecturally this is fine —
prompt files are provider-agnostic. But:

- Which checks are quality-suitable for local models?
- How do authors configure provider preference?
- Is there a hybrid mode (local for cheap checks, cloud for
  complex)?

Defer to v2/v3.

### 10.4 Misconception database scope

Several skills consume "misconception data for concept X." Where
does that data live?

- Per-chapter (frontmatter only) — duplicated, lost across chapters.
- Per-course (`misconceptions/` directory) — better, scopes to one
  course.
- Cross-course (`@astrobytes-edu/misconception-db`) — best, accrues
  pedagogical knowledge across years and courses.

V1: per-course. V2 or V3: cross-course shared resource.

### 10.5 Plugin / extension API for v3

Other instructors will want custom skills, custom slash commands,
custom Tier 3 checks. The architecture supports this — components
already register their own checks; skills are just files. But the
public API for third-party plugins needs to be specified before
open-source release.

Defer to v3.

### 10.6 Audit history / regression detection

When a chapter changes, the audit verdict may shift. Useful
features:

- Audit-result diffs in PRs (this PR causes 3 new warnings).
- Historical trends ("calibration of student feedback declining").
- Snapshot tests (audit verdict is committed; regressions visible).

Probably v2. Adds engineering complexity but high value once content
is mature.

---

## What this gives us

- **Provider independence**: Sophia works with whichever AI tool you
  prefer. No lock-in.
- **Subscription-friendly**: no per-call API costs; uses Claude Max
  / ChatGPT Pro / etc.
- **Author always in the loop**: nothing writes silently; every AI
  output is a reviewable diff.
- **Composable**: skills, slash commands, and subagents combine into
  arbitrary workflows.
- **Extensible**: new checks, skills, and commands are additive.
- **Open-source ready**: plugin architecture works for third-party
  contributors in v3.

The audit/authoring stack is what makes Sophia *AI-native* without
being *AI-dependent*. The deterministic core works without any AI;
the AI surface amplifies the author's productivity. Both are useful
on their own; together they're substantially more than the sum.
