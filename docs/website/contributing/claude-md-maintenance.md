---
title: Agent-instructions maintenance (AGENTS.md + CLAUDE.md)
short_title: Agent instructions
description: Design principles and growth discipline for keeping Sophie's project-instruction file at SoTA-level signal density without bloat. AGENTS.md is canonical; CLAUDE.md is a one-line @AGENTS.md import per Anthropic's recommended cross-tool pattern.
tags: [contributing, agents-md, claude-md, process, instruction-file, maintenance]
---

# Agent-instructions maintenance

How Sophie's project-instruction file stays at SoTA-level signal
density as the platform grows. Read this before any non-trivial
change to **AGENTS.md** at the repo root.

## File layout — AGENTS.md is canonical

Sophie's project-instruction content lives in **`AGENTS.md`** at the
repo root. `CLAUDE.md` is a one-line `@AGENTS.md` import per
Anthropic's [documented cross-tool pattern](https://code.claude.com/docs/en/memory.md).

| File | Role | Loaded by |
| --- | --- | --- |
| **`AGENTS.md`** | Canonical project instructions | OpenAI Codex, Cursor, Aider, GitHub Copilot Coding Agent, Gemini CLI, Windsurf, Devin, JetBrains Junie, Zed, Warp, VS Code, goose, opencode, Factory, Google Jules, Augment Code, Roo Code, Kilo Code, +others ([agents.md ecosystem](https://agents.md/)) |
| **`CLAUDE.md`** | One-line `@AGENTS.md` import | Claude Code (which does not read AGENTS.md natively) |

Every edit goes into **AGENTS.md**. `CLAUDE.md` should change only
if you add Claude-specific extensions *below* the `@AGENTS.md` line —
and Sophie has none.

The agent-instruction file is loaded into context on every coding-
agent session and every turn. Every line you keep is a line you pay
for forever. Bloat is expensive in two ways: it crowds out attention
from rules that matter, and it consumes context tokens on every
interaction.

Last full review: **2026-05-23**.

## The one design principle that solves everything

> **Would a fresh agent fail at their task if they didn't know this
> on turn 1?**

Apply this question to every line, every table row, every example.

- If **yes** → `AGENTS.md`.
- If **no** → ADR (architectural), reference doc (look-up-able),
  memory (user-side preference), or contributor doc like this one.

Most of AGENTS.md's bloat lives in content that fails this test —
content that's *true* and *useful* but not *first-turn load-bearing*.

## Six general principles

### 1. First-turn loading, not comprehensiveness

`AGENTS.md` is the orientation a fresh agent gets *before doing
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

`AGENTS.md` should change rarely. Anything tied to a current sprint,
a specific PR number, or a debate-in-progress belongs in a doc with
a `last_updated` field. Volatile content in AGENTS.md ages out
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

A long reference table inside `AGENTS.md` sends a "memorize this"
signal. If only a fraction of the rows actually come up in routine
reasoning, prune to what's cited and let the directory listing carry
the rest. Sophie's locked-decisions table was the canonical case:
35 rows pre-trim, 11 after the 2026-05-23 wedge.

### 6. Memory ↔ AGENTS.md is a real distinction

- **Memory** is user-side preferences for cross-session continuity.
  Lives at `~/.claude/projects/<project>/memory/`. Personal,
  cross-project-portable, optional.
- **AGENTS.md** is project-side rules every agent (fresh or
  otherwise) must know on turn 1. Public-repo, contributor-shared,
  mandatory.

Don't blur the line. When a memory item is genuinely project-side
(applies to anyone working in Sophie, not just the user), it belongs
in AGENTS.md. When an AGENTS.md line is genuinely user-side ("Anna
prefers terse responses"), it belongs in memory.

## Length guidance

**Anthropic's documented target for `CLAUDE.md` is < 200 lines** —
see [How Claude remembers your project § Write effective instructions](https://code.claude.com/docs/en/memory.md#write-effective-instructions).
The target reflects Claude's adherence and context-cost research,
not an arbitrary cap. AGENTS.md has no equivalent published number,
but the same principle holds: every line loads on every turn for
every supported tool.

Honest reality: most production projects hover 250–400 lines and
still function. The 200-line target is aspirational; the bands
below are what observed projects actually look like.

| Range | Signal |
| --- | --- |
| < 100 lines | Probably missing load-bearing rules |
| 100–200 lines | Anthropic's documented target band |
| 200–300 lines | Above target but defensible; audit annually |
| 300–400 lines | Bloat is accumulating; thoughtful trim warranted |
| > 400 lines for > 1 month | Aggressive trim trigger |
| > 500 lines | Agents start skimming past sections; fix immediately |

Sophie's `AGENTS.md` as of 2026-05-23 is **325 lines**, in the
"above target but defensible" band. Further trims should come
from evidence about which lines actually get cited, not from
chasing the 200-line number.

## Sectional template — Sophie-specific

Each section in Sophie's `AGENTS.md`, what belongs in it, and what
belongs elsewhere:

| Section | Belongs here | Belongs elsewhere |
| --- | --- | --- |
| **HITL mandate** | Load-bearing gate rules, voiced for direct internalization | (this section is irreducible) |
| **Working principles (W1–W4)** | Citable, evergreen, hard rules with brief rationale | Examples of W-rule violations → memory or PR comments, not AGENTS.md |
| **What Sophie is** | One-paragraph identity + scope-and-origin sentence + pointer | Proposal-voice positioning → [`positioning.md`](../strategy/positioning.md) |
| **Where things live** | Pointer table to the docs/files agents need to find | Content of those destinations (always pointer, never content) |
| **Locked decisions** | ADRs cited in routine reasoning (10–15 max) | Full ADR catalog → `decisions/` directory listing |
| **Engineering principles** | Evergreen principle statements with at most one timeless example | Dated PR-X examples → rotate quarterly or remove |
| **Conventions** | Project-side hard rules (one-liners) + discipline patterns (multi-line) | User-preference conventions → memory |
| **Style** | Quick reminders only | Detailed style spec → [`docs-style-guide.md`](docs-style-guide.md) |
| **When in doubt** | Escalation pattern, terse | Detail belongs in HITL section above |

## Cross-tool compatibility — the AGENTS.md + CLAUDE.md import pattern

The repo-root layout (`AGENTS.md` canonical + `CLAUDE.md` as a
one-line `@AGENTS.md` import) is Anthropic's documented pattern for
keeping a single source of truth that Claude Code and the AGENTS.md
ecosystem both read.

**The CLAUDE.md file at the repo root contains:**

```markdown
@AGENTS.md

<!-- Human-readable explanation of why this file is short -->
```

The `@AGENTS.md` line is a Claude Code import directive. Claude
expands it at load time and sees the full AGENTS.md content
verbatim. The HTML comment is stripped before Claude sees it, so
it costs zero context tokens; it exists purely for the human who
opens CLAUDE.md in an editor and wonders why it's so short.

**Discipline:**
- Every edit goes into `AGENTS.md`. Never duplicate into
  `CLAUDE.md`.
- If Sophie ever needs a Claude-specific extension, add it *below*
  the `@AGENTS.md` line in `CLAUDE.md`. Sophie has none today.
- Anthropic's recommended max import recursion depth is 5 levels.
  Sophie uses 1.

## Claude-specific features (use with caution)

Two Claude-only features exist that Sophie deliberately does not
use today because they fragment cross-tool portability:

### `.claude/rules/` directory

Path-scoped instructions via YAML frontmatter. Example:

```markdown
---
paths:
  - "docs/website/decisions/**/*.md"
---

# Rules when editing ADRs
```

Only loaded when Claude reads matching paths. Excellent for
deep-context rules that don't need to live in AGENTS.md.
**Tradeoff:** OpenAI Codex, Cursor, Aider, and the rest of the
AGENTS.md ecosystem ignore `.claude/rules/` entirely. Using this
feature means deciding the rule is Claude-Code-only.

Reference: [How Claude remembers your project § Organize rules](https://code.claude.com/docs/en/memory.md#organize-rules-with-claude/rules/).

### `@file/path` imports beyond `@AGENTS.md`

Claude expands imports at load time. Sophie could use
`@docs/website/strategy/positioning.md` to inline the positioning
content into AGENTS.md context. Same tradeoff: **AGENTS.md
ecosystem tools do not expand imports.** A `@file/path` line is
treated as plain text by everything other than Claude Code.

Sophie avoids deeper imports today. The `@AGENTS.md` line in
`CLAUDE.md` is the one exception, and that one is structural
(Claude needs the import to read AGENTS.md at all).

### When to break cross-tool portability

Only when the rule is *materially better* delivered through a
Claude-specific feature than as plain AGENTS.md content. The bar
is high. If Sophie ever adopts `.claude/rules/` for ADR-touching
work, document the decision in this guide and explain the
tradeoff explicitly.

## Bloat patterns to watch

Five recurring patterns that cause `AGENTS.md` to grow without earning
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
   `AGENTS.md` keeps only the status table.

4. **Memory → AGENTS.md drift.** When a user-side preference keeps
   coming up in conversation, the temptation is to "make it
   official" by putting it in `AGENTS.md`. Resist unless it's
   project-side. Personal preferences belong in memory.

5. **Engineering principles that read more like a manifesto than a
   gate.** Each principle should answer "which choice does this
   rule out?" If a principle can't be violated, it's not a rule;
   it's atmosphere. Cut or rewrite.

## Growth discipline (per-PR rule)

Every PR that touches `AGENTS.md` must answer:

- Does this line earn first-turn relevance?
- Would a fresh agent fail without it?
- If no: which doc / ADR / memory is the right home?
- If yes: is there an existing line that should be removed because
  the new one supersedes it?

This is the same shape as W3 ("Touch only what you must") applied
to `AGENTS.md` specifically.

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
   ADR 0064 carries the per-pilot detail and `AGENTS.md` keeps only
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

- **Read before** any non-trivial `AGENTS.md` change.
- **Use as gate check:** every diff line in `AGENTS.md` needs an
  honest answer to "does this earn first-turn relevance?"
- **Update this doc** when you find a new bloat pattern, a new
  design principle that works, or evidence that an existing
  principle is wrong. Keep the date in the "Last full review"
  line at the top current.

The doc should change rarely — same discipline as the file it
documents. If this doc starts growing beyond ~300 lines, the
recursion has gone too far.

## See also

- [Working principles W1–W4](https://github.com/drannarosen/sophie/blob/main/AGENTS.md)
  in `AGENTS.md` itself — especially **W3 (touch only what you must)**
  and **W4 (define success criteria, loop until verified)**, both of
  which govern AGENTS.md edits.
- [Docs style guide](docs-style-guide.md) — the voice and Diátaxis
  rules apply to `AGENTS.md` too.
- [ADR process](adr-process.md) — when something belongs in an ADR
  rather than `AGENTS.md`.
- [AGENTS.md ecosystem](https://agents.md/) — open standard stewarded
  by the Agentic AI Foundation under the Linux Foundation; lists the
  20+ agentic tools that read the file natively.
- [Anthropic — `CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory)
  documentation on how Claude Code loads project-instruction files
  and the `@AGENTS.md` import pattern.
