---
title: ADR Template
short_title: Template
description: The shape every Architecture Decision Record fills in.
---

# ADR Template

This page is the template every {abbr}`ADR` follows. Copy it to
`decisions/NNNN-short-title.md`, replace placeholders, and update the
toc in `myst.yml`.

## When to write an ADR

Write an ADR when a decision:

- **Affects multiple modules or layers** of the platform (cross-cutting).
- **Constrains future choices** (you can't easily reverse it).
- **Has alternatives that are non-obvious** (someone six months from
  now would benefit from seeing why this option won).
- **Carries trade-offs worth recording** (the rejected options would
  have been defensible too).

If a decision is local, easily reversed, and obvious, don't write an
ADR. Just do it.

## ADR lifecycle

```{mermaid}
stateDiagram-v2
    [*] --> Proposed
    Proposed --> Accepted: review passes
    Proposed --> Rejected: review rejects
    Accepted --> Deprecated: no longer relevant
    Accepted --> Superseded: a new ADR replaces it
    Rejected --> [*]
    Deprecated --> [*]
    Superseded --> [*]
```

ADRs are **immutable once accepted**. Edits to typos or formatting are
fine; substantive changes mean writing a new ADR that supersedes the
old one. The old one stays in the tree with `status: superseded`.

## Metadata fields

Two places to record ADR metadata:

- **Frontmatter** — `date` and `tags` only. These are mystmd-recognized
  keys; anything else triggers "extra keys ignored" warnings on build.
- **Body admonition** — an `:::{admonition} ADR metadata` block right
  after the H1, holding the lifecycle keys (`Status`, `Deciders`,
  `Supersedes`, `Superseded by`, `Amends`). Omit any row whose value is
  null/unused; always include `Status` and `Deciders`.

| Field | Required | Where | Notes |
|---|---|---|---|
| `date` | yes | frontmatter | ISO 8601 (`YYYY-MM-DD`) — date of acceptance |
| `tags` | recommended | frontmatter | Discoverability via tag search |
| `Status` | yes | admonition | `proposed`, `accepted`, `deprecated`, `superseded`, `rejected` |
| `Deciders` | yes | admonition | Decision-makers (comma-joined) |
| `Supersedes` | optional | admonition | ADR id this replaces (e.g. `0003`) |
| `Superseded by` | optional | admonition | ADR id that replaces this |
| `Amends` | optional | admonition | ADR id this refines without superseding |

## The template

```markdown
---
date: 2026-MM-DD
tags: [foundation]
---

# ADR NNNN: <Concise decision title>

:::{admonition} ADR metadata
- **Status**: proposed
- **Deciders**: anna
:::


## Context

What forces are at play. What problem are we solving. What constraints
shape the answer. Why this decision is needed *now* — what triggered
it. Quantify where possible (numbers, references, prior incidents).

## Decision

The single-sentence answer. Avoid hedging. State the decision.

## Rationale

Why this option, anchored to the forces in Context. The case *for*
the chosen option, in terms of the forces above.

## Alternatives considered

For each rejected alternative:

- **<Option name>**: brief description.
  - Pros relative to the chosen option.
  - Cons relative to the chosen option.
  - Why rejected.

If you didn't seriously consider alternatives, the decision probably
isn't ADR-worthy.

## Consequences

What this decision makes:

- **Easier**: bullet list.
- **Harder**: bullet list.
- **Triggers** (follow-on decisions or work): bullet list.

State both positive and negative consequences honestly. The point of
the ADR is for *future-you* to understand the trade-off, not to
defend the choice.

## References

- Links to the discussion or issue that prompted the ADR.
- Prior ADRs this builds on.
- External references (papers, blog posts, RFCs).
```

## Tone and voice

- **Be brief.** A 200-word ADR that captures the essence beats a
  2,000-word one that buries it.
- **Quantify** when you can. "Saves ~1 week in Phase 4" beats "saves
  significant effort."
- **Name names**: "rejected MyST" not "rejected an alternative."
- **Active voice.**
- **Past tense for context, present for decision, future for
  consequences.**

## See also

- [Contributing → ADR process](../contributing/adr-process.md) — when
  and how to propose an ADR.
- [Existing ADRs](0001-platform-not-monorepo.md) — concrete examples.
