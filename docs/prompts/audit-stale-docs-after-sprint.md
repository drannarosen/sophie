# Audit stale docs after a feature sprint

**When to use this prompt:** A feature sprint just landed on `main`
(merged via PR or direct commits) and you suspect the design has
deviated from the initial proposal, the scope expanded, or new
patterns emerged that aren't yet reflected in the website docs
(`docs/website/`), ADRs, AGENTS.md tables, or memory files. Paste
this prompt at the start of a new Claude Code session focused on
documentation hygiene.

**Variables to fill in before pasting:**
- `{SPRINT_NAME}` — e.g. "course-info projection", "WS3 PR-5"
- `{PR_URL}` — the merged PR's GitHub URL
- `{DESIGN_DOC_PATH}` — `docs/plans/<date>-<sprint>-design.md` or similar
- `{IMPL_PLAN_PATH}` — `docs/plans/<date>-<sprint>-implementation.md` (if one exists)
- `{REVIEW_DOC_PATH}` — `docs/reviews/<date>-<sprint>.md` (if a code-review doc was produced)
- `{KEY_ADRS}` — comma-separated list of ADR numbers most affected (e.g. "0080, 0058, 0061")
- `{HIGH_RISK_TERMS}` — search terms most likely to be stale (e.g. "grade_weights, v0.1, IsoEvent")
- `{ARCH_DEVIATIONS}` — short bullet list of known deviations from the design doc you want documented
  (e.g. "H7 Option B chose .astro layouts over the design-doc's React-layouts shape")

---

## Prompt — copy from below this line

I want to systematically audit + update stale website docs after the
**{SPRINT_NAME}** sprint, which merged at {PR_URL}. The implementation
deviated from the initial design + expanded scope as expected; the
goal of this session is to bring the docs back in sync with what
actually shipped.

**Sprint context (paste-once, you'll reference these throughout):**
- PR: {PR_URL}
- Design doc: `{DESIGN_DOC_PATH}`
- Implementation plan: `{IMPL_PLAN_PATH}`
- Code-review doc: `{REVIEW_DOC_PATH}`
- Most-affected ADRs: {KEY_ADRS}
- Architectural deviations from the design doc that need documenting:
  {ARCH_DEVIATIONS}

**Run the audit + update as a 4-phase workflow per the saved
recommendation at `docs/prompts/audit-stale-docs-after-sprint.md`.
Each phase ends with an explicit pause for my review before the next
starts.**

### Phase A — Discovery (read-only, ~30 min)

**Dispatch 3 parallel `Explore` agents** to map the staleness
surface concurrently (one message, multiple Agent tool calls):

1. **ADR + cross-references agent.** Walk
   `docs/website/decisions/` end-to-end. Find every ADR that
   references the affected sprint's surface (cite {KEY_ADRS} + the
   `grep` terms {HIGH_RISK_TERMS}). For each ADR, report: still
   accurate / needs amendment / supersedes opportunity. Also grep
   for stale field names + obsolete patterns across the whole
   `docs/` tree (not just decisions/).

2. **Reference docs + author-facing surface agent.** Walk
   `docs/website/reference/`, `docs/website/explanation/`, and
   anything author-facing. Inventory which docs mention the sprint's
   components / schema / patterns. For each: still accurate /
   needs revision / needs new section / candidate for new doc.
   Specifically check `chapter-components.md`, any "how to author X"
   docs, and the strategy + positioning docs.

