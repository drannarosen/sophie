---
title: ADR Template
short_title: Template
description: The shape every Architecture Decision Record fills in.
---

# ADR Template

This page is the template every {abbr}`ADR` follows. Copy it to
`decisions/NNNN-short-title.md`, replace placeholders, and update the
toc in `myst.yml`.

## Filename conventions

The filename pattern is `NNNN-short-title.md` — zero-padded four-digit
id, then a kebab-case slug, then `.md`. Two constraints worth calling
out:

- **No dots in the slug.** Don't write `0080-course-spec-format-v0.1.md`;
  write `0080-course-spec-format-v0-1.md` instead. MyST slugifies `.`
  → `-` when generating the URL (`_build/html/<slug>/`), but the
  validation-dashboard generator
  ([`scripts/regenerate-validation-index.mts`](https://github.com/drannarosen/sophie/blob/main/scripts/regenerate-validation-index.mts))
  uses the filename literal, so a dotted filename produces a dashboard
  `href` that doesn't resolve to any rendered HTML artifact.
  Integration test `I5` in
  [`packages/astro/src/lib/validation/index-generator.integration.test.ts`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/lib/validation/index-generator.integration.test.ts)
  fails the unit job when this drift exists.
- **Lowercase + kebab-case + alphanumerics only.** Same reason — the
  filename slug must equal the MyST URL slug character-for-character.

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

ADR editing rules are **state-dependent**. Pre-implementation ADRs
(no `implemented_in:` field) are freely editable in place — substantive
refinements land directly in the Decision / Rationale / Alternatives /
Consequences sections, with git history as the audit trail. Post-
implementation ADRs (with `implemented_in:` populated) land substantive
changes as Revisions sections at the end of the ADR. Hard renames or
breaking shifts still mean a new ADR that supersedes the old one
(which stays in the tree with `status: superseded`). See
[ADR process](../contributing/adr-process.md) for the full rule.

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
| `validation` | yes | frontmatter | Validation tracker block per [ADR 0056](0056-validation-tracker.md); new ADRs default to `status: unvalidated` |
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
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
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
