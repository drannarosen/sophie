---
title: Docs style guide
short_title: Docs style guide
description: Voice, IA, naming conventions, and discipline for authoring Sophie design documentation.
tags: [contributing, docs, style, diataxis]
---

# Docs style guide

How to write Sophie design documentation that holds up over time and
serves multiple audiences. The voice is **clear, concrete, honest**.
The structure is **Diátaxis-disciplined**.

## Voice

### Be direct

Active voice. Concrete nouns. Specific numbers. Real names.

> ✅ "Astro 6 + MDX, with `remark-math`, `rehype-katex`, and
> `rehype-citation` plugins."
>
> ❌ "A modern web framework with appropriate plugins for academic
> markdown."

### Be honest about trade-offs

Every architectural choice has consequences — both positive and
negative. Document both. Future-you will read this and need to know
why; lying doesn't help.

> ✅ "Re-themable without rebuilding the platform. Cost: two
> artifacts to keep in sync (CSS vars + Tailwind preset)."
>
> ❌ "Easy and powerful theming."

### Be specific about audience

Sophie docs serve four audiences (Anna, future collaborators,
external users, contributors). Each page should know which audience
it's for. The Diátaxis section signals it:

- **Tutorials** → newcomers learning by doing.
- **How-to guides** → users with a specific task.
- **Reference** → users looking up facts.
- **Explanation** → users trying to understand the *why*.

If a page is "for everyone," it's probably for no one.

### Avoid hedging

Decisions are commitments. ADRs especially: state the decision in
one sentence; hedge in Consequences if needed.

> ✅ "Astro 6 + MDX as the renderer."
>
> ❌ "We probably want to use Astro 6 + MDX, but we might switch."

## Information architecture (Diátaxis)

The four content types are not interchangeable:

### Tutorial — learning-oriented

A read-along walkthrough. The reader follows along step by step and
ends with a working artifact. **Tutorials don't explain *why*.** They
demonstrate. The reader trusts and follows.

Voice: imperative, present tense. "Open the file. Type this. Run
that."

Length: as long as the walkthrough requires; usually 1,000–3,000
words.

### How-to guide — task-oriented

A recipe for accomplishing a specific task. The reader knows what
they want; the how-to gives the steps. **How-tos assume context** —
they don't re-explain concepts that are already explained elsewhere.

Voice: imperative or descriptive. "To set up X, first Y, then Z."

Length: as short as possible. Usually 300–1,500 words.

### Reference — information-oriented

A factual specification. The reader is looking up a fact and wants
to leave fast. **Reference is structured, factual, exhaustive.**
Less prose, more tables/code/lists.

Voice: descriptive, declarative. "Field X is type Y; see Z."

Length: whatever the surface requires.

### Explanation — understanding-oriented

An essay-shaped piece that explains *why* something is the way it
is. **Explanation can be longer**, more discursive. It connects
ideas, traces causes, names alternatives.

Voice: analytical, discursive.

Length: 1,000–5,000 words is typical. Longer is fine if warranted.

## Cross-section discipline

If a page mixes intents, refactor:

- A how-to that starts explaining *why* should split: the why moves
  to explanation.
- A reference page that includes a tutorial-style walkthrough should
  link out to the tutorial, not embed it.
- An explanation page that lists "steps to do X" is probably a
  how-to.

Use cross-references aggressively. Link sideways across sections;
don't duplicate.

## Naming conventions

### Files

- Kebab-case: `set-up-dual-profile.md`, `audit-and-ai-authoring.md`.
- ADRs: `NNNN-short-title.md` with zero-padded numbers
  (`0001-`, `0011-`, `0123-`).
- Avoid date-stamped filenames; use frontmatter `date` instead.

### Frontmatter

Every page has:

```yaml
---
title: <Full descriptive title>
short_title: <Brief title for sidebar>
description: <One sentence; appears in search results and link previews>
tags: [...]
---
```

Tags are searchable; use existing tags first, add new ones sparingly.

### Section headings

- Sentence case, not title case: "Audit and AI authoring," not
  "Audit And AI Authoring."
- One `# H1` per page (the page title; usually omitted from the body
  since the title comes from frontmatter).
- Use `## H2` for top-level sections.
- Avoid skipping levels; if you need an H4, you probably need to
  refactor.

## Cross-references

### Internal

Use relative-path links with explicit fragments:

```markdown
See [Component contract §3](../reference/component-contract.md#three-render-modes-plus-serialize).
```

Why: explicit fragments survive title changes; relative paths work
in MyST and after migration to Sophie-hosted.

### Glossary terms

Use the `{term}` directive once a term has a glossary entry:

```markdown
The {term}`useInteractive` hook owns persistence.
```

### Citations

Use the `[@key]` syntax against `references.bib`:

```markdown
Calibration is trainable [@tetlock2015superforecasting].
```

### Abbreviations

Define abbreviations in `myst.yml` `abbreviations:`. Use them with
`{abbr}`:

```markdown
The {abbr}`ADR` template lives at...
```

## Diagrams

Use Mermaid for flow, sequence, state-machine diagrams:

````markdown
```{mermaid}
flowchart LR
  A --> B
  B --> C
```
````

Avoid embedding rendered images for diagrams that could be Mermaid —
text source is editable, version-controllable, accessible.

## Code blocks

- Always specify a language for syntax highlighting (`typescript`,
  `bash`, `mdx`, `yaml`, `text`, `json`).
- Use `text` or `console` for shell output.
- Keep code blocks focused — show the relevant lines, not the entire
  file. Use `// ...` for elided portions.

## Admonitions

Use sparingly:

```markdown
:::{important} Status: pending
This page is a stub until Phase X.
:::

:::{seealso}
[Related page](other.md).
:::

:::{warning}
Don't do X without Y.
:::

:::{tip}
A useful but optional pointer.
:::
```

Admonitions interrupt flow; they should *earn* the interruption.

## Migration-readiness

This MyST docs site will migrate to Sophie-hosted in Phase 4–5
([ADR 0010](../decisions/0010-myst-for-design-docs.md)). Authoring
discipline now means easier migration later:

- Avoid MyST-only flourishes that don't have MDX equivalents.
- Use only the MyST features listed in
  [ADR 0010](../decisions/0010-myst-for-design-docs.md):
  cross-refs, admonitions, glossary, Mermaid, citations, tabs,
  cards, abbreviations.
- If you reach for something not on that list, ADR it first.

## See also

- [ADR process](adr-process.md) — when and how to write ADRs.
- [Setup](setup.md) — how to run the docs site locally.
- [Diátaxis](https://diataxis.fr) — the upstream framework.
- [Strunk's *Elements of Style*](https://www.bartleby.com/141/) —
  evergreen guidance for prose.
