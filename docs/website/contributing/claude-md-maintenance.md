---
title: CLAUDE.md maintenance
short_title: CLAUDE.md maintenance
description: Design principles and growth discipline for keeping CLAUDE.md at SoTA-level signal density without bloat. Read before any non-trivial CLAUDE.md change.
tags: [contributing, claude-md, process, instruction-file, maintenance]
---

# CLAUDE.md maintenance

How Sophie's project-instruction file (`CLAUDE.md` at the repo root)
stays at SoTA-level signal density as the platform grows. Read this
before any non-trivial CLAUDE.md change.

`CLAUDE.md` is loaded into context on every Claude Code session and
every turn. Every line you keep is a line you pay for forever. There
is no version of "we'll catch up later" — bloat in CLAUDE.md is
expensive in two ways: it crowds out attention from rules that
matter, and it consumes context tokens on every interaction.

Last full review: **2026-05-23**.

## The one design principle that solves everything

> **Would a fresh agent fail at their task if they didn't know this
> on turn 1?**

Apply this question to every line, every table row, every example.

- If **yes** → CLAUDE.md.
- If **no** → ADR (architectural), reference doc (look-up-able),
  memory (user-side preference), or contributor doc like this one.

Most of CLAUDE.md's bloat lives in content that fails this test —
content that's *true* and *useful* but not *first-turn load-bearing*.

## Six general principles

### 1. First-turn loading, not comprehensiveness

CLAUDE.md is the orientation a fresh agent gets *before doing
anything*. It is not the project encyclopedia. Pointers beat content
for anything that can be looked up. The "Where things live" table is
the model for this — it's pure pointers, zero content, and it's the
densest section of the file.

### 2. Hard rules > principles > examples

- **Hard rules** ("use pnpm, never npm") stay verbatim and are
  one-liners.
- **Principles** ("SoTA over simple") are evergreen and earn one
  paragraph each.
- **Examples** are the most expendable category. Date-bound
  examples ("PR-C3 hard-renamed X") rot — they read as historical
  trivia within months. Either rotate examples regularly, or
  state the principle alone and let `git log` be the example.

### 3. Stable > volatile

CLAUDE.md should change rarely. Anything tied to a current sprint,
a specific PR number, or a debate-in-progress belongs in a doc with
a `last_updated` field. Volatile content in CLAUDE.md ages out
silently and starts to mislead.

### 4. Hierarchy should match agent decision flow

Sophie's current ordering models the right shape:

1. **Orient** — what Sophie is (one paragraph, then a pointer)
2. **Gate** — HITL mandate (the gate that fires before everything
   else)
3. **Constrain** — Working principles W1–W4 (citable rules)
4. **Reference** — Locked decisions, Engineering principles,
   Conventions
5. **Escalate** — When in doubt

Note that HITL comes *before* "what Sophie is" — because HITL is a
gate that fires regardless of orientation. Order by *when the agent
needs the rule*, not by what's logically prior.

### 5. Tables earn their keep only if they're cited

A long reference table inside CLAUDE.md sends a "memorize this"
signal. If only a fraction of the rows actually come up in routine
reasoning, prune to what's cited and let the directory listing carry
the rest. Sophie's locked-decisions table is the canonical case:
~35 rows today, ~10–15 actually referenced in typical sessions.

### 6. Memory ↔ CLAUDE.md is a real distinction

- **Memory** is user-side preferences for cross-session continuity.
  Lives at `~/.claude/projects/<project>/memory/`. Personal,
  cross-project-portable, optional.
- **CLAUDE.md** is project-side rules every agent (fresh or
  otherwise) must know on turn 1. Public-repo, contributor-shared,
  mandatory.

