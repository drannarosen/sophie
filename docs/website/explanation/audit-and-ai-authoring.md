---
title: Audit and AI Authoring
short_title: Audit & AI authoring
description: How Sophie integrates with Claude Code, Codex, and other AI tools without making its own AI calls.
tags: [audit, ai, claude-code, codex]
---

# Audit and AI authoring

Sophie's AI surface — how the AI **primary-authors** chapter content
under instructor supervision, using third-party AI tools (Claude
Code, Codex, etc.) as the runtime. Per
[ADR 0030](../decisions/0030-audience-and-ai-author-model.md) and
[overview §1](../overview.md), the AI plays four load-bearing roles
(primary author / STEM pedagogy expert / domain expert /
brainstorming + design-doc writer); the instructor remains the
supervisor, decider, and final authority. This doc describes the
*technical surface* that makes those roles effective — how Sophie
integrates with AI tools without making its own AI calls.

This is the AI-native differentiator vs. MyST/Quarto/JupyterBook. But
**Sophie itself is provider-agnostic**: the CLI is deterministic, and
the AI work happens in tools the instructor already pays for (Claude
Max, ChatGPT Pro, etc.).

## 1. Architecture model

```{mermaid}
flowchart TB
    subgraph Sophie["Sophie CLI (deterministic, in-process)"]
        S1[Schema validation]
        S2[Reference resolution]
        S3[Asset freshness]
        S4[Pedagogy contract checks<br/>cadence, pairing]
        S5[Cross-component graph verification]
        S6[Emits Tier-3 prompt files<br/>does not run them]
    end

    Sophie --> Files[".sophie-tasks/<br/>Markdown + frontmatter prompt files"]

    Files --> CC[Claude Code<br/>Skills, Subagents, Slash cmds, TodoWrite]
    Files --> Codex[Codex<br/>Slash cmds, Plain prompts]
    Files --> Other[Any LLM tool<br/>via prompt format]
```

The boundary is sharp: **Sophie handles everything *deterministic*; AI
tools handle everything *generative or judgment-based*.** The
interface is structured prompt files in a known format.

### Why this architecture is right

- **No API keys** in the platform. Sophie ships without provider
  credentials.
- **No per-call costs.** Authors use their existing subscriptions.
- **Provider-agnostic.** Today Claude Code + Codex; tomorrow a local
  Ollama setup or whatever else exists. The prompt format is the
  contract.
- **Reproducibility lives at the AI tool layer.** Sophie produces
  the same prompt every time; the AI tool produces non-deterministic
  output, but that's expected and bounded.
- **Instructor always in the loop.** Sophie never silently writes
  content. The AI primary-authors; the instructor reviews and decides
  at every handoff. HITL is structural, not advisory
  ([ADR 0030](../decisions/0030-audience-and-ai-author-model.md)).

## 2. The Sophie CLI surface

The CLI is purely deterministic. See
[CLI reference](../reference/cli.md) for the complete command list.

The deterministic operations:

- `sophie audit` — schema, reference, pedagogy contract, plus emit
  Tier 3 prompt files.
- `sophie validate` — strict subset of audit; schema only.
- `sophie build` — wraps `astro build`, sets `PROFILE`, runs audit.
- `sophie preview` — Astro preview pinned to a profile.
- `sophie fmt` — auto-format MDX consistently.
- `sophie eval` — prompt-regression testing across providers; ships
  in v1 ([ADR 0010](../decisions/0010-myst-for-design-docs.md)).
- `sophie create` — scaffold a new textbook, course, or chapter from
  templates.
- `sophie upgrade` — apply forward-only schema migrations.

What's **not** in the CLI by design: `sophie generate`, `sophie fix`,
`sophie refactor`. Those need an AI in the loop and live as Claude
Code slash commands and skills.

## 3. The prompt file format

The contract between the CLI and any AI tool. A prompt file is a
self-contained Markdown document with structured frontmatter:

