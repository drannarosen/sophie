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
- The ADR is now in **pre-implementation** state. Editing rules
  per the next section apply.

### 5. Update consumers

After acceptance:

- Update affected reference / how-to / explanation pages with
  cross-refs to the new ADR.
- Update `index.md`'s "Quick facts" if the ADR is foundational.
- Update [Roadmap](../status/roadmap.md) if the ADR shifts phase
  scope.

## ADR editing rules (state-dependent immutability)

Sophie distinguishes **pre-implementation** ADRs from
**post-implementation** ADRs. The two states have different
editing rules. The state is tracked by the optional
`implemented_in:` frontmatter field.

### Pre-implementation: freely editable in place

An ADR with `implemented_in: null` (or with the field absent) is
**pre-implementation** — its decision has been accepted, but no
code PR has shipped to implement it. In this state:

- **Substantive changes land in place**, directly editing the
  Decision / Rationale / Alternatives / Consequences / References
  sections.
- **No Revisions section needed.** Git history is the audit trail.
  `git log --follow <adr>.md` shows every change.
- The rationale: ADRs that haven't been built against are still
  *design proposals*. Forcing changelog overhead onto design-stage
  iteration produces unreadable changelogs and discourages real
  refinement.
- The cost of in-place editing is bounded: nothing depends on the
  ADR's prior text yet.

### Post-implementation: Revisions sections + new-ADR escape hatch

An ADR transitions to **post-implementation** when its
`implemented_in:` field becomes non-null (typically populated with
the merging PR number or commit SHA). At that point:

- **Substantive changes land as Revisions sections** at the end of
  the ADR (`## Revisions` heading, with `**§N — <date>: <label>**`
  sub-headings for each revision).
- The rationale: the ADR now represents a contract with deployed
  code. Future readers (and future authors maintaining that code)
  benefit from seeing how the contract evolved alongside the
  implementation.
- **Hard renames or breaking shifts** still land as new ADRs that
  supersede the old one (see "Superseding" below). Revisions
  sections are for *amendments*, not *replacements*.

### Setting `implemented_in:`

The first code PR that ships an implementation of an ADR's
contract updates that ADR's frontmatter:

```yaml
---
date: 2026-05-14
implemented_in: "#123"   # or commit SHA, or list of PRs
tags: [...]
---
```

Once set, the ADR is in post-implementation state. Subsequent
substantive changes use Revisions sections.

### When in doubt, ask

If a change feels like it might warrant a new ADR (e.g., a broad
architectural shift that would substantively rewrite the Decision
section), it probably does. The in-place editing path is for
*refinement* — clarifying language, tightening prose, fixing
contradictions, adding examples. Re-deciding the core call is a
new-ADR move regardless of state.

## Superseding an ADR

When a previously-accepted decision needs to change *substantively*
(beyond what Revisions can carry):

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