3. **Memory + roadmap + status agent.** Walk:
   - `~/.claude/projects/-Users-anna-Teaching-sophie/memory/MEMORY.md`
     and every linked memory file
   - `docs/website/status/roadmap.md`
   - `docs/website/status/validation.md` (dashboard regen needs)
   - `docs/website/strategy/positioning.md`
   - `AGENTS.md`'s "Locked decisions" table (does it need a new row?)
   - The design doc itself (does it need a "post-implementation
     amendments" appendix flagging what changed?)

Each agent should produce a structured "findings by file" report
with classifications: **must-update** / **should-update** /
**nice-to-update** / **no-op**. Don't write anything in this phase;
just inventory.

**Pause for my review after all 3 agents return.**

### Phase B — Triage + decision lock

Aggregate the 3 agents' findings into a single triage table. Then
use `AskUserQuestion` to lock the architectural decision points
that govern downstream writing:

- For each existing ADR flagged for amendment: **amendment-in-place
  vs new ADR with supersedes link** (per Sophie pre-launch
  convention — amendment-in-place is usually preferred since there
  are no external consumers, but new-ADR-with-supersedes-link is
  appropriate when the change is large enough that audit-trail
  clarity matters)
- For each candidate new ADR: confirm it should be written + lock
  the ADR number + lock its locked-decisions list
- For each author-facing reference doc: amend vs sibling-new-doc
- For AGENTS.md changes: which rows + which language?
- For memory updates: which file gets the canonical update vs which
  get cross-reference updates?

**Pause for my answers via `AskUserQuestion` before any writing.**

### Phase C — Plan via `superpowers:writing-plans`

Produce a structured implementation plan at
`docs/plans/<today>-docs-audit-{SPRINT_NAME}.md` capturing:

1. Per-file diff intent (what changes, what doesn't, why)
2. R6 anchor-verification gate: every new ADR cross-reference uses
   MyST heading-slug, not `#L\d+` GitHub line-anchors. Run
   `grep -rE "#L[0-9]+" docs/website/**/*.md` and flag any drift
   introduced by the audit.
3. `feedback_validation_dashboard_regen` discipline: any ADR
   status/validation block change triggers `validation.md`
   regeneration in the same commit.
4. MyST build gate: `npx mystmd build --html` exits 0 AND
   `grep -c "⚠" ` returns 0 after every commit.
5. Branch/PR scope per `feedback_branch_pr_scope`: docs-only
   changes land directly on `main` (no PR). The plan should list
   each commit explicitly + its dependency order.
6. AGENTS.md table updates batched into one commit at the end so
   the "Locked decisions" surface stays atomic.

**Pause for my plan approval before any writing begins.**

### Phase D — Execute via `superpowers:executing-plans`

Land the plan one commit at a time on `main`. After each commit:

- Run `grep -c "⚠" ` on the MyST build output → 0
- Run `pnpm exec biome check` → 0/0 (cosmetic but consistent)
- If an ADR status block was touched, regen `validation.md` in the
  same commit
- After all commits land, run `grep -rE "#L[0-9]+" docs/website/**/*.md`
  one final time as the R6 closure gate

End-of-session report:
- Commits landed (each with rationale)
- ADRs amended / created (status + validation evidence rows)
- Reference docs updated / added
- AGENTS.md changes
- Memory updates
- Outstanding follow-ups (if any)

### Constraints (apply throughout)

- **W3 (touch only what you must)** — docs audit is the goal; resist
  scope creep into refactors, schema changes, or code edits beyond
  the minimum needed to keep examples accurate.
- **HITL mandate** — every ADR draft + every new doc-creation
  decision needs my explicit approval at the Phase B triage.
- **No autonomous side-effects** — don't open GitHub issues, push
  to remotes, or update remote state without explicit text
  confirmation each time per `feedback_no_questions_mode_scope`.
- **No emojis in docs** — per global rule unless I explicitly ask.
- **Cite ADR numbers** when proposing changes; cite the design doc
  + PR + review doc when claiming "this was decided / shipped."
- **Pre-launch convention** — favor in-place amendments + clean
  break renames over back-compat shims per
  `feedback_no_backcompat_prelaunch`.

---

## Why this 4-phase shape

Documentation audits that skip Phase A (discovery) tend to fix one
stale reference while missing five others — the staleness surface
is genuinely large for a multi-package sprint (likely a new ADR, an
amendment to existing ADRs, an author-facing reference, AGENTS.md
table, memory updates, design doc appendix, MyST TOC, possibly
strategy/positioning).

Documentation audits that skip Phase B (triage + decision lock)
tend to write inconsistent ADRs (e.g. some amended in place, others
superseded with cross-links) and leave the architectural-decision
trail ambiguous.

Documentation audits that skip Phase C (plan) tend to produce
ad-hoc commits that miss the validation-dashboard-regen rule, the
R6 anchor-verification rule, or the MyST build gate — and then
require fixup commits later.

Investing in the 4-phase ceremony up front is cheap relative to
the cost of multi-pass doc revisions or stale docs persisting for
another sprint cycle.