```yaml
---
sophie-task: question-clarity
sophie-version: 1.0.0
chapter: flux-luminosity-distance
component: prediction
component-id: flux-distance-doubles
severity-if-found: warning
expected-response: structured-json
confidence: high
---

# Sophie Task: Question Clarity Check

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

Every Tier 3 check produces a file in this format. The frontmatter
is machine-parseable; the body is human + LLM readable; the expected
response is structured so it can be parsed back into the audit
report.

**Why this format works for any AI tool:**

- Claude Code reads it natively (it's just Markdown with frontmatter).
- Codex reads it via paste or file upload.
- A custom script can pipe it through any LLM API.
- The structured response can be parsed automatically.

## 4. Sophie skills (Claude Code skill files)

Each skill is a `SKILL.md` file with a system prompt, examples, and
constraints. Skills get installed in Claude Code (or in Cowork via
the plugin system) and become available when working on Sophie
content.

### v1 skills

- **`sophie-chapter-author`** — Scaffolds new chapter drafts.
- **`sophie-figure-annotator`** — Generates alt text and FigureReading prompts.
- **`sophie-quality-reviewer`** — Runs Tier 3 audit checks.
- **`sophie-misconception-researcher`** — Finds and documents common misconceptions.
- **`sophie-mission-generator`** — Drafts a mission for a chapter.
- **`sophie-transcript-curator`** — Generates transcripts and VideoPrompt timestamps.
- **`sophie-fix-applier`** — Applies suggested fixes from an audit.

Each one is single-purpose. Skills produce drafts/diffs the author
reviews; nothing writes silently.

## 5. Slash commands

Shortcuts that wrap common workflows. Each is a thin orchestration:
runs the relevant CLI command, formats output, hands the right
context to the right skill.

```
/sophie-audit <chapter-id>
  → runs `sophie audit chapter <id>`
  → loads results into Claude Code's task list

/sophie-fix <issue-id>
  → invokes sophie-fix-applier skill
  → produces a diff for review

/sophie-scaffold-chapter <topic>
  → invokes sophie-chapter-author skill
  → produces a draft chapter

/sophie-review-chapter <chapter-id>
  → invokes sophie-quality-reviewer
  → reads Tier 3 prompts from .sophie-tasks/
  → produces a review report
```

All slash commands are reviewable: output is presented for the
author to accept, modify, or reject. **Nothing writes silently.**

## 6. Subagents

For complex multi-step tasks, Sophie ships subagent definitions that
Claude Code can dispatch to. A subagent is an autonomous worker with
its own task and context.

Examples:

- **`chapter-scaffolder`** — full chapter creation pipeline:
  research misconceptions, identify related chapters, draft structure,
  write prose stubs, suggest figures, run audit, iterate until
  audit passes, return final draft for author review.
- **`quality-reviewer`** — full Tier 3 review pipeline.
- **`refactor-agent`** — cross-chapter refactoring (e.g., rename a
  concept across all ASTR 201 chapters).

Subagents work for multi-skill workflows; slash commands work for
single-skill invocations.

## 7. Cowork plugin packaging

Sophie's AI authoring kit ships as a Cowork plugin so installation is
one step. The plugin manifest enumerates skills, slash commands, and
subagents:

```json
{
  "name": "sophie",
  "version": "1.0.0",
  "skills": ["sophie-chapter-author", "sophie-figure-annotator", ...],
  "commands": ["sophie-audit", "sophie-fix", ...],
  "agents": ["chapter-scaffolder", "quality-reviewer", "refactor-agent"],
  "requires": { "sophie-cli": "^1.0.0" }
}
```

After `cowork plugin install @drannarosen/sophie-plugin`, working
in any Sophie chapter activates the skills, slash commands, and
subagents in Claude Code.

## 8. Workflow examples

### Authoring a new chapter from scratch

```
Author: "I want to write a chapter on stellar parallax for ASTR 201."

In Claude Code:
> /sophie-scaffold-chapter "stellar parallax" --course=astr201 --framing=omi

→ chapter-scaffolder subagent runs:
  - researches parallax misconceptions
  - reads related chapters (light-as-information, distance-measurement)
  - drafts chapter with OMI framing
  - declares concepts: parallax-angle, baseline, trig-distance
  - creates prediction stubs
  - suggests figures
  - runs sophie audit on draft
  - iterates until audit passes

→ produces: src/content/textbook/stellar-parallax.mdx
→ presents diff for author review
```

### Auditing an existing chapter

```
$ sophie audit chapter flux-luminosity-distance
✗ Tier 1: 1 error
  - Missing required field `framing` in frontmatter (line 5)
✓ Tier 2: passed
→ Tier 3: 5 prompts generated in .sophie-tasks/flux-luminosity-distance/

In Claude Code:
> /sophie-fix flux-luminosity-distance:framing-missing

→ sophie-fix-applier reads the issue
→ proposes adding framing to frontmatter (diff shown)
→ author accepts

> /sophie-review-chapter flux-luminosity-distance

→ quality-reviewer runs through Tier 3 prompts
→ flags one issue: question-clarity for prediction
  flux-distance-doubles
  → Issue: Choice "Halves" is ambiguous
  → Suggestion: Reword to "Drops to half the original flux"

