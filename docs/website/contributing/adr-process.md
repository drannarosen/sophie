---
title: ADR process
short_title: ADR process
description: When to write an ADR, how to author it, the review and acceptance flow.
tags: [contributing, adr, process]
---

# ADR process

How {abbr}`ADR`s get written, reviewed, accepted, and superseded for
Sophie.

The ADR template lives at [`decisions/template.md`](../decisions/template.md).
This page is the *workflow*, not the format.

## When to write an ADR

Write an ADR when a decision:

- **Affects multiple modules or layers** of the platform.
- **Constrains future choices** — you can't easily reverse it.
- **Has alternatives that are non-obvious** — someone six months from
  now would benefit from seeing why this option won.
- **Carries trade-offs worth recording** — the rejected options would
  have been defensible too.

If a decision is local, easily reversed, and obvious, **don't write
an ADR**. Just do it. ADRs are for the genuinely load-bearing
choices.

Examples that *do* warrant ADRs:

- Choosing a renderer (Astro+MDX vs MyST).
- Choosing schema source-of-truth (Zod).
- Choosing storage primitive (IndexedDB).
- Adding a new architectural seam (plugin API, renderer adapter).
- Deferring a feature to later (i18n).
- Adopting a process discipline (Changesets, axe-core in CI).

Examples that *don't*:

- Naming a function.
- Picking between two equivalent libraries (e.g., `lodash` vs
  `radash`) for a small utility.
- Refactoring the internals of one component.
- Adding a new page to the docs site.

## Authoring flow

```{mermaid}
stateDiagram-v2
    [*] --> Drafting
    Drafting --> Proposed: open PR
    Proposed --> Accepted: review approves
    Proposed --> Rejected: review rejects
    Proposed --> Drafting: review requests changes
    Accepted --> Deprecated: no longer relevant
    Accepted --> Superseded: new ADR replaces it
    Rejected --> [*]
    Deprecated --> [*]
    Superseded --> [*]
```

### 1. Draft

- Pick the next available ADR number (zero-padded, four digits).
- Copy `decisions/template.md` to `decisions/NNNN-short-title.md`.
- Fill in frontmatter: `status: proposed`, `date`, `deciders`,
  `tags`.
- Write the body following the template's section structure.
- Add the new file to `myst.yml` toc under Decisions.

### 2. Propose

- Open a PR titled `ADR NNNN: <title>`.
- Link any related ADRs in the PR body.
- Tag relevant deciders for review.

### 3. Review

The review is **substantive, not procedural**. Reviewers should:

- Verify the Context section accurately captures the forces at play.
- Stress-test the Decision: is it the right call?
- Check that Alternatives considered are real alternatives, not
  straw men.
- Verify Consequences are honest — both positive and negative.
- Look for missing References (prior ADRs, external standards).

A review that just says "lgtm" without engaging with the alternatives
isn't a review.

### 4. Accept

When the review is settled:

- Update frontmatter: `status: accepted`, `date: <today>`.
- Merge the PR.
- The ADR is now **immutable**. Substantive changes require a new
  ADR that supersedes it.

### 5. Update consumers

After acceptance:

- Update affected reference / how-to / explanation pages with
  cross-refs to the new ADR.
- Update `index.md`'s "Quick facts" if the ADR is foundational.
- Update [Roadmap](../status/roadmap.md) if the ADR shifts phase
  scope.

## Superseding an ADR

When a previously-accepted decision needs to change:

1. Write a new ADR (`NNNN+`) with `supersedes: <old-id>`.
2. Update the old ADR's frontmatter: `status: superseded`,
   `superseded-by: <new-id>`.
3. Add a brief note at the top of the old ADR pointing to the new
   one.
4. The old ADR stays in the tree — historical record matters.

This is *not* an in-place edit of the old ADR. The point is to
preserve the *evolution* of thinking, not to erase what we used to
believe.

## Deprecating an ADR

When a decision becomes irrelevant (e.g., the feature it governed
was removed):

1. Update frontmatter: `status: deprecated`.
2. Add a brief note at the top explaining what changed.
3. Don't remove the ADR — historical record.

## Tone and voice

- **Be brief.** A 200-word ADR that captures the essence beats a
  2,000-word one that buries it.
- **Quantify** when you can. "Saves ~1 week in Phase 4" beats "saves
  significant effort."
- **Name names**: "rejected MyST" not "rejected an alternative."
- **Active voice.**
- **Past tense for context, present for decision, future for
  consequences.**
- **Honest about trade-offs.** Future-you will read this; lying to
  yourself doesn't help.

## Anti-patterns

- **The retroactive ADR.** Writing an ADR after the work is already
  done, just to have one. Acceptable only if the decision was made
  in conversation and you're capturing it for the record. Note in
  the body that this is a retroactive capture.
- **The ADR sandwich.** A 50-word ADR that's basically a tweet.
  Either the decision isn't ADR-worthy, or you didn't capture
  enough context. Recheck.
- **The committee ADR.** Listing 12 deciders. ADRs are usually
  decided by a small group; large groups suggest the decision
  wasn't actually made.
- **The hedge-everything ADR.** "We chose X but might switch to Y if
  Z happens." Decisions are commitments. Hedge in Consequences,
  not in Decision.

## See also

- [Decisions index](../decisions/template.md) — the ADR template.
- [Existing ADRs 0001–0010](../decisions/0001-platform-not-monorepo.md) —
  worked examples.
- [Docs style guide](docs-style-guide.md) — voice and IA.