Don't blur the line. When a memory item is genuinely project-side
(applies to anyone working in Sophie, not just the user), it belongs
in CLAUDE.md. When a CLAUDE.md line is genuinely user-side ("Anna
prefers terse responses"), it belongs in memory.

## Length guidance

| Range | Signal |
| --- | --- |
| < 100 lines | Probably missing load-bearing rules |
| 100–300 lines | Sweet spot for most projects |
| 300–400 lines | Bloat is starting to accumulate; audit needed |
| 400–500 lines | Aggressive trim warranted |
| > 500 lines | Agents start skimming past sections; fix immediately |

Sophie's `CLAUDE.md` as of 2026-05-23 is ~400 lines. On the long
side but not crisis-level; the file deserves a thoughtful trim, not
a panic cut.

## Sectional template — Sophie-specific

Each section in Sophie's CLAUDE.md, what belongs in it, and what
belongs elsewhere:

| Section | Belongs here | Belongs elsewhere |
| --- | --- | --- |
| **HITL mandate** | Load-bearing gate rules, voiced for direct internalization | (this section is irreducible) |
| **Working principles (W1–W4)** | Citable, evergreen, hard rules with brief rationale | Examples of W-rule violations → memory or PR comments, not CLAUDE.md |
| **What Sophie is** | One-paragraph identity + scope-and-origin sentence + pointer | Proposal-voice positioning → [`positioning.md`](../strategy/positioning.md) |
| **Where things live** | Pointer table to the docs/files agents need to find | Content of those destinations (always pointer, never content) |
| **Locked decisions** | ADRs cited in routine reasoning (10–15 max) | Full ADR catalog → `decisions/` directory listing |
| **Engineering principles** | Evergreen principle statements with at most one timeless example | Dated PR-X examples → rotate quarterly or remove |
| **Conventions** | Project-side hard rules (one-liners) + discipline patterns (multi-line) | User-preference conventions → memory |
| **Style** | Quick reminders only | Detailed style spec → [`docs-style-guide.md`](docs-style-guide.md) |
| **When in doubt** | Escalation pattern, terse | Detail belongs in HITL section above |

## Bloat patterns to watch

Five recurring patterns that cause CLAUDE.md to grow without earning
its keep:

1. **Reference tables that send "memorize this" signal.** Pruning
   ≥ adding when a table grows beyond ~15 rows.

2. **Dated examples in principle bullets.** "Bucket C examples,"
   "PR-C3 / PR-C4 / PR #39," "the 2026-05-18 audit" — useful
   *today*, weird in a year. Rotate them out as they age or replace
   with timeless principle statements.

3. **Section sprawl as the project grows.** Consumer-course
   migrations: 25 lines for one course. When ASTR 101 and COMP 521
   join, this section will grow unmanageably unless the per-course
   detail moves to ADR 0064 (which already holds the protocol) and
   CLAUDE.md keeps only the status table.

4. **Memory → CLAUDE.md drift.** When a user-side preference keeps
   coming up in conversation, the temptation is to "make it
   official" by putting it in CLAUDE.md. Resist unless it's
   project-side. Personal preferences belong in memory.

5. **Engineering principles that read more like a manifesto than a
   gate.** Each principle should answer "which choice does this
   rule out?" If a principle can't be violated, it's not a rule;
   it's atmosphere. Cut or rewrite.

## Growth discipline (per-PR rule)

Every PR that touches CLAUDE.md must answer:

- Does this line earn first-turn relevance?
- Would a fresh agent fail without it?
- If no: which doc / ADR / memory is the right home?
- If yes: is there an existing line that should be removed because
  the new one supersedes it?

This is the same shape as W3 ("Touch only what you must") applied
to CLAUDE.md specifically.

## When to trim

**Wait a week after significant additions.** Fresh additions feel
load-bearing; usage data tells the truth. After the conversation
that prompted the addition fades, scan agent transcripts to see
which lines actually got cited and which got ignored. Prune from
*evidence*, not from estimated relevance.

**Trim triggers, in order of urgency:**

- File > 500 lines → immediate aggressive trim.
- Any single table > 20 rows → prune to the cited subset.
- Any single section > 100 lines → split or compress.
- File > 400 lines for > 1 month → thoughtful audit pass.

Sophie hits the third trigger now (line count growth over several
weeks); the right move is a single trim wedge that prunes the
locked-decisions table, compresses the consumer-course migrations
section, and replaces dated examples with timeless statements.
Estimated impact: ~50–55 lines.

## Sophie-specific watchpoints

The sections most likely to balloon in the next 6 months:

1. **Locked-decisions table.** ADRs accumulate at ~3–10 per month.
   If every new ADR claims a row, the table becomes unscannable
   within a quarter. Discipline: only ADRs cited in *routine*
   reasoning earn a row; reserved ADRs (e.g., 0050) and ADRs whose
   substance is captured by a parent principle do not.

2. **Consumer-course migrations.** Will grow per course unless
   ADR 0064 carries the per-pilot detail and CLAUDE.md keeps only
   the status table.

3. **Conventions.** Currently 15 bullets after the 2026-05-23
   memory pulls. Will grow if every new "I noticed this" lands here.
   Discipline: hard rules (one-liners) and discipline rules
   (multi-line) should be separated; the threshold for adding a new
   convention is "every agent on every project would fail without
   this."

4. **Working principles.** Resist adding W5, W6, W7. The four are
   sized to be memorable. If a fifth genuinely earns its place, it
   should *replace* a weaker one, not extend the list.

5. **What Sophie is.** The scope-and-origin paragraph should stay
   one paragraph + a pointer. Proposal-voice elaboration belongs in
   [`positioning.md`](../strategy/positioning.md).

## How to use this doc

- **Read before** any non-trivial CLAUDE.md change.
- **Use as gate check:** every diff line in CLAUDE.md needs an
  honest answer to "does this earn first-turn relevance?"
- **Update this doc** when you find a new bloat pattern, a new
  design principle that works, or evidence that an existing
  principle is wrong. Keep the date in the "Last full review"
  line at the top current.

The doc should change rarely — same discipline as the file it
documents. If this doc starts growing beyond ~300 lines, the
recursion has gone too far.

## See also

- [Working principles W1–W4](https://github.com/drannarosen/sophie/blob/main/CLAUDE.md)
  in CLAUDE.md itself — especially **W3 (touch only what you must)**
  and **W4 (define success criteria, loop until verified)**, both of
  which govern CLAUDE.md edits.
- [Docs style guide](docs-style-guide.md) — the voice and Diátaxis
  rules apply to CLAUDE.md too.
- [ADR process](adr-process.md) — when something belongs in an ADR
  rather than CLAUDE.md.
- [Anthropic — `CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory)
  documentation on how Claude Code loads project-instruction files.