Author accepts via /sophie-fix.
```

## 9. Trust, reproducibility, caching

### Trust calibration

AI checks are not perfect. Some are highly reliable (alt text
quality, reading level estimation). Others are flaky (judging whether
multiple-choice options are pedagogically distinct).

Each Tier 3 check has a confidence band:

- **High confidence**: surfaced as warnings.
- **Medium confidence**: surfaced as info.
- **Low confidence**: surfaced as suggestions for human review only.

Confidence bands are declared per-check in the prompt frontmatter
(`confidence: high | medium | low`).

Only Tier 1 + Tier 2 checks can block CI. **Tier 3 issues never fail
a build by default.**

### Reproducibility

Sophie produces the same prompt every time. The AI tool produces
non-deterministic output. Mitigations:

- Pin `sophie-version` in prompt frontmatter — changing the prompt
  bumps the version, makes the change visible.
- Authors should run Tier 3 audits with consistent settings (same
  model, same temperature) when possible.
- For critical checks (e.g., answer correctness), require multi-pass
  agreement: the check is "verified" only if 2/3 runs agree.
- `sophie eval` runs the prompts against fixtures across providers
  to detect regressions.

### Caching

Sophie caches Tier 3 prompts by content hash:

```text
.sophie-cache/
  prompts/
    {chapter-hash}/
      {check-id}.md          # the prompt
      {check-id}.response.md # the cached AI response (if any)
```

The cache key is `chapter-content-hash + check-id + sophie-version`.
Cache invalidates when any of these changes.

Note: Sophie caches *prompts* (which are deterministic). The author
or AI tool caches *responses* (which are not). Claude Code's own
context caching handles response-side caching automatically.

## 10. Open design questions

### Slash command vs. skill

When does a workflow live as a slash command vs. a skill? Current
heuristic:

- **Slash command** for fast, well-defined operations (audit, fix,
  scaffold).
- **Skill** for general capabilities that may be invoked any way
  (annotate, research, review).

### Multi-tool support — resolved by `sophie eval`

Validating that prompts work across providers (Claude Code, Codex,
local models) ships in v1 as `sophie eval prompts`. See
[CLI reference](../reference/cli.md). Open sub-questions:

- Per-provider configuration: where do API credentials live?
  (Author's shell environment; Sophie never stores them.)
- Acceptance thresholds: how much drift between providers is "drift"
  vs. "expected stochastic variance"? Tune empirically.
- Fixture maintenance: keep the eval fixtures small and authored,
  not scraped from real chapter content (privacy + reproducibility).

### Local LLM fallback

Long-term, Tier 3 should support local models (Ollama + a fine-tuned
small model) for privacy and cost. Architecturally fine — prompt
files are provider-agnostic. Sub-questions:

- Which checks are quality-suitable for local models?
- How do authors configure provider preference?
- Is there a hybrid mode (local for cheap checks, cloud for
  complex)?

Defer to v2/v3.

### Misconception database scope

Several skills consume "misconception data for concept X." Where does
that data live?

- Per-chapter (frontmatter only) — duplicated, lost across chapters.
- Per-course (`misconceptions/` directory) — better, scopes to one
  course.
- Cross-course (`@drannarosen/misconception-db`) — best, accrues
  pedagogical knowledge across years and courses.

V1: per-course. V2 or V3: cross-course shared resource.

### Audit history / regression detection

When a chapter changes, the audit verdict may shift. Useful features:

- Audit-result diffs in PRs (this PR causes 3 new warnings).
- Historical trends ("calibration of student feedback declining").
- Snapshot tests (audit verdict is committed; regressions visible).

Probably v2. Adds engineering complexity but high value once content
is mature.

## What this gives us

- **Provider independence**: Sophie works with whichever AI tool you
  prefer. No lock-in.
- **Subscription-friendly**: no per-call API costs; uses Claude Max
  / ChatGPT Pro / etc.
- **Author always in the loop**: nothing writes silently; every AI
  output is a reviewable diff.
- **Composable**: skills, slash commands, and subagents combine into
  arbitrary workflows.
- **Extensible**: new checks, skills, and commands are additive.
- **Open-source ready**: plugin architecture works for third-party
  contributors in v3 (see [Plugin API](../reference/plugin-api.md)).

The audit/authoring stack is what makes Sophie *AI-native* without
being *AI-dependent*. The deterministic core works without any AI;
the AI surface amplifies the author's productivity. Both are useful
on their own; together they're substantially more than the sum.
