---
date: 2026-05-15T00:00:00.000Z
tags:
  - process
  - contributing
  - git
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-16"
  evidence:
    - kind: manual
      ref: docs/website/decisions/0055-squash-merge-for-code-prs.md
      date: "2026-05-15"
      notes: "ADR 0055 itself is the contract; squash-merge has been the default for every code PR since adoption (visible in `git log --oneline` — each feature PR appears as a single commit on main)."
    - kind: deployment
      ref: .github/workflows/squash-merge-guard.yml
      date: "2026-05-16"
      notes: "Post-push workflow on main asserts HEAD is not a merge commit (parent count > 1). Catches `Allow merge commits` bypass at the CI layer. Landed in PR #60; first run on the merge commit (3599fc0) passed in 7s."
    - kind: deployment
      ref: null
      date: "2026-05-16"
      notes: "GitHub repo settings: allow_merge_commit=false, allow_rebase_merge=false, allow_squash_merge=true. Verified via `gh api /repos/drannarosen/sophie` post-flip on 2026-05-16. Settings-state lives outside the repo so ref is null; the squash-merge button is now the only one available in the GitHub PR UI."
  notes: "Status promoted from in-progress → validated on 2026-05-16 after the squash-merge-guard CI workflow + repo-settings change both landed. Two layers are required: settings prevent UI accidents (the `Create a merge commit` and `Rebase and merge` buttons are gone); the CI workflow catches API-level bypass of the merge-commit shape. Together they cover all three GitHub merge strategies."
---

# ADR 0055: Squash-merge for code PRs

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie merged its first 42 PRs as merge commits — GitHub's default.
The cadence produced clean, granular branch history on `main`: each
PR's RED-GREEN-REFACTOR arc, design iterations, and incidental
config-drift fixes are all visible in `git log`.

Two forces are reshaping the trade-off:

1. **The 13-commit [PR 10 history](https://github.com/drannarosen/sophie/pull/42)**
   included two commits (`5af775c` adding a print-mode HTML
   snapshot test, `b5f6377` excluding Playwright snapshot dirs from
   biome) that were both reverted in `03b442d` once the snapshot
   approach was abandoned for behavior-only e2e tests. The
   [Bucket B + C architecture audit](../../reviews/2026-05-15-bucket-b-c-architecture-audit.md)
   dim 8 evaluated this commit-history hygiene as "natural TDD arc
   with one mid-PR pivot" and noted that future iterations of
   similar shape would benefit from collapsing noise on merge.
   Merge commits propagate every iteration including obsoleted
   ones; squash-merge collapses to one commit per PR.

2. **GitHub branch protection informational warnings** flag merge
   commits in default branches as a code-smell. Sophie's branch
   protection isn't fully active yet (deferred until CI build job
   is green — per
   [ADR 0025](./0025-phase-0-actual-scope.md)),
   but the convention should align before branch protection
   activates rather than triggering an ADR retroactively.

The
[cheerful-eagle session plan](file:///Users/anna/.claude/plans/hi-claude-this-session-cheerful-eagle.md)
recorded the convention switch as a scope decision before
Workstream 2's first PR. This ADR pins it.

The `feedback_branch_pr_scope` durable-memory rule
(`docs/reviews/`, ADRs, registry updates land direct-to-main; code
changes get the full PR flow) is **unchanged**. This ADR scopes
*only* the merge mechanic for PRs that do go through the full flow.

## Decision

All code PRs landing on `main` use **squash-and-merge** as the
default merge strategy. Direct-to-main commits (docs, reviews,
ADRs, registry updates per `feedback_branch_pr_scope`) are
unaffected — they land as individual commits without any merge
mechanic.

## Rationale

- **Cleaner main history.** `git log --oneline main` reads one
  commit per PR. The RED-GREEN-REFACTOR + iteration arc lives on
  the PR branch and in GitHub's PR archive; the *outcome* is what
  lands on `main`.
- **PR-atomic revert.** `git revert <squash-commit>` undoes one
  PR with one command. Merge-commit revert needs `-m 1` and leaves
  the inverse merge in history; squash-revert is a clean inverse
  diff.
- **Aligns with branch protection.** When Sophie's branch
  protection activates (post-CI-green), the merge-commit warning
  will already be moot.
- **Lower review-time noise.** Squash-merge funnels the iteration
  noise into the PR review surface where it belongs (granular
  diffs visible per-commit during review) instead of permanently
  on `main`.
- **Pre-launch posture (feedback_no_backcompat_prelaunch).** No
  consumers depend on Sophie's commit shape today; the change has
  zero downstream cost.

## Alternatives considered

- **Keep merge commits (status quo).**
  - Pros: preserves full granular history on `main`; visible TDD
    arc for every feature; familiar GitHub default.
  - Cons: accumulates noise from reverted iterations (PR 10's
    `5af775c` + `b5f6377` + `03b442d` triangle), 13-commit PRs
    dominate `git log --oneline`, branch-protection warnings will
    fire on every merge.
  - Why rejected: the granular history value diminishes once a PR
    is merged — readers care about the *outcome diff*; the
    iteration is preserved in the PR archive.

- **Rebase-and-merge.**
  - Pros: linearizes commits onto `main` without a merge commit;
    preserves individual-commit history.
  - Cons: requires every branch commit to be independently clean
    (PR 10's history fails this — `5af775c` introduces a snapshot
    test that doesn't exist on `main`); PR-atomic revert needs
    knowing the commit range, not one commit; loses the
    "one commit = one PR" mental model that squash provides.
  - Why rejected: incompatible with the looser pre-merge branch
    discipline Sophie has been using (RED commits, exploratory
    fixes, mid-PR pivots are normal). Rebase-and-merge punishes
    that discipline retroactively.

## Consequences

**Easier:**

- Reading `main` history (one line per PR).
- Reverting a PR atomically.
- Branch-protection compliance when it activates.
- Bisecting (one commit per logical change vs averaging 5-10 per
  PR).

**Harder:**

- Intra-PR commit-by-commit blame on `main` (the granular history
  is still in the GitHub PR archive + the merged branch tip, just
  not first-class in `git log`).
- Cherry-picking individual within-PR commits to other branches
  (need to fetch the PR branch first).

**Triggers:**

- Update GitHub repo settings: "Allow squash merging" remains
  enabled; "Allow merge commits" and "Allow rebase merging" can be
  disabled to enforce by default. **Action item — Anna sets in
  GitHub settings.**
- Update `docs/website/contributing/adr-process.md` and any future
  `CONTRIBUTING.md` to specify squash-merge.
- Future quality audits use a simpler commit-hygiene rubric: each
  PR = one commit on `main`; iteration noise is out-of-scope.

## References

- [Bucket B + C architecture audit](../../reviews/2026-05-15-bucket-b-c-architecture-audit.md)
  — dim 8 surfaced the convention question.
- [ADR 0025: Phase 0 actual scope](./0025-phase-0-actual-scope.md)
  — branch protection deferred until CI build green.
- [`feedback_branch_pr_scope`](file:///Users/anna/.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_branch_pr_scope.md)
  — direct-to-main convention for docs (unchanged by this ADR).
- [PR 10 merge commit `215a20a`](https://github.com/drannarosen/sophie/pull/42)
  — last PR under the merge-commit convention; cited in Context.
- [`hi-claude-this-session-cheerful-eagle.md`](file:///Users/anna/.claude/plans/hi-claude-this-session-cheerful-eagle.md)
  — session plan that scoped this ADR.
